# Kế hoạch đổi quy cách bán ngay trong giỏ hàng POS

## Mục tiêu

Cho phép thu ngân quét barcode của một quy cách rồi đổi ngay dòng hàng sang quy cách khác của cùng sản phẩm trong `cart-table.tsx`.

Ví dụ: quét barcode `Lon` để thêm `1 Lon Coca-Cola`, sau đó đổi dòng đó thành `1 Lốc Coca-Cola` mà không cần xóa dòng và tìm lại sản phẩm.

## Kết luận sau khi rà source

- Trong mô hình hiện tại, `Lon` và `Lốc` nên là hai `ProductUnit` thuộc cùng một `ProductVariant`; `conversion_to_base` biểu diễn số đơn vị gốc trong mỗi quy cách. Tên “variant/quy cách” trên UI hiện đang gộp hai khái niệm, nhưng trường hợp Lon/Lốc chủ yếu là đổi `ProductUnit`.
- Barcode đã gắn trực tiếp với `product_unit_id`, nên quét mã Lon sẽ chọn đúng đơn vị Lon.
- Cart hiện định danh một dòng bằng `${variant.id}-${productUnit.id}` và chỉ hỗ trợ sửa số lượng, giá, giảm giá hoặc xóa dòng; chưa có thao tác thay `variant`/`productUnit` và cập nhật `key` đồng bộ.
- Payload checkout đã gửi `product_unit_id`; backend lấy giá hiện hành, kiểm tra số lượng và trừ tồn theo `quantity × conversion_to_base`. Vì vậy tính năng này không cần migration hoặc API mới.
- Cart draft lưu toàn bộ `CartLine` trong IndexedDB. Khi thay đổi cart đúng qua hook hiện có, draft sẽ tiếp tục được lưu tự động.
- `VariantUnitPicker` hiện đã hiển thị các variant và đơn vị của một sản phẩm. Nên mở rộng component này để dùng cho cả “thêm vào giỏ” và “đổi quy cách”, tránh tạo thêm một picker trùng chức năng.

## Phương án UX được chọn

Trong cột **Sản phẩm**, chuyển phần đang hiển thị quy cách hiện tại thành một nút phụ có accessible label rõ ràng, ví dụ:

```text
Coca-Cola
[ Lon · 1 LON = 1 đơn vị gốc  ▾ ]
```

- Chỉ hiển thị affordance đổi khi sản phẩm hiện có từ hai lựa chọn bán trở lên; nếu chỉ có một lựa chọn thì giữ dạng text.
- Khi bấm, mở `VariantUnitPicker` ở chế độ **Đổi quy cách bán**. Đây là tác vụ ngắn, một lựa chọn, nên Dialog hiện có phù hợp.
- Đánh dấu quy cách đang chọn và vô hiệu hóa chính lựa chọn đó.
- Sau khi chọn, đóng Dialog, cập nhật dòng cart và trả focus về ô quét/tìm kiếm.
- Cho phép thao tác khi offline vì toàn bộ lựa chọn nằm trong catalog cache và checkout offline đã hỗ trợ `product_unit_id`.
- Không dùng searchable select: dữ liệu đã có sẵn ở client, được nhóm theo một sản phẩm và thường là danh sách ngắn. Các nút lựa chọn lớn trong picker phù hợp hơn với tốc độ thao tác và màn hình cảm ứng POS.

## Quy tắc nghiệp vụ khi đổi

### Số lượng

Giữ nguyên số lượng bán, không giữ nguyên số lượng đơn vị gốc.

- `1 Lon → 1 Lốc` nghĩa là bán một lốc.
- Không tự chuyển thành `1 / conversion_to_base` Lốc vì kết quả thường là số lẻ, trái với ý định thao tác và có thể vi phạm `allows_fractional_quantity`.

### Giá và giảm giá

- Khi đổi sang một dòng chưa tồn tại trong cart, đặt `unitPrice` về `sale_price` của quy cách mới và đặt `discount` về `0`.
- Nếu dòng cũ có sửa giá hoặc giảm giá, hiển thị thông báo rằng giá/giảm giá đã được đặt lại để tránh âm thầm áp dụng giá Lon cho Lốc.
- Việc đặt lại này cũng tránh phát sinh owner override không còn phù hợp với quy cách mới.

### Khi quy cách đích đã có trong cart

Gộp hai dòng thay vì tạo dòng trùng:

- cộng số lượng dòng nguồn vào số lượng dòng đích;
- giữ giá và giảm giá đang có của dòng đích;
- xóa dòng nguồn;
- chuyển `selectedKey` sang dòng đích.

Ví dụ cart đã có `2 Lốc`, đổi dòng `1 Lon` thành Lốc thì kết quả là một dòng `3 Lốc`.

### Catalog thay đổi hoặc quy cách không còn bán

- Chỉ cho chọn các variant/unit còn active trong catalog hiện tại hoặc snapshot offline hiện tại.
- Nếu dòng đang có trạng thái `unavailable`, giữ hành vi hiện tại: yêu cầu xóa và chọn lại. Không lấy danh sách cũ được nhúng trong cart draft để khôi phục một quy cách đã ngừng bán.
- Reconciliation sau khi đổi phải dựa trên `productUnit.id` mới.

## Thiết kế thay đổi theo file

### 1. `resources/js/features/pos/hooks/use-pos-cart.ts`

Thêm action chuyên biệt, ví dụ `changeLineSelection`, thay vì gọi `updateLine` với object rời rạc.

Action thực hiện atomically trong một lần `setCart`:

1. Tìm dòng nguồn theo `key`.
2. Tạo key đích từ `variant.id` và `productUnit.id`.
3. No-op nếu nguồn và đích giống nhau.
4. Nếu key đích đã tồn tại, gộp số lượng và xóa dòng nguồn.
5. Nếu chưa tồn tại, thay `product`, `variant`, `productUnit`, `key`, giữ `quantity`, đặt giá theo catalog mới và xóa giảm giá.
6. Cập nhật `selectedKey` thành key đích.

Không dùng `updateLine` hiện tại cho thao tác này vì cập nhật `key` và xử lý collision cần là một invariant riêng của cart.

### 2. `resources/js/features/pos/components/cart-table.tsx`

- Thêm callback yêu cầu đổi quy cách cho một dòng, ví dụ `onChangeSelection(line)`.
- Dùng dữ liệu reconciliation hiện hành để xác định sản phẩm còn khả dụng và số lựa chọn bán.
- Render quy cách dưới tên sản phẩm thành button khi có thể đổi; giữ text hiện tại khi không có lựa chọn khác.
- Button phải dừng event propagation để không gây side effect chọn row ngoài ý muốn, đồng thời vẫn đặt row hiện tại làm selected nếu contract yêu cầu.
- Có accessible name như `Đổi quy cách bán cho Coca-Cola, hiện tại Lon` và focus state nhìn thấy rõ.
- Không làm thay đổi chiều cao row đáng kể, độ rộng table hoặc các control số lượng/giá hiện tại.

### 3. `resources/js/features/pos/components/variant-unit-picker.tsx`

Mở rộng props theo mode thay vì tạo component mới:

- mode `add`: giữ nội dung và callback hiện tại;
- mode `replace`: đổi title/description, nhận `selectedUnitId`, đánh dấu lựa chọn hiện tại và dùng copy “Đổi quy cách bán”.

Hiển thị số lượng có thể bán theo quy cách để thông tin dễ hiểu hơn:

```text
allows_fractional_quantity = true
    → quantity_base / conversion_to_base

allows_fractional_quantity = false
    → floor(quantity_base / conversion_to_base)
```

Dùng `formatQuantity` hiện có và nhãn ngắn “Tồn: {số lượng} {mã đơn vị}” để giữ picker gọn; đây chỉ là thông tin hỗ trợ, không bổ sung chính sách chặn bán theo tồn trong phạm vi task này.

### 4. `resources/js/pages/pos/index.tsx`

- Thay state `pickerProduct` đơn lẻ bằng context phân biệt rõ hai trường hợp:
  - `{ mode: 'add', product }`;
  - `{ mode: 'replace', product, lineKey, selectedUnitId }`.
- Luồng catalog/search tiếp tục mở picker ở mode `add` như hiện tại.
- Callback từ `CartTable` mở picker mode `replace` bằng product mới nhất lấy từ reconciliation/catalog hiện tại.
- Khi chọn ở mode `replace`, gọi action cart mới, đóng picker, hiển thị thông báo đặt lại giá/giảm giá khi cần và trả focus về `searchRef`.
- Giữ `dialogOpen` của `usePosShortcuts` bao phủ picker để phím tắt không chạy xuyên qua Dialog.

### 5. `resources/js/features/pos/components/index.ts`

Giữ export `VariantUnitPicker` hiện có và chuẩn hóa import tại page qua barrel export; không tạo export/component song song.

## Kiểm thử cần bổ sung

### Unit/hook tests

Tạo test cho cart transition, ưu tiên tách reducer/helper thuần nếu cần để test không phụ thuộc timing React:

- đổi `1 Lon` sang `1 Lốc` giữ quantity `1`, đổi key và `product_unit_id`;
- giá chuyển sang giá Lốc và discount về `0`;
- đổi sang quy cách đã có thì gộp quantity, không còn key nguồn và giữ pricing của dòng đích;
- chọn lại chính quy cách hiện tại là no-op;
- `selectedKey` chuyển đúng sang key mới/key được gộp;
- đơn vị mới có `allows_fractional_quantity` khác được dùng cho validation số lượng sau khi đổi.

### Component tests

Tạo hoặc cập nhật test cho `CartTable` và `VariantUnitPicker`:

- dòng có nhiều lựa chọn hiển thị nút đổi quy cách;
- dòng chỉ có một lựa chọn hiển thị text, không tạo action giả;
- click action gửi đúng dòng và không kích hoạt nhầm action khác;
- picker mode replace có title đúng, đánh dấu/vô hiệu hóa lựa chọn hiện tại;
- chọn Lốc gọi callback đúng `product`, `variant`, `productUnit`;
- hành vi keyboard và accessible name hoạt động.

### Regression/UAT POS

- Quét barcode Lon nhiều lần vẫn cộng quantity dòng Lon như hiện tại.
- Đổi Lon thành Lốc cập nhật đơn giá, thành tiền và tổng hóa đơn ngay.
- Checkout online tạo `SaleItem.product_unit_id` của Lốc và `quantity_base = quantity × conversion_to_base`.
- Checkout offline lưu payload với `product_unit_id` mới, phục hồi cart draft và sync bình thường.
- Đổi quy cách, giữ đơn, chuyển đơn rồi quay lại vẫn thấy dữ liệu mới.
- Catalog refresh/reconciliation không báo stale cho unit mới hợp lệ.
- Dialog đóng bằng chọn, Escape hoặc click ngoài đều trả focus về ô quét theo contract hiện tại.
- Các phím tắt xóa dòng/checkout không chạy khi picker đang mở.

## Lệnh xác minh khi triển khai

Chạy tối thiểu các kiểm tra sau, điều chỉnh tên file test theo tên thực tế được tạo:

```bash
npm test -- resources/js/features/pos/hooks/use-pos-cart.test.tsx resources/js/features/pos/components/cart-table.test.tsx resources/js/features/pos/components/variant-unit-picker.test.tsx
npm run typecheck
npm run lint:check
npm run build
php artisan test --compact --filter=PosSaleFeatureTest
php artisan test --compact --filter=PosOfflineSyncFeatureTest
```

Nếu triển khai không sửa PHP thì không cần thêm backend test mới chỉ để lặp lại phép quy đổi đã được backend đảm nhiệm; vẫn chạy hai feature test POS liên quan để bảo vệ contract checkout.

## Tiêu chí nghiệm thu

- Thu ngân có thể đổi một dòng từ Lon sang Lốc ngay trong cart với tối đa hai thao tác: mở picker và chọn Lốc.
- `1 Lon → 1 Lốc` cho kết quả quantity `1`, giá Lốc và thành tiền đúng.
- Cart không sinh hai dòng trùng cùng `variant + productUnit`; trường hợp trùng được gộp theo quy tắc đã nêu.
- Không giữ nhầm giá/giảm giá của quy cách cũ.
- Checkout online/offline đều gửi đúng `product_unit_id` mới và backend tiếp tục là nguồn quyết định authoritative cho tiền/tồn kho.
- Luồng barcode, keyboard shortcut, focus, held carts, IndexedDB draft và reconciliation không bị regression.
- Không thêm dependency, migration hoặc endpoint mới.

## Ngoài phạm vi

- Tự động suy đoán Lốc khi quét đủ số Lon.
- Tự gom `12 Lon` thành `1 Lốc` dựa trên conversion.
- Thay đổi chính sách cho phép bán âm kho.
- Sửa cấu trúc quản trị Product/Variant/Unit hoặc thêm barcode mới.
- Đổi quy cách cho sale đã hoàn tất hoặc luồng trả hàng.
