import type { Entity, ScreenSpaceEventHandler, Viewer } from 'cesium';
import { CATEGORY_COLOR, type Place, type PlaceCategory } from '$lib/places';
import { parkingMapLabel, parkingTone, type Parking } from '$lib/parking';
import type { Camera, Flight, Quake } from '$lib/intel/types';
import { TRAFFIC_LEVEL_COLOR, ZURICH_ARTERIES } from '../zurichArteries';

export type OverlayKind = 'place' | 'parking' | 'flight' | 'camera' | 'quake';

type EntityBag = { kind: OverlayKind; id: string };

const PLACE_CAP = 320;

function color(Cesium: typeof import('cesium'), hex: string, alpha = 1) {
	const base = Cesium.Color.fromCssColorString(hex);
	return alpha < 1 ? base.withAlpha(alpha) : base;
}

function clearPrefix(viewer: Viewer, prefix: string) {
	const doomed: Entity[] = [];
	for (const entity of viewer.entities.values) {
		if (entity.id?.startsWith(prefix)) doomed.push(entity);
	}
	for (const entity of doomed) viewer.entities.remove(entity);
}

export function syncPlaceEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	places: Place[]
) {
	clearPrefix(viewer, 'place:');
	for (const place of places.slice(0, PLACE_CAP)) {
		const hex = CATEGORY_COLOR[place.category as PlaceCategory] ?? '#868e96';
		const alpha = place.isOpen === false ? 0.45 : 1;
		viewer.entities.add({
			id: `place:${place.id}`,
			position: Cesium.Cartesian3.fromDegrees(place.lon, place.lat, 8),
			point: {
				pixelSize: 12,
				color: color(Cesium, hex, alpha),
				outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
				outlineWidth: 2,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				text: place.name,
				font: '600 11px "Avenir Next", "Segoe UI", sans-serif',
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.fromCssColorString('#0b1724'),
				outlineWidth: 3,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				pixelOffset: new Cesium.Cartesian2(0, -14),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY,
				scaleByDistance: new Cesium.NearFarScalar(200, 1.05, 12000, 0.55)
			},
			properties: { kind: 'place', id: place.id } satisfies EntityBag
		});
	}
	viewer.scene.requestRender();
}

export function syncParkingEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	parkings: Parking[],
	visible: boolean
) {
	clearPrefix(viewer, 'parking:');
	if (!visible) {
		viewer.scene.requestRender();
		return;
	}
	for (const parking of parkings) {
		if (!parking.coordinates) continue;
		const [lat, lon] = parking.coordinates;
		const tone = parkingTone(parking);
		const hex = tone === 'green' ? '#1b6b2e' : tone === 'red' ? '#a61e1e' : '#1c4d7a';
		viewer.entities.add({
			id: `parking:${parking.id || parking.name}`,
			position: Cesium.Cartesian3.fromDegrees(lon, lat, 6),
			point: {
				pixelSize: 10,
				color: color(Cesium, hex),
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 2,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				text: parkingMapLabel(parking),
				font: '700 11px "Avenir Next", "Segoe UI", sans-serif',
				fillColor: color(Cesium, hex),
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 3,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				pixelOffset: new Cesium.Cartesian2(0, -12),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			properties: {
				kind: 'parking',
				id: parking.id || parking.name
			} satisfies EntityBag
		});
	}
	viewer.scene.requestRender();
}

export function syncFlightEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	flights: Flight[],
	visible: boolean
) {
	clearPrefix(viewer, 'flight:');
	if (!visible) {
		viewer.scene.requestRender();
		return;
	}
	for (const flight of flights) {
		const alt = Math.max(80, (flight.altitudeFt ?? 3000) * 0.3048);
		viewer.entities.add({
			id: `flight:${flight.id}`,
			position: Cesium.Cartesian3.fromDegrees(flight.lon, flight.lat, alt),
			point: {
				pixelSize: 11,
				color: color(Cesium, '#f0b429'),
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 1,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				text: flight.callsign || 'ACFT',
				font: '600 10px "Avenir Next", "Segoe UI", sans-serif',
				fillColor: Cesium.Color.fromCssColorString('#f0b429'),
				outlineColor: Cesium.Color.fromCssColorString('#1a1200'),
				outlineWidth: 3,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				pixelOffset: new Cesium.Cartesian2(0, -12),
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			properties: { kind: 'flight', id: flight.id } satisfies EntityBag
		});
	}
	viewer.scene.requestRender();
}

export function syncCameraEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	cameras: Camera[],
	visible: boolean,
	showCones: boolean
) {
	clearPrefix(viewer, 'camera:');
	clearPrefix(viewer, 'viewshed:');
	if (!visible) {
		viewer.scene.requestRender();
		return;
	}
	for (const camera of cameras) {
		viewer.entities.add({
			id: `camera:${camera.id}`,
			position: Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 10),
			point: {
				pixelSize: 9,
				color: color(Cesium, '#7c5cff'),
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 2,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			properties: { kind: 'camera', id: camera.id } satisfies EntityBag
		});
		if (!showCones) continue;
		const positions = [Cesium.Cartesian3.fromDegrees(camera.lon, camera.lat, 2)];
		const range = 160;
		for (let a = camera.bearing - 28; a <= camera.bearing + 28; a += 7) {
			const rad = (a * Math.PI) / 180;
			const dLat = (range * Math.cos(rad)) / 111320;
			const dLon =
				(range * Math.sin(rad)) / (111320 * Math.cos((camera.lat * Math.PI) / 180));
			positions.push(Cesium.Cartesian3.fromDegrees(camera.lon + dLon, camera.lat + dLat, 2));
		}
		viewer.entities.add({
			id: `viewshed:${camera.id}`,
			polygon: {
				hierarchy: positions,
				material: color(Cesium, '#3dd68c', 0.18),
				outline: false,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			}
		});
	}
	viewer.scene.requestRender();
}

export function syncQuakeEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	quakes: Quake[],
	visible: boolean
) {
	clearPrefix(viewer, 'quake:');
	if (!visible) {
		viewer.scene.requestRender();
		return;
	}
	for (const quake of quakes) {
		viewer.entities.add({
			id: `quake:${quake.id}`,
			position: Cesium.Cartesian3.fromDegrees(quake.lon, quake.lat, 4),
			ellipse: {
				semiMajorAxis: Math.max(80, quake.mag * 120),
				semiMinorAxis: Math.max(80, quake.mag * 120),
				material: color(Cesium, '#e64980', 0.25),
				outline: true,
				outlineColor: color(Cesium, '#e64980', 0.8),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
			},
			label: {
				text: `M${quake.mag.toFixed(1)}`,
				font: '700 11px sans-serif',
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.fromCssColorString('#4a1028'),
				outlineWidth: 3,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			properties: { kind: 'quake', id: quake.id } satisfies EntityBag
		});
	}
	viewer.scene.requestRender();
}

export function syncTrafficEntities(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	visible: boolean
) {
	clearPrefix(viewer, 'traffic:');
	if (!visible) {
		viewer.scene.requestRender();
		return;
	}
	for (const artery of ZURICH_ARTERIES) {
		viewer.entities.add({
			id: `traffic:${artery.id}`,
			polyline: {
				positions: artery.coordinates.map(([lon, lat]) =>
					Cesium.Cartesian3.fromDegrees(lon, lat, 3)
				),
				width: 4,
				material: color(Cesium, TRAFFIC_LEVEL_COLOR[artery.level], 0.92),
				clampToGround: true
			}
		});
	}
	viewer.scene.requestRender();
}

export function syncUserEntity(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	position: [number, number] | null
) {
	clearPrefix(viewer, 'user:');
	if (!position) {
		viewer.scene.requestRender();
		return;
	}
	const [lat, lon] = position;
	viewer.entities.add({
		id: 'user:self',
		position: Cesium.Cartesian3.fromDegrees(lon, lat, 4),
		point: {
			pixelSize: 14,
			color: color(Cesium, '#1260ce'),
			outlineColor: Cesium.Color.WHITE,
			outlineWidth: 3,
			heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
			disableDepthTestDistance: Number.POSITIVE_INFINITY
		}
	});
	viewer.scene.requestRender();
}

export function attachEntityClick(
	viewer: Viewer,
	Cesium: typeof import('cesium'),
	onSelect: (payload: EntityBag) => void
): ScreenSpaceEventHandler {
	const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction((movement: { position: import('cesium').Cartesian2 }) => {
		const picked = viewer.scene.pick(movement.position);
		const entity = picked?.id as Entity | undefined;
		const props = entity?.properties;
		if (!props) return;
		const kind = props.kind?.getValue?.() ?? props.kind;
		const id = props.id?.getValue?.() ?? props.id;
		if (kind && id) onSelect({ kind: kind as OverlayKind, id: String(id) });
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	return handler;
}
