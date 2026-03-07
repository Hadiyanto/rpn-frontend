'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';
import { LuMenu, LuTruck, LuMapPin, LuSearch, LuPackage, LuCheck, LuX, LuRefreshCw, LuClipboardList } from 'react-icons/lu';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ORIGIN_AREA_ID = 'IDNP11KOTA3676KEC367601'; // Rawajati, Pancoran — update this after doing area search

// Default package for 1 box besar
const DEFAULT_ITEMS = [
    { name: 'Pisang Nugget Box Besar', description: 'Box snack', value: 50000, length: 30, width: 30, height: 10, weight: 500, quantity: 1 },
];

type Step = 'map' | 'area' | 'rates' | 'form' | 'done';

interface Rate {
    courier_name: string;
    courier_code: string;
    courier_service_name: string;
    courier_service_code: string;
    type: string;
    price: number;
    min_day: number;
    max_day: number;
}

interface OrderResult {
    id: string;
    status: string;
    waybill_id?: string;
    courier?: { tracking_id?: string; company: string; name: string };
}

export default function ShippingPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole();
    const [step, setStep] = useState<Step>('map');

    // Map state
    const [destLat, setDestLat] = useState<number | null>(null);
    const [destLng, setDestLng] = useState<number | null>(null);
    const [geoAddress, setGeoAddress] = useState('');

    // Area search
    const [areaQuery, setAreaQuery] = useState('');
    const [areaResults, setAreaResults] = useState<any[]>([]);
    const [selectedArea, setSelectedArea] = useState<any>(null);
    const [areaLoading, setAreaLoading] = useState(false);
    const areaDebounce = useRef<any>(null);

    // Items
    const [qty, setQty] = useState(1);
    const [boxType, setBoxType] = useState<'FULL' | 'HALF'>('FULL');
    const [selectedDeliveryType, setSelectedDeliveryType] = useState<'instant' | 'same_day'>('instant');

    // Rates
    const [rates, setRates] = useState<Rate[]>([]);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [selectedRate, setSelectedRate] = useState<Rate | null>(null);

    // Recipient form
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Order result
    const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
    const [trackingData, setTrackingData] = useState<any>(null);
    const [tracking, setTracking] = useState(false);

    // Reverse geocode when pin is dropped
    const onMapClick = useCallback(async (lat: number, lng: number) => {
        setDestLat(lat);
        setDestLng(lng);
        setSelectedArea(null);
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`);
            const json = await r.json();
            const addr = json.display_name || '';
            setGeoAddress(addr);
            // Pre-fill search from detected neighborhood/district
            const suburb = json.address?.suburb || json.address?.village || json.address?.city_district || '';
            if (suburb) setAreaQuery(suburb);
        } catch {
            setGeoAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    }, []);

    // Debounced area search
    useEffect(() => {
        if (!areaQuery || areaQuery.length < 3) { setAreaResults([]); return; }
        clearTimeout(areaDebounce.current);
        areaDebounce.current = setTimeout(async () => {
            setAreaLoading(true);
            try {
                const r = await fetch(`${API_URL}/api/biteship/areas?search=${encodeURIComponent(areaQuery)}`);
                const json = await r.json();
                setAreaResults(json.data || []);
            } catch { setAreaResults([]); }
            finally { setAreaLoading(false); }
        }, 500);
    }, [areaQuery]);

    const getItems = () => {
        const base = boxType === 'FULL'
            ? { name: 'Pisang Nugget Box Besar', value: 50000, length: 30, width: 30, height: 10, weight: 500 }
            : { name: 'Pisang Nugget Box Kecil', value: 30000, length: 20, width: 20, height: 8, weight: 300 };
        return [{ ...base, description: 'Snack box', quantity: qty }];
    };

    const fetchRates = async () => {
        if (!selectedArea) return;
        setRatesLoading(true);
        setRates([]);
        try {
            const r = await fetch(`${API_URL}/api/biteship/rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_area_id: ORIGIN_AREA_ID,
                    destination_area_id: selectedArea.id,
                    couriers: 'gosend,grab,gojek,lalamove,borzo,paxel,jne,sicepat,jnt,anteraja',
                    items: getItems(),
                }),
            });
            const json = await r.json();
            if (json.status === 'ok') {
                setRates((json.data || []).sort((a: Rate, b: Rate) => a.price - b.price));
                setStep('rates');
            } else {
                alert(json.message || 'Gagal mengambil tarif');
            }
        } catch { alert('Gagal mengambil tarif'); }
        finally { setRatesLoading(false); }
    };

    const submitOrder = async () => {
        if (!selectedArea || !selectedRate || !recipientName || !recipientPhone || !recipientAddress) {
            alert('Lengkapi semua field penerima');
            return;
        }
        setSubmitting(true);
        try {
            const r = await fetch(`${API_URL}/api/biteship/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_contact_name: 'Raja Pisang Nugget',
                    origin_contact_phone: '08561234567',
                    origin_address: 'Jl. Rawajati Timur VIII, Rawajati, Pancoran, Jakarta Selatan 12750',
                    origin_area_id: ORIGIN_AREA_ID,
                    destination_contact_name: recipientName,
                    destination_contact_phone: recipientPhone,
                    destination_address: recipientAddress,
                    destination_area_id: selectedArea.id,
                    courier_company: selectedRate.courier_code,
                    courier_type: selectedRate.courier_service_code,
                    items: getItems(),
                    notes: notes || undefined,
                }),
            });
            const json = await r.json();
            if (json.status === 'ok') {
                setOrderResult(json.data);
                setStep('done');
            } else {
                alert(json.message || 'Gagal membuat pesanan');
            }
        } catch { alert('Gagal membuat pesanan'); }
        finally { setSubmitting(false); }
    };

    const trackOrder = async () => {
        if (!orderResult?.id) return;
        setTracking(true);
        try {
            const r = await fetch(`${API_URL}/api/biteship/order/${orderResult.id}`);
            const json = await r.json();
            if (json.status === 'ok') setTrackingData(json.data);
        } catch { }
        finally { setTracking(false); }
    };

    const reset = () => {
        setStep('map');
        setDestLat(null); setDestLng(null); setGeoAddress('');
        setAreaQuery(''); setAreaResults([]); setSelectedArea(null);
        setQty(1); setBoxType('FULL');
        setRates([]); setSelectedRate(null);
        setRecipientName(''); setRecipientPhone(''); setRecipientAddress(''); setNotes('');
        setOrderResult(null); setTrackingData(null);
    };

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} allowedPages={userRoleData.allowedPages} userEmail={userRoleData.email} userRole={userRoleData.role} />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-brand-yellow/95 backdrop-blur-md border-b border-primary/10 px-5 py-4 flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center border border-primary/10 shadow-sm">
                    <LuMenu className="text-primary text-lg" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-extrabold text-primary flex items-center gap-2"><LuTruck /> Pengiriman</h1>
                    <p className="text-[11px] font-bold text-primary/50">Jasa kirim via Biteship</p>
                </div>
                {step !== 'map' && (
                    <button onClick={reset} className="text-xs font-bold text-primary/50 hover:text-primary flex items-center gap-1">
                        <LuX size={14} /> Reset
                    </button>
                )}
            </header>

            {/* Step Indicator */}
            <div className="flex items-center gap-1 px-5 py-3 overflow-x-auto">
                {(['map', 'area', 'rates', 'form', 'done'] as Step[]).map((s, i) => {
                    const labels: Record<Step, string> = { map: '1. Pin', area: '2. Area', rates: '3. Tarif', form: '4. Penerima', done: '5. Selesai' };
                    const past = ['map', 'area', 'rates', 'form', 'done'].indexOf(step) >= i;
                    return (
                        <div key={s} className="flex items-center gap-1">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap transition-all ${past ? 'bg-primary text-brand-yellow' : 'bg-white/60 text-primary/40'}`}>
                                {labels[s]}
                            </span>
                            {i < 4 && <span className="text-primary/20 text-xs">›</span>}
                        </div>
                    );
                })}
            </div>

            <main className="flex-1 px-4 pb-24 space-y-4">

                {/* ── STEP: MAP ── */}
                {(step === 'map' || step === 'area') && (
                    <>
                        <div className="rounded-2xl overflow-hidden border border-primary/10 shadow-md" style={{ height: 300 }}>
                            <LeafletMap destLat={destLat} destLng={destLng} onMapClick={onMapClick} />
                        </div>

                        {destLat && (
                            <div className="bg-white rounded-2xl p-3 shadow-sm border border-primary/10 flex items-start gap-2">
                                <LuMapPin className="text-red-500 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-primary/40 uppercase mb-0.5">Pin Destinasi</p>
                                    <p className="text-xs font-medium text-primary truncate">{geoAddress || `${destLat?.toFixed(5)}, ${destLng?.toFixed(5)}`}</p>
                                </div>
                            </div>
                        )}

                        {destLat && (
                            <>
                                {/* Area search */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/10 space-y-3">
                                    <p className="text-xs font-black text-primary uppercase">Cari Area Pengiriman</p>
                                    <div className="relative">
                                        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" size={14} />
                                        <input
                                            value={areaQuery}
                                            onChange={e => setAreaQuery(e.target.value)}
                                            placeholder="Contoh: Pancoran, Jakarta Selatan"
                                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                        />
                                        {areaLoading && <LuRefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary/40" />}
                                    </div>
                                    {areaResults.length > 0 && !selectedArea && (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {areaResults.map((area: any) => (
                                                <button key={area.id} onClick={() => { setSelectedArea(area); setAreaQuery(area.name); setAreaResults([]); setStep('area'); }}
                                                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-primary/5 text-xs font-medium text-primary transition-colors border border-transparent hover:border-primary/10">
                                                    <span className="font-bold">{area.name}</span>
                                                    {area.administrative_division_level_1_name && <span className="text-primary/40 ml-1">· {area.administrative_division_level_1_name}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {selectedArea && (
                                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                            <div>
                                                <p className="text-xs font-bold text-green-700">{selectedArea.name}</p>
                                                <p className="text-[10px] text-green-500">{selectedArea.administrative_division_level_1_name}</p>
                                            </div>
                                            <button onClick={() => { setSelectedArea(null); setAreaQuery(''); }} className="text-green-400 hover:text-red-500 transition-colors">
                                                <LuX size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Package config */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/10 space-y-3">
                                    <p className="text-xs font-black text-primary uppercase">Paket</p>
                                    <div className="flex gap-2">
                                        {(['FULL', 'HALF'] as const).map(type => (
                                            <button key={type} onClick={() => setBoxType(type)}
                                                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${boxType === type ? 'bg-primary text-brand-yellow border-primary' : 'bg-white text-primary/50 border-gray-100'}`}>
                                                {type === 'FULL' ? 'Box Besar' : 'Box Kecil'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs font-bold text-primary/60 flex-1">Jumlah</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-lg">−</button>
                                            <span className="w-8 text-center font-black text-primary">{qty}</span>
                                            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full bg-primary text-brand-yellow font-black flex items-center justify-center text-lg">+</button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={fetchRates}
                                    disabled={!selectedArea || ratesLoading}
                                    className="w-full h-12 bg-primary text-brand-yellow font-extrabold rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {ratesLoading ? <LuRefreshCw size={16} className="animate-spin" /> : <LuTruck size={16} />}
                                    {ratesLoading ? 'Mengambil Tarif...' : 'Cek Tarif Pengiriman'}
                                </button>
                            </>
                        )}

                        {!destLat && (
                            <div className="text-center py-6 bg-white/60 rounded-2xl border border-dashed border-primary/20">
                                <LuMapPin className="mx-auto text-3xl text-primary/30 mb-2" />
                                <p className="text-sm font-bold text-primary/50">Tap peta untuk menentukan lokasi tujuan</p>
                                <p className="text-xs text-primary/30 mt-1">Pin hijau = RPN Store (asal)</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── STEP: RATES ── */}
                {step === 'rates' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-primary">Pilih Layanan</p>
                            <button onClick={() => setStep('area')} className="text-xs font-bold text-primary/50 hover:text-primary">← Kembali</button>
                        </div>

                        {/* Delivery Type Radio Toggle */}
                        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-primary/10 shadow-sm">
                            {(['instant', 'same_day'] as const).map(type => (
                                <button key={type} onClick={() => { setSelectedDeliveryType(type); setSelectedRate(null); }}
                                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-black transition-all ${selectedDeliveryType === type ? 'bg-primary text-brand-yellow shadow-md' : 'text-primary/50 hover:bg-primary/5'}`}>
                                    {type === 'instant' ? 'Instant (±3 Jam)' : 'Same Day (±8 Jam)'}
                                </button>
                            ))}
                        </div>

                        {rates.filter(r => {
                            // Biteship uses various codes for same_day (e.g. sameday, same_day) so we sanitize
                            const svc = (r.courier_service_code || '').toLowerCase().replace(/_/g, '');
                            if (selectedDeliveryType === 'instant') return svc.includes('instant');
                            if (selectedDeliveryType === 'same_day') return svc.includes('sameday') || svc.includes('same');
                            return true;
                        }).length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-2xl">
                                <LuPackage className="mx-auto text-3xl text-primary/20 mb-2" />
                                <p className="text-sm text-primary/40">Tarif {selectedDeliveryType === 'instant' ? 'Instant' : 'Same Day'} tidak tersedia untuk area ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rates.filter(r => {
                                    const svc = (r.courier_service_code || '').toLowerCase().replace(/_/g, '');
                                    if (selectedDeliveryType === 'instant') return svc.includes('instant');
                                    if (selectedDeliveryType === 'same_day') return svc.includes('sameday') || svc.includes('same');
                                    return true;
                                }).map((rate, i) => (
                                    <button key={i} onClick={() => { setSelectedRate(rate); setStep('form'); }}
                                        className="w-full bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-primary/30 active:scale-[0.98] transition-all text-left space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-primary">{rate.courier_name}</p>
                                                <p className="text-xs text-primary/50">{rate.courier_service_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-black text-primary">Rp {rate.price.toLocaleString('id-ID')}</p>
                                                <p className="text-[10px] text-primary/40">{rate.min_day}–{rate.max_day} hari</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP: FORM ── */}
                {step === 'form' && selectedRate && (
                    <div className="space-y-4">
                        {/* Selected rate summary */}
                        <div className="bg-primary text-brand-yellow rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black opacity-60 uppercase">Dipilih</p>
                                <p className="font-extrabold">{selectedRate.courier_name} · {selectedRate.courier_service_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black">Rp {selectedRate.price.toLocaleString('id-ID')}</p>
                                <button onClick={() => setStep('rates')} className="text-[10px] opacity-60 hover:opacity-100 transition-opacity">Ganti</button>
                            </div>
                        </div>

                        {/* Recipient form */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/10 space-y-3">
                            <p className="text-xs font-black text-primary uppercase">Data Penerima</p>
                            {[
                                { label: 'Nama Penerima', value: recipientName, set: setRecipientName, placeholder: 'Contoh: Budi Santoso' },
                                { label: 'No. HP Penerima', value: recipientPhone, set: setRecipientPhone, placeholder: '08xxxxxxxxxx', type: 'tel' },
                                { label: 'Alamat Lengkap', value: recipientAddress, set: setRecipientAddress, placeholder: 'Jl. ..., RT/RW, Kelurahan, Kecamatan' },
                                { label: 'Catatan (opsional)', value: notes, set: setNotes, placeholder: 'Contoh: Jangan dikocok' },
                            ].map(({ label, value, set, placeholder, type }) => (
                                <div key={label} className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary/50">{label}</label>
                                    <input
                                        type={type || 'text'}
                                        value={value}
                                        onChange={e => set(e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={submitOrder}
                            disabled={submitting || !recipientName || !recipientPhone || !recipientAddress}
                            className="w-full h-12 bg-primary text-brand-yellow font-extrabold rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {submitting ? <LuRefreshCw size={16} className="animate-spin" /> : <LuCheck size={16} />}
                            {submitting ? 'Membuat Pesanan...' : 'Buat Pesanan Kirim'}
                        </button>
                    </div>
                )}

                {/* ── STEP: DONE ── */}
                {step === 'done' && orderResult && (
                    <div className="space-y-4">
                        <div className="bg-green-500 text-white rounded-2xl p-5 text-center space-y-1">
                            <LuCheck className="mx-auto text-3xl mb-2" />
                            <p className="text-lg font-extrabold">Pesanan Dibuat!</p>
                            <p className="text-xs opacity-80">ID: {orderResult.id}</p>
                            {orderResult.waybill_id && <p className="text-xs opacity-80">Waybill: {orderResult.waybill_id}</p>}
                        </div>

                        {orderResult.courier && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/10 space-y-2">
                                <p className="text-xs font-black uppercase text-primary/40">Kurir</p>
                                <p className="font-bold text-primary">{orderResult.courier.company} · {orderResult.courier.name}</p>
                                {orderResult.courier.tracking_id && (
                                    <p className="text-xs text-primary/50">Tracking ID: <span className="font-bold">{orderResult.courier.tracking_id}</span></p>
                                )}
                            </div>
                        )}

                        {/* Tracking */}
                        <button onClick={trackOrder} disabled={tracking}
                            className="w-full h-11 bg-white border-2 border-primary text-primary font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            {tracking ? <LuRefreshCw size={14} className="animate-spin" /> : <LuClipboardList size={14} />}
                            Cek Status Pengiriman
                        </button>

                        {trackingData && (
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-primary/10 space-y-2">
                                <p className="text-xs font-black uppercase text-primary/40">Status</p>
                                <p className="font-bold text-primary capitalize">{trackingData.status?.replace(/_/g, ' ')}</p>
                                {trackingData.courier?.tracking?.history?.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        {trackingData.courier.tracking.history.slice(0, 5).map((h: any, i: number) => (
                                            <div key={i} className="text-xs text-primary/60 flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                                                <span>{h.note || h.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={reset} className="w-full h-11 bg-primary/10 text-primary font-bold rounded-2xl hover:bg-primary/20 transition-all">
                            Buat Pengiriman Baru
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
