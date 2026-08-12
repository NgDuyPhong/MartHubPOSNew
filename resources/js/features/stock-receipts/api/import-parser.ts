import type { ProductUnit, StockReceiptRow } from '../model/types';

type CellMatrix = unknown[][];

function matchRow(cells: unknown[], productUnits: ProductUnit[]): StockReceiptRow | null {
    const identifier = String(cells[0] ?? '').trim();
    const unitCode = String(cells[1] ?? '')
        .trim()
        .toUpperCase();
    const match = productUnits.find(
        (item) =>
            item.unit.code.toUpperCase() === unitCode &&
            (item.variant.product.sku === identifier || item.barcodes.some((barcode) => barcode.value === identifier)),
    );

    if (!match) return null;

    return {
        product_unit_id: match.id,
        quantity: Number(cells[2] ?? 0),
        unit_cost: Number(cells[3] ?? 0),
        lot_number: String(cells[4] ?? ''),
        expiry_date: String(cells[5] ?? '').slice(0, 10),
    };
}

export function mapImportRows(matrix: CellMatrix, productUnits: ProductUnit[]): StockReceiptRow[] {
    return matrix
        .slice(1)
        .map((cells) => matchRow(cells, productUnits))
        .filter((row): row is StockReceiptRow => row !== null && row.quantity > 0);
}

export function parseCsvMatrix(content: string): CellMatrix {
    return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split(',').map((cell) => cell.trim()));
}

export async function parseSpreadsheet(file: File): Promise<CellMatrix> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await file.arrayBuffer()) as never);
    const worksheet = workbook.worksheets[0];
    const matrix: CellMatrix = [];

    worksheet.eachRow((row) => {
        matrix.push(
            (row.values as unknown[])
                .slice(1)
                .map((value) => (typeof value === 'object' && value && 'text' in value ? (value as { text: string }).text : value)),
        );
    });

    return matrix;
}
