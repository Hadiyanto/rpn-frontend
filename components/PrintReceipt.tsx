import { useState } from 'react';
import { printReceipt } from '@/utils/printer';
import { LuPrinter } from 'react-icons/lu';

interface PrintReceiptProps {
    data: {
        orderNumber: string;
        customerName: string;
        date: string;
        items: any[];
        total: number;
    };
    onSuccess?: () => void;
}

export default function PrintReceipt({ data, onSuccess }: PrintReceiptProps) {
    const [loading, setLoading] = useState(false);

    const handlePrint = async () => {
        setLoading(true);
        try {
            // Transform cart items / order items to Printer format
            const printItems = data.items.map(item => ({
                name: item.menuToName || item.name, // Adjust based on data source
                variant: item.topping ? item.topping.join(', ') : item.type,
                qty: item.qty || item.quantity,
                price: item.price,
                total: item.total_price || (item.price * (item.qty || item.quantity))
            }));

            await printReceipt({
                storeName: 'Raja Pisang Nugget',
                ...data,
                items: printItems
            });

            alert('Print Berhasil!');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            alert('Gagal Print. Pastikan Bluetooth aktif dan pilih printer yang benar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-lg font-black uppercase shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
            <LuPrinter className="text-xl" />
            {loading ? 'Printing...' : 'Cetak Struk'}
        </button>
    );
}
