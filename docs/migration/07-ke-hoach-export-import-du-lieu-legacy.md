# Kế hoạch chuyển catalog và tồn kho từ `MartHubPOS-API`

## 1. Mục tiêu và quyết định phạm vi

Tài liệu này mô tả **fast path one-shot** để đưa catalog sản phẩm và tồn kho tại thời điểm cutover từ dự án cũ `MartHubPOS-API` sang `MartHubPOSNew-clean`.

```text
MartHubPOS-API (MySQL snapshot/read-only)
  → export bundle marthub-legacy/v1
  → manifest + NDJSON + ảnh + checksum
  → MartHubPOSNew-clean preview/validate
  → import một lần vào organization/branch đích
  → đối soát + UAT + cutover
```

Phạm vi fast path gồm:

- danh mục, đơn vị, sản phẩm, một variant mặc định;
- barcode, đơn vị bán và giá bán có thể biểu diễn đúng trong schema mới;
- ảnh sản phẩm;
- `inventory.current_stock` làm tồn đầu kỳ của một branch đích.

Không chuyển bằng fast path này:

- customer, công nợ, invoice, invoice item, return và lịch sử bán hàng;
- payment, ca/két, user, password, token và PIN;
- supplier, purchase order, stock adjustment và inventory log;
- settings, secret, audit log, cache, session, job và offline queue;
- `product_pricing_tiers` hoặc giá theo nhóm khách hàng vì schema đích chưa có price book tương ứng.

Hệ thống cũ phải được giữ read-only để tra cứu dữ liệu ngoài phạm vi. Fast path này **không thay thế** kế hoạch ETL toàn bộ dữ liệu một năm trong [04-kien-truc-va-du-lieu.md](04-kien-truc-va-du-lieu.md). Trước khi triển khai phải chốt một trong hai quyết định:

1. chỉ cần catalog + tồn đầu kỳ: dùng tài liệu này làm runbook chính;
2. cần cả khách hàng/hóa đơn/thanh toán lịch sử: mở workstream ETL riêng, không mở rộng âm thầm contract `product_catalog`.

## 2. Kết quả rà soát code hiện tại

| Hạng mục | Hiện trạng | Kết luận |
|---|---|---|
| Source chuẩn | Chủ dự án xác định là `MartHubPOS-API` | Mọi profiling và final export phải chạy từ repo/database này |
| Exporter | `legacy:export` đã được port vào `MartHubPOS-API` | Đã kiểm tra PHP syntax; cần chạy dependency + dry-run trên backup MySQL trước rehearsal |
| Importer CLI | Có `app/Console/Commands/ImportLegacyData.php` và `app/Services/LegacyImportService.php` | Đã có fast path, chưa đủ điều kiện production |
| Importer UI | Có route authenticated `/legacy-imports`, chỉ owner/manager được dùng | Dùng cho preview nhỏ; final cutover ưu tiên CLI |
| Contract/ZIP safety | Có kiểm tra contract, scope, checksum, path traversal, số file và dung lượng giải nén | Cần bổ sung kiểm tra file bắt buộc, byte size và semantic validation |
| Test | Có unit/feature test trên SQLite | Chưa thay cho rehearsal với backup MySQL thật |
| Mapping | Mapping source ID → target ID chỉ giữ trong memory | Chấp nhận cho one-shot nếu target không có SKU/inventory xung đột và restore backup khi lỗi |

Không chạy production khi còn bất kỳ gate nào ở mục 8 chưa được ký.

## 3. Mapping schema đã đối chiếu

### 3.1 Category, unit, product và variant

| Nguồn `MartHubPOS-API` | Đích `MartHubPOSNew-clean` | Quy tắc |
|---|---|---|
| `product_categories.name` | `categories.name` | Unique trong `organization_id`; trim và so collision không phân biệt hoa/thường |
| `product_categories.is_active` | `categories.is_active` | Giữ nguyên |
| `product_categories.parent_id/code/icon/description` | Không có cột tương ứng | Ghi vào exception report; không tự ghép tên hoặc làm phẳng cây mà không duyệt |
| `units.name` | `units.name` | Giữ tên đã trim |
| `units.symbol` | `units.code` | Chuẩn hóa uppercase; nếu thiếu dùng slug của `name`; collision code khác nghĩa là lỗi |
| `products.id` | `products.sku`, `product_variants.sku` | Schema nguồn hiện không khai báo `sku/code`; mặc định dùng `LEGACY-<id>` |
| `products.name/category_id/is_active` | `products` | Map category theo source ID; category orphan là lỗi preview |
| `products.cost_price` | `product_variants.last_cost_base` | VND nguyên: `round(decimal)`, không nhân 100; âm hoặc vượt `unsignedBigInteger` là lỗi |
| một `products` row | một `product_variants` row | Variant tên `Mặc định`, cùng SKU với product |
| `products.image` | `products.image_path` | Copy sang public disk và lưu relative path; file thiếu chỉ warning |

Các field nguồn chưa có đích trực tiếp như `description`, `min_stock`, discount, commission, `notes` và `no_print_processing` phải xuất hiện trong báo cáo “not mapped”; không được bỏ im lặng.

### 3.2 Đơn vị, barcode và giá

Schema nguồn có nhiều lớp dữ liệu chồng nhau: field trực tiếp trên `products`, bảng `product_units` và bảng `product_prices`. Quy tắc ưu tiên phải cố định như sau:

1. Tạo đúng một base `product_units` từ `products.unit_id` hoặc `products.unit`; `conversion_to_base=1`, `is_base=true`.
2. Giá base lấy lần lượt `retail_price`, `selling_price`; thiếu thì `0` và báo warning.
3. Nếu `products.base_unit` thực sự là đơn vị đóng gói khác và `unit_conversion > 1`, tạo unit phụ với `conversion_to_base=unit_conversion`, giá `base_unit_price`. Không gán conversion lớn hơn `1` cho row đang đánh dấu `is_base=true`.
   - Trong dữ liệu legacy thực tế, `unit_conversion=0` là sentinel cho “chưa khai báo”; importer chuyển trường hợp này thành conversion cơ sở `1` và ghi warning. Giá trị âm vẫn là lỗi.
4. `product_units` nguồn bổ sung/override theo `(product_id, unit_name)`; `unit_value` phải lớn hơn `0`. Chỉ một unit được `is_default_sale=true`.
5. `product_prices.price_type=le` cập nhật giá của base unit, không tạo unit giả tên `Lẻ`.
6. `price_type=thung/loc` chỉ tạo hoặc cập nhật unit khi có tên unit tin cậy và `quantity_per_unit > 1`.
7. `price_type=si` hoặc row dùng `min_quantity` để biểu diễn giá theo số lượng không được biến thành unit quy đổi. Đưa vào exception report vì schema mới chưa biểu diễn được pricing tier.
8. Giá lưu ở đích là số nguyên VND: `round(price)`, không nhân 100.
9. `products.barcode`, `alternate_barcode` và `product_units.barcode` được trim nhưng giữ kiểu string, kể cả số `0` đầu. Barcode rỗng được bỏ qua; barcode trùng giữa hai product unit khác nhau là lỗi chặn execute.

Việc `alternate_barcode` thuộc base unit hay đơn vị đóng gói phải được xác nhận bằng mẫu dữ liệu thật. Nếu không chứng minh được, gắn cả barcode chính/phụ vào base unit và đưa vào UAT quét mã.

### 3.3 Tồn kho

- Nguồn lấy `inventory.current_stock`; không tái dựng từ `inventory_logs`.
- `reserved_quantity` không được tự trừ. Nếu có bất kỳ row khác `0`, preview phải **NO-GO** để chủ nghiệp vụ quyết định dùng `current_stock` hay `current_stock - reserved_quantity`.
- Tồn nguồn phải được xác nhận đang tính theo đơn vị cơ sở `products.unit`. Sau xác nhận, `quantity_base = current_stock`; nếu nguồn dùng đơn vị khác thì phải nhân conversion đã duyệt.
- Cho phép tồn âm và số thập phân ở đích, dù schema nguồn hiện là integer.
- Mỗi `(branch_id, product_variant_id, inventory_lot_id=null)` chỉ có một `inventory_balances` row với `scope_key` chuẩn `branchId:variantId:0`.
- Tạo một `inventory_movements` loại `opening_balance`, `quantity_base=balance_after`, `source_type=legacy_import`; lưu `export_id` và legacy product ID trong metadata.
- Không nối `export_id` vào `inventory_balances.scope_key`. Làm vậy sẽ tạo bucket khác với luồng bán hàng (`AdjustInventoryAction`) và khiến sale sau cutover không trừ vào tồn đầu kỳ.

## 4. Contract bundle `marthub-legacy/v1`

```text
manifest.json
data/categories.ndjson
data/units.ndjson
data/products.ndjson
data/product_units.ndjson
data/product_prices.ndjson
data/inventory.ndjson
images/<product-id>-<safe-filename>
reports/source-summary.json
```

Manifest bắt buộc có:

- `contract=marthub-legacy/v1`, `scope=product_catalog`, UUID `export_id`, `status=complete`;
- source repo/app, source commit, database driver, timezone, thời điểm bắt đầu/kết thúc;
- `currency=VND`, quy ước tiền nguyên và `inventory_quantity_basis`;
- danh sách allowlist của sáu file NDJSON, row count, byte size và SHA-256 từng file;
- danh sách ảnh cùng checksum; checksum SHA-256 của ZIP được tính sau khi đóng archive;
- control totals và warning/exception summary.

Importer phải từ chối khi:

- thiếu manifest, `products.ndjson`, file được khai báo hoặc checksum/byte size không khớp;
- có data file ngoài allowlist ở bất kỳ đường dẫn nào;
- có path tuyệt đối, `..`, symlink entry, quá số file hoặc quá giới hạn giải nén;
- contract/scope/status không đúng hoặc manifest không liệt kê đầy đủ file trong ZIP;
- một dòng không phải UTF-8/JSON object hợp lệ, source ID trống hoặc trùng trong cùng entity.

Control totals tối thiểu:

- row count của category, unit, product, product unit, product price và inventory;
- product active/inactive; product không có inventory; orphan category/unit/product;
- barcode tổng, barcode rỗng và barcode collision;
- tổng `current_stock`, số row tồn âm và số row `reserved_quantity != 0`;
- tổng cost/retail price để phát hiện lỗi scale tiền;
- ảnh được tham chiếu, copied và missing.

## 5. Workstream nguồn cũ `MartHubPOS-API`

### 5.1 Việc phải làm

1. Đã port `ExportLegacyData` và `LegacyExportService` từ bản làm việc `old/api` sang đúng repo `MartHubPOS-API`; không chạy final export từ `old/api`.
2. Bổ sung test contract, missing table/column, barcode có số `0` đầu, ảnh thiếu, dữ liệu lớn và MySQL; phần chạy MySQL vẫn là gate rehearsal.
3. Chạy exporter bằng database user read-only trên bản restore/snapshot MySQL. Chỉ thư mục output được phép ghi.
4. Dùng `Schema::hasTable()`/`hasColumn()` vì migration cũ có các biến thể và file migration trùng thời điểm.
5. Stream NDJSON bằng `chunkById`; không tải toàn bộ catalog vào memory.
6. Khi final export từ live database, phải khóa sale/import/stock adjustment và xác nhận offline queue không còn pending. Nếu không khóa được, dùng consistent snapshot từ backup để tránh các file được đọc ở các thời điểm khác nhau.
7. Xác nhận cách lưu `products.image` trên production; exporter phải resolve đúng public disk/root thực tế và không cho path traversal.

### 5.2 Lệnh vận hành

```bash
cd MartHubPOS-API
php artisan legacy:export --dry-run
php artisan legacy:export --include-images --output=legacy-exports
```

Exporter chỉ phát hành ZIP sau khi đóng toàn bộ writer, ghi report/manifest, đóng archive và tính SHA-256 của file ZIP hoàn chỉnh. File đang tạo dùng tên tạm; chỉ rename sang tên final khi thành công.

### 5.3 UI export

UI export ở source cũ không thuộc phạm vi cutover hiện tại. Authentication của source cũ chưa đủ tin cậy để mở endpoint tải toàn bộ catalog. Nếu sau này bắt buộc có UI, phải làm auth/authorization owner/admin, private storage, queue job, audit và signed download có hạn trước; không tạo ZIP lớn trực tiếp trong web request.

## 6. Workstream đích `MartHubPOSNew-clean`

### 6.1 Preflight và preview

```bash
cd MartHubPOSNew-clean
php artisan legacy:import <bundle.zip>
```

Preview phải hoàn toàn read-only và xuất báo cáo machine-readable + human-readable, gồm:

1. ZIP/manifest/checksum/allowlist validation;
2. row count và control totals;
3. orphan reference, duplicate source ID, category/unit/SKU/barcode collision;
4. unit graph của từng product: đúng một base unit conversion `1`, tối đa một default sale unit;
5. field/price row không map được và mọi fallback đã dùng;
6. target preflight: organization/branch tồn tại và cùng scope; target catalog/inventory không chứa dữ liệu xung đột;
7. dự kiến created/skipped/error, ảnh copied/missing và stock opening totals.

Preview hiện tại mới profile row count, vì vậy chưa được xem là production-ready cho đến khi có semantic validation ở trên.

### 6.2 Execute

```bash
php artisan legacy:import <bundle.zip> --execute --organization=<organization-id> --branch=<branch-id>
```

Quy tắc execute:

- final cutover ưu tiên CLI để tránh giới hạn upload 512 MB và web timeout;
- bắt buộc truyền rõ organization và branch; không dùng “oldest organization/branch” trong production;
- chỉ chạy trên target đã backup và không có SKU sản phẩm hoặc inventory bucket xung đột; sản phẩm mẫu không liên quan được phép giữ lại;
- thứ tự load: category → unit → product/variant → product unit/price/barcode → ảnh → opening stock;
- một lỗi semantic hoặc database bất kỳ làm kết quả final thất bại; không báo “thành công” khi `completed_with_errors`;
- mapping chỉ nằm trong process; nếu lỗi sau khi đã ghi một phần thì restore toàn bộ database đích rồi chạy lại từ đầu;
- không execute lại cùng hoặc khác bundle trên database đã import một phần;
- xóa upload và thư mục giải nén tạm trong `finally`, nhưng lưu bundle, ZIP SHA-256 và reconciliation report ra nơi backup ngoài application.

Web UI `/legacy-imports` chỉ dùng khi feature flag bật và user active có role owner/manager. UI phải hiển thị đầy đủ preview và buộc xác nhận organization, branch, export ID, ZIP hash trước execute; không chỉ hiển thị thông báo thành công chung.

## 7. Đối soát và acceptance criteria

### Catalog

- source product count = target product mới = target default variant mới + rejected có lý do được duyệt;
- active/inactive count khớp;
- mọi product có đúng một variant mặc định, đúng một base unit conversion `1` và tối đa một default sale unit;
- không còn category/unit/product orphan;
- barcode count khớp theo chính sách deduplicate đã duyệt và không có collision chưa xử lý;
- mẫu UAT gồm barcode có số `0` đầu, barcode phụ, đơn vị lẻ/lốc/thùng, product không giá và product inactive;
- giá và giá vốn VND không bị nhân/chia `100`.

### Ảnh

- số ảnh tham chiếu = copied + missing + invalid path;
- ảnh copied mở được qua public disk/link của production;
- thiếu ảnh là warning đã duyệt, không làm mất product.

### Tồn kho

- một product chỉ có một non-lot balance cho branch đích;
- `scope_key` của opening balance đúng cùng format với `AdjustInventoryAction`;
- tổng tồn base và số product tồn âm khớp nguồn sau conversion đã duyệt;
- smoke test bán một sản phẩm vừa import làm giảm trực tiếp balance mở đầu, không sinh balance non-lot thứ hai;
- `inventory_movements.balance_after` khớp `inventory_balances.quantity_base` ngay sau import.

### Phạm vi và vận hành

- bundle không có customer, invoice, payment, user, settings hoặc secret;
- source cũ vẫn truy cập read-only để tra cứu lịch sử;
- rehearsal MySQL staging và UAT được ký trước final cutover;
- reconciliation có source ZIP hash, export ID, target backup ID, thời gian chạy và người phê duyệt.

## 8. Gate còn lại trước production

Các lỗi fast path đã được xử lý trong code hiện tại: exporter đã nằm trong `MartHubPOS-API`; opening balance dùng `scope_key=branch:variant:0`; base unit luôn có conversion `1`; barcode collision bị chặn; `product_prices` không còn tự tạo unit giả cho giá sỉ; preview có semantic validation; execute rollback khi có row error; target conflict bị chặn; manifest kiểm tra file bắt buộc, byte size và checksum.

Các gate chưa thể tự xác nhận bằng SQLite local:

1. Cài dependency và chạy được `php artisan legacy:export --dry-run` trong môi trường của `MartHubPOS-API` (repo hiện chưa có `vendor/`).
2. Có backup MySQL production và folder ảnh để profile read-only; xác nhận `inventory_quantity_basis=products.unit`.
3. Quyết định nghiệp vụ cho mọi row `reserved_quantity != 0`; không execute khi còn row chưa được duyệt.
4. Hoàn tất rehearsal trên MySQL staging sạch với volume thật, gồm restore, preview, execute, rollback và chạy lại từ đầu.
5. Ký UAT barcode có số `0` đầu, giá lẻ/lốc/thùng, giá sỉ bị loại có lý do, ảnh thiếu, tồn âm và smoke sale làm giảm đúng opening balance.
6. Final cutover phải có backup ID, ZIP SHA-256, reconciliation report và người phê duyệt; CLI execute truyền rõ organization/branch.

## 9. Runbook rehearsal và cutover

### Rehearsal

1. Restore backup MySQL legacy vào môi trường read-only và profile schema/data thật.
2. Chốt cách hiểu unit, barcode phụ, `current_stock` và `reserved_quantity` bằng mẫu nghiệp vụ.
3. Đóng toàn bộ NO-GO về code/contract.
4. Export bundle có ảnh; lưu ZIP SHA-256 và source summary.
5. Restore database mới sạch trên MySQL staging, tạo đúng organization/branch/operator.
6. Preview; xử lý toàn bộ error và duyệt warning.
7. Backup target staging rồi execute đúng một lần.
8. Chạy reconciliation, smoke sale, UAT quét barcode/giá/unit/ảnh/tồn âm.
9. Restore target và chạy lại để chứng minh runbook lặp lại được từ đầu.
10. Ghi thời lượng thực tế để khóa cửa sổ cutover và mốc go/no-go.

### Final cutover

1. Xác nhận backup database cũ/mới có thể restore; ghi backup ID và người chịu trách nhiệm rollback.
2. Dừng sale, import sản phẩm, nhập/xuất/điều chỉnh kho ở hệ thống cũ; đồng bộ offline queue về `0`.
3. Chạy dry-run cuối và so với rehearsal; chênh lệch bất thường là NO-GO.
4. Export final kèm ảnh từ `MartHubPOS-API`; lưu bundle ngoài application và xác nhận ZIP hash.
5. Preview trên production mới với organization/branch tường minh.
6. Đạt mọi gate mới execute đúng một lần.
7. Đối soát tự động, sau đó UAT mẫu và smoke sale có hoàn tồn nếu cần.
8. Nếu có error, stock duplicate, sai scale tiền hoặc sai count: dừng sử dụng hệ thống mới, restore backup target và quay về legacy read-only/mutation theo quyết định cutback; không sửa tay rồi import chồng.
9. Khi nghiệm thu đạt, mở hệ thống mới và giữ legacy read-only.

## 10. Tắt và gỡ feature sau cutover

Đặt `LEGACY_PRODUCT_IMPORT_ENABLED=false` ngay sau khi hoàn tất UAT production. Giá trị production nên mặc định false và chỉ bật có chủ đích trong cửa sổ migration.

Các điểm cần gỡ khi hết thời gian lưu feature:

```text
app/Console/Commands/ImportLegacyData.php
app/Http/Controllers/LegacyImportController.php
app/Http/Requests/LegacyImportRequest.php
app/Services/LegacyImportService.php
config/legacy-product-import.php
resources/js/pages/legacy-imports/
routes/web.php                         # route legacy-imports
resources/js/config/navigation.ts      # menu import
resources/js/components/app-sidebar.tsx
app/Http/Middleware/HandleInertiaRequests.php
resources/js/types/index.ts
.env.example
tests/Feature/LegacyImportFeatureTest.php
tests/Unit/LegacyImportServiceTest.php
```

Trước khi gỡ:

1. lưu bundle, checksum, source summary và reconciliation theo retention policy;
2. xác nhận không còn upload/tạm trong `storage/app/private/legacy-imports`;
3. gỡ code/route/menu/config/test trong cùng một change;
4. chạy route list, PHP test, lint, typecheck và production build;
5. không xóa catalog, ảnh, movement hoặc opening balance đã import.

## 11. Definition of Done

### `MartHubPOS-API`

- exporter nằm và chạy trong đúng repo nguồn;
- dry-run profile được backup MySQL production;
- bundle chỉ có allowlist product catalog, manifest/checksum/control totals đầy đủ;
- ảnh và mọi field không map được có báo cáo;
- không cần UI export để thực hiện cutover.

### `MartHubPOSNew-clean`

- toàn bộ NO-GO tại mục 8 đã đóng và có test hồi quy;
- preview semantic không ghi database và final execute thất bại nếu còn error;
- catalog, barcode, unit/price, ảnh và opening stock map đúng schema mới;
- sale sau import trừ đúng opening balance chuẩn;
- không tạo customer, sale, sale item, payment hoặc bảng lịch sử migration;
- rehearsal MySQL staging, reconciliation và UAT đã được ký;
- rollback đã diễn tập và feature import được tắt sau cutover.
