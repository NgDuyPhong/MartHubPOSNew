# Trạng thái triển khai

Cập nhật: 2026-08-10.

## Đã triển khai trong source

| Nhóm | Trạng thái | Ghi chú |
|---|---|---|
| Organization/branch/user | Hoàn thành nền tảng | Một organization, một branch; public registration đã tắt |
| Product/category/unit | Hoàn thành luồng chính | Tạo/sửa sản phẩm, unit theo sản phẩm, barcode và giá theo unit |
| Inventory | Hoàn thành luồng chính | Base quantity, âm kho, ledger, nhập kho tay/Excel, last cost |
| Lot/expiry | Hoàn thành luồng chính | Không bắt buộc khi nhập, FEFO, cảnh báo 7 ngày, job 06:00 |
| POS online | Hoàn thành luồng chính | Bố cục 2/5 + 3/5, barcode, phím tắt, authoritative checkout |
| Payment/debt | Hoàn thành luồng chính | Cash, QR thủ công, partial, debt và thu nợ |
| Owner approval | Hoàn thành | Hash PIN phía server; override offline bị từ chối |
| Shift/register | Hoàn thành luồng chính | Shared shift, opening float, thu/chi, kiểm đếm và variance |
| Sale snapshot | Hoàn thành | Item/unit/conversion/price/cost snapshot, reprint 58 mm |
| Return/exchange | Hoàn thành luồng chính | Partial return, giới hạn số đã bán, stock/payment/debt reversal |
| Offline | Hoàn thành nền tảng | Service worker, IndexedDB queue, auto sync và idempotency |
| Dashboard | Hoàn thành cơ bản | Doanh thu, cash/QR, nợ, tồn âm và cận hạn |
| Product image | Hoàn thành | Lưu persistent folder qua public storage disk |

## Đã kiểm tra tự động trong giai đoạn triển khai

- toàn bộ migration đã chạy trên SQLite local;
- production frontend build thành công;
- TypeScript `--noEmit` không có lỗi;
- Pint style check thành công;
- smoke transaction bán hàng/công nợ/thu nợ/return/chốt ca thành công và rollback;
- scheduler nhận job cảnh báo hạn dùng.

Unit test, feature test và browser E2E vẫn để ở milestone hardening theo quyết định của chủ dự án.

## Chưa được coi là sẵn sàng cutover

1. Chưa có backup MySQL legacy để viết/chạy mapping ETL và reconciliation thật.
2. Chưa rehearsal migration trên MySQL staging và chưa kiểm tra tương thích volume production.
3. Chưa UAT trực quan trên đúng độ phân giải quầy, scanner và máy in nhiệt 58 mm.
4. Offline hiện có durable sale queue và retry cơ bản; màn hình xử lý conflict/export recovery queue nâng cao vẫn thuộc milestone offline hardening.
5. Chưa triển khai supplier/purchase order, hóa đơn điện tử, loyalty và multi-branch nâng cao vì nằm ngoài phạm vi phiên bản đầu.
6. Dependency audit còn cảnh báo transitive từ `exceljs`; không dùng `xlsx` vì package đó có advisory nghiêm trọng. Cần theo dõi bản cập nhật hoặc chuyển parsing Excel sang backend trước production.

## Bước tiếp theo

1. Nhận bản backup MySQL legacy và folder ảnh để data profiling read-only.
2. Bổ sung ETL có dry-run, exception report và reconciliation report.
3. UAT các tình huống cash, QR, partial debt, negative stock, unit conversion, return và offline lâu ngày.
4. Chốt nội dung hóa đơn 58 mm và kiểm thử trên máy in thật.
5. Hoàn thiện queue conflict/recovery và monitoring production.
6. Sau khi toàn bộ chức năng được nghiệm thu, thực hiện unit/feature/E2E test và hardening.
