declare module 'esc-pos-encoder' {
    export default class EscPosEncoder {
        constructor();
        initialize(): this;
        align(align: 'left' | 'center' | 'right'): this;
        line(text: string): this;
        newline(): this;
        text(text: string): this;
        bold(value: boolean): this;
        underline(value: boolean): this;
        italic(value: boolean): this;
        invert(value: boolean): this;
        width(width: number): this;
        height(height: number): this;
        size(size: number): this; // alias for width/height combined? Or 0-7
        font(font: 'A' | 'B'): this;
        codepage(codepage: string): this;
        encode(): Uint8Array;
        raw(data: number[]): this;
        image(element: any, width: number, height: number, algorithm: string, threshold: number): this;
        qrcode(url: string, model: number, size: number, errorLevel: string): this;
        barcode(code: string, type: string, height: number): this;
        cut(mode: string): this;
        table(columns: any[]): this;
    }
}
