// <input type="datetime-local"> works in the browser's local time without a zone.

/** "YYYY-MM-DDTHH:mm" for a datetime-local input, in the browser's local time. */
export const toDateTimeLocal = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};

/** datetime-local value → absolute ISO time for the API; empty → undefined (the server uses now). */
export const dateTimeLocalToISO = (value: string) => (value ? new Date(value).toISOString() : undefined);
