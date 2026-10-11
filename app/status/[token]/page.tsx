'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { LuUpload, LuCheck, LuPackage, LuCreditCard, LuMapPin, LuClock } from 'react-icons/lu';
import { itemSubtotal, orderTotal } from '@/utils/pricing';
import { boxLabelID } from '@/utils/box';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { BRAND_NAME } from '@/utils/brand';

// Customer-facing order status (/status/<public_token>): where the customer lands after ordering,
// after paying on DOKU, and from the WhatsApp link. Payment section depends on the payment method:
// DOKU → pay now / paid / expired · TRANSFER → the store's account + proof upload · QRIS (manual) →
// the store's QRIS + proof upload · CASH → pay at pickup.

interface OrderItem {
    box_type: 'FULL' | 'HALF';
    name: string;
    qty: number;
    unit_price: number | null;
}

interface PublicOrder {
    id: number;
    customer_name: string;
    pickup_date: string;
    pickup_time: string | null;
    status: 'UNPAID' | 'PAID' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
    payment_method: 'TRANSFER' | 'QRIS' | 'CASH' | 'DOKU' | null;
    store_id: number | null;
    has_transfer_img: boolean;
    total_amount: number;
    delivery_fee: number | null;
    payment_url: string | null;
    items: OrderItem[];
}

interface Store {
    name: string;
    address: string | null;
    maps_url: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    qris_image_url: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
}

const isPublicToken = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const STATUS_LABEL: Record<PublicOrder['status'], { text: string; cls: string }> = {
    UNPAID: { text: 'Menunggu pembayaran', cls: 'bg-amber-100 text-amber-800' },
    PAID: { text: 'Pembayaran diterima', cls: 'bg-green-100 text-green-800' },
    CONFIRMED: { text: 'Sedang diproses', cls: 'bg-blue-100 text-blue-800' },
    DONE: { text: 'Selesai', cls: 'bg-primary text-brand-yellow' },
    CANCELLED: { text: 'Dibatalkan', cls: 'bg-red-100 text-red-700' },
};

const mapsLink = (s: Store) => s.maps_url
    || (s.latitude != null && s.longitude != null && s.latitude !== '' && s.longitude !== ''
        ? `https://www.google.com/maps/search/?api=1&query=${Number(s.latitude)},${Number(s.longitude)}`
        : null);

export default function OrderStatusPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!isPublicToken(token)) { setNotFound(true); setLoading(false); return; }
            try {
                let res = await fetchJson(`${API_URL}/api/order/public/${token}`);
                // Back from the DOKU checkout page: check the payment with DOKU in case its
                // notification hasn't been processed yet.
                if (res.data?.payment_method === 'DOKU' && res.data?.status === 'UNPAID') {
                    const synced = await fetchJson(`${API_URL}/api/order/public/${token}/doku-sync`, { method: 'POST' }).catch(() => null);
                    if (synced?.status === 'ok') res = synced;
                }
                if (cancelled) return;
                setOrder(res.data);
                if (res.data?.store_id) {
                    const storeRes = await fetchJson(`${API_URL}/api/stores/${res.data.store_id}`).catch(() => null);
                    if (!cancelled && storeRes?.status === 'ok') setStore(storeRes.data);
                }
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setErrorMsg('');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const uploadJson = await (await fetch(`${API_URL}/api/upload-image`, { method: 'POST', body: formData })).json();
            if (uploadJson.status !== 'ok') {
                setErrorMsg(uploadJson.message || 'Gagal mengunggah gambar. Silakan coba lagi.');
                return;
            }
            const updateJson = await (await fetch(`${API_URL}/api/order/public/${token}/transfer-img-url`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transfer_img_url: uploadJson.imageUrl }),
            })).json();
            if (updateJson.status === 'ok') setUploaded(true);
            else setErrorMsg('Gagal menyimpan bukti pembayaran ke pesanan.');
        } catch {
            setErrorMsg('Terjadi kesalahan jaringan.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-brand-white min-h-screen p-4 pt-12">
                <div className="max-w-md mx-auto animate-pulse space-y-3">
                    <div className="h-8 bg-white/70 rounded-xl w-2/3" />
                    <div className="h-40 bg-white/70 rounded-3xl" />
                    <div className="h-28 bg-white/70 rounded-3xl" />
                </div>
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="bg-brand-white font-display min-h-screen flex items-center justify-center p-4 text-primary">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl text-center space-y-4">
                    <h1 className="text-xl font-extrabold">Pesanan tidak ditemukan</h1>
                    <p className="text-sm text-primary/60">Periksa kembali link dari WhatsApp.</p>
                    <Link href="/pesan" className="block w-full h-12 leading-[3rem] bg-primary text-brand-yellow font-bold rounded-xl">Buat Pesanan</Link>
                </div>
            </div>
        );
    }

    const status = STATUS_LABEL[order.status] ?? STATUS_LABEL.UNPAID;
    const deliveryFee = Number(order.delivery_fee ?? 0);
    const total = orderTotal({ items: order.items ?? [] }) + deliveryFee;
    const unpaid = order.status === 'UNPAID';
    const needsProof = unpaid && (order.payment_method === 'TRANSFER' || order.payment_method === 'QRIS');
    const maps = store ? mapsLink(store) : null;

    return (
        <div className="bg-brand-white font-display min-h-screen text-primary pb-10">
            <header className="px-4 pt-8 pb-4 max-w-md mx-auto">
                <Link href="/" className="font-heading text-sm font-extrabold uppercase tracking-wider text-primary/60">{BRAND_NAME}</Link>
                <h1 className="text-2xl font-extrabold mt-2">Pesanan #{order.id}</h1>
                <p className="text-sm font-semibold text-primary/60">{order.customer_name}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wide ${status.cls}`}>{status.text}</span>
            </header>

            <main className="px-4 max-w-md mx-auto space-y-4">
                {/* Ringkasan */}
                <section className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                        <LuPackage className="text-primary/50" />
                        <h2 className="text-xs font-black uppercase tracking-wider">Detail Pesanan</h2>
                    </div>
                    {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between gap-3 text-sm">
                            <span className="font-semibold">{item.qty}x {boxLabelID(item.box_type)} <span className="text-primary/60">· {item.name}</span></span>
                            <span className="font-bold shrink-0">{rp(itemSubtotal(item))}</span>
                        </div>
                    ))}
                    {deliveryFee > 0 && (
                        <div className="flex justify-between text-sm"><span className="font-semibold">Ongkir</span><span className="font-bold">{rp(deliveryFee)}</span></div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                        <span className="text-xs font-black uppercase text-primary/60">Total</span>
                        <span className="text-lg font-black">{rp(total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-primary/60 pt-1">
                        <LuClock /> {new Date(order.pickup_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })}{order.pickup_time ? ` · ${order.pickup_time}` : ''}
                    </div>
                </section>

                {/* Pembayaran */}
                {order.status !== 'CANCELLED' && (
                    <section className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                            <LuCreditCard className="text-primary/50" />
                            <h2 className="text-xs font-black uppercase tracking-wider">Pembayaran</h2>
                        </div>

                        {!unpaid && (
                            <div className="flex items-center gap-3 text-green-700">
                                <LuCheck className="text-2xl shrink-0" />
                                <p className="text-sm font-bold">Pembayaran sudah kami terima. Terima kasih!</p>
                            </div>
                        )}

                        {unpaid && order.payment_method === 'DOKU' && (order.payment_url ? (
                            <>
                                <p className="text-sm text-primary/70">Selesaikan pembayaran QRIS. Status diperbarui otomatis setelah berhasil.</p>
                                <a href={order.payment_url} className="flex items-center justify-center gap-2 h-12 bg-primary text-brand-yellow font-extrabold text-sm rounded-2xl">
                                    <LuCreditCard /> Bayar Sekarang
                                </a>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-red-600">Batas waktu pembayaran sudah habis. Silakan hubungi kami via WhatsApp atau buat pesanan baru.</p>
                        ))}

                        {unpaid && order.payment_method === 'TRANSFER' && (
                            store?.bank_account_number ? (
                                <div className="rounded-2xl bg-brand-white p-4 text-center">
                                    <p className="text-xs font-semibold text-primary/60">Transfer ke {store.bank_name}</p>
                                    <p className="font-mono text-xl font-bold tracking-wider my-1">{store.bank_account_number}</p>
                                    <p className="text-xs font-semibold text-primary/60">a.n. {store.bank_account_name}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-primary/70">Nomor rekening akan dikirim admin via WhatsApp.</p>
                            )
                        )}

                        {unpaid && order.payment_method === 'QRIS' && (
                            store?.qris_image_url ? (
                                <div className="flex justify-center bg-brand-white p-3 rounded-2xl">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={store.qris_image_url} alt="QRIS pembayaran" width={200} height={200} className="rounded-lg" />
                                </div>
                            ) : (
                                <p className="text-sm text-primary/70">Kode QRIS akan dikirim admin via WhatsApp.</p>
                            )
                        )}

                        {unpaid && order.payment_method === 'CASH' && (
                            <p className="text-sm text-primary/70">Bayar tunai saat pengambilan di toko.</p>
                        )}

                        {needsProof && (
                            uploaded || order.has_transfer_img ? (
                                <div className="flex items-start gap-3 bg-green-50 text-green-800 rounded-2xl p-3">
                                    <LuCheck className="mt-0.5 shrink-0" />
                                    <p className="text-sm font-semibold">Bukti pembayaran sudah kami terima dan sedang divalidasi.
                                        <label className="block mt-1 text-xs underline cursor-pointer">
                                            Kirim ulang bukti
                                            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                                        </label>
                                    </p>
                                </div>
                            ) : (
                                <label className={`flex items-center justify-center gap-2 h-12 rounded-2xl font-extrabold text-sm cursor-pointer ${uploading ? 'bg-primary/10 pointer-events-none' : 'bg-primary text-brand-yellow'}`}>
                                    {uploading ? 'Mengunggah…' : <><LuUpload /> Upload Bukti Pembayaran</>}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                                </label>
                            )
                        )}
                        {errorMsg && <p className="text-sm font-bold text-red-600">{errorMsg}</p>}
                    </section>
                )}

                {/* Store */}
                {store && (
                    <section className="bg-white rounded-3xl p-5 shadow-sm space-y-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                            <LuMapPin className="text-primary/50" />
                            <h2 className="text-xs font-black uppercase tracking-wider">Store</h2>
                        </div>
                        <p className="font-heading font-extrabold">{store.name}</p>
                        {store.address && <p className="text-sm text-primary/70">{store.address}</p>}
                        {maps && (
                            <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold underline">
                                <LuMapPin /> Buka di Google Maps
                            </a>
                        )}
                    </section>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Link href="/" className="h-12 flex items-center justify-center rounded-2xl border-2 border-primary/15 font-bold text-sm">Beranda</Link>
                    <Link href="/pesan" className="h-12 flex items-center justify-center rounded-2xl bg-primary text-brand-yellow font-extrabold text-sm">Pesan Lagi</Link>
                </div>
            </main>
        </div>
    );
}
