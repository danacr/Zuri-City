declare module '@here/quantized-mesh-decoder' {
	type DecodedQuantizedMesh = {
		header: { minHeight: number; maxHeight: number };
		vertexData: Uint16Array;
		triangleIndices: Uint16Array | Uint32Array;
	};

	type DecoderModule = {
		(buffer: ArrayBuffer): DecodedQuantizedMesh;
		default: (buffer: ArrayBuffer) => DecodedQuantizedMesh;
		DECODING_STEPS: Record<string, number>;
	};

	const decode: DecoderModule;
	export default decode;
}

declare module 'maplibre-gl-3dtiles-terrain' {
	export type QuantizedMeshBounds = {
		west: number;
		south: number;
		east: number;
		north: number;
	};

	export type QuantizedMeshDataset = {
		available: unknown[];
		bounds: QuantizedMeshBounds;
		minZoom: number;
		maxZoom: number;
		fadeDistanceDeg: number;
		attribution?: string;
		tileUrl: (z: number, x: number, y: number) => string;
	};

	export function loadQuantizedMeshDataset(
		layerJsonUrl: string,
		options?: {
			boundsOverride?: QuantizedMeshBounds;
			maxZoom?: number;
			attribution?: string;
		}
	): Promise<QuantizedMeshDataset>;

	export function registerQuantizedMeshTerrain(
		maplibregl: {
			addProtocol: (protocol: string, loadFn: never) => void;
			removeProtocol: (protocol: string) => void;
		},
		options: {
			dataset: QuantizedMeshDataset;
			decode: (buffer: ArrayBuffer) => unknown;
			protocol?: string;
			tileSize?: number;
			fallbackHeight?: number;
		}
	): {
		protocol: string;
		sourceSpec: Record<string, unknown>;
		unregister: () => void;
	};
}
