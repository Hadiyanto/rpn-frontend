export async function fetchJson(input: string, init?: RequestInit) {
    const res = await fetch(input, init);
    if (!res.ok) {
        let message = `Request failed (${res.status}): ${input}`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch { /* response body wasn't JSON */ }
        throw new Error(message);
    }
    return res.json();
}
