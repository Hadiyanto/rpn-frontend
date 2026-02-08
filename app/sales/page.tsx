'use client';

import { useState, useEffect } from 'react';
import { LuChevronLeft, LuChevronDown, LuPlus, LuTrash } from 'react-icons/lu';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import PrintReceipt from '@/components/PrintReceipt';

interface Menu {
    id: number;
    name: string;
    price: number;
    category: string;
}

interface Variant {
    id: number;
    menu_id: number;
    variant_name: string;
}

interface CartItem {
    menu_id: number;
    menuToName: string;
    type: string;
    topping: string[];
    qty: number;
    price: number;
    total_price: number;
    note: string;
}

export default function SalesPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState<string>("");

    // New state
    const [menus, setMenus] = useState<Menu[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedMenuId, setSelectedMenuId] = useState<string>("");
    const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([""]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // Receipt state
    const [lastOrder, setLastOrder] = useState<any>(null);

    // Quantity and Note state
    const [quantity, setQuantity] = useState<number>(1);
    const [isCustomQuantity, setIsCustomQuantity] = useState<boolean>(false);
    const [note, setNote] = useState<string>("");
    const [selectedMenuPrice, setSelectedMenuPrice] = useState<number>(0);

    useEffect(() => {
        // Reset cart and selected price on mount
        localStorage.removeItem('cart_items');
        localStorage.removeItem('selected_menu_price');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const fetchData = async () => {
            try {
                const menuRes = await fetch(`${apiUrl}/api/menu`);
                const menuData = await menuRes.json();
                if (menuData.status === 'ok') setMenus(menuData.data);

                const variantRes = await fetch(`${apiUrl}/api/variants`);
                const variantData = await variantRes.json();
                if (variantData.status === 'ok') setVariants(variantData.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };

        fetchData();
    }, []);

    const handleMenuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedMenuId(id);
        const menu = menus.find(m => m.id.toString() === id);
        if (menu) {
            setSelectedMenuPrice(menu.price);
            localStorage.setItem('selected_menu_price', menu.price.toString());
        } else {
            setSelectedMenuPrice(0);
        }
        // Reset variants when menu changes
        setSelectedVariantIds([""]);
    };

    const handleVariantChange = (index: number, value: string) => {
        const newVariants = [...selectedVariantIds];
        newVariants[index] = value;
        setSelectedVariantIds(newVariants);
    };

    const addVariantField = () => {
        if (selectedVariantIds.length < 3) {
            setSelectedVariantIds([...selectedVariantIds, ""]);
        }
    };

    const removeVariantField = (index: number) => {
        const newVariants = selectedVariantIds.filter((_, i) => i !== index);
        setSelectedVariantIds(newVariants);
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === "lebih") {
            setIsCustomQuantity(true);
            setQuantity(1);
        } else {
            setIsCustomQuantity(false);
            setQuantity(Number(value));
        }
    };

    const handleAddItem = () => {
        if (!selectedMenuId) {
            alert("Pilih menu terlebih dahulu");
            return;
        }

        const menu = menus.find(m => m.id.toString() === selectedMenuId);
        if (!menu) return;

        // Get selected variant names
        const selectedVariantNames = selectedVariantIds
            .map(id => variants.find(v => v.id.toString() === id)?.variant_name)
            .filter(Boolean) as string[];

        const pricePerItem = selectedMenuPrice;
        const totalPrice = pricePerItem * quantity;

        let type = selectedVariantNames.length > 0 ? "variant" : "reguler";

        if (selectedVariantNames.length === 0) {
            type = "Original";
        } else if (selectedVariantNames.length === 1) {
            type = "1 Topping";
        } else if (selectedVariantNames.length === 2) {
            type = "Mix 2 Topping";
        } else if (selectedVariantNames.length === 3) {
            type = "Mix 3 Topping";
        }

        const newItem: CartItem = {
            menu_id: menu.id,
            menuToName: menu.name,
            type: type,
            topping: selectedVariantNames,
            qty: quantity,
            price: pricePerItem,
            total_price: totalPrice,
            note: note
        };

        // Get existing cart data
        const rawCart = localStorage.getItem('cart_items');
        let cartData = rawCart ? JSON.parse(rawCart) : { items: [], total_price_checkout: 0, customer_name: "" };

        // Handle case if cart_items was previously stored as an array
        if (Array.isArray(cartData)) {
            cartData = { items: cartData, total_price_checkout: 0, customer_name: "" };
        }

        const updatedItems = [...cartData.items, newItem];

        // Calculate total checkout price
        const totalCheckoutPrice = updatedItems.reduce((sum: number, item: { total_price: number }) => sum + (item.total_price || 0), 0);

        const newCartData = {
            items: updatedItems,
            total_price_checkout: totalCheckoutPrice,
            customer_name: customerName
        };

        localStorage.setItem('cart_items', JSON.stringify(newCartData));
        // Remove old key if present
        localStorage.removeItem('total_price_checkout');

        // Update local state for summary
        setCartItems(updatedItems);

        // Reset form
        setSelectedMenuId("");
        setSelectedVariantIds([""]);
        setQuantity(1);
        setIsCustomQuantity(false);
        setNote("");
    };

    const handleOrder = async () => {
        const rawCart = localStorage.getItem('cart_items');
        if (!rawCart) {
            alert("Keranjang kosong.");
            return;
        }

        const cartData = JSON.parse(rawCart);
        if (!cartData.items || cartData.items.length === 0) {
            alert("Keranjang kosong.");
            return;
        }

        if (!customerName) {
            alert("Mohon isi nama pelanggan.");
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/api/transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cartData),
            });

            const result = await response.json();

            if (result.status === 'ok') {
                // Success logic
                const orderData = {
                    orderNumber: result.data.order_number,
                    customerName: customerName,
                    date: date,
                    items: cartItems,
                    total: cartItems.reduce((acc, item) => acc + item.total_price, 0)
                };

                setLastOrder(orderData); // Set last order for printing

                alert("Order berhasil dibuat!");

                // Reset state
                setCartItems([]);
                setCustomerName("");
                setNote("");
                setQuantity(1);
                setIsCustomQuantity(false);
                setSelectedMenuId("");
                setSelectedVariantIds([""]);
                setDate(new Date().toISOString().split('T')[0]);

                // Clear localStorage
                localStorage.removeItem('cart_items');
                localStorage.removeItem('selected_menu_price');
                localStorage.removeItem('total_price_checkout');
            } else {
                alert(`Gagal membuat order: ${result.message}`);
            }
        } catch (error) {
            console.error("Error submitting order:", error);
            alert("Terjadi kesalahan saat membuat order.");
        }
    };

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center p-0 m-0">
            {/* Modal or View for Success/Print */}
            {lastOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">
                            ✓
                        </div>
                        <h2 className="text-xl font-black text-primary uppercase">Transaksi Berhasil!</h2>
                        <p className="text-center text-primary/70 mb-4">
                            Order <strong>{lastOrder.orderNumber}</strong> atas nama <strong>{lastOrder.customerName}</strong> telah tersimpan.
                        </p>

                        <div className="w-full flex flex-col gap-3">
                            <PrintReceipt
                                data={lastOrder}
                                onSuccess={() => { }}
                            />

                            <button
                                onClick={() => setLastOrder(null)}
                                className="h-12 w-full rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors"
                            >
                                Tutup & Order Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        <div className="px-4 py-4">
                            <label className="flex flex-col gap-2">
                                <p className="text-primary text-sm font-bold uppercase tracking-wider">Nama Pelanggan</p>
                                <input
                                    className="flex h-12 w-full rounded-xl border-2 border-primary bg-white px-4 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-primary/40 outline-none transition-all"
                                    placeholder="Masukkan Nama Pelanggan"
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5 px-4 py-2">
                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Tanggal</p>
                            <div className="flex w-full items-stretch rounded-xl border-2 border-primary bg-white focus-within:ring-2 focus-within:ring-primary/20 group">
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 h-14 px-4 text-base font-semibold text-primary placeholder:text-primary/40 w-full"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </label>

                        {/* Menu Dropdown */}
                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Menu</p>
                            <div className="relative group">
                                <select
                                    className="flex h-14 w-full appearance-none rounded-xl border-2 border-primary bg-white px-4 pr-10 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                                    value={selectedMenuId}
                                    onChange={handleMenuChange}
                                    required
                                >
                                    <option disabled value="">Pilih Menu</option>
                                    {menus.map((menu) => (
                                        <option key={menu.id} value={menu.id}>
                                            {menu.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                                    <LuChevronDown className="text-xl font-bold" />
                                </div>
                            </div>
                        </label>

                        {/* Variant Dropdown(s) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <p className="text-primary text-sm font-bold uppercase tracking-wider">Rasa / Varian</p>
                            </div>
                            {selectedVariantIds.map((variantId, index) => (
                                <div key={index} className="flex gap-2">
                                    <div className="relative group flex-1">
                                        <select
                                            className="flex h-14 w-full appearance-none rounded-xl border-2 border-primary bg-white px-4 pr-10 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                                            value={variantId}
                                            onChange={(e) => handleVariantChange(index, e.target.value)}
                                        >
                                            <option disabled value="">Pilih Rasa</option>
                                            {variants.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.variant_name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                                            <LuChevronDown className="text-xl font-bold" />
                                        </div>
                                    </div>

                                    {index === selectedVariantIds.length - 1 && selectedVariantIds.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={addVariantField}
                                            className="h-14 w-14 flex items-center justify-center rounded-xl bg-primary text-brand-yellow text-2xl font-bold border-2 border-primary hover:bg-primary/90 transition-colors"
                                        >
                                            <LuPlus />
                                        </button>
                                    )}
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => removeVariantField(index)}
                                            className="h-14 w-14 flex items-center justify-center rounded-xl bg-red-500 text-white text-xl font-bold border-2 border-red-500 hover:bg-red-600 transition-colors"
                                        >
                                            <LuTrash />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Quantity Dropdown */}
                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Jumlah</p>
                            <div className="relative group">
                                <select
                                    className="flex h-14 w-full appearance-none rounded-xl border-2 border-primary bg-white px-4 pr-10 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                                    value={isCustomQuantity ? "lebih" : quantity}
                                    onChange={handleQuantityChange}
                                >
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                    <option value="lebih">Lebih dari 5</option>
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                                    <LuChevronDown className="text-xl font-bold" />
                                </div>
                            </div>
                        </label>

                        {/* Custom Quantity Input */}
                        {isCustomQuantity && (
                            <div className="flex flex-col gap-2">
                                <input
                                    className="flex h-14 w-full rounded-xl border-2 border-primary bg-white px-4 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-primary/40 outline-none transition-all"
                                    placeholder="Masukkan jumlah"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                />
                            </div>
                        )}

                        {/* Total Price Display */}
                        <div className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Total</p>
                            <div className="flex h-14 w-full items-center rounded-xl border-2 border-primary bg-primary/5 px-4">
                                <span className="text-lg font-black text-primary">
                                    Rp {(quantity * selectedMenuPrice).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        {/* Note Field */}
                        <label className="flex flex-col gap-2">
                            <p className="text-primary text-sm font-bold uppercase tracking-wider">Catatan (Optional)</p>
                            <input
                                className="flex h-14 w-full rounded-xl border-2 border-primary bg-white px-4 text-base font-semibold text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-primary/40 outline-none transition-all"
                                placeholder="Contoh: Jangan terlalu manis"
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>

                        {/* Order Summary */}
                        {cartItems.length > 0 && (
                            <div className="flex flex-col gap-2 rounded-xl bg-white p-4 items-start shadow-sm border-2 border-primary/20">
                                <div className="flex w-full justify-between items-center border-b-2 border-primary/10 pb-2 mb-2">
                                    <p className="text-primary text-sm font-bold uppercase tracking-wider">
                                        Ringkasan Pesanan
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1 w-full text-sm text-primary">
                                    <p className="font-bold mb-2">
                                        Nama: <span className="font-normal">{customerName || "-"}</span>
                                    </p>
                                    <p className="font-bold mb-1">Item:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {cartItems.map((item, idx) => (
                                            <li key={idx}>
                                                <span className="font-semibold">{item.menuToName}</span>
                                                {' '}
                                                <span className="text-primary/80">
                                                    {item.topping && item.topping.length > 0
                                                        ? item.topping.join(', ')
                                                        : item.type}
                                                </span>
                                                {' '}
                                                <span className="font-bold">x {item.qty}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 mb-8 flex flex-col gap-4">
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-brand-yellow text-lg font-black uppercase shadow-[0_4px_0_0_rgba(45,90,39,0.3)] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all"
                            >
                                <LuPlus className="text-xl" />
                                Tambah Item
                            </button>

                            <button
                                type="button"
                                onClick={handleOrder}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow text-primary border-4 border-primary text-lg font-black uppercase shadow-[0_4px_0_0_rgba(45,90,39,0.3)] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all"
                            >
                                Order
                            </button>
                        </div>
                    </form>
                </main>

                <BottomNav />
            </div>
        </div>
    );
}
