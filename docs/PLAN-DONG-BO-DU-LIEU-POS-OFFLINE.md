# Kế hoạch đồng bộ và làm mới dữ liệu POS/offline

## 1. Mục tiêu và phạm vi

Tài liệu này phân tích trạng thái hiện tại của frontend, xác định dữ liệu nào của POS được làm mới sau các thao tác tạo/sửa/xóa và đề xuất kế hoạch bảo đảm dữ liệu trong bộ nhớ, Inertia props và IndexedDB nhất quán.

Trong tài liệu, từ **offline** được hiểu là trường hợp máy bán hàng mất kết nối mạng. Laravel database/cache phía server và browser cache/IndexedDB là hai lớp khác nhau; phạm vi chính ở đây là dữ liệu phía trình duyệt.

Nguồn đã rà soát:

- `resources/js/pages/pos/index.tsx` và toàn bộ `resources/js/features/pos`;
- các trang frontend gọi route bằng Inertia hoặc `requestJson`;
- `routes/web.php`, các controller/action liên quan catalog, tồn kho, bán hàng, khách hàng và ca;
- `resources/js/app.tsx`, `public/sw.js` và các test hiện có.

### 1.1. Các quyết định đã chốt

| Nội dung                           | Quyết định                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Thuật ngữ “office”                 | Là **offline**                                                                                                   |
| Mức hỗ trợ offline                 | Chỉ tiếp tục bán khi trang POS đã mở rồi mới mất mạng                                                            |
| Reload/mở lại `/pos` khi mất mạng  | Không yêu cầu                                                                                                    |
| Dữ liệu sửa từ thiết bị khác       | Phải được kiểm tra và cập nhật **trước khi checkout**; không yêu cầu hiển thị real-time ngay khi mutation xảy ra |
| Cache customer trong IndexedDB     | Không lưu tên, điện thoại hoặc công nợ customer                                                                  |
| Giá cart line khi master price đổi | Giữ giá snapshot tại thời điểm thêm vào cart                                                                     |

Các quyết định trên là acceptance criteria của kế hoạch. Phạm vi không bao gồm PWA/offline cold-start, WebSocket/SSE hoặc đồng bộ customer vào persistent browser storage.

## 2. Kết luận hiện trạng

### 2.1. Trả lời ngắn

| Tình huống                             | Database server                 | Dữ liệu POS đang mở                                                            | IndexedDB catalog                                                              |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Sửa nhanh sản phẩm ngay trên `/pos`    | Có cập nhật                     | Inertia redirect về `/pos` nên catalog mới được trả lại                        | Có ý định ghi lại, nhưng hiện **không đáng tin cậy** do lệch version IndexedDB |
| Tạo/sửa sản phẩm tại `/products`       | Có cập nhật                     | Tab POS khác không tự biết; chỉ mới khi mở/reload `/pos`                       | Không được cập nhật tại trang `/products`                                      |
| Tạo/sửa/xóa danh mục tại `/categories` | Có cập nhật                     | Tab POS khác không tự biết                                                     | Danh mục hiện không được lưu trong catalog cache                               |
| Sửa đơn vị, nhập kho, trả hàng         | Có cập nhật                     | Tồn kho/đơn vị trên POS có thể stale cho đến khi reload                        | Không được cập nhật chủ động                                                   |
| Bán hàng online bằng JSON API          | Có cập nhật tồn kho/công nợ     | Receipt cập nhật, nhưng catalog tồn kho và số dư khách hàng không refetch      | Không ghi catalog mới                                                          |
| Đồng bộ hóa đơn offline                | Có cập nhật khi sync thành công | Pending queue/last receipt cập nhật, nhưng catalog và khách hàng không refetch | Không ghi catalog mới                                                          |

### 2.2. Luồng hiện tại

1. `GET /pos` trả các Inertia props: `catalog`, `categories`, `customers`, `activeShift`, `registers`, `expiryAlerts`, `canManageCatalog`, `latestReceipt`.
2. POS tìm kiếm và bán hàng từ `catalog` trong React memory.
3. `useConnectivity(catalog, ...)` gọi `cacheCatalog(catalog)` mỗi khi prop `catalog` đổi.
4. Chỉ `activeShift` được polling mỗi 30 giây. Catalog, danh mục, khách hàng, tồn kho và receipt không được polling.
5. `catalog` chỉ được ghi vào IndexedDB; source hiện không có hàm đọc catalog để hydrate POS.
6. Service worker cũ đang bị unregister và cache `marthub-pos-*` bị xóa có chủ đích. Vì vậy không có application shell để mở/reload `/pos` khi hoàn toàn offline.

### 2.3. Các vấn đề xác định từ source

#### P0 — Lệch version IndexedDB

- `catalog-cache-repository.ts` mở database `marthub-pos` với version `1`.
- `offline-sale-repository.ts` và `cart-draft-repository.ts` mở cùng database với version `3`.
- Sau khi database đã ở v3, mở lại bằng v1 có thể trả `VersionError`.
- `useConnectivity` gọi `void cacheCatalog(catalog)` nhưng không `.catch()`, nên lỗi ghi cache không được phản ánh vào UI hay retry.

Kết luận: không thể khẳng định catalog mới đã được lưu offline sau mutation.

#### P0 — Cache catalog chỉ có chiều ghi

- Không có `getCachedCatalog()` hoặc luồng hydrate từ IndexedDB.
- Không có metadata `organization_id`, `branch_id`, `schema_version`, `fetched_at` hoặc server version.
- Key duy nhất là `latest`, trong khi tồn kho trong catalog phụ thuộc chi nhánh. Nếu sau này đọc key này mà không bổ sung scope, dữ liệu có nguy cơ lẫn giữa người dùng/chi nhánh trên cùng trình duyệt.
- `categories`, `customers`, `activeShift`, `registers` và `expiryAlerts` không nằm trong snapshot đã cache.

#### P1 — Invalidation chỉ xảy ra gián tiếp trên trang hiện tại

- Các mutation dùng Inertia rồi `return back()` sẽ reload URL hiện tại. Điều này làm đúng danh sách của trang đang mở, nhưng không làm mới một tab POS khác.
- `products.quick-update` gọi từ chính `/pos` là trường hợp tốt nhất: response `/pos` trả catalog mới, React nhận prop mới và kích hoạt ghi IndexedDB. Tuy nhiên vẫn vướng lỗi version ở trên.
- Mutation từ `/products`, `/categories`, `/units`, `/stock-receipts`, `/customers`, `/shifts` chỉ reload trang quản trị tương ứng.
- Không có `BroadcastChannel`, storage event, WebSocket/SSE hoặc catalog polling để báo thay đổi cho POS đang mở.

#### P1 — JSON mutation không làm Inertia reload

- `POST /sales` và `POST /customers/quick` dùng `fetch` qua `requestJson`.
- Tạo nhanh khách hàng tự chèn customer mới vào local state nên dùng được ngay, nhưng các tab khác không biết.
- Bán hàng online/offline sync cập nhật receipt và queue, nhưng không refetch `catalog`, `customers` hoặc `expiryAlerts`. Số tồn và công nợ hiển thị trong POS có thể stale sau chính giao dịch vừa tạo.

#### P0 — Cart hiển thị giá cũ nhưng request có thể dùng giá master mới

- Cart line đang giữ `line.unitPrice` và `line.productUnit.sale_price` tại thời điểm thêm hàng.
- `usePosCheckout` chỉ gửi `unit_price` khi hai giá trị trên khác nhau.
- Nếu master price đổi sau khi hàng đã vào cart, cả hai giá trị local vẫn bằng giá cũ nên request có thể không gửi `unit_price`.
- Backend khi đó lấy `ProductUnit.sale_price` mới làm giá bán, trái với quyết định giữ giá snapshot và có thể khác số tiền cashier vừa xác nhận trên UI.

P0 phải bảo đảm request luôn biểu diễn đúng giá snapshot đã hiển thị. Khi snapshot khác master price mới, cơ chế owner approval hiện có cho price override vẫn được áp dụng; không âm thầm đổi cart sang giá mới.

## 3. Phân loại nguồn dữ liệu POS

| Resource        | Nguồn server              | Nơi dùng                            | Cache hiện tại                         | Yêu cầu freshness     |
| --------------- | ------------------------- | ----------------------------------- | -------------------------------------- | --------------------- |
| `catalog`       | `GET /pos`                | tìm kiếm, barcode, giá, đơn vị, tồn | IndexedDB `catalog/latest`, write-only | Rất cao               |
| `categories`    | `GET /pos`                | lọc catalog, quick edit             | Không cache                            | Cao                   |
| `customers`     | `GET /pos`                | chọn khách, công nợ                 | Không cache và đã chốt không cache     | Cao khi bán nợ/thu nợ |
| `activeShift`   | `GET /pos`                | cho phép checkout                   | Không cache; poll 30 giây              | Rất cao               |
| `registers`     | `GET /pos`                | mở ca                               | Không cache                            | Trung bình            |
| `expiryAlerts`  | `GET /pos`                | status bar                          | Không cache                            | Trung bình            |
| `latestReceipt` | `GET /pos`                | in lại hóa đơn                      | Có bản riêng trong IndexedDB metadata  | Cao                   |
| pending sales   | IndexedDB + `POST /sales` | Sync Center                         | IndexedDB v3                           | Rất cao               |
| cart drafts     | IndexedDB                 | held/active carts                   | IndexedDB v3                           | Rất cao               |

## 4. Danh sách API frontend hiện dùng

Project không có REST API riêng trong `routes/api.php`. Frontend dùng hai kiểu endpoint trong `web` middleware:

- Inertia page/mutation: response page hoặc redirect rồi Inertia GET lại URL hiện tại;
- JSON API: `requestJson` cho sale và quick customer.

### 4.1. Read/navigation API

| Method | Route name/URL         | Dữ liệu chính                          | Có cần refetch sau GET?                      |
| ------ | ---------------------- | -------------------------------------- | -------------------------------------------- |
| GET    | `dashboard`            | KPI, hóa đơn, cảnh báo                 | Không; đây là read                           |
| GET    | `pos`                  | toàn bộ POS bootstrap props            | Đây là nguồn chuẩn cần refetch theo resource |
| GET    | `products.index`       | sản phẩm phân trang, categories, units | Không; refetch khi filter/pagination         |
| GET    | `categories.index`     | danh mục và parent options             | Không; refetch khi filter/pagination         |
| GET    | `units.index`          | đơn vị                                 | Không; refetch khi filter/pagination         |
| GET    | `inventory.index`      | số tồn và lô sắp hết hạn               | Không; refetch khi filter/pagination         |
| GET    | `stock-receipts.index` | phiếu nhập và product units            | Không; refetch khi filter/pagination         |
| GET    | `shifts.index`         | ca và quầy                             | Không; refetch khi filter/pagination         |
| GET    | `sales.index`          | hóa đơn phân trang                     | Không; refetch khi filter/pagination         |
| GET    | `sales.show`           | chi tiết hóa đơn/đổi trả               | Không                                        |
| GET    | `customers.index`      | khách hàng và công nợ                  | Không; refetch khi filter/pagination         |
| GET    | `legacy-imports.index` | màn hình import                        | Không                                        |

`stock-receipts.template` tồn tại ở backend nhưng frontend hiện tạo file `.xlsx` tại client bằng ExcelJS, không gọi endpoint này.

### 4.2. Mutation API và resource phải làm mới

Ký hiệu resource POS: `C` = catalog, `G` = categories, `K` = customers, `S` = activeShift, `E` = expiryAlerts, `R` = latestReceipt.

| Method    | Route                         | Ảnh hưởng server                           | Resource POS cần làm mới          | Hiện tại                                                             |
| --------- | ----------------------------- | ------------------------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| POST      | `products.store`              | thêm product/variant/product units/barcode | C                                 | Chỉ reload `/products`; POS/cache không đổi                          |
| PUT       | `products.update`             | sửa product, units, barcode, trạng thái    | C                                 | Chỉ reload `/products`; POS/cache không đổi                          |
| PATCH     | `products.quick-update`       | tên, category_id, giá bán                  | C                                 | Nếu gọi từ `/pos`, Inertia trả catalog mới; cache có thể lỗi version |
| POST      | `categories.store`            | thêm danh mục                              | G                                 | Chỉ reload `/categories`                                             |
| PUT       | `categories.update`           | tên/màu/thứ tự/trạng thái/cây              | G                                 | Chỉ reload `/categories`                                             |
| DELETE    | `categories.destroy`          | xóa danh mục chưa dùng                     | G                                 | Chỉ reload `/categories`                                             |
| POST      | `units.store`                 | thêm đơn vị chưa gắn product               | Không bắt buộc C                  | Chỉ reload `/units`                                                  |
| PUT       | `units.update`                | đổi code/name/trạng thái đơn vị            | C nếu unit đang được product dùng | Chỉ reload `/units`                                                  |
| DELETE    | `units.destroy`               | xóa unit chưa dùng                         | Không bắt buộc C                  | Chỉ reload `/units`                                                  |
| POST      | `stock-receipts.store`        | tăng tồn, tạo/cập nhật lot, giá vốn        | C, E                              | Chỉ reload `/stock-receipts`                                         |
| POST JSON | `sales.store`                 | sale, payment, giảm tồn/lot, công nợ       | C, K khi có customer/debt, E, R   | Chỉ receipt/local queue được cập nhật                                |
| POST      | `sales.returns.store`         | tăng tồn, hoàn tiền/cấn công nợ            | C, K, E                           | Chỉ reload `/sales/{id}`                                             |
| POST      | `customers.store`             | thêm khách                                 | K                                 | Chỉ reload `/customers`                                              |
| POST JSON | `customers.quick.store`       | thêm khách                                 | K                                 | POS tự append local; cache/tab khác không đổi                        |
| PUT       | `customers.update`            | sửa thông tin/trạng thái khách             | K                                 | Chỉ reload `/customers`                                              |
| POST      | `customers.payments.store`    | giảm công nợ, tạo payment                  | K                                 | Chỉ reload `/customers`                                              |
| POST      | `shifts.store`                | mở ca                                      | S                                 | Đúng nếu gọi từ POS; tab khác chờ poll tối đa 30 giây                |
| POST      | `shifts.close`                | đóng ca                                    | S                                 | Tab POS chờ poll tối đa 30 giây                                      |
| POST      | `shifts.cash-movements.store` | thu/chi trong ca                           | Không có prop POS tương ứng       | Không cần refetch POS hiện tại                                       |
| POST      | `shifts.reconcile`            | đối soát ca                                | Không có prop POS tương ứng       | Không cần refetch POS hiện tại                                       |
| POST      | `legacy-imports.preview`      | chỉ validate/preview                       | Không                             | Không cần                                                            |
| POST      | `legacy-imports.execute`      | catalog, units, tồn hiện tại               | C, G, E                           | Chỉ reload `/legacy-imports`                                         |

`categories.destroy` và `units.destroy` có route backend nhưng source frontend hiện chưa gọi hai endpoint DELETE này. Chúng vẫn được đưa vào ma trận để xác định đúng invalidation nếu UI xóa được bổ sung. Project hiện không có endpoint xóa product.

Các mutation auth/settings (`login`, `logout`, reset password, verify email, profile/password update/delete) không invalidates dữ liệu nghiệp vụ POS. Khi logout hoặc đổi organization/branch, cần xóa hoặc đổi namespace IndexedDB thay vì dùng lại key `latest`.

## 5. Kiến trúc đề xuất

### 5.1. Một nguồn mở IndexedDB duy nhất

Tạo module schema dùng chung cho database `marthub-pos`:

- một hằng `DB_VERSION` duy nhất, nâng từ v3 lên version mới; tuyệt đối không downgrade;
- một `openPosDatabase()` tạo/nâng tất cả stores: `pending-sales`, `cart-drafts`, `metadata`, `catalog-snapshots`;
- giữ migration tương thích với pending sales/cart hiện có;
- mọi transaction đóng DB đúng thời điểm và trả lỗi có thể quan sát;
- bổ sung test upgrade từ v1/v3, không mất pending sale/cart.

Không dùng `Cache::tags()` của Laravel cho vấn đề này: dữ liệu stale đang nằm ở browser, không phải Laravel cache store.

### 5.2. Snapshot có scope và metadata

Thay `catalog/latest` bằng envelope tối thiểu:

```ts
type PosSnapshot = {
  key: `${organizationId}:${branchId}`;
  schemaVersion: number;
  serverVersion: string;
  fetchedAt: string;
  catalog: Product[];
  categories: CategoryOption[];
};
```

Quy tắc:

- không cache dữ liệu nhạy cảm hoặc owner PIN;
- snapshot catalog bắt buộc tách theo organization + branch vì balances phụ thuộc branch;
- ghi catalog và categories trong cùng transaction để tránh snapshot nửa cũ/nửa mới;
- khi logout hoặc scope đổi, không đọc snapshot của scope trước;
- chỉ dùng snapshot cho catalog/categories; không ghi customer vào persistent browser storage;
- trong phiên POS đã mở, React memory là nguồn sử dụng khi mất mạng; không cam kết hydrate sau reload offline.

Customer offline chỉ dùng danh sách đã có trong React memory của phiên đang mở. Khi logout, đổi user hoặc reload, không khôi phục customer từ IndexedDB.

### 5.3. Endpoint snapshot độc lập

Thêm JSON endpoint xác thực, ví dụ:

`GET /pos/freshness`

và khi version thay đổi:

`GET /pos/snapshot?resources=catalog,categories,customers,activeShift,expiryAlerts`

Lý do cần endpoint riêng:

- Inertia partial reload chỉ áp dụng khi request lại cùng page component;
- mutation tại `/products` không thể partial reload props của `/pos` mà không chuyển trang;
- freshness endpoint cho phép POS kiểm tra version nhẹ ngay trước checkout;
- snapshot endpoint trả resource mới khi version đã đổi mà không cần chuyển khỏi trang POS.

Contract đề xuất:

- chỉ cho phép whitelist resource;
- luôn scope theo user organization/branch ở server, không nhận scope tùy ý từ client;
- freshness trả version theo resource; snapshot hỗ trợ ETag để bỏ qua payload chưa đổi;
- dùng cùng transformer/query với `PosController` để tránh hai contract lệch nhau;
- response không được cache công khai bởi browser/proxy vì phụ thuộc session/user/branch.

Version phải là counter tăng đơn điệu theo resource và scope, được bump sau khi transaction mutation commit. Không suy ra version chỉ từ `MAX(updated_at)` vì thao tác DELETE có thể không làm giá trị đó thay đổi. Các nhóm version tối thiểu là catalog master theo organization, inventory theo branch, customers theo organization và active shift theo branch.

### 5.4. Freshness service phía frontend

Tạo một service duy nhất, ví dụ `ensureCheckoutDataFresh()`:

1. Khi cashier xác nhận checkout và trình duyệt đang online, gọi freshness endpoint với các version POS đang giữ.
2. Nếu version không đổi, tiếp tục `POST /sales` ngay.
3. Nếu version đổi, fetch các resource liên quan từ snapshot endpoint.
4. Cập nhật React memory; chỉ ghi `catalog` + `categories` vào IndexedDB, tuyệt đối không ghi customers.
5. Đối soát cart, selected customer và active shift trước khi gửi sale.
6. Nếu freshness request lỗi mạng, chuyển sang luồng offline hiện có và queue sale bằng snapshot trong memory.
7. Nếu server trả lỗi nghiệp vụ/authorization, không coi là offline và không queue; giữ cart để cashier xử lý.

Mutation ở các màn hình quản trị phải bump đúng resource version sau commit theo ma trận mục 4.2. Không cần BroadcastChannel, WebSocket hoặc polling catalog định kỳ vì SLA đã chốt là trước checkout.

### 5.5. Chính sách refresh trên POS

- Khi mount online: dùng bootstrap `/pos` làm nguồn chuẩn và ghi catalog/categories vào IndexedDB.
- Khi trang đã mở rồi mất mạng: tiếp tục dùng catalog, categories và customers trong React memory; không hỗ trợ reload/mở lại `/pos` khi offline.
- Ngay trước checkout online: chạy freshness gate ở mục 5.4.
- Nếu product/unit trong cart đã bị ngừng sử dụng hoặc không còn trong catalog mới: chặn checkout và chỉ rõ dòng cần bỏ/thay thế.
- Nếu selected customer đã bị ngừng sử dụng hoặc không còn hợp lệ: chặn checkout và yêu cầu chọn lại.
- Nếu active shift đã đóng: chặn checkout và yêu cầu mở/chọn ca hợp lệ.
- Nếu master price đổi: giữ `line.unitPrice` cũ, gửi rõ giá snapshot trong payload và áp dụng owner approval hiện có nếu backend xác định đây là price override.
- Khi nhận event `online`: sync pending sales trước; sau khi sync xong refetch `C`, `K`, `E`, `R`.
- Sau `sales.store` online thành công: trả receipt ngay, đồng thời refetch `C`, `K`, `E`; `R` có thể cập nhật trực tiếp từ receipt để tránh request thừa.
- Sau `customers.quick.store`: append customer vào React memory như hiện tại; không ghi customer vào IndexedDB.
- Sau quick product edit tại POS: dùng props mới từ Inertia response hoặc fetch `C`; không tạo double request. Chỉ đánh dấu fresh khi cache write thành công.
- Giữ polling `S` 30 giây như safety net; freshness gate vẫn kiểm tra lại shift ngay trước sale.
- Backend `POST /sales` vẫn là lớp xác thực cuối cùng để xử lý race condition xảy ra sau freshness check.

## 6. Kế hoạch triển khai

### Phase 0 — Chốt contract và sửa tính đúng đắn IndexedDB

1. Hợp nhất `openPosDatabase()` và nâng schema forward-only.
2. Thêm snapshot envelope có organization/branch scope, chỉ chứa catalog/categories.
3. Bổ sung read/write/clear-scope API và xử lý lỗi; không triển khai offline cold-start.
4. Sửa checkout payload để luôn biểu diễn đúng cart price snapshot đã hiển thị.
5. Test migration bảo toàn pending sales, carts, last receipt và test master price đổi sau khi add cart.

Exit criteria:

- không còn nhiều `DB_VERSION` cho cùng database;
- ghi catalog không phát sinh unhandled rejection;
- không thể đọc snapshot khác organization/branch;
- upgrade không làm mất sale chờ đồng bộ hoặc cart draft.
- sale không âm thầm dùng master price mới khi cart đang hiển thị giá snapshot cũ.

### Phase 1 — Resource version, snapshot API và pre-checkout freshness

1. Tách query/transformer POS dùng chung giữa page và JSON endpoint.
2. Thêm resource version tăng sau commit cho catalog, inventory, customers và active shift.
3. Thêm freshness + snapshot endpoints với authorization, whitelist resources và version/ETag.
4. Chạy `ensureCheckoutDataFresh()` trước sale online; đối soát cart/customer/shift rồi mới submit.
5. Nếu freshness lỗi mạng, chuyển đúng sang queue offline; lỗi nghiệp vụ không được queue.
6. Sau sale online/offline sync, refetch đúng resource theo ma trận và chỉ persist catalog/categories.

Exit criteria:

- thay đổi từ thiết bị quản lý được phát hiện và cập nhật trước checkout;
- product/unit/customer/shift không còn hợp lệ sẽ chặn checkout với lỗi thao tác được;
- cart giữ giá snapshot; price override tiếp tục tuân thủ owner approval;
- bán hàng làm số tồn/công nợ trên POS mới lại mà không reload toàn trang;
- sync offline thành công làm mới catalog và last receipt;
- không ghi customer vào IndexedDB.

### Phase 2 — Bump version từ các mutation

1. Gắn resource tags cho product/category/unit/stock/customer/shift/return/import mutations theo mục 4.2.
2. Bump version sau transaction commit để không công bố dữ liệu chưa commit.
3. Giữ Inertia reload trang quản trị hiện tại như source đang làm; không thêm fetch toàn POS tại trang quản trị.
4. Không thêm BroadcastChannel, WebSocket/SSE hoặc catalog polling định kỳ.

Exit criteria:

- sửa product/category/unit, nhập kho/trả hàng hoặc import làm version tương ứng tăng;
- customer/shift mutation làm version đúng scope tăng;
- POS phát hiện mọi version mới trong freshness gate trước checkout.

### Phase 3 — Kiểm thử và rollout

1. Feature test cho snapshot authorization, branch scope, resource whitelist và response contract.
2. Feature test từng nhóm mutation bump đúng version sau commit và không bump khi transaction rollback.
3. Frontend test cho IndexedDB upgrade/read/write failure và pre-checkout freshness state machine.
4. UAT hai thiết bị, hai user cùng branch, hai branch, mất mạng trong freshness check, reconnect và pending sale conflict.
5. Rollout có logging/telemetry cho snapshot fetch/write failure; không log customer data/PIN.

## 7. Danh sách test tối thiểu

| Nhóm             | Ca kiểm thử bắt buộc                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| IndexedDB        | v1→mới, v3→mới, giữ pending sales/cart/receipt, version không downgrade                   |
| Scope            | user đổi branch/org không thấy snapshot cũ                                                |
| Quick edit       | PATCH từ POS trả catalog mới, search index rebuild, cart line giữ giá snapshot            |
| Price snapshot   | master price đổi sau add cart; payload/receipt vẫn dùng giá cart và yêu cầu đúng approval |
| Product/category | create/update/deactivate bump version và được refresh trước checkout                      |
| Unit/barcode     | đổi code/name/barcode làm scanner/catalog dùng dữ liệu mới                                |
| Inventory        | nhập kho/sale/return cập nhật balance và expiry alert                                     |
| Customer         | refresh memory trước checkout nhưng không tạo customer store trong IndexedDB              |
| Shift            | open/close từ thiết bị khác được kiểm tra trước checkout                                  |
| Offline warm     | trang đang mở tiếp tục bán; không cam kết reload/mở mới khi mất mạng                      |
| Offline sync     | sync thành công/xung đột/lỗi mạng; queue không mất và catalog được refetch khi online     |
| Security         | endpoint snapshot bị chặn khi chưa auth và không nhận organization/branch giả từ client   |

## 8. Thứ tự ưu tiên API cần refetch

1. **P0:** `sales.store`, offline sale sync → `catalog`, `customers`, `expiryAlerts`, receipt.
2. **P0:** `products.store/update/quick-update` → `catalog` và snapshot IndexedDB.
3. **P0:** `stock-receipts.store`, `sales.returns.store` → `catalog`, `expiryAlerts`, customer khi liên quan.
4. **P1:** `categories.*`, `units.update` → `categories`/`catalog`.
5. **P1:** `customers.*` → `customers`.
6. **P1:** `shifts.store/close` → `activeShift`.
7. **P1:** `legacy-imports.execute` → full catalog/categories/expiry snapshot.

## 9. Acceptance criteria đã xác nhận

1. POS đang mở có thể tiếp tục tạo hóa đơn vào offline queue khi mất mạng.
2. Không yêu cầu tải hoặc reload trang `/pos` khi hoàn toàn offline.
3. Khi online, mọi checkout phải kiểm tra resource version và lấy dữ liệu mới nếu có mutation từ thiết bị khác.
4. Không lưu customer list, số điện thoại hoặc công nợ vào IndexedDB.
5. Cart line giữ giá tại thời điểm thêm hàng; master price mới không được âm thầm thay đổi tổng tiền đã hiển thị.
6. Dữ liệu server tại `POST /sales` vẫn là thẩm quyền cuối cùng; lỗi nghiệp vụ không được biến thành offline sale.

## 10. Ngoài phạm vi mặc định

- Không tái bật service worker/PWA application shell; offline cold-start đã được xác nhận ngoài phạm vi.
- Không triển khai BroadcastChannel, WebSocket/SSE hoặc catalog polling định kỳ.
- Không thêm dependency mới trước khi được duyệt.
- Không thay đổi lịch sử hóa đơn khi master product/category/unit thay đổi.
- Không lưu customer data, owner PIN hoặc dữ liệu nhạy cảm vào IndexedDB.
