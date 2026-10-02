/** Used when a store has no last pickup time set (the database default is the same). */
export const DEFAULT_LAST_PICKUP_TIME = '17:00';

type StoreHours = { open_time?: string | null; last_pickup_time?: string | null } | null | undefined;

const lastPickupOf = (store: StoreHours) => store?.last_pickup_time || DEFAULT_LAST_PICKUP_TIME;

/**
 * Pickup hours ("HH") to offer, never past the store's last pickup time: the store's active hourly
 * slots (configured in /config → Kuota). A store without any slot has no hourly cap (the server
 * then only checks the daily quota), so every hour from opening time up to the last pickup hour
 * is offered instead.
 */
export const pickupHourOptions = (slots: { time_str: string; is_active: boolean }[], store: StoreHours): string[] => {
    const lastHour = Number(lastPickupOf(store).slice(0, 2));
    if (slots.length > 0) {
        return [...new Set(slots.filter(h => h.is_active).map(h => String(h.time_str).slice(0, 2)))]
            .filter(h => Number(h) <= lastHour)
            .sort();
    }
    const open = Number((store?.open_time ?? '00:00').slice(0, 2));
    return Array.from({ length: Math.max(lastHour - open + 1, 0) }, (_, i) => String(open + i).padStart(2, '0'));
};

/** False for minutes past the store's last pickup time (e.g. 17:05 when the last pickup is 17:00). */
export const isPickupMinuteAllowed = (hh: string, mm: string, store: StoreHours) => `${hh}:${mm}` <= lastPickupOf(store);

/** "HH:mm" for a newly picked hour, keeping the minutes unless that would pass the last pickup time. */
export const withPickupHour = (hh: string, currentTime: string, store: StoreHours) => {
    const mm = currentTime.split(':')[1] || '00';
    return isPickupMinuteAllowed(hh, mm, store) ? `${hh}:${mm}` : `${hh}:00`;
};
