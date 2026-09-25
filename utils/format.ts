// Small formatting helpers that used to be copy-pasted into several pages.

/** Today as YYYY-MM-DD in the browser's local timezone. */
export function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatRupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
}

/** "Sen / 2 Mar" for a YYYY-MM-DD date (WIB). */
export function formatChipDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00+07:00`);
    const day = date.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    return `${day.slice(0, 3)} / ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}`;
}

/** "budi santoso" → "Budi Santoso" (lowercases the rest of each word). */
export function toTitleCase(str: string) {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Canonical flavor name: "A Dengan B" → "Mix A Dan B", mixed flavors sorted. */
export function normalizeVariant(name: string) {
    if (!name) return name;
    let n = name.replace(/Dengan/g, 'Dan').trim();
    if (n.includes(' Dan ') && !n.startsWith('Mix ')) n = 'Mix ' + n;
    if (n.startsWith('Mix ')) {
        const parts = n.replace('Mix ', '').split(' Dan ').map(p => p.trim()).sort();
        return 'Mix ' + parts.join(' Dan ');
    }
    return n;
}
