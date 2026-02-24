import EscPosEncoder from 'esc-pos-encoder';

interface PrintItem {
    name: string;
    variant: string;
    qty: number;
    price: number;
    total: number;
}

interface ReceiptData {
    storeName: string;
    orderNumber: string;
    customerName: string;
    date: string;
    items: PrintItem[];
    total: number;
}

const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

let cachedDevice: BluetoothDevice | null = null;
let cachedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export const printReceipt = async (data: ReceiptData) => {
    try {
        let characteristic = cachedCharacteristic;

        // Check if we have a valid connection
        if (!cachedDevice || !cachedDevice.gatt?.connected || !characteristic) {

            // If we have a stored device but it's disconnected, try to reconnect first
            if (cachedDevice && !cachedDevice.gatt?.connected) {
                try {
                    const server = await cachedDevice.gatt!.connect();
                    const service = await server.getPrimaryService(SERVICE_UUID);
                    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
                    cachedCharacteristic = characteristic;
                } catch (error) {
                    console.warn("Reconnection failed, requesting device...", error);
                    cachedDevice = null;
                    cachedCharacteristic = null;
                }
            }

            // If no valid device or reconnection failed, request new device
            if (!cachedDevice || !cachedCharacteristic) {
                const device = await navigator.bluetooth.requestDevice({
                    filters: [
                        { services: [SERVICE_UUID] }
                    ],
                    optionalServices: [SERVICE_UUID]
                });

                const server = await device.gatt!.connect();
                const service = await server.getPrimaryService(SERVICE_UUID);
                characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

                cachedDevice = device;
                cachedCharacteristic = characteristic;

                // Handle disconnection to clear cache
                device.addEventListener('gattserverdisconnected', () => {
                    console.log('Printer disconnected');
                    // We keep cachedDevice to try reconnecting next time, but clear char?
                    // Actually if it disconnects, next time we try to reconnect.
                });
            }
        }

        if (!characteristic) throw new Error("Failed to connect to printer");

        const encoder = new EscPosEncoder();

        let encoderChain = encoder
            .initialize()
            .align('center')
            .bold(true)
            .line(data.storeName)
            .bold(false)
            .line(data.date)
            .line(`Order: ${data.orderNumber}`)
            .line('--------------------------------')
            .align('left')
            .line(`Cust: ${data.customerName}`)
            .line('--------------------------------');

        data.items.forEach(item => {
            encoderChain = encoderChain
                .line(`${item.name}`)
                .line(`${item.qty} x ${item.price.toLocaleString('id-ID')} = ${item.total.toLocaleString('id-ID')}`);

            if (item.variant) {
                encoderChain = encoderChain.line(`  (${item.variant})`);
            }
        });

        const encodedData = encoderChain
            .line('--------------------------------')
            .align('right')
            .bold(true)
            .line(`TOTAL: Rp ${data.total.toLocaleString('id-ID')}`)
            .bold(false)
            .align('center')
            .line('--------------------------------')
            .line('Terima Kasih!')
            .line('\n\n') // Feed
            .encode();

        // BLE MTU is typically 20 bytes — send in small chunks with delay
        const CHUNK_SIZE = 20;
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
            const chunk = encodedData.slice(i, i + CHUNK_SIZE);
            await characteristic.writeValue(new Uint8Array((chunk as Uint8Array).buffer as ArrayBuffer));
            await delay(30);
        }

        return true;

    } catch (error) {
        console.error('Printing error:', error);
        throw error;
    }
};
export interface OrderPrintItem {
    box_type: 'FULL' | 'HALF';
    name: string;
    qty: number;
}

export interface OrderReceiptData {
    customerName: string;
    pickupDate: string;   // formatted string, e.g. "Rabu, 26 Februari 2026"
    pickupTime: string;
    note?: string | null;
    orderId: number;
    items: OrderPrintItem[];
}

export const printOrder = async (data: OrderReceiptData) => {
    try {
        let characteristic = cachedCharacteristic;

        if (!cachedDevice || !cachedDevice.gatt?.connected || !characteristic) {
            if (cachedDevice && !cachedDevice.gatt?.connected) {
                try {
                    const server = await cachedDevice.gatt!.connect();
                    const service = await server.getPrimaryService(SERVICE_UUID);
                    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
                    cachedCharacteristic = characteristic;
                } catch {
                    cachedDevice = null;
                    cachedCharacteristic = null;
                }
            }

            if (!cachedDevice || !cachedCharacteristic) {
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: [SERVICE_UUID] }],
                    optionalServices: [SERVICE_UUID],
                });
                const server = await device.gatt!.connect();
                const service = await server.getPrimaryService(SERVICE_UUID);
                characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
                cachedDevice = device;
                cachedCharacteristic = characteristic;
                device.addEventListener('gattserverdisconnected', () => {
                    console.log('Printer disconnected');
                });
            }
        }

        if (!characteristic) throw new Error('Failed to connect to printer');

        const encoder = new EscPosEncoder();

        // Manual center padding (32 chars = 58mm printer)
        const W = 32;
        const c = (text: string) => {
            const pad = Math.max(0, Math.floor((W - text.length) / 2));
            return ' '.repeat(pad) + text;
        };

        let chain = encoder
            .initialize()
            .bold(true)
            .line(c('Raja Pisang Nugget'))
            .bold(false)
            .line(c('-- ORDER --'))
            .align('left')
            .line('--------------------------------')
            .line(`Nama  : ${data.customerName}`)
            .line(`Pickup: ${data.pickupDate}`)
            .line(`Waktu : ${data.pickupTime}`)
            .line(`Order#: #${data.orderId}`)
            .line('--------------------------------');


        const fullItems = data.items.filter(i => i.box_type === 'FULL');
        const halfItems = data.items.filter(i => i.box_type === 'HALF');

        if (fullItems.length > 0) {
            chain = chain.bold(true).line('[ FULL BOX ]').bold(false);
            fullItems.forEach(item => {
                chain = chain.line(`  ${item.qty}x ${item.name}`);
            });
            const totalFull = fullItems.reduce((s, i) => s + i.qty, 0);
            chain = chain.line(`  Total: ${totalFull} box`);
        }

        if (halfItems.length > 0) {
            if (fullItems.length > 0) chain = chain.line('');
            chain = chain.bold(true).line('[ HALF BOX ]').bold(false);
            halfItems.forEach(item => {
                chain = chain.line(`  ${item.qty}x ${item.name}`);
            });
            const totalHalf = halfItems.reduce((s, i) => s + i.qty, 0);
            chain = chain.line(`  Total: ${totalHalf} box`);
        }

        chain = chain.line('--------------------------------');

        if (data.note) {
            chain = chain.line(`Catatan: ${data.note}`);
            chain = chain.line('--------------------------------');
        }

        const encodedData = chain
            .line(c('Terima Kasih!'))
            .line('\n\n')
            .encode();

        // BLE MTU is typically 20 bytes — send in small chunks with delay
        const CHUNK_SIZE = 20;
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < encodedData.length; i += CHUNK_SIZE) {
            const chunk = encodedData.slice(i, i + CHUNK_SIZE);
            await characteristic.writeValue(new Uint8Array(chunk.buffer as ArrayBuffer));
            await delay(50);
        }

        return true;
    } catch (error) {
        console.error('Print order error:', error);
        throw error;
    }
};
