import type { SelectOption } from '../components/Select';

/**
 * Timezones for the reminder picker.
 *
 * The picker used to offer eight raw IANA ids ("America/Los_Angeles") and
 * default to UTC. Defaulting to UTC is a real bug, not a cosmetic one: a daily
 * 8am reminder set by someone in India fired at 1:30pm their time. It now
 * starts on the zone the browser is actually in, and every zone reads as a
 * city with its current offset.
 *
 * The backend passes the id straight to croner, which accepts any IANA zone,
 * so the full list the browser knows is safe to offer.
 */

const FALLBACK = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin',
    'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney',
];

/** The zone this browser is in, or UTC if it will not say. */
export function browserTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

/**
 * The offset right now — which is the one that matters for a reminder set
 * today, and is why daylight-saving zones show their current value.
 */
function offsetOf(zone: string, at: Date): { text: string; minutes: number } {
    try {
        const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
            .formatToParts(at)
            .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
        const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
        if (!m) return { text: 'UTC±00:00', minutes: 0 };
        const sign = m[1] === '-' ? -1 : 1;
        const h = Number(m[2]);
        const min = Number(m[3] ?? 0);
        return {
            text: `UTC${m[1]}${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
            minutes: sign * (h * 60 + min),
        };
    } catch {
        return { text: '', minutes: 0 };
    }
}

/*
 * Chrome lists zones by their ICU canonical ids, several of which are names
 * the cities themselves retired years ago. Left alone, the picker labelled an
 * Indian user's own zone "Calcutta", and a search for "kolkata" found nothing.
 * The id stays as the value — it is valid, and it is what the browser reports
 * — but the label and the search use the name people actually use now.
 */
const RENAMED: Record<string, string> = {
    'Asia/Calcutta': 'Kolkata',
    'Asia/Katmandu': 'Kathmandu',
    'Asia/Saigon': 'Ho Chi Minh City',
    'Asia/Rangoon': 'Yangon',
    'Europe/Kiev': 'Kyiv',
    'America/Godthab': 'Nuuk',
    'Africa/Asmera': 'Asmara',
    'Atlantic/Faeroe': 'Faroe',
    'Pacific/Truk': 'Chuuk',
    'Pacific/Ponape': 'Pohnpei',
    'Pacific/Enderbury': 'Kanton',
    'America/Coral_Harbour': 'Atikokan',
};

/** "America/Argentina/Buenos_Aires" reads as "Buenos Aires". */
function cityOf(zone: string): string {
    if (zone === 'UTC') return 'UTC';
    return RENAMED[zone] ?? zone.split('/').pop()!.replace(/_/g, ' ');
}

function allZones(): string[] {
    try {
        const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
        if (list?.length) return list.includes('UTC') ? list : ['UTC', ...list];
    } catch { /* an older engine: the short list is still every zone that used to be offered */ }
    return FALLBACK;
}

/**
 * Every zone, the browser's own first, the rest in offset order so that
 * scrolling moves around the world rather than through the alphabet.
 * `current` is always included, even if the browser does not list it, so an
 * existing reminder never opens with its own zone missing.
 */
export function timeZoneOptions(current?: string): SelectOption<string>[] {
    const now = new Date();
    const mine = browserTimeZone();
    const zones = new Set(allZones());
    zones.add(mine);
    if (current) zones.add(current);

    const rows = [...zones].map((zone) => {
        const off = offsetOf(zone, now);
        return {
            zone,
            minutes: off.minutes,
            option: {
                value: zone,
                label: cityOf(zone),
                hint: zone === mine ? `${off.text} · yours` : off.text,
                // Searchable by the full id and region too, so "america",
                // "kolkata", "india time" (via Kolkata) and "+5:30" all land.
                // The retired name stays searchable alongside the current one.
                keywords: `${zone} ${zone.split('/')[0]} ${zone.split('/').pop()} ${off.text.replace('UTC', 'utc gmt')}`,
            } satisfies SelectOption<string>,
        };
    });

    rows.sort((a, b) =>
        (a.zone === mine ? -1 : b.zone === mine ? 1 : 0)
        || a.minutes - b.minutes
        || a.option.label.localeCompare(b.option.label));

    return rows.map((r) => r.option);
}
