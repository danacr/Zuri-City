import { trafficLevelColor } from './cameras';
import type { Camera, Flight, Quake, TrafficSegment } from './types';

export function flightsToGeoJSON(flights: Flight[]) {
	return {
		type: 'FeatureCollection' as const,
		features: flights.map((flight) => ({
			type: 'Feature' as const,
			id: flight.id,
			properties: {
				id: flight.id,
				kind: 'flight',
				callsign: flight.callsign,
				name: flight.callsign,
				label: flight.callsign,
				heading: flight.heading ?? 0,
				altitude: flight.altitudeFt,
				speed: flight.speedKts,
				onGround: flight.onGround
			},
			geometry: {
				type: 'Point' as const,
				coordinates: [flight.lon, flight.lat]
			}
		}))
	};
}

export function camerasToGeoJSON(cameras: Camera[]) {
	return {
		type: 'FeatureCollection' as const,
		features: cameras.map((camera) => ({
			type: 'Feature' as const,
			id: camera.id,
			properties: {
				id: camera.id,
				kind: 'camera',
				name: camera.name,
				bearing: camera.bearing,
				cameraKind: camera.kind,
				modeled: camera.modeled
			},
			geometry: {
				type: 'Point' as const,
				coordinates: [camera.lon, camera.lat]
			}
		}))
	};
}

export function trafficToGeoJSON(segments: TrafficSegment[]) {
	return {
		type: 'FeatureCollection' as const,
		features: segments.map((segment) => ({
			type: 'Feature' as const,
			id: segment.id,
			properties: {
				id: segment.id,
				kind: 'traffic',
				name: segment.name,
				level: segment.level,
				color: trafficLevelColor(segment.level),
				modeled: segment.modeled
			},
			geometry: {
				type: 'LineString' as const,
				coordinates: segment.coordinates
			}
		}))
	};
}

export function quakesToGeoJSON(quakes: Quake[]) {
	return {
		type: 'FeatureCollection' as const,
		features: quakes.map((quake) => ({
			type: 'Feature' as const,
			id: quake.id,
			properties: {
				id: quake.id,
				kind: 'quake',
				name: `M${quake.mag.toFixed(1)}`,
				place: quake.place,
				mag: quake.mag,
				radius: Math.max(8, quake.mag * 6)
			},
			geometry: {
				type: 'Point' as const,
				coordinates: [quake.lon, quake.lat]
			}
		}))
	};
}

/** Simple wedge polygon for a camera viewshed. */
export function cameraViewshedsGeoJSON(cameras: Camera[], rangeMeters = 180) {
	const features = cameras.map((camera) => {
		const coords: [number, number][] = [[camera.lon, camera.lat]];
		const start = camera.bearing - 28;
		for (let angle = start; angle <= camera.bearing + 28; angle += 7) {
			const rad = (angle * Math.PI) / 180;
			const dLat = (rangeMeters * Math.cos(rad)) / 111320;
			const dLon =
				(rangeMeters * Math.sin(rad)) / (111320 * Math.cos((camera.lat * Math.PI) / 180));
			coords.push([camera.lon + dLon, camera.lat + dLat]);
		}
		coords.push([camera.lon, camera.lat]);
		return {
			type: 'Feature' as const,
			id: `${camera.id}-viewshed`,
			properties: { id: camera.id, kind: 'viewshed' },
			geometry: { type: 'Polygon' as const, coordinates: [coords] }
		};
	});
	return { type: 'FeatureCollection' as const, features };
}
