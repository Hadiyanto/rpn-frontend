'use client';

import React, { useState, useEffect } from 'react';
import { MdQrCode, MdRefresh, MdSend, MdCheckCircle, MdError, MdClose, MdSync } from 'react-icons/md';
import Image from 'next/image';

// We do not have NotificationService yet, let's substitute it with window.alert or toast
const showLocalNotification = async ({ title, body }: { title: string, body: string }) => {
    alert(`${title}\n${body}`);
};

interface Contact {
    id: number;
    fullName: string;
    phoneNumber: string;
    block?: string;
    houseNumber?: string;
}

const formatRupiah = (value: string | number) => {
    const number = typeof value === 'string'
        ? parseInt(value.replace(/\D/g, ''), 10)
        : value;

    if (isNaN(number)) return '0';

    return new Intl.NumberFormat('id-ID').format(number);
};

const renderTemplate = (template: string, variables: Record<string, string>) => {
    const rendered = template.replace(/{{(.*?)}}/g, (_, key) => {
        return variables[key.trim()] ?? '';
    });

    return rendered;
};

const hasUnfilledVariables = (text: string) => {
    return /{{(.*?)}}/g.test(text);
};

export default function WhatsAppManager() {
    const [isConnected, setIsConnected] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);

    // Message modal states
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [recipient, setRecipient] = useState<'individual' | 'group' | 'all'>('individual');
    const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
    const [manualPhone, setManualPhone] = useState('62'); // Auto-prefix 62
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Message templates adapted for RPN
    const messageTemplates = [
        {
            "label": "Pesanan Diterima",
            "value": "Hai {{customer_name}}, pesanannya sudah diterima ya.\n\nDetail Pesanan:\n{{order_details}}\n\nJumlah: {{total_box}} box\nTotal: Rp {{total_amount}}\n\nPembayaran bisa melalui:\nBank: BCA\nNo Rek: 123456789\nA/N: Anggita Prima\n\nMohon konfirmasi bukti pembayarannya melalui link berikut:\n{{upload_link}}\n\nTerima kasih,\nAnggita"
        },
        {
            "label": "Menunggu Pembayaran",
            "value": "Hai {{customer_name}}, izin mengingatkan untuk pembayaran order {{order_number}} sebesar Rp {{total_amount}} belum kami terima ya.\n\nMohon segera melakukan pembayaran agar pesanan bisa kami proses.\n\nTerima kasih,\n{{sender_name}}"
        },
        {
            "label": "Paid",
            "value": "Hi {{customer_name}}, makasih ya sudah order 🙌🏻\n\nPesananmu dengan nomor {{order_number}} akan diproses sesuai jadwal {{schedule_date}} ya.\n\nUntuk pengambilan bisa via:\n🛵 GoSend\n🛵 GrabExpress\n🛵 Maxim (opsional kalau tersedia di area kamu)\n\nSilakan atur driver sesuai jadwal di format order ya.\n\nAtau bisa juga pick up langsung ke:\n{{pickup_location}}\n\nNotes untuk driver:\n{{pickup_note}}\n\nTerima kasih,\n{{sender_name}}"
        },
        {
            "label": "Canceled",
            "value": "Hai {{customer_name}}, mohon maaf pesanan dengan nomor {{order_number}} dibatalkan.\n\nJika masih ingin melakukan pemesanan, silakan hubungi kami kembali ya.\n\nTerima kasih,\n{{sender_name}}"
        },
        {
            "label": "Pengumuman Umum",
            "value": "Halo {{customer_name}},\n\n{{announcement_content}}\n\nTerima kasih atas perhatiannya.\n\n{{sender_name}}"
        }
    ];

    useEffect(() => {
        checkStatus();
        fetchContacts();
    }, []);

    // Polling effect: Check status every 5 seconds if NOT connected
    useEffect(() => {
        if (isConnected) return;

        const intervalId = setInterval(() => {
            checkStatus();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [isConnected]);

    const checkStatus = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/status`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setIsConnected(data.connected);

                // If not connected and no QR, fetch QR
                if (!data.connected && !qrCode && !isLoading) {
                    fetchQR();
                } else if (data.connected) {
                    setQrCode(null);
                }
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const fetchQR = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/qr`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.qr) {
                    setQrCode(data.qr);
                } else if (data.connected) {
                    setIsConnected(true);
                    setQrCode(null);
                }
            }
        } catch (error) {
            console.error('Fetch QR error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerateQR = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/regenerate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                showLocalNotification({
                    title: '🔄 QR Code di-Regenerate',
                    body: 'Mohon tunggu sebentar...',
                });
                setQrCode(null);
                setIsConnected(false);

                // Wait a bit then fetch new QR
                setTimeout(fetchQR, 3000);
            }
        } catch (error) {
            console.error('Regenerate QR error:', error);
            showLocalNotification({
                title: '❌ Gagal Regenerate QR',
                body: 'Terjadi kesalahan, coba lagi.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/contacts`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setContacts(data.contacts || []);
            }
        } catch (error) {
            console.error('Fetch contacts error:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) {
            showLocalNotification({
                title: '⚠️ Pesan Kosong',
                body: 'Silakan ketik pesan terlebih dahulu',
            });
            return;
        }

        try {
            setIsSending(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            let body: any = {
                recipient,
                message,
            };

            if (recipient === 'individual') {
                if (manualPhone.trim() && manualPhone !== '62') {
                    body.phone = manualPhone.trim();
                } else if (selectedContacts.length > 0) {
                    const contact = contacts.find(c => c.id === selectedContacts[0]);
                    body.phone = contact?.phoneNumber;
                } else {
                    showLocalNotification({
                        title: '⚠️ Nomor HP Diperlukan',
                        body: 'Masukkan nomor HP atau pilih kontak',
                    });
                    setIsSending(false);
                    return;
                }
            } else if (recipient === 'group') {
                if (selectedContacts.length === 0) {
                    showLocalNotification({
                        title: '⚠️ Kontak Belum Dipilih',
                        body: 'Pilih minimal 1 kontak untuk group',
                    });
                    setIsSending(false);
                    return;
                }
                body.phones = contacts
                    .filter(c => selectedContacts.includes(c.id))
                    .map(c => c.phoneNumber);
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                showLocalNotification({
                    title: '✅ Pesan Terkirim',
                    body: `Pesan WhatsApp berhasil dikirim!`,
                });
                setShowMessageModal(false);
                setMessage('');
                setSelectedContacts([]);
                setManualPhone('62');
            } else {
                const error = await response.json();
                showLocalNotification({
                    title: '❌ Gagal Kirim Pesan',
                    body: error.message || 'Terjadi kesalahan',
                });
            }
        } catch (error) {
            console.error('Send message error:', error);
            showLocalNotification({
                title: '❌ Error',
                body: 'Terjadi kesalahan saat mengirim pesan',
            });
        } finally {
            setIsSending(false);
        }
    };

    const toggleContactSelection = (contactId: number) => {
        if (recipient === 'individual') {
            setSelectedContacts([contactId]);
        } else {
            setSelectedContacts(prev =>
                prev.includes(contactId)
                    ? prev.filter(id => id !== contactId)
                    : [...prev, contactId]
            );
        }
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                        <MdQrCode className="text-xl" />
                        WhatsApp Bot
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        {isConnected ? (
                            <>
                                <MdCheckCircle className="text-green-500" />
                                <span className="text-xs text-green-600 font-bold">Terhubung</span>
                            </>
                        ) : (
                            <>
                                <MdError className="text-red-500" />
                                <span className="text-xs text-red-600 font-bold">Terputus</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={checkStatus}
                        disabled={isLoading}
                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors disabled:opacity-50"
                        title="Check Status"
                    >
                        <MdRefresh className={`text-xl ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleRegenerateQR}
                        disabled={isLoading}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors disabled:opacity-50"
                        title="Regenerate QR"
                    >
                        <MdSync className={`text-xl ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => setShowMessageModal(true)}
                        disabled={!isConnected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MdSend className="text-lg" />
                        Kirim Pesan
                    </button>
                </div>
            </div>

            {/* QR Code Display */}
            {!isConnected && qrCode && (
                <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-[10px] font-black uppercase text-primary/60 mb-3 text-center tracking-wider">
                        Scan QR Code dengan WhatsApp Anda
                    </p>
                    <div className="flex justify-center bg-white p-2 rounded-xl border border-primary/10 inline-block mx-auto max-w-fit block shadow-sm">
                        <Image
                            src={qrCode}
                            alt="WhatsApp QR Code"
                            width={220}
                            height={220}
                            className="rounded-lg"
                        />
                    </div>
                </div>
            )}

            {!isConnected && !qrCode && !isLoading && (
                <div className="mt-4 p-4 bg-brand-yellow/30 border border-brand-yellow rounded-xl">
                    <p className="text-xs font-bold text-primary">
                        QR Code sedang dimuat... Silakan tunggu beberapa detik atau tekan tombol Refresh.
                    </p>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-primary/70 backdrop-blur-sm"
                        onClick={() => !isSending && setShowMessageModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
                            <h3 className="text-lg font-extrabold text-primary flex items-center gap-2">
                                <MdSend />
                                Kirim Pesan WA
                            </h3>
                            <button
                                onClick={() => setShowMessageModal(false)}
                                disabled={isSending}
                                className="p-1.5 hover:bg-primary/5 rounded-lg transition-colors text-primary/50 hover:text-primary"
                            >
                                <MdClose className="text-xl" />
                            </button>
                        </div>

                        {/* Recipient Type */}
                        <div className="mb-4">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-primary/60 mb-2">
                                Penerima
                            </label>
                            <select
                                value={recipient}
                                onChange={(e) => {
                                    setRecipient(e.target.value as any);
                                    setSelectedContacts([]);
                                    setManualPhone('62');
                                }}
                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none focus:border-primary/40 appearance-none"
                            >
                                <option value="individual">Ketik Nomor Manual</option>
                                <option disabled value="group">Pilih Group / Kontak (Belum tersedia)</option>
                                <option disabled value="all">Semua Pelanggan (Belum tersedia)</option>
                            </select>
                        </div>

                        {/* Manual Phone Input - For Individual */}
                        {recipient === 'individual' && (
                            <div className="mb-4">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-primary/60 mb-2">
                                    Nomor WA Tujuan
                                </label>
                                <input
                                    type="text"
                                    value={manualPhone}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (!val.startsWith('62')) {
                                            if (val.startsWith('0')) val = '62' + val.substring(1);
                                            else if (val && !val.startsWith('6')) val = '62' + val;
                                            else val = '62';
                                        }
                                        setManualPhone(val);
                                    }}
                                    placeholder="628123456789"
                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none focus:border-primary/40"
                                />
                                <p className="text-[9px] font-bold text-primary/40 mt-1 uppercase">
                                    Format wajib: 628xxxxxxxxxx
                                </p>
                            </div>
                        )}

                        {/* Message Input */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-primary/60">
                                    Isi Pesan
                                </label>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) setMessage(e.target.value);
                                    }}
                                    className="text-[10px] font-bold px-2 py-1 rounded border border-primary/10 bg-primary/5 text-primary outline-none"
                                >
                                    {messageTemplates.map((template, idx) => (
                                        <option key={idx} value={template.value}>
                                            {template.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                placeholder="Ketik pesan disini..."
                                className="w-full p-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-medium text-primary focus:outline-none focus:border-primary/40 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowMessageModal(false)}
                                disabled={isSending}
                                className="flex-1 px-4 py-3 text-sm font-bold text-primary/60 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSendMessage}
                                disabled={isSending}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-brand-yellow bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <>Mengirim...</>
                                ) : (
                                    <>
                                        <MdSend />
                                        Kirim Pesan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
