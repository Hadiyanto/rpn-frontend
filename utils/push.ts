const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribePush(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
        // Minta izin notifikasi
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        // Ambil public key dari backend
        const res = await fetch(`${API_URL}/api/push/vapid-public-key`);
        const { key } = await res.json();
        if (!key) return false;

        // Register / retrieve service worker
        const registration = await navigator.serviceWorker.ready;

        // Subscribe ke push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
        });

        // Kirim subscription ke backend
        await fetch(`${API_URL}/api/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription.toJSON()),
        });

        return true;
    } catch (err) {
        console.error('[Push] Failed to subscribe:', err);
        return false;
    }
}

export async function unsubscribePush(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        await fetch(`${API_URL}/api/push/unsubscribe`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
    } catch (err) {
        console.error('[Push] Failed to unsubscribe:', err);
    }
}
