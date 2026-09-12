import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import * as THREE from 'three';
import { TilesRenderer } from '3d-tiles-renderer/three';
import { GLTFExtensionsPlugin } from '3d-tiles-renderer/three/plugins';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SWISS_BUILDINGS_TILESET } from './swissSources';

export const SWISS_BUILDINGS_LAYER_ID = 'swiss-buildings-3d';

type MercatorCoordinateLike = {
	x: number;
	y: number;
	z: number;
	meterInMercatorCoordinateUnits(): number;
};

type MapLibreModule = {
	MercatorCoordinate: {
		fromLngLat(
			lngLat: { lng: number; lat: number } | [number, number],
			altitude?: number
		): MercatorCoordinateLike;
	};
};

function ecefToLngLatAlt(x: number, y: number, z: number) {
	const a = 6378137.0;
	const e2 = 6.69437999014e-3;
	const b = a * Math.sqrt(1 - e2);
	const ep2 = (a * a - b * b) / (b * b);
	const p = Math.sqrt(x * x + y * y);
	const th = Math.atan2(a * z, b * p);
	const lon = Math.atan2(y, x);
	const lat = Math.atan2(
		z + ep2 * b * Math.pow(Math.sin(th), 3),
		p - e2 * a * Math.pow(Math.cos(th), 3)
	);
	const n = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
	const alt = p / Math.cos(lat) - n;
	return {
		lng: (lon * 180) / Math.PI,
		lat: (lat * 180) / Math.PI,
		alt
	};
}

/**
 * MapLibre custom layer streaming swisstopo swissBUILDINGS3D.
 * Tile LOD is internal — zoom never swaps building systems.
 */

const FALLBACK_GL_ATTRIBUTES: WebGLContextAttributes = {
	alpha: true,
	depth: true,
	stencil: true,
	antialias: true,
	premultipliedAlpha: true,
	preserveDrawingBuffer: false,
	powerPreference: 'high-performance',
	failIfMajorPerformanceCaveat: false
};

/**
 * Three r186 does `context.getContextAttributes().alpha` and crashes when MapLibre
 * hands over a shared context that still reports null attributes.
 */
function ensureContextAttributes(gl: WebGLRenderingContext | WebGL2RenderingContext) {
	let attrs: WebGLContextAttributes | null = null;
	try {
		attrs = gl.getContextAttributes();
	} catch {
		attrs = null;
	}
	if (attrs) return;

	const safe = () => {
		try {
			return gl.getContextAttributes?.() ?? { ...FALLBACK_GL_ATTRIBUTES };
		} catch {
			return { ...FALLBACK_GL_ATTRIBUTES };
		}
	};

	try {
		Object.defineProperty(gl, 'getContextAttributes', {
			configurable: true,
			enumerable: true,
			writable: true,
			value: () => {
				try {
					return safe() ?? { ...FALLBACK_GL_ATTRIBUTES };
				} catch {
					return { ...FALLBACK_GL_ATTRIBUTES };
				}
			}
		});
	} catch {
		try {
			(gl as WebGLRenderingContext).getContextAttributes = () => ({
				...FALLBACK_GL_ATTRIBUTES
			});
		} catch {
			/* last resort handled by createSharedRenderer */
		}
	}
}

function createSharedRenderer(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	canvas: HTMLCanvasElement
): THREE.WebGLRenderer {
	ensureContextAttributes(gl);

	// Three r163+ rejects WebGL1. MapLibre should provide WebGL2; bail early if not.
	if (typeof WebGL2RenderingContext !== 'undefined' && !(gl instanceof WebGL2RenderingContext)) {
		throw new Error('swiss buildings require WebGL2');
	}

	const attributes = gl.getContextAttributes();
	if (!attributes) {
		// Final shield: temporarily wrap the prototype method for this construction only.
		const proto = Object.getPrototypeOf(gl) as WebGL2RenderingContext;
		const original = proto.getContextAttributes;
		proto.getContextAttributes = function patched(this: WebGL2RenderingContext) {
			try {
				return original.call(this) ?? { ...FALLBACK_GL_ATTRIBUTES };
			} catch {
				return { ...FALLBACK_GL_ATTRIBUTES };
			}
		};
		try {
			// Prefer context-only — Three derives the canvas from the shared GL context.
			return new THREE.WebGLRenderer({
				canvas,
				context: gl,
				antialias: true,
				alpha: true
			});
		} finally {
			proto.getContextAttributes = original;
		}
	}

	return new THREE.WebGLRenderer({
		canvas,
		context: gl,
		antialias: true,
		alpha: true
	});
}

export function createSwissBuildingsLayer(
	maplibregl: MapLibreModule,
	tilesetUrl: string = SWISS_BUILDINGS_TILESET
): CustomLayerInterface & { dispose?: () => void } {
	let map: MapLibreMap | undefined;
	let renderer: THREE.WebGLRenderer | undefined;
	let scene: THREE.Scene | undefined;
	let camera: THREE.Camera | undefined;
	let tilesCamera: THREE.PerspectiveCamera | undefined;
	let tiles: TilesRenderer | undefined;
	let localTransform: THREE.Matrix4 | undefined;
	let disposed = false;

	function getModelTransform(coord: [number, number, number]) {
		const merc = maplibregl.MercatorCoordinate.fromLngLat([coord[0], coord[1]], coord[2]);
		return {
			translateX: merc.x,
			translateY: merc.y,
			translateZ: merc.z,
			scale: merc.meterInMercatorCoordinateUnits(),
			rotateX: Math.PI / 2,
			rotateY: 0,
			rotateZ: 0
		};
	}

	function updateLocalTransform(origin: [number, number, number] = [8.54, 47.37, 400]) {
		const modelTransform = getModelTransform(origin);
		const rotationX = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(1, 0, 0),
			modelTransform.rotateX
		);
		const rotationY = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(0, 1, 0),
			modelTransform.rotateY
		);
		const rotationZ = new THREE.Matrix4().makeRotationAxis(
			new THREE.Vector3(0, 0, 1),
			modelTransform.rotateZ
		);
		const scaleVec = new THREE.Vector3(
			modelTransform.scale,
			-modelTransform.scale,
			modelTransform.scale
		);
		localTransform = new THREE.Matrix4()
			.makeTranslation(
				modelTransform.translateX,
				modelTransform.translateY,
				modelTransform.translateZ
			)
			.scale(scaleVec)
			.multiply(rotationX)
			.multiply(rotationY)
			.multiply(rotationZ);
	}

	function initTiles() {
		if (!scene || !tilesCamera || !renderer) return;

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

		tiles = new TilesRenderer(tilesetUrl);
		tiles.errorTarget = 8;
		tiles.registerPlugin(
			new GLTFExtensionsPlugin({
				dracoLoader,
				rtc: true
			})
		);
		tiles.group.name = 'swiss-buildings';
		scene.add(tiles.group);
		tiles.setCamera(tilesCamera);
		tiles.setResolutionFromRenderer(tilesCamera, renderer);

		let handled = false;
		const onLoadTileset = () => {
			if (handled || !tiles) return;
			handled = true;
			tiles.removeEventListener('load-tileset', onLoadTileset);

			const sphere = new THREE.Sphere();
			tiles.getBoundingSphere(sphere);
			const center = sphere.center.clone();
			const root = tiles.root as { transform?: number[] } | null;
			let m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
			if (root?.transform) m = root.transform;

			const { lng, lat, alt } = ecefToLngLatAlt(center.x, center.y, center.z);
			updateLocalTransform([lng, lat, alt]);

			const rotationMat3 = new THREE.Matrix3().set(
				m[0],
				m[1],
				m[2],
				m[8],
				m[9],
				m[10],
				-m[4],
				-m[5],
				-m[6]
			);
			const rotationMat4 = new THREE.Matrix4().setFromMatrix3(rotationMat3);
			const moveToOrigin = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
			const finalMatrix = new THREE.Matrix4().multiplyMatrices(rotationMat4, moveToOrigin);
			tiles.group.matrix.copy(finalMatrix);
			tiles.group.matrixAutoUpdate = false;
			tiles.group.updateMatrixWorld(true);
			map?.triggerRepaint();
		};
		tiles.addEventListener('load-tileset', onLoadTileset);
		updateLocalTransform();
	}

	const layer: CustomLayerInterface & { dispose?: () => void } = {
		id: SWISS_BUILDINGS_LAYER_ID,
		type: 'custom',
		renderingMode: '3d',

		onAdd(mapInstance, gl) {
			map = mapInstance;
			disposed = false;
			camera = new THREE.Camera();
			tilesCamera = new THREE.PerspectiveCamera();
			scene = new THREE.Scene();
			scene.add(new THREE.AmbientLight(0xffffff, 2.2));
			const sun = new THREE.DirectionalLight(0xfff2e0, 1.4);
			sun.position.set(40, 60, 20);
			scene.add(sun);

			// Defer Three setup until the shared GL context reports attributes —
			// MapLibre can call onAdd before getContextAttributes() is ready.
			ensureContextAttributes(gl);
			try {
				if (!gl.isContextLost?.() && gl.getContextAttributes()) {
					renderer = createSharedRenderer(gl, mapInstance.getCanvas());
					renderer.autoClear = false;
					initTiles();
				}
			} catch (error) {
				console.warn('swiss buildings renderer deferred', error);
				renderer = undefined;
			}
		},

		render(gl, args) {
			if (disposed || !camera || !scene || !tilesCamera || !map) return;

			if (!renderer) {
				ensureContextAttributes(gl);
				if (gl.isContextLost?.() || !gl.getContextAttributes()) {
					map.triggerRepaint();
					return;
				}
				try {
					renderer = createSharedRenderer(gl, map.getCanvas());
					renderer.autoClear = false;
					initTiles();
				} catch (error) {
					console.warn('swiss buildings renderer still unavailable', error);
					map.triggerRepaint();
					return;
				}
			}

			if (!renderer || !localTransform) return;

			const mainMatrix =
				args.defaultProjectionData?.mainMatrix ?? args.modelViewProjectionMatrix;
			if (!mainMatrix) return;

			camera.projectionMatrix.fromArray(mainMatrix as unknown as number[]);
			camera.projectionMatrix.multiply(localTransform);

			const P = new THREE.Matrix4().fromArray(mainMatrix as unknown as number[]);
			const invP = P.clone().invert();
			const V = new THREE.Matrix4().multiplyMatrices(invP, camera.projectionMatrix);
			tilesCamera.projectionMatrix.copy(P);
			tilesCamera.matrixWorldInverse.copy(V);
			tilesCamera.matrixWorld.copy(V).invert();
			tilesCamera.matrixAutoUpdate = false;

			tiles?.update();
			renderer.resetState();
			renderer.render(scene, camera);
			// Drop the depth buffer so later MapLibre symbols (traffic streaks, POIs)
			// are not occluded by building meshes at street level.
			gl.clear(gl.DEPTH_BUFFER_BIT);
			map.triggerRepaint();
		},

		onRemove() {
			disposed = true;
			tiles?.dispose();
			tiles = undefined;
			renderer?.dispose();
			renderer = undefined;
			scene = undefined;
			camera = undefined;
			tilesCamera = undefined;
			map = undefined;
		},

		dispose() {
			layer.onRemove?.({} as MapLibreMap, {} as WebGL2RenderingContext);
		}
	};

	return layer;
}
