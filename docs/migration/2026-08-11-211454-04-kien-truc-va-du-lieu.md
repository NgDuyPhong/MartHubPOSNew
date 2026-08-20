# Kiến trúc đích và kế thừa dữ liệu

## 1. Kiến trúc ứng dụng

Giữ một Laravel modular monolith trong `MartHubPOSNew`:

```text
Inertia React pages/components
  ├─ back-office page requests
  └─ POS catalog/sale sync requests
          ↓
Laravel HTTP layer
  → Form Requests + Policies
  → application actions/services
  → domain models/state transitions
  → database transaction + outbox/audit
          ↓
SQLite local / MySQL production
Queue cho import/report/sync jobs
IndexedDB cho catalog cache và offline sale queue
```

Inertia phù hợp với màn quản trị và điều hướng authenticated. Các tác vụ POS/offline cần JSON endpoint ổn định riêng, nhưng vẫn nằm trong cùng Laravel application; không cần tách microservice hay duy trì một SPA repository độc lập.

## 2. Ranh giới domain đề xuất

- Identity & Access: user, capability, session, actor context.
- Organization: organization, branch, location, device, shift khi bật.
- Catalog: product, variant, barcode, category, unit, conversion.
- Pricing: customer segment, price book, entry, discount authorization.
- Sales: sale, sale item snapshot, cancellation/refund/reversal.
- Payments: method, payment, refund/allocation.
- Inventory: immutable movement, balance projection, optional lot/expiry, adjustment và negative reconciliation.
- Customers: customer, contact, segment và credit ledger.
- Register Operations: register, shared shift, participants, cash movements/counts và variance.
- Imports: batch, row, mapping preset và exception report.
- Reporting/Audit: projections, audit log và operational metrics.
- Legacy Migration: staging/raw, transform, legacy ID map, reconciliation.

Các module là ranh giới logic, không nhất thiết tạo package hoặc top-level folder phức tạp ngay từ đầu. Khi code tăng, có thể tổ chức Action/Service theo domain sau khi chốt convention của source mới.

## 3. Transaction boundary bắt buộc

### Tạo sale

Trong một transaction:

1. kiểm tra actor, device/branch và idempotency key;
2. load/lock các balance cần thiết;
3. resolve unit, price, discount và tax từ server;
4. tạo sale + item snapshot;
5. tạo một hoặc nhiều payment cash/QR và customer debt allocation cho phần còn thiếu; QR manual confirmation phải lưu actor xác nhận;
6. tạo inventory movements và cập nhật projection, cho phép balance âm nhưng phải đánh dấu đối soát;
7. gắn register/shift/actor và cập nhật cash projection đúng payment method;
8. ghi audit/outbox;
9. trả receipt authoritative.

Client gửi identity, quantity, tender và context; client không quyết định tổng cuối.

### Hủy/hoàn tác

Không sửa/xóa chứng từ completed. Tạo reversal liên kết chứng từ gốc, payment refund và stock movements ngược. Endpoint phải idempotent và khóa chống xử lý đồng thời.

### Đổi/trả hàng

- Return document tham chiếu sale và từng sale item gốc.
- Quantity trả được kiểm tra theo base quantity đã bán trừ phần đã trả trước đó.
- Trả hàng tạo inventory movement ngược và refund/credit reversal tương ứng cash, QR hoặc debt.
- Đổi hàng tạo return document cho hàng trả và một sale mới cho hàng nhận, liên kết hai chứng từ để audit.
- Không chỉnh sửa trực tiếp quantity, total hoặc payment của sale completed.

### Import

Preview sinh một mapping/version hoặc batch draft. Execute phải dùng đúng mapping đã preview. File lớn chạy queue; lỗi một dòng không làm mất khả năng xuất báo cáo và chạy lại có kiểm soát.

Nhập kho Excel là import type riêng với product master import. Hệ thống xuất template versioned và preview product unit, quantity, `base_quantity`, last purchase cost, lot và expiry optional trước khi tạo stock-in movements.

## 4. Mô hình dữ liệu tối thiểu trước parity

- `organizations`, `branches` (có thể seed một bản ghi mặc định);
- `users` và authorization tables;
- `categories`, `units`, `products`, `product_variants`, `product_units`, `barcodes`;
- `customer_segments`, `price_books`, `price_book_entries`;
- `customers`;
- `customer_credit_entries`, `payment_allocations`;
- `sales`, `sale_items`, `returns`, `return_items`;
- `payment_methods`, `payments`;
- `stock_receipts`, `stock_receipt_items`, `approval_events`;
- `inventory_lots`, `inventory_movements`, `inventory_balances`;
- `registers`, `shifts`, `shift_participants`, `shift_cash_movements`, `shift_cash_counts`;
- `devices`, `offline_requests` hoặc idempotency record;
- `import_batches`, `import_rows`;
- `audit_logs`, `legacy_id_map`.

Schema cụ thể chỉ khóa sau data profiling production. Không tạo migration mới dựa riêng vào migrations legacy vì schema production có thể khác lịch sử file.

### Invariant nhiều đơn vị theo sản phẩm

- mỗi product variant có đúng một base product unit với `conversion_to_base = 1`;
- conversion nằm trên product unit, không nằm trên unit master; `Thùng` có thể là 24 lon ở Coca nhưng 20 chai ở nước suối;
- mọi conversion đi trực tiếp về base, không tính theo chuỗi `thùng → lốc → lon`;
- inventory balance và movement chỉ lưu base quantity;
- barcode trỏ tới product unit để scan tự xác định lon/lốc/thùng;
- price book entry gắn product unit; giá theo thùng/lốc có thể khác `base price × conversion`;
- sale item snapshot sold unit, sold quantity, conversion, base quantity, unit price và line total;
- product unit đã phát sinh giao dịch không hard-delete hoặc sửa conversion; ngừng sử dụng và tạo cấu hình mới.

### Snapshot hóa đơn

Sale completed là chứng từ bất biến. `sale_items` lưu tối thiểu:

- product/variant ID nullable và legacy reference;
- product name, SKU/barcode và category tại lúc bán;
- sold unit name/symbol, sold quantity và conversion snapshot;
- base quantity;
- original/unit price, discount rule/amount và line total;
- last purchase cost tại lúc bán và profit snapshot;
- tax snapshot nếu sau này bật thuế;
- lot allocations ở bảng liên kết khi có theo dõi lô.

Sale header snapshot customer name/contact tại lúc bán, document number, branch/register/shift/actor, subtotal/discount/total và trạng thái. Payments và debt entries là ledger bất biến liên kết sale; không thay thế chúng bằng cách cập nhật một trường `paid_amount` duy nhất.

Nếu product bị inactive hoặc không còn map được sau migration, hóa đơn vẫn hiển thị từ snapshot và `product_id` có thể nullable.

### Giá vốn lần nhập cuối

- Stock-in có purchase cost theo product unit và được normalize thành cost per base unit.
- Sau khi stock-in hoàn tất, product variant `current_cost` được cập nhật bằng cost của lần nhập mới nhất.
- Sale item snapshot `current_cost` tại thời điểm checkout; lần nhập sau không tính lại profit của sale cũ.
- Sale xảy ra khi tồn âm vẫn snapshot current cost đang có. Không hồi tố giá vốn tự động khi nhập bù, trừ khi sau này xây quy trình costing adjustment riêng.

### Owner PIN approval

PIN được hash và chỉ kiểm tra server-side, không lưu plaintext, hash/verifier hoặc dữ liệu có thể xác thực PIN ở client. Approval record lưu approver, cashier actor, action, reason, value trước/sau, sale/local ID, device và timestamp. Một approval chỉ dùng cho đúng action/request, không mở khóa vô thời hạn cho cả phiên. Khi offline, price/discount override bị từ chối ở UI và domain contract; POS chỉ được bán theo catalog/pricing policy đã cache và phải chờ online để xin phê duyệt.

## 5. Database và file storage

- SQLite chỉ dùng cho development local và dữ liệu demo.
- MySQL là production target; mọi migration phải chạy được trên cả hai nhưng quyết định về locking, collation, index và concurrency lấy MySQL làm chuẩn.
- Không dùng database enum, generated column hoặc truy vấn đặc thù SQLite nếu chưa có phương án MySQL tương ứng.
- Trước deploy phải chạy full migration/rehearsal trên MySQL staging; việc chạy tốt trên SQLite không đủ để kết luận production an toàn.
- Ảnh sản phẩm lưu file trong storage persistent của server; database chỉ giữ relative path, MIME, size và checksum cần thiết.
- Backup production phải gồm cả database và thư mục ảnh. Không commit backup/dữ liệu production vào repository.

## 6. Offline contract

Catalog sync trả version/cursor, entity thay đổi và tombstone. Client lưu tối thiểu product/variant/barcode/unit/category/price cần cho POS.

Offline sale envelope gồm:

- UUID local sale và `Idempotency-Key` ổn định qua mọi lần retry;
- actor, branch, device và thời điểm client;
- catalog/pricing version;
- item identity, unit và quantity;
- tender đã nhận;
- hash/checksum payload nếu cần phát hiện mutation sau lần gửi đầu.

Queue state: `pending → syncing → synced`, hoặc `failed_retryable` / `conflict` / `rejected`. Chỉ xóa payload local sau khi lưu server ID và receipt; vẫn giữ metadata đủ để hỗ trợ.

Với một máy POS, không áp giới hạn tuổi queue theo business rule. Client phải xin persistent storage, cho phép export bản sao queue và đồng bộ event theo dependency `open shift → sale/payment/cash movement → close shift`. Hỏng thiết bị hoặc xóa browser data vẫn là rủi ro vật lý nên cần backup/export local; “không giới hạn” không đồng nghĩa đảm bảo dữ liệu khi thiết bị bị mất.

## 7. Lô/hạn dùng và tồn âm

- Product có tracking mode `none|optional|required`; mặc định hiện tại là `optional`.
- Không bắt buộc barcode riêng theo lot. Sale scan barcode sản phẩm và server phân bổ FEFO theo expiry, sau đó received time.
- Lot thiếu expiry vẫn hợp lệ; stock không theo lot dùng `lot_id = null`, không tạo mã lô giả.
- Nếu tồn/lô không đủ, phần còn thiếu tạo movement âm ở bucket chưa phân bổ để đối soát sau.
- Scheduler chạy hằng ngày tạo/cập nhật cảnh báo `expiring_soon` trong 7 ngày, `expires_today` và `expired`; key idempotent tránh thông báo trùng.
- Checkout hàng hết hạn hiển thị cảnh báo và ghi nhận actor xác nhận, không chặn sale.

## 8. Chiến lược migration dữ liệu

```text
Legacy snapshot read-only
  → raw/staging
  → profile + normalize
  → transform + legacy_id_map
  → load schema mới
  → reconcile counts/money/stock
  → UAT
  → final full migration/cutover trong cửa sổ 12 giờ
```

Thứ tự load:

1. organization/branch/location mặc định;
2. users và capability mapping;
3. units, categories;
4. products, variants, barcodes và price books;
5. customers;
6. historical sales/items với snapshot bất biến;
7. payments đáng tin cậy;
8. opening stock đã duyệt;
9. settings đã whitelist.

Không migrate sessions/cache/jobs/tokens hoặc secret. Inventory hiện tại được coi là opening balance tại cutover sau kiểm kê/duyệt; không tái dựng mù từ inventory logs chưa chứng minh đầy đủ.

Legacy production là MySQL và có thể cung cấp backup. Công cụ migration dùng connection read-only riêng, staging/raw data, `legacy_id_map`, batch/checksum, dry-run và exception report. Rehearsal chính phải load vào MySQL staging; SQLite có thể dùng cho phát triển UI nhưng không dùng làm bằng chứng tương thích production.

Quy tắc bổ sung:

- historical sales/items được import để tra cứu nhưng không phát lại stock movements;
- inventory tại thời điểm cutover trở thành opening balance, kể cả số âm;
- actor hard-code hoặc không xác định map sang `Legacy Import`/legacy metadata, không giả làm user hiện tại;
- payment method/paid status legacy không đáng tin thì giữ raw value và gắn `legacy_unknown`, không suy đoán cash/QR/debt;
- không tạo shift, debt ledger hoặc lot/expiry lịch sử nếu nguồn cũ không có dữ liệu đáng tin;
- ảnh sản phẩm được copy sang storage mới bằng mapping/checksum; file thiếu nằm trong exception report;
- tại thời điểm xác nhận không có invoice offline legacy pending, nhưng cutover vẫn phải kiểm tra pending count bằng 0 trước khi khóa hệ thống cũ.

## 9. Đối soát và cutover gate

- source count = migrated + skipped có lý do + error;
- barcode collision và unit/category orphan đã xử lý hoặc có exception được duyệt;
- doanh thu theo ngày/tháng/status khớp trong tolerance đã ký;
- tổng item/header chênh lệch được liệt kê, không tự sửa im lặng;
- opening stock được ký duyệt;
- sample trace sale → payment → movement → balance thành công;
- rehearsal có thể chạy lại từ đầu bằng batch mới;
- legacy chuyển read-only và có runbook cutback.

Với cửa sổ 12 giờ, đặt go/no-go trước khi hết giờ thứ 8 để còn tối thiểu 4 giờ cutback. Kế hoạch mục tiêu: backup/final extract ≤ 2 giờ, ETL ≤ 3 giờ, reconciliation ≤ 2 giờ, smoke/UAT ≤ 1 giờ và 4 giờ buffer. Thời lượng này chỉ được khóa sau rehearsal bằng volume production thực tế.

## 10. Chiến lược kiểm tra và unit test hoãn lại

Trong thời gian xây chức năng, mỗi milestone chỉ yêu cầu các kiểm tra tích hợp tối thiểu: migrations chạy được, PHP/frontend build được, type-check/lint không lỗi, smoke test các route và UAT luồng vừa hoàn thành. Không yêu cầu viết unit test để đóng từng backlog item.

Sau khi toàn bộ chức năng đã hoàn tất, chủ dự án sẽ thực hiện giai đoạn unit test và hardening với backlog đề xuất:

- Pest tests cho authorization, catalog, sale, payment, inventory, refund, idempotency và import;
- unit tests cho money, pricing, unit conversion và state transitions;
- React tests cho cart, keyboard, pricing display và offline queue state;
- browser E2E cho login → bán → thanh toán → hóa đơn → hoàn tác và offline retry;
- migration tests bằng fixture đại diện cho barcode/unit/pricing/invoice lỗi;
- concurrency tests cho hai sale hoặc hai cancel cùng tác động một SKU/chứng từ.

Việc hoãn unit test không thay đổi các invariant bắt buộc trong thiết kế như server-authoritative pricing, transaction, idempotency và stock locking.
