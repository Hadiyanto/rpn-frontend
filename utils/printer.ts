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

export const printReceipt = async (data: ReceiptData) => {
    try {
        //Request Bluetooth Device
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Standard UUID for POS Printers
            ],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        if (!device || !device.gatt) {
            throw new Error('Device not found or not supported.');
        }

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        // Common characteristic for write
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

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

        // Disconnect after printing
        if (device.gatt.connected) {
            device.gatt.disconnect();
        }

        return true;

    } catch (error) {
        console.error('Printing error:', error);
        throw error;
    }
};
