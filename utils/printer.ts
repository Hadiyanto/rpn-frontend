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

        // Split into chunks of 512 bytes to avoid MTU limits
        const chunks = [];
        for (let i = 0; i < encodedData.length; i += 512) {
            chunks.push(encodedData.slice(i, i + 512));
        }

        for (const chunk of chunks) {
            await characteristic.writeValue(chunk);
        }

        return true;

    } catch (error) {
        console.error('Printing error:', error);
        throw error;
    }
};
