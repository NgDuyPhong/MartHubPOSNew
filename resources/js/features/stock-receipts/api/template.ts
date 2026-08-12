export async function downloadStockReceiptTemplate(): Promise<void> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nhap kho');
    sheet.columns = [
        { header: 'barcode_or_sku', key: 'identifier', width: 22 },
        { header: 'unit_code', key: 'unit', width: 14 },
        { header: 'quantity', key: 'quantity', width: 12 },
        { header: 'unit_cost', key: 'cost', width: 16 },
        { header: 'lot_number', key: 'lot', width: 18 },
        { header: 'expiry_date', key: 'expiry', width: 16 },
    ];
    sheet.addRow({ identifier: '8935049501576', unit: 'LON', quantity: 24, cost: 9000, lot: 'LO-001', expiry: '2027-12-31' });
    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mau-nhap-kho.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
}
