'use client';

import { useState, useEffect, use } from 'react';
import { LuUpload, LuCheck, LuArrowLeft, LuPackage, LuReceipt } from 'react-icons/lu';
import { useRouter } from 'next/navigation';

interface OrderItem {
    id: number;
    box_type: 'FULL' | 'HALF';
    name: string;
    qty: number;
}

interface Order {
    id: number;
    customer_name: string;
    customer_phone: string;
    pickup_date: string;
    items: OrderItem[];
}

export default function BuktiTransferPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [order, setOrder] = useState<Order | null>(null);
    const [menus, setMenus] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const [orderRes, menuRes] = await Promise.all([
                    fetch(`${apiUrl}/api/order/${id}`).then(r => r.json()),
                    fetch(`${apiUrl}/api/menu`).then(r => r.json())
                ]);

                if (orderRes.status === 'ok') setOrder(orderRes.data);
                if (menuRes.status === 'ok') setMenus(menuRes.data);
            } catch (err) {
                console.error('Gagal memuat data order', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErrorMsg('');
        try {
            const formData = new FormData();
            formData.append('image', file);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // 1. Upload to Cloudinary via backend
            const uploadRes = await fetch(`${apiUrl}/api/upload-image`, {
                method: 'POST',
                body: formData,
            });
            const uploadJson = await uploadRes.json();

            if (uploadJson.status !== 'ok') {
                setErrorMsg('Gagal mengunggah gambar. Silakan coba lagi.');
                setUploading(false);
                return;
            }

            // 2. Patch Order with the new image URL
            const updateRes = await fetch(`${apiUrl}/api/order/${id}/transfer-img-url`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transfer_img_url: uploadJson.imageUrl }),
            });

            const updateJson = await updateRes.json();
            if (updateJson.status === 'ok') {
                setSuccess(true);
            } else {
                setErrorMsg('Gagal menyimpan bukti transfer ke pesanan.');
            }
        } catch (err) {
            setErrorMsg('Terjadi kesalahan jaringan.');
        } finally {
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-brand-yellow font-display min-h-screen flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500">
                        <LuCheck className="text-4xl" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-primary">Berhasil!</h2>
                    <p className="text-primary/70 text-sm font-medium">
                        Bukti transfer untuk Order #{id} telah tersimpan. Terima kasih!
                    </p>
                    <button
                        onClick={() => router.push('/pesan')}
                        className="w-full mt-4 h-12 bg-primary text-brand-yellow font-bold rounded-xl active:scale-95 transition-transform"
                    >
                        Buat Pesanan Baru
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-yellow font-display min-h-screen flex flex-col items-center p-4 pt-12 sm:pt-20 text-primary">
            <div className="w-full max-w-md">
                {/* Title */}
                <div className="flex flex-col mb-4">
                    <h1 className="text-xl font-extrabold">Upload Bukti</h1>
                    <p className="text-sm font-semibold text-primary/60">Order ID: #{id}</p>
                    {order && <p className="text-sm font-bold text-primary mt-1">{order.customer_name}</p>}
                </div>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-6 space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            </div>
                        ) : order ? (
                            <div className="space-y-3 bg-primary/5 p-4 rounded-2xl mb-4">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-primary/10">
                                    <LuPackage className="text-primary/60" />
                                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary">Detail Pesanan</h3>
                                </div>
                                <div className="space-y-2">
                                    {order.items?.map((item, idx) => {
                                        const menu = menus.find(m => m.name === item.box_type);
                                        const price = menu ? menu.price * item.qty : 0;
                                        return (
                                            <div key={idx} className="flex justify-between items-start">
                                                <div className="w-3/4">
                                                    <p className="text-sm font-bold truncate pr-3">{item.qty}x {item.box_type === 'FULL' ? 'Full Box' : 'Half Box'} (<span className="text-primary/70">{item.name}</span>)</p>
                                                </div>
                                                <p className="text-sm font-black text-right shrink-0">Rp {price.toLocaleString('id-ID')}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-primary/10">
                                    <span className="text-xs font-black uppercase text-primary/70">Total Pembayaran</span>
                                    <span className="text-lg font-black text-brand-maroon">
                                        Rp {order.items?.reduce((sum, item) => {
                                            const menu = menus.find(m => m.name === item.box_type);
                                            return sum + (menu ? menu.price * item.qty : 0);
                                        }, 0).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">Data pesanan tidak ditemukan.</div>
                        )}

                        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-4 text-center space-y-2">
                            <h3 className="text-xs font-bold text-blue-900">Rekening BCA</h3>
                            <p className="font-black text-xl text-blue-600 tracking-wider">1280119748</p>
                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">A/N Anggita Prima</p>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl border border-red-100 text-center">
                                {errorMsg}
                            </div>
                        )}

                        <div className="pt-4">
                            <label className={`relative overflow-hidden w-full h-14 flex items-center justify-center gap-2 rounded-2xl shadow-lg border-2 border-transparent transition-all cursor-pointer font-extrabold text-sm ${uploading ? 'bg-primary/10 text-primary border-primary/20 pointer-events-none' : 'bg-primary text-brand-yellow hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'}`}>
                                {uploading ? (
                                    <>Sedang Mengunggah...</>
                                ) : (
                                    <>
                                        <LuUpload className="text-lg" />
                                        Pilih Screenshot Transfer
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                            </label>
                            <p className="text-[10px] text-center font-bold text-primary/40 mt-3 uppercase tracking-wider">Maksimal ukuran file 5MB</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
