'use client';

import { useState } from 'react';
import { LuChevronLeft, LuCalendar, LuChevronDown, LuCamera, LuSave, LuReceipt } from 'react-icons/lu';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function SalesPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate submission
        setTimeout(() => {
            alert('Transaksi Berhasil Disimpan!');
            setLoading(false);
            setDescription('');
            setAmount('');
            setCategory('');
        }, 1000);
    };

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center p-0 m-0">
            <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">
                <header className="sticky top-0 z-50 bg-brand-yellow border-b border-primary/10">
                    <div className="flex items-center p-4 justify-between w-full">
                        <Link href="/" className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer">
                            <LuChevronLeft className="text-2xl font-bold" />
                        </Link>
                        <h1 className="text-primary text-lg font-extrabold leading-tight tracking-[-0.015em] flex-1 text-center uppercase">Input Penjualan</h1>
                        <div className="size-10 shrink-0"></div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col w-full overflow-y-auto pb-32">
                    <div className="px-4 py-4">
                        <div className="flex h-12 w-full items-center justify-center rounded-xl bg-primary/10 p-1">
                            <div className="flex h-full grow items-center justify-center overflow-hidden rounded-lg px-2 bg-primary text-brand-yellow text-sm font-bold transition-all shadow-sm">
                                <span className="truncate flex items-center gap-2">
                                    <LuReceipt className="text-lg" />
                                    Penjualan
                                </span>
                            </div>
                            <Link href="/expenses" className="flex h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-primary/60 text-sm font-bold transition-all hover:bg-primary/5">
                                <span className="truncate">Pengeluaran</span>
                            </Link>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-2">
                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Tanggal</p>
                            <div className="flex w-full items-stretch rounded-xl border-2 border-primary bg-white focus-within:ring-2 focus-within:ring-primary/20 group">
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 h-14 px-4 text-base font-semibold text-primary placeholder:text-primary/40 w-full"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                                <div className="flex items-center pr-4 text-primary pointer-events-none">
                                    <LuCalendar />
                                </div>
                            </div>
                        </label>

                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Keterangan</p>
                            <input
                                className="flex h-14 w-full rounded-xl border-2 border-primary bg-white px-4 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-primary/40 outline-none transition-all"
                                placeholder="Contoh: Jual Pisang Nugget Cokelat"
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Jumlah (Rp)</p>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-primary pointer-events-none">Rp</span>
                                <input
                                    className="flex h-14 w-full rounded-xl border-2 border-primary bg-white pl-12 pr-4 text-xl font-black text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-primary/40 outline-none transition-all"
                                    placeholder="0"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </label>

                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Kategori</p>
                            <div className="relative group">
                                <select
                                    className="flex h-14 w-full appearance-none rounded-xl border-2 border-primary bg-white px-4 pr-10 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    required
                                >
                                    <option disabled value="">Pilih Kategori</option>
                                    <option value="Penjualan Nugget">Penjualan Nugget</option>
                                    <option value="Penjualan Minuman">Penjualan Minuman</option>
                                    <option value="Lain-lain">Lain-lain</option>
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                                    <LuChevronDown className="text-xl font-bold" />
                                </div>
                            </div>
                        </label>

                        <div className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Bukti Transaksi (Opsional)</p>
                            <div className="flex flex-col items-center justify-center h-40 w-full rounded-xl border-2 border-dashed border-primary bg-white/50 cursor-pointer hover:bg-white/80 transition-colors group">
                                <LuCamera className="text-4xl text-primary mb-2 group-hover:scale-110 transition-transform" />
                                <p className="text-sm font-bold text-primary">Klik untuk unggah foto nota</p>
                            </div>
                        </div>

                        <div className="mt-4 mb-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-brand-yellow text-lg font-black uppercase shadow-[0_4px_0_0_rgba(45,90,39,0.3)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <LuSave className="text-xl" />
                                {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
                            </button>
                        </div>
                    </form>
                </main>

                <BottomNav />
            </div>
        </div>
    );
}
