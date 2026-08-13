# Trạng thái triển khai

Cập nhật: 2026-08-13.

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

## Đã triển khai fast path export/import legacy

- repo nguồn `MartHubPOS-API` đã có command `php artisan legacy:export --dry-run` để profile riêng catalog sản phẩm và tồn kho hiện tại;
- repo nguồn `MartHubPOS-API` đã có command `php artisan legacy:export --include-images` để tạo bundle `marthub-legacy/v1`, scope `product_catalog`, có NDJSON, manifest, checksum và ảnh;
- source mới có `php artisan legacy:import <bundle.zip>` để validate/checksum/preview và `--execute` để import một lần; mapping phụ thuộc chỉ giữ trong bộ nhớ process;
- phạm vi chỉ gồm category, unit, product, barcode, product unit/price, ảnh và tồn kho mở đầu;
- customer, invoice, invoice item, payment, user và settings không được export/import; dữ liệu lịch sử tiếp tục tra cứu trên hệ thống cũ;
- source mới đã có UI authenticated để upload, preview checksum và xác nhận execute; command trả reconciliation/error trực tiếp trong output, không lưu bảng migration;
- importer từ chối bundle chứa file customer/giao dịch ngoài scope sản phẩm;
- test contract/ZIP safety, semantic validation, barcode collision, clean-target gate và catalog/stock import đã pass (6 test, 19 assertion); exporter mới chỉ được kiểm tra PHP syntax trong môi trường hiện tại vì `MartHubPOS-API` chưa có `vendor/`.

Ví dụ chạy rehearsal local:

```bash
# MartHubPOS-API
php artisan legacy:export --include-images --output=legacy-exports

# MartHubPOSNew-clean
php artisan legacy:import storage/app/private/legacy-exports/marthub-legacy-<export-id>-<timestamp>.zip
php artisan legacy:import storage/app/private/legacy-exports/marthub-legacy-<export-id>-<timestamp>.zip --execute --organization=1 --branch=1
```

Các command và UI trên là fast path vận hành server; chưa coi là cutover production cho đợt dữ liệu lớn.

Unit test, feature test và browser E2E vẫn để ở milestone hardening theo quyết định của chủ dự án.

## Chưa được coi là sẵn sàng cutover

1. Chưa có backup MySQL legacy để chạy profiling catalog, giá, đơn vị và tồn kho thật.
2. Fast path command và UI import authenticated đã có; chưa có progress/retry queue theo production volume và chưa có UI export authenticated ở source cũ; kế hoạch chi tiết nằm tại [07-ke-hoach-export-import-du-lieu-legacy.md](07-ke-hoach-export-import-du-lieu-legacy.md).
3. Importer có kill switch `LEGACY_PRODUCT_IMPORT_ENABLED`; sau cutover có thể khóa route/menu và gỡ feature code mà không ảnh hưởng catalog đã nhập.
4. Chưa rehearsal migration đầy đủ trên MySQL staging và chưa kiểm tra tương thích volume production.
5. Chưa UAT trực quan trên đúng độ phân giải quầy, scanner và máy in nhiệt 58 mm.
6. Offline hiện có durable sale queue và retry cơ bản; màn hình xử lý conflict/export recovery queue nâng cao vẫn thuộc milestone offline hardening.
7. Chưa triển khai supplier/purchase order, hóa đơn điện tử, loyalty và multi-branch nâng cao vì nằm ngoài phạm vi phiên bản đầu.
8. Dependency audit còn cảnh báo transitive từ `exceljs`; không dùng `xlsx` vì package đó có advisory nghiêm trọng. Cần theo dõi bản cập nhật hoặc chuyển parsing Excel sang backend trước production.

## Bước tiếp theo

1. Cài dependency và cấu hình read-only cho `MartHubPOS-API`, sau đó nhận bản backup MySQL legacy và folder ảnh để data profiling.
2. Chạy rehearsal đầy đủ trên MySQL staging sạch, đo volume/thời gian/disk và ký reconciliation.
3. Bổ sung progress/retry queue và exception/reconciliation report tải xuống cho production volume.
4. UAT barcode, giá bán, unit conversion, ảnh, tồn kho âm và đối chiếu số lượng sản phẩm.
5. Chốt nội dung hóa đơn 58 mm và kiểm thử trên máy in thật.
6. Hoàn thiện queue conflict/recovery, monitoring production và cân nhắc UI export authenticated ở source cũ.
7. Sau khi toàn bộ chức năng được nghiệm thu, thực hiện unit/feature/E2E test và hardening.
