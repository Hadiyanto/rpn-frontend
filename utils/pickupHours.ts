/** Latest pickup time for every store (the backend rejects later ones, see LAST_PICKUP_TIME in order.service.ts). */
export const LAST_PICKUP_TIME = '17:00';
const LAST_PICKUP_HOUR = Number(LAST_PICKUP_TIME.slice(0, 2));

/**
 * Pickup hours ("HH") to offer: the store's active hourly slots (configured in /config → Kuota).
 * A store without any slot has no hourly cap (the server then only checks the daily quota), so
 * every hour from opening time up to the last pickup hour is offered instead.
 */
export const pickupHourOptions = (slots: { time_str: string; is_active: boolean }[], openTime?: string | null): string[] => {
    if (slots.length > 0) {
        return [...new Set(slots.filter(h => h.is_active).map(h => String(h.time_str).slice(0, 2)))]
            .filter(h => Number(h) <= LAST_PICKUP_HOUR)
            .sort();
    }
    const open = Number((openTime ?? '00:00').slice(0, 2));
    return Array.from({ length: Math.max(LAST_PICKUP_HOUR - open + 1, 0) }, (_, i) => String(open + i).padStart(2, '0'));
};

/** False for minutes past the last pickup time (e.g. 17:05 when the last pickup is 17:00). */
export const isPickupMinuteAllowed = (hh: string, mm: string) => `${hh}:${mm}` <= LAST_PICKUP_TIME;

/** "HH:mm" for a newly picked hour, keeping the minutes unless that would pass the last pickup time. */
export const withPickupHour = (hh: string, currentTime: string) => {
    const mm = currentTime.split(':')[1] || '00';
    return isPickupMinuteAllowed(hh, mm) ? `${hh}:${mm}` : `${hh}:00`;
};
