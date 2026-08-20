# Kế hoạch làm mới catalog khi quay lại POS

## 1. Trạng thái và mục tiêu

Trạng thái: **chưa triển khai**.

Mục tiêu của kế hoạch là bảo đảm tab POS đang mở nhận biết thay đổi catalog sau khi sản phẩm được tạo, sửa, đổi giá hoặc chuyển trạng thái ở tab/trang khác, mà không yêu cầu người dùng reload toàn trang và không làm mất giỏ hàng đang bán.

Phạm vi lỗi cần xử lý gồm hai lớp dữ liệu:

1. Catalog trong React memory không được kiểm tra lại khi tab POS trở thành tab đang hoạt động.
2. Cart draft giữ snapshot của product/unit trong IndexedDB, nên dòng hàng đã thêm vào giỏ không tự phản ánh việc product bị ngừng bán hoặc master data đã thay đổi.

## 2. Hiện trạng đã xác nhận

- `PosPage` khởi tạo `currentCatalog` từ Inertia prop `catalog` và chỉ đồng bộ lại khi prop này thay đổi.
- Polling 30 giây hiện chỉ reload `activeShift`.
- Listener `visibilitychange` hiện chỉ flush cart draft; không gọi freshness/snapshot API.
- Backend đã tăng resource version `catalog` sau khi product mutation commit.
- `GET /pos/freshness` đã có khả năng phát hiện version phía POS đang giữ là cũ.
- `GET /pos/snapshot` đã có khả năng trả catalog mới và loại product có `is_active = false`.
- `getPosFreshness()` hiện chỉ được dùng trong bước kiểm tra trước checkout, nên UI có thể stale cho tới lúc thanh toán.
- Link sidebar dùng Inertia `prefetch`; response `/pos` đã prefetch cũng có thể cũ trong thời gian cache còn hiệu lực.
- Cart line hiển thị trực tiếp từ `line.product` và `line.productUnit` đã lưu trong draft, không phải từ `currentCatalog` mới nhất.

Kết luận: backend và resource-version contract đã đủ nền tảng. Phần thiếu chính là lifecycle refresh ở frontend và cách biểu diễn cart line không còn hợp lệ.

## 3. Quyết định triển khai

| Nội dung | Quyết định |
| --- | --- |
| Nguồn xác thực freshness | Dùng `GET /pos/freshness` và `GET /pos/snapshot` hiện có |
| Trigger chính | Khi POS mount, khi document chuyển sang `visible`, khi window nhận `focus`, và khi kết nối trở lại online |
| Chống request trùng | Một request đang chạy tại một thời điểm, gộp các trigger gần nhau và bỏ qua trigger khi tab còn hidden |
| Polling catalog liên tục | Không thêm; freshness-on-activation nhẹ hơn và đúng với lỗi cần sửa |
| Inertia prefetch | Không dùng cache prefetch làm nguồn xác thực; freshness check lúc POS mount sẽ sửa response cũ |
| Cart price | Giữ snapshot giá tại thời điểm thêm hàng; không tự đổi giá hoặc tổng tiền |
| Product ngừng bán đã có trong cart | Giữ dòng để không mất dữ liệu âm thầm, đánh dấu không còn khả dụng và yêu cầu xóa/chọn lại trước checkout |
| Checkout | Giữ `ensureCheckoutDataFresh` làm chốt xác thực cuối cùng phía client; server vẫn là authoritative |
| Offline | Không gọi freshness khi offline; tiếp tục dùng snapshot hiện có và kiểm tra ngay khi online lại |
| Global state/package mới | Không thêm |

## 4. Hành vi đích

```text
Product được cập nhật ở tab/trang khác
  → backend commit mutation
  → catalog resource version tăng
  → người dùng quay lại POS
  → POS gọi freshness bằng version đang giữ
  → nếu catalog/inventory thay đổi, tải snapshot cần thiết
  → cập nhật currentCatalog/currentCategories/currentVersions
  → catalog search index tự rebuild
  → product ngừng bán biến mất khỏi catalog
  → cart cũ được đối chiếu nhưng không bị đổi giá/xóa dòng âm thầm
```

Nếu freshness request thất bại, POS tiếp tục giữ dữ liệu hiện tại, hiển thị lỗi có thể phục hồi và vẫn chạy lại authoritative check trước checkout.

## 5. Kế hoạch triển khai

### Giai đoạn 1 — Tách orchestration làm mới resource

Tạo hook thuộc feature POS, dự kiến:

- `resources/js/features/pos/hooks/use-pos-resource-refresh.ts`;
- export hook qua `resources/js/features/pos/index.ts`.

Trách nhiệm của hook:

1. Nhận `versions`, trạng thái online và callback áp dụng snapshot.
2. Gọi `getPosFreshness(versions)`.
3. Chuyển `changed` thành danh sách snapshot resource:
   - `catalog` → `catalog`, `categories`;
   - `inventory` → `catalog`, `categories`, `expiryAlerts`;
   - `customers` → `customers`;
   - `activeShift` → `activeShift`.
4. Không gọi snapshot nếu `changed` rỗng.
5. Dedupe resource trước khi gọi `getPosSnapshot()`.
6. Cập nhật `versions` kể cả khi resource không yêu cầu render lại.
7. Dùng single-flight/ref để tránh `focus` và `visibilitychange` tạo hai request song song.
8. Không để response cũ ghi đè response mới nếu có request kế tiếp.

Không đặt request trực tiếp vào component trình bày như `CatalogPanel` hoặc `CartTable`.

### Giai đoạn 2 — Gắn lifecycle của POS

Sửa `resources/js/pages/pos/index.tsx`:

- tái sử dụng `refreshPosResources()` hoặc chuyển phần áp dụng snapshot sang callback ổn định cho hook mới;
- chạy freshness check một lần sau khi POS mount và browser đang online;
- nghe `document.visibilitychange`, chỉ refresh khi `document.visibilityState === 'visible'`;
- nghe `window.focus` để bao phủ trường hợp browser không phát visibility transition như mong đợi;
- nghe chuyển trạng thái online để refresh ngay cả khi không có pending sale cần sync;
- cleanup toàn bộ listener khi unmount;
- không thay đổi focus của ô barcode khi background refresh hoàn tất;
- không reset query, category, checkout draft, cart selection hoặc receipt state khi catalog cập nhật.

Giữ polling `activeShift` hiện tại trong đợt sửa lỗi này. Nếu hook freshness đã bao phủ active shift khi tab được kích hoạt, polling vẫn phục vụ trường hợp ca bị đóng trong lúc POS đang liên tục visible.

### Giai đoạn 3 — Làm rõ contract với Inertia prefetch

Freshness check khi mount phải chạy cả khi `/pos` được mở từ sidebar bằng response prefetch. Vì vậy:

- không phụ thuộc vào việc xóa toàn bộ Inertia prefetch cache;
- không bỏ `prefetch` toàn hệ thống chỉ để sửa lỗi này;
- không coupling `ProductsPage` với hành vi `router.reload('/pos')`;
- có thể cân nhắc flush riêng cache `/pos` sau catalog mutation ở một thay đổi sau, nhưng đây chỉ là tối ưu perceived freshness, không phải correctness boundary.

### Giai đoạn 4 — Đối chiếu cart draft với catalog mới

Không rewrite các object snapshot đã lưu trong `CartDraft`. Thay vào đó tạo derived reconciliation state từ `cart` và `currentCatalog`:

- `available`: product unit vẫn tồn tại trong catalog hiện tại;
- `price_changed`: unit còn tồn tại nhưng master sale price khác snapshot trong cart;
- `unavailable`: product hoặc unit đã bị ngừng bán/xóa khỏi catalog.

Sửa dự kiến:

- `resources/js/features/pos/model/selectors.ts`: thêm selector đối chiếu cart/catalog;
- `resources/js/features/pos/components/cart-table.tsx`: nhận trạng thái derived và hiển thị text/icon rõ ràng, không chỉ dùng màu;
- `resources/js/pages/pos/index.tsx`: tính reconciliation một lần và truyền xuống cart/checkout;
- `resources/js/features/pos/hooks/use-pos-checkout.ts`: chặn submit sớm nếu còn dòng `unavailable`, nhưng vẫn giữ freshness check ngay trước request để chống race condition.

Quy tắc nghiệp vụ:

- không tự xóa product ngừng bán khỏi cart;
- không tự thay `line.unitPrice` bằng master price mới;
- không tự sửa discount, quantity hoặc payment draft;
- product ngừng bán phải biến mất khỏi catalog/search/barcode lookup sau refresh;
- dòng cart không còn khả dụng phải có hướng dẫn “xóa dòng và chọn sản phẩm khác”;
- price change tiếp tục theo contract snapshot/owner override hiện có.

### Giai đoạn 5 — Trạng thái lỗi và offline

- Background refresh không được che catalog bằng full-page loading hoặc tạo layout shift.
- Khi freshness/snapshot lỗi, dùng message/status không chặn thao tác và cho phép retry ở lần focus/online tiếp theo.
- Không hiển thị “đã đồng bộ” nếu snapshot chưa tải thành công.
- Khi offline, bỏ qua network refresh; không xóa catalog hoặc cart đang có.
- Khi online trở lại, chạy freshness ngay cả khi pending queue rỗng.
- IndexedDB catalog chỉ được ghi sau khi snapshot mới đã áp dụng thành công qua flow hiện có của `useConnectivity`.

## 6. File dự kiến thay đổi

### Frontend

- `resources/js/pages/pos/index.tsx`
- `resources/js/features/pos/index.ts`
- `resources/js/features/pos/hooks/use-pos-resource-refresh.ts` — file mới
- `resources/js/features/pos/model/selectors.ts`
- `resources/js/features/pos/components/cart-table.tsx`
- `resources/js/features/pos/hooks/use-pos-checkout.ts` nếu cần chặn sớm dòng unavailable

### Backend/test

Không dự kiến đổi production PHP vì endpoint/version contract đã tồn tại. Cập nhật test:

- `tests/Feature/PosFreshnessFeatureTest.php`;
- có thể mở rộng `tests/Feature/CatalogUxFeatureTest.php` nếu assertion thuộc catalog mutation phù hợp hơn.

Không tạo migration, dependency hoặc global store.

## 7. Kế hoạch kiểm thử

### Test tự động phía server

Bổ sung hoặc cập nhật Pest test cho các tình huống:

1. Update product từ active sang inactive làm version `catalog` tăng.
2. Gọi freshness với version cũ trả `changed` chứa `catalog`.
3. Snapshot catalog sau update không còn product inactive.
4. Product ở organization khác không ảnh hưởng version/snapshot của user hiện tại.
5. Snapshot vẫn trả đúng scope organization/branch.

Lệnh dự kiến:

```bash
php artisan test --compact tests/Feature/PosFreshnessFeatureTest.php
php artisan test --compact tests/Feature/CatalogUxFeatureTest.php
vendor/bin/pint --dirty --format agent
```

### Kiểm tra frontend bắt buộc

Project chưa có frontend test runner. Không thêm Vitest/Jest chỉ cho lỗi này nếu chưa được duyệt. Chạy:

```bash
npm run format:check
npm run lint:check
npm run typecheck
npm run build
```

### UAT trình duyệt

1. Mở POS ở tab A, Products ở tab B.
2. Tại tab B, đổi product active thành inactive.
3. Quay lại tab A.
4. Xác nhận chỉ có một chuỗi freshness/snapshot request hợp lệ, product biến mất khỏi catalog mà không reload trang.
5. Lặp lại với đổi tên, giá, barcode và category.
6. Thêm product vào cart trước khi ngừng bán; xác nhận dòng cart không bị mất, có trạng thái unavailable và checkout bị chặn với hướng dẫn rõ ràng.
7. Thêm product vào cart rồi đổi giá; xác nhận tổng tiền không tự đổi và stale-price/override contract vẫn đúng.
8. Chuyển tab nhanh nhiều lần; xác nhận không có request storm hoặc response cũ ghi đè catalog mới.
9. Mất mạng, quay lại POS rồi khôi phục mạng; xác nhận cart/catalog cũ vẫn dùng được theo offline contract và freshness chạy sau reconnect.
10. Điều hướng Products → POS bằng sidebar ngay sau mutation; xác nhận mount freshness sửa được response prefetch cũ.
11. Xác nhận focus barcode, shortcut, held carts, receipt và pending-sale sync không regression.

## 8. Tiêu chí nghiệm thu

- [ ] Product inactive biến mất khỏi catalog tối đa sau lần POS trở thành active/visible tiếp theo.
- [ ] Đổi tên, giá, barcode hoặc category được phản ánh mà không reload toàn trang.
- [ ] Không polling/download toàn catalog khi version không đổi.
- [ ] Không có nhiều freshness/snapshot request song song do cùng một lần chuyển tab.
- [ ] Cart, checkout draft, query, category và focus không bị reset khi refresh.
- [ ] Cart line không bị đổi giá hoặc bị xóa âm thầm.
- [ ] Product/unit unavailable trong cart được chỉ rõ và không thể checkout.
- [ ] Checkout vẫn chạy freshness check cuối cùng.
- [ ] Offline/reconnect và IndexedDB queue không regression.
- [ ] Pest test liên quan, Pint, format, lint, typecheck và production build đều pass.

## 9. Ngoài phạm vi

- WebSocket, SSE hoặc real-time push giữa mọi thiết bị.
- Polling toàn bộ catalog theo chu kỳ ngắn.
- Thay đổi resource-version schema hoặc API contract nếu test hiện tại chứng minh chúng đang đúng.
- Xóa Inertia prefetch trên toàn ứng dụng.
- Tự động reprice cart đang bán.
- PWA offline cold-start hoặc cache HTML `/pos`.
- Thêm frontend test framework/dependency mới khi chưa được phê duyệt.

## 10. Rollback

Chia triển khai thành các commit nhỏ:

1. lifecycle freshness + test backend;
2. cart reconciliation UI;
3. hardening offline/concurrency.

Nếu lifecycle refresh gây request storm hoặc ảnh hưởng focus, rollback riêng listener/hook mới mà vẫn giữ checkout freshness hiện tại. Nếu cart reconciliation gây sai tổng tiền, rollback phần derived UI/chặn sớm; không thay đổi dữ liệu draft đã lưu nên cart cũ vẫn có thể phục hồi.
