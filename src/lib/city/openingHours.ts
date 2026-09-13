/** Lightweight opening_hours evaluator for common OSM / curated strings (Europe/Zurich). */

const DAY_INDEX: Record<string, number> = {
	su: 0,
	mo: 1,
	tu: 2,
	we: 3,
	th: 4,
	fr: 5,
	sa: 6,
	ph: -1
};

function zurichParts(at: Date) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Europe/Zurich',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(at);
	const weekday = parts.find((p) => p.type === 'weekday')?.value?.slice(0, 2).toLowerCase() || 'mo';
	const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
	const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
	return { day: DAY_INDEX[weekday] ?? 1, minutes: hour * 60 + minute };
}

function parseDayToken(token: string): number | null {
	const key = token.trim().slice(0, 2).toLowerCase();
	return key in DAY_INDEX ? DAY_INDEX[key] : null;
}

function expandDays(spec: string): number[] {
	const cleaned = spec.replace(/\./g, '').trim();
	if (!cleaned) return [];
	if (/^(mo|tu|we|th|fr|sa|su)-(mo|tu|we|th|fr|sa|su)$/i.test(cleaned)) {
		const [a, b] = cleaned.split('-');
		const start = parseDayToken(a!);
		const end = parseDayToken(b!);
		if (start == null || end == null || start < 0 || end < 0) return [];
		const days: number[] = [];
		let cursor = start;
		for (let i = 0; i < 7; i++) {
			days.push(cursor);
			if (cursor === end) break;
			cursor = (cursor + 1) % 7;
		}
		return days;
	}
	const single = parseDayToken(cleaned);
	return single != null && single >= 0 ? [single] : [];
}

function parseTime(value: string): number | null {
	const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const h = Number(match[1]);
	const m = Number(match[2]);
	if (h > 24 || m > 59) return null;
	return Math.min(h * 60 + m, 24 * 60);
}

function intervalsForRule(rule: string): { days: number[]; open: number; close: number }[] {
	const trimmed = rule.trim();
	if (!trimmed || /^off$/i.test(trimmed) || /^closed$/i.test(trimmed)) return [];
	if (/^24\/7$/i.test(trimmed)) {
		return Array.from({ length: 7 }, (_, day) => ({ days: [day], open: 0, close: 24 * 60 }));
	}

	// "Open daily", "Always open", curated English hints
	if (/always open/i.test(trimmed)) {
		return Array.from({ length: 7 }, (_, day) => ({ days: [day], open: 0, close: 24 * 60 }));
	}
	if (/open daily/i.test(trimmed)) {
		return Array.from({ length: 7 }, (_, day) => ({ days: [day], open: 8 * 60, close: 22 * 60 }));
	}
	if (/open mon[–-]sat/i.test(trimmed)) {
		return [1, 2, 3, 4, 5, 6].map((day) => ({ days: [day], open: 9 * 60, close: 19 * 60 }));
	}
	if (/closed mondays?/i.test(trimmed)) {
		return [0, 2, 3, 4, 5, 6].map((day) => ({ days: [day], open: 10 * 60, close: 18 * 60 }));
	}

	const timeMatch = trimmed.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
	if (!timeMatch) return [];
	const open = parseTime(timeMatch[1]!);
	const close = parseTime(timeMatch[2]!);
	if (open == null || close == null) return [];

	const dayPart = trimmed.slice(0, timeMatch.index).trim();
	let days: number[] = [];
	if (!dayPart || /^days?/i.test(dayPart) || /daily|every day/i.test(dayPart)) {
		days = [0, 1, 2, 3, 4, 5, 6];
	} else {
		for (const chunk of dayPart.split(/[,\s]+/)) {
			days.push(...expandDays(chunk));
		}
		days = [...new Set(days)];
	}
	if (!days.length) days = [0, 1, 2, 3, 4, 5, 6];
	return [{ days, open, close }];
}

/**
 * Returns true/false when hours can be interpreted, otherwise null (unknown).
 * Handles common OSM rules like `Mo-Fr 09:00-18:00; Sa 10:00-16:00` and curated English.
 */
export function evaluateOpenNow(
	openingHours: string | null | undefined,
	at: Date = new Date()
): boolean | null {
	if (!openingHours) return null;
	const raw = openingHours.trim();
	if (!raw) return null;
	if (/^24\/7$/i.test(raw)) return true;
	if (/hours vary|check before|box office|seasonal|reserve/i.test(raw) && !/\d{1,2}:\d{2}/.test(raw)) {
		return null;
	}

	const { day, minutes } = zurichParts(at);
	const rules = raw
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean);

	let matched = false;
	for (const rule of rules) {
		if (/^(Mo|Tu|We|Th|Fr|Sa|Su)/i.test(rule) && /\boff\b/i.test(rule)) {
			const days = expandDays(rule.split(/\s+/)[0] || '');
			if (days.includes(day)) return false;
			continue;
		}
		for (const interval of intervalsForRule(rule)) {
			if (!interval.days.includes(day)) continue;
			matched = true;
			const { open, close } = interval;
			if (close > open) {
				if (minutes >= open && minutes < close) return true;
			} else {
				// Overnight range e.g. 22:00-03:00
				if (minutes >= open || minutes < close) return true;
			}
		}
	}
	if (!matched) return null;
	return false;
}

export function openBadge(isOpen: boolean | null): string {
	if (isOpen === true) return 'Open now';
	if (isOpen === false) return 'Closed now';
	return 'Hours unknown';
}
