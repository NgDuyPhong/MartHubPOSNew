# Đánh giá trải nghiệm màn hình POS

> Ngày đánh giá: 16/08/2026  
> Phạm vi chính: `resources/js/pages/pos/index.tsx` và toàn bộ `resources/js/features/pos`  
> Đối tượng sử dụng: thu ngân/nhân viên cửa hàng tiện lợi, chủ cửa hàng hoặc quản lý có quyền sửa catalog

## 1. Kết luận ngắn

Màn hình POS hiện tại có **nền tảng nghiệp vụ tốt và đúng hướng**, đặc biệt ở tìm kiếm barcode cục bộ, bố cục catalog–giỏ hàng, thanh toán inline, hỗ trợ nhiều đơn vị bán, QR xác nhận thủ công, owner PIN, queue offline và idempotency. Một nhân viên đã được đào tạo có thể dùng màn hình này để bán hàng trong môi trường kiểm thử hoặc pilot có giám sát.

Tuy nhiên, màn hình **chưa nên được coi là sẵn sàng cutover production** trước khi xử lý các lỗi P0 về phím tắt phá hủy dữ liệu, chọn multiple variants, đồng bộ offline qua ranh giới ca, validation tiền tại chỗ và UAT bản in 58 mm. Rủi ro lớn nhất hiện tại không nằm ở thẩm mỹ mà nằm ở khả năng nhân viên vô tình xóa giỏ, không chọn được hoặc chọn nhầm variant, để sale offline mắc kẹt sau khi ca cũ đóng, hoặc nhận phản hồi lỗi quá xa vị trí đang thao tác.

Đánh giá tổng thể hiện tại: **6,5/10**.

| Nhóm tiêu chí                  | Điểm | Nhận xét ngắn                                                                                        |
| ------------------------------ | ---: | ---------------------------------------------------------------------------------------------------- |
| Tốc độ tìm/scan và thêm hàng   | 8/10 | Local search index, exact barcode và tăng số lượng dòng có sẵn rất phù hợp POS.                      |
| Hiển thị giỏ và tổng tiền      | 7/10 | Tách vùng rõ; nhưng bảng chật ở viewport trung bình và input tiền còn dễ nhập sai.                   |
| Luồng thanh toán               | 7/10 | Checkout inline là lựa chọn đúng; QR, cash, debt khá đầy đủ.                                         |
| An toàn thao tác               | 4/10 | F8/Delete có thể gây mất dữ liệu; chưa có undo/confirm phù hợp.                                      |
| Ca/quầy và quyền               | 7/10 | Đáp ứng bối cảnh một máy/một ca dùng chung; cần contract rõ trước khi mở rộng thêm máy.              |
| Offline và phục hồi            | 5/10 | Có durable queue và idempotency, nhưng UI chưa cho biết syncing/failed/conflict hoặc cách khôi phục. |
| Desktop và responsive fallback | 6/10 | Hợp keyboard desktop, nhưng cần UAT độ phân giải quầy và tránh bảng giỏ bị chật.                     |
| Accessibility/keyboard         | 5/10 | Có focus và shortcut cơ bản, nhưng shortcut xung đột input và combobox chưa hoàn chỉnh.              |
| In/reprint hóa đơn             | 5/10 | Có preview 58 mm, nhưng cần UAT CSS in và bổ sung dữ liệu/đường reprint rõ.                          |

## 2. Phạm vi và giới hạn đánh giá

Đánh giá được thực hiện từ:

- page compose POS;
- catalog, giỏ hàng, checkout, mở ca, trạng thái kết nối và receipt components;
- hooks cho cart, shortcut, checkout và connectivity;
- IndexedDB queue, sync service, API contract;
- controller/action Laravel tạo sale, ca/quầy và inventory;
- CSS responsive, theme và print;
- `README.md`, kế hoạch UX, kế hoạch refactor và ma trận chức năng đã chốt.

Trong phiên đánh giá không có trình duyệt khả dụng để mở ứng dụng local. Vì vậy:

- các kết luận về logic, state, accessibility markup và contract là bằng chứng trực tiếp từ source;
- các nhận xét về độ chật, layout shift, contrast và bản in cần được xác nhận thêm bằng UAT trên đúng màn hình quầy, scanner và máy in thật;
- chưa có đo thời gian scan-to-cart, input-to-paint hoặc checkout latency trên dữ liệu production.

### 2.1. Bối cảnh vận hành đã được chủ dự án xác nhận

- Quầy hiện dùng một máy tính bàn 1920×1080, bàn phím thông thường, Google Chrome và không có màn hình cảm ứng.
- Hiện có một máy POS, một ca mở trên một chi nhánh; nhiều nhân viên dùng chung ca.
- Máy quét gửi phím `Enter` sau barcode.
- Một hóa đơn trung bình khoảng năm dòng hàng.
- Catalog hiện gần 3.000 sản phẩm; số variants, units, barcodes và customers chính xác sẽ được đo sau final migration.
- Có nhu cầu giữ nhiều đơn vì khách đến sau có thể hoàn tất mua hàng trước khách đang chọn dở.
- Không tự động in sau checkout; nhân viên quyết định in hoặc không vì phần lớn khách không lấy hóa đơn.
- Khi đang có sale offline mà ca cũ đã đóng, cửa hàng vẫn mở ca mới; sale offline được ghi về ca gốc và ca gốc được đánh dấu cần đối soát lại.
- Một sản phẩm thực tế có thể có nhiều variants.
- Unit đóng gói như `thùng` chỉ nhập số nguyên. Trường hợp 1 thùng + 12 lon phải tạo hai cart line theo đúng giá của từng unit.
- Hệ thống được phép bán âm kho; chỉ cần cảnh báo, không yêu cầu nhập lý do hoặc manager approval.
- Model/driver máy in 58 mm chưa được xác định và phải được bổ sung trước UAT phần cứng.

Các xác nhận này làm thay đổi ưu tiên: keyboard/desktop, giữ nhiều đơn, multiple variants và đồng bộ qua ranh giới ca là các hạng mục quan trọng; touch keypad chỉ còn là fallback, không phải yêu cầu vận hành chính.

## 3. Luồng sử dụng hiện tại

```text
Mở POS
  → kiểm tra/mở ca
  → focus ô scan/tìm kiếm
  → scan hoặc chọn card/unit
  → sửa số lượng/giá/giảm giá nếu có quyền
  → mở checkout
  → nhập cash/QR/chọn khách nếu còn nợ
  → xác nhận QR/owner PIN khi cần
  → lưu online hoặc queue offline
  → xem/in hóa đơn
```

Luồng tổng thể này hợp lý cho cửa hàng tiện lợi. Checkout được đặt inline thay vì nhét vào dialog nhiều bước là một quyết định tốt vì nhân viên vẫn nhìn thấy tổng tiền và không bị focus trap trong lúc bán.

## 4. Những điểm đang làm tốt

### 4.1. Tìm kiếm và barcode

- Exact barcode dùng `Map`, phù hợp yêu cầu phản hồi nhanh của scanner.
- Tìm kiếm tên/SKU hỗ trợ tiếng Việt không dấu.
- `useDeferredValue` giảm giật khi lọc catalog lớn mà không debounce barcode.
- Catalog render theo batch 100 card, tránh render toàn bộ DOM ngay lập tức.
- Scan lại cùng unit sẽ tăng số lượng dòng hiện có thay vì tạo dòng trùng.
- Sau khi add hàng hoặc đóng quick edit, focus được trả về ô scan.

Đây là phần tốt nhất của màn hình và nên được giữ nguyên về kiến trúc local index. Không nên thay nó bằng request search theo từng ký tự.

### 4.2. Cart và tính tiền

- Product, unit, quy đổi, số lượng, đơn giá, giảm giá và thành tiền được tách thành các cột rõ ràng.
- Dùng formatter `vi-VN` cho tiền và số lượng hiển thị.
- Giá dòng trong cart được giữ như snapshot khi catalog đổi; UI có cảnh báo stale price.
- Server vẫn là nguồn tính tiền/tồn kho authoritative, client không phải nguồn quyết định cuối cùng.
- Owner PIN được yêu cầu khi sửa giá/giảm giá và bị khóa offline.

### 4.3. Checkout

- Cash, QR và ghi nợ có thể phối hợp trên một hóa đơn.
- QR không tự động coi là đã thanh toán; thu ngân phải xác nhận đã kiểm tra tiền vào.
- Khi còn nợ, hệ thống bắt buộc chọn khách hàng.
- Có hiển thị đã trả, còn nợ và tiền thừa.
- Có processing state và idempotency key cho mỗi lần tạo sale.

### 4.4. Offline

- Pending sale được lưu trong IndexedDB thay vì state tạm trong React.
- Request sync có idempotency nên retry không nên tạo trùng hóa đơn.
- Override giá/discount bị chặn offline, phù hợp contract quyền.
- Màn hình có badge online/offline và số hóa đơn chờ đồng bộ.

### 4.5. Kiến trúc frontend

- Page đã tương đối mỏng và compose feature components/hooks.
- Request, IndexedDB và pure selector đã được tách khỏi presentational component.
- Không đưa nghiệp vụ POS vào primitive `components/ui`.
- Quick edit catalog có permission riêng, không đánh đồng với owner PIN của một sale.

## 5. Phát hiện cần xử lý

### 5.1. P0 — Phím tắt có thể xóa dữ liệu khi nhân viên đang nhập

**Hiện trạng**

- `F8` gọi `clearCart()` ngay, không confirm và không undo.
- `Delete` xóa dòng đang chọn mà không kiểm tra event target có phải `input`, `textarea`, `select` hoặc `contenteditable` hay không.
- Nhân viên có thể đang sửa số lượng, giá, discount, tìm khách hoặc nhập PIN rồi nhấn Delete và làm mất một dòng giỏ ngoài ý muốn.
- Ma trận chức năng đã yêu cầu rõ: F8 chỉ xóa sau xác nhận; Delete không chạy khi đang nhập text.

**Ảnh hưởng**

- Mất công nhập lại giỏ, tăng hàng chờ tại quầy.
- Có thể không nhận ra dòng vừa bị xóa và thu thiếu tiền.

**Đề xuất**

1. Bỏ qua shortcut phá hủy khi target là control nhập liệu hoặc contenteditable.
2. F8 dùng confirmation ngắn hoặc tốt hơn là xóa kèm snackbar `Hoàn tác` trong 5–10 giây.
3. Delete chỉ chạy khi một cart row có selected/focus state rõ.
4. Bổ sung F2 và Enter đúng contract đã chốt hoặc sửa bảng trợ giúp để không hứa hành vi chưa có.

**Bằng chứng:** `use-pos-shortcuts.ts:25–27`, `use-pos-shortcuts.ts:45–47`, `pos-status-bar.tsx:27`, `docs/migration/2026-08-11-211454-02-ma-tran-chuc-nang.md:34–45`.

### 5.2. P1 — Ca/quầy cần được định danh rõ để tránh nợ kỹ thuật khi mở rộng

**Hiện trạng**

- Backend lấy `first()` trong tất cả ca đang mở của chi nhánh.
- Nếu nhiều quầy có ca đang mở, POS không có lựa chọn terminal/register cố định và kết quả `first()` không thể hiện ý định của người dùng.
- `ShiftParticipant` tồn tại nhưng màn POS không cho biết nhân viên đang tham gia ca nào hay có được phép dùng ca đó hay không.

Với bối cảnh hiện tại chỉ có một máy, một ca mở và ca dùng chung, đây **không còn là lỗi chặn cutover ngay lập tức**. Tuy nhiên, việc chọn `first()` vẫn là contract ngầm và sẽ trở thành lỗi dữ liệu nếu thêm máy/quầy thứ hai.

**Ảnh hưởng**

- Sale có thể được ghi vào nhầm quầy/ca, làm sai tiền két và đối soát cuối ca.
- Rủi ro tăng khi cửa hàng chạy nhiều máy hoặc nhiều ca mở đồng thời.

**Đề xuất**

1. Trong giai đoạn một máy, xác nhận bằng validation/config rằng mỗi chi nhánh chỉ có tối đa một ca mở.
2. Vẫn hiển thị rõ `Quầy · Mã ca` trên status bar; không cần flow join từng nhân viên vì ca đã được chốt là dùng chung.
3. Trước khi thêm máy thứ hai, gắn terminal với `register_id` và query active shift theo register thay vì dùng `first()`.
4. Khi ca bị đóng từ nơi khác, refresh trạng thái và khóa checkout ngay với hướng dẫn mở ca mới.

**Bằng chứng:** `PosController.php:34`, `CreateSaleAction.php:40–49`, `OpenShiftAction.php` và bảng `shift_participants`.

### 5.3. P0 — Offline queue có lỗi nhưng nhân viên không được biết lỗi gì

**Hiện trạng**

- `syncPendingSales()` có đếm `failed` nhưng `useConnectivity()` bỏ qua giá trị này.
- UI chỉ hiển thị số pending, không có trạng thái `syncing`, `failed`, `conflict`, lần thử gần nhất hoặc nút retry.
- Lỗi từng sale bị nuốt hoàn toàn trong `catch`.
- Pending sale giữ `shift_id`; nếu ca đã đóng trước khi thiết bị online lại, sale có thể thất bại lặp lại mà nhân viên không có flow giải quyết.
- Chủ dự án đã xác nhận nhân viên vẫn mở ca mới và sale offline cũ phải được sync. Source hiện tại **chưa đáp ứng được policy này**: mở ca mới không thay đổi `shift_id` trong pending payload, còn server chỉ nhận shift đang `open`.

**Ảnh hưởng**

- Nhân viên có thể nghĩ hóa đơn đã lên server trong khi thực tế vẫn mắc kẹt ở thiết bị.
- Cuối ngày có thể chốt ca với queue chưa về 0.
- Xóa browser data/hỏng thiết bị có thể làm mất phần queue chưa export/backup.

**Đề xuất**

1. Badge pending phải mở được một `Sync Center` nhỏ: local ID, thời gian, tổng tiền, trạng thái, lỗi cuối, retry.
2. Hiển thị riêng `offline`, `pending`, `syncing`, `synced`, `failed/conflict` bằng text + icon, không chỉ màu.
3. Có nút `Đồng bộ lại`, đồng thời auto retry có backoff cho lỗi mạng.
4. Với sale phát sinh trong ca cũ nhưng sync sau khi ca đã đóng, quyết định đã được xác nhận là:
   - sale giữ `original_shift_id` và `occurred_at` lúc bán;
   - server cho phép `offline_sync` vào ca gốc đã đóng theo contract riêng có idempotency/audit;
   - ca gốc được đánh dấu `needs_reconciliation` và tính lại expected cash, không âm thầm cộng doanh thu cũ vào ca mới;
   - ca mới vẫn mở và nhận các sale mới bình thường.
5. Không nên tự đổi pending sale sang ca mới chỉ để request pass, vì tiền đã thu thuộc thời điểm/ca cũ và sẽ làm lệch đối soát ca mới.
6. Khi còn pending, màn đóng ca phải cảnh báo rõ. Nếu vẫn cho đóng, phải dùng flow `đóng có pending` và bắt buộc reconciliation sau sync.
7. Cung cấp export bản sao recovery queue theo contract migration trước cutover.

**Bằng chứng:** `offline-sale-sync.ts:4–18`, `use-connectivity.ts:17–31`, `pos-status-bar.tsx:24`, `docs/migration/2026-08-11-211454-02-ma-tran-chuc-nang.md:57`.

### 5.4. P0 — Validation tiền chưa nằm cạnh nơi nhập và một số giá trị sai vẫn hiển thị như hợp lệ

**Hiện trạng**

- Discount có thể lớn hơn gross, làm thành tiền dòng âm trên UI; chỉ server chặn sau khi submit.
- QR có thể lớn hơn tổng hóa đơn; client chưa báo trước dù server từ chối.
- Các input VND nhận `number` bất kỳ, có thể nhập số lẻ trong khi server yêu cầu integer.
- Khi xóa nội dung ô số lượng, `Number('')` thành `0` rồi bị ép thành `0.001`, khiến thao tác gõ lại khó đoán.
- Lỗi checkout được đưa lên message chung ở đầu page. Ở tablet/mobile khi checkout nằm dưới catalog/cart, thông báo có thể nằm ngoài viewport.

**Ảnh hưởng**

- Tăng lỗi nhập tiền và thời gian sửa lỗi tại quầy.
- Nhân viên khó biết field nào sai.
- Có thể nhìn thấy thành tiền âm trước khi server chặn.

**Đề xuất**

1. Dùng draft string cho input số, parse/normalize ở blur hoặc submit.
2. VND dùng `inputMode="numeric"`, `step="1"`, format khi blur và giới hạn integer.
3. Chặn/hiển thị lỗi ngay cạnh discount nếu `discount > unitPrice × quantity`.
4. Chặn QR vượt total; chỉ cash tạo tiền thừa.
5. Field error nằm sát field và có error summary trong checkout; focus field lỗi đầu tiên.
6. Nút xác nhận disabled theo trạng thái hợp lệ, kèm lý do có thể đọc được.

**Bằng chứng:** `cart-table.tsx:74–108`, `cart-summary.tsx:124–139`, `use-pos-checkout.ts:32–38`, `CreateSaleAction.php:74–76`, `CreateSaleAction.php:87–90`.

### 5.5. P0 — Cần UAT và siết lại hợp đồng in 58 mm

**Hiện trạng**

- CSS print đặt kích thước trang và receipt nhưng chưa chủ động ẩn toàn bộ app shell/non-receipt content.
- Receipt chưa hiển thị subtotal, tổng discount, tách cash/QR, tiền thừa, khách hàng, ca/quầy và nhân viên.
- Nút `In` trên success bar chỉ mở preview, cùng hành vi với `Xem hóa đơn`.
- Success bar tự ẩn sau 5 giây; sau đó không có action cố định để mở lại hóa đơn vừa bán dù receipt vẫn còn trong state.

**Ảnh hưởng**

- Bản in có nguy cơ kèm shell/overlay hoặc sai chiều rộng tùy browser/driver.
- Thu ngân và khách thiếu thông tin đối chiếu payment/change.
- Reprint hóa đơn vừa bán không thuận tiện.

**Đề xuất**

1. UAT trên Google Chrome với đúng model/driver máy in 58 mm; test tên hàng dài, số lượng lẻ, discount, debt và return. Model máy in phải được ghi nhận trước khi chạy gate này.
2. Print stylesheet chỉ cho receipt xuất hiện; ẩn shell, overlay và control không in.
3. Bổ sung tổng trước giảm, discount, cash, QR, đã thu, tiền thừa, còn nợ, khách, ca/quầy và cashier theo nhu cầu nghiệp vụ.
4. Đổi hai action thành `Xem` và `In ngay` với hành vi thực sự khác nhau, hoặc gộp thành `Xem & in`.
5. Thêm action cố định `Hóa đơn gần nhất`/`In lại` trên POS.

**Bằng chứng:** `receipt-preview.tsx:18–67`, `receipt-preview.tsx:73–105`, `app.css:159–178`.

### 5.6. P1 — Đóng dialog mở ca có thể để người dùng ở trạng thái cụt

**Hiện trạng**

- Dialog mở ca nhận `onOpenChange` bình thường nên có thể đóng bằng Escape/nút close.
- Status bar chỉ ghi `Chưa mở ca`; không có nút mở lại dialog.
- Nút thanh toán bị disable khi không có active shift nhưng không giải thích lý do tại chỗ.
- Nếu danh sách register rỗng, form dùng `register_id = 0` mà chưa có empty/setup state phù hợp.

**Đề xuất**

- Khi chưa có ca, giữ dialog bắt buộc hoặc luôn có CTA `Mở ca` trong status bar/checkout.
- Disabled checkout có supporting text `Cần mở ca trước khi thanh toán` và CTA.
- Nếu chưa cấu hình quầy, hiển thị hướng dẫn liên hệ quản lý/thêm quầy thay vì select rỗng.

**Bằng chứng:** `index.tsx:38`, `index.tsx:44`, `index.tsx:180`, `pos-status-bar.tsx:23`, `cart-summary.tsx:94`, `open-shift-dialog.tsx:21–22`.

### 5.7. P1 — Bố cục có thể chật trên máy bàn độ phân giải thấp

**Hiện trạng**

- Grid chuyển sang 2/5 + 3/5 theo viewport `lg`, không theo chiều rộng thực còn lại sau sidebar.
- Ở viewport khoảng 1024 px với sidebar mở, phần cart có thể rất hẹp nhưng bảng vẫn giữ năm cột và nhiều width cố định.
- Bảng cart không có wrapper `overflow-x-auto` hoặc layout card thay thế trên màn nhỏ.
- Nút tăng/giảm và ô số lượng chỉ cao/rộng 28 px. Mức này vẫn hơi nhỏ cho thao tác chuột nhanh, dù cửa hàng hiện không dùng màn cảm ứng.
- Dưới `lg`, catalog và cart xếp dọc; total/checkout có thể nằm rất xa sau catalog.

**Đề xuất**

1. Dùng 1920×1080 làm viewport nghiệm thu chính. Chạy regression thêm tại 1600×900, 1536×864, 1440×900, 1366×768 và 1280×720 trên Chrome zoom 100%.
2. Dùng breakpoint/layout theo chiều rộng khả dụng: chỉ chia hai panel khi cart đạt min-width an toàn.
3. Cho cart table cuộn ngang có chủ đích hoặc chuyển dòng cart thành card ở tablet dọc/mobile.
4. Trên màn nhỏ, giữ total và CTA thanh toán sticky; catalog/cart đổi bằng tab hoặc split có kiểm soát.
5. Không cần đầu tư touch mode trong phase hiện tại; chỉ giữ mobile/tablet fallback an toàn để không vỡ layout.
6. Tại mỗi viewport desktop, kiểm tra cả sidebar mở/thu gọn, checkout đóng/mở, cảnh báo offline/stale price và customer picker để bảo đảm không có layout shift hoặc action bị cắt.

**Bằng chứng:** `index.tsx:119`, `index.tsx:134`, `cart-table.tsx:38–108`, `catalog-panel.tsx:76–88`.

### 5.8. P1 — Hợp đồng keyboard/focus chưa hoàn chỉnh

**Hiện trạng**

- Status bar quảng bá F3/F8/F9/F12 nhưng không có bảng trợ giúp đầy đủ.
- Enter chỉ hoạt động tự nhiên nếu nút confirm đang focus; hook không triển khai Enter theo trạng thái checkout hợp lệ.
- F3 focus ô search nhưng không select nội dung hiện có.
- Combobox khách hàng không có ArrowUp/ArrowDown/active descendant/Escape/outside-click contract đầy đủ.
- Nút icon tăng/giảm không có accessible name; label checkout chưa gắn `htmlFor`/`id`.
- Card có outer `div tabIndex=0` và button bên trong, tạo hai focus stop cho một sản phẩm.

**Đề xuất**

- Triển khai shortcut theo state machine nhỏ và bỏ qua input target phù hợp.
- F3 focus + select toàn bộ search text.
- Enter chỉ submit khi checkout hợp lệ và không đang chọn option/nhập multiline.
- Dùng combobox primitive đúng chuẩn hoặc hoàn thiện keyboard/ARIA contract.
- Thêm `aria-label` cho icon-only controls và liên kết Label–Input.
- Một product card chỉ nên có focus stop chính cho hành động add, action phụ tách semantic rõ.

### 5.9. P1 ưu tiên cao — Cần giữ nhiều đơn và phục hồi cart đang làm dở

**Hiện trạng**

- Cart chỉ tồn tại trong React state.
- Reload, session timeout, điều hướng nhầm hoặc lỗi frontend có thể làm mất toàn bộ giỏ.
- Không có giữ đơn/tạm dừng đơn khi khách cần đổi hàng, lấy thêm tiền hoặc nhường lượt.
- Chủ dự án đã xác nhận tình huống này xảy ra thực tế: khách trước chưa chọn xong nhưng khách sau đã sẵn sàng thanh toán.

**Đề xuất**

1. Cho phép nhiều cart draft cục bộ; mỗi draft có local ID, thời gian tạo, người tạo, số dòng, tổng tạm tính và tên/ghi chú ngắn tùy chọn.
2. Action chính gồm `Giữ đơn`, `Đơn mới` và `Mở đơn đang giữ`; có thể kích hoạt F1 sau khi flow hoàn chỉnh.
3. Chuyển cart phải giữ scanner focus và không làm thay đổi cart khác.
4. Payment draft không nên được giữ mặc định; khi giữ đơn phải reset cash/QR/PIN để tránh dùng nhầm tiền của khách trước.
5. Autosave drafts vào IndexedDB hoặc session storage có version/schema rõ và restore sau reload.
6. Khi mở lại đơn, cảnh báo giá/tồn stale nhưng không âm thầm đổi giá đã chốt trong draft.
7. Chỉ tạo sale/stock movement khi checkout; “giữ đơn” không được trừ kho hoặc tạo hóa đơn server.
8. Có xóa đơn giữ với confirmation/undo và giới hạn dọn draft cũ có chủ đích, không tự xóa im lặng.
9. Mặc định cho draft tồn tại qua reload và đổi ca; vì draft chưa phải sale, hóa đơn được gắn vào ca đang mở tại thời điểm checkout. Không tự động xóa draft khi đổi ca.

### 5.10. P0 — Multiple variants chưa được hỗ trợ đầy đủ trên catalog và text search

**Hiện trạng**

- Enter với barcode không khớp và search không trả đúng một sản phẩm sẽ không làm gì.
- Barcode map giữ match đầu tiên nếu có collision trong payload.
- Chủ dự án đã xác nhận một product có thể có nhiều variants. Exact barcode index duyệt qua tất cả variants nên scan barcode riêng của variant vẫn có thể add đúng variant.
- Tuy nhiên, card chỉ render `product.variants[0]`; khi text search chỉ còn đúng một product, Enter cũng lấy `product.variants[0]`. Các variant còn lại vì vậy không thể chọn tin cậy bằng click hoặc tìm tên.
- Tồn kho được hiển thị nhưng không có trạng thái âm/hết/thấp rõ và không cảnh báo khi add hàng âm kho, dù hệ thống chủ động cho phép bán âm.

**Đề xuất**

- Scan lỗi phải có text + âm báo khác biệt, giữ barcode để nhân viên kiểm tra hoặc mở flow tìm/tạo sản phẩm theo quyền.
- Collision phải chặn hoặc yêu cầu chọn, không âm thầm dùng match đầu.
- Card/search result phải cho chọn rõ `variant → unit`, kèm giá và tồn của đúng variant. Không tự mặc định variant đầu khi product có nhiều hơn một variant.
- Hiển thị `Hết hàng`/`Tồn âm`/`Sắp hết` bằng text + icon; vẫn cho bán âm theo policy nhưng yêu cầu nhận biết hoặc lý do nếu đã chốt.

#### Trường hợp bán 1,5 thùng bia

Logic hiện tại vẫn cho nhập số thập phân và xử lý được về **quy đổi tồn**, nhưng đây không phải hành vi đích đã được xác nhận:

- Nếu chọn unit `thùng`, đặt quantity `1.5`, server tính `1.5 × conversion_to_base`. Ví dụ một thùng 24 lon thì tồn giảm 36 lon. Tiền được tính `1.5 × giá thùng`.
- Nếu chính sách bán là `1 thùng theo giá thùng + 12 lon theo giá lon`, phải tạo hai cart line: `1 thùng` và `12 lon`. Cấu trúc key `variant-unit` hiện tại hỗ trợ hai dòng unit khác nhau của cùng variant và server quy đổi tồn đúng.
- Chủ dự án đã chốt không cho nhập trực tiếp `1,5 thùng`. Nhân viên phải tạo `1 thùng + 12 lon` để áp đúng giá của từng unit.

Quy tắc UI đã chốt:

1. Unit đóng gói như thùng dùng step `1` và validation integer ở cả client lẫn server.
2. Quantity thập phân chỉ áp dụng cho unit/product được cấu hình rõ là cho phép bán theo phần, ví dụ kg hoặc lít.
3. Khi khách mua hỗn hợp thùng + lon, nhân viên chọn hai unit riêng; scanner barcode thùng/lon tạo đúng hai dòng.
4. Variant và unit phải được hiển thị rõ trong cart/receipt để không nhầm loại bia hoặc quy cách.

**Bằng chứng:** `index.tsx:86–99`, `catalog-panel.tsx:23–25`, `selectors.ts` phần `barcodeMatches`, `docs/2026-08-14-222010-PLAN-NANG-CAP-UX-TOAN-DIEN.md:304–311`.

### 5.11. P1 — Thanh toán cần tối ưu cho tiền mặt thực tế

**Hiện trạng**

- Nhân viên phải gõ số tiền khách đưa hoặc nhớ F9.
- Input hiển thị số thô, không có phân tách hàng nghìn khi nhập.
- Không có mệnh giá nhanh/nearest tender.
- Khách nợ chỉ chọn được khách có sẵn; không có tạo nhanh khách ngay trong checkout.

**Đề xuất**

- Thêm `Tiền đủ`, các mệnh giá hợp lý theo total và nút làm tròn lên 10k/20k/50k/100k/200k/500k.
- Hiển thị tiền nhập theo format VND nhưng lưu integer.
- Cho tạo nhanh khách với tập field tối thiểu khi phát sinh công nợ; server vẫn validate và tránh record rác.
- Không cần keypad cảm ứng trong giai đoạn hiện tại; ưu tiên phím tắt, nhập bàn phím và focus order.

### 5.12. P2 — Visual system và dark mode chưa nhất quán

**Hiện trạng**

- POS dùng nhiều `bg-white`, `bg-slate-*`, `text-blue-*`, `text-red-*` thay vì semantic token.
- App có dark theme token nhưng các vùng POS có thể giữ nền sáng/text cố định khi dark mode bật.
- Message, stale price, QR confirmation và sync state chưa có component status thống nhất.

**Đề xuất**

- Chuyển dần sang `bg-card`, `bg-muted`, `text-muted-foreground`, `text-destructive`, `primary` và status token có contrast phù hợp.
- Không dùng màu là tín hiệu duy nhất; luôn kèm icon/text.
- Không cần thiết kế lại toàn màn; thực hiện theo từng vertical slice P0/P1 để tránh regression.

### 5.13. P1 — Cần benchmark catalog gần 3.000 sản phẩm trên máy quầy thật

**Hiện trạng**

- Catalog được tải toàn bộ cùng variants, units, barcodes và balances vào Inertia props.
- Local search index và exact barcode `Map` là kiến trúc đúng cho scanner/offline; batch 100 card và lazy image giúp giảm DOM/render ban đầu.
- Gần 3.000 product không phải lý do để chuyển sang server pagination, nhưng tổng payload thực tế phụ thuộc mạnh vào số variants/units/barcodes trên mỗi product.

**Đề xuất**

1. Sau final migration, đo product, variant, product unit, barcode, customer count và kích thước response `/pos` đã nén/chưa nén.
2. Benchmark initial load, thời gian build index, input-to-paint và scan-to-cart p50/p95 trên chính máy 1920×1080 dùng ở quầy.
3. Giữ local index; chỉ virtualize hoặc thay chiến lược cache khi số liệu chứng minh batch rendering hiện tại không đạt baseline.
4. Không để ảnh sản phẩm chặn ô scan hoặc làm layout catalog nhảy khi tải.

## 6. Tính năng nên giữ, thêm, giảm hoặc chưa nên làm

### 6.1. Nên giữ nguyên về nguyên tắc

- Local barcode/search index và batch rendering.
- Catalog và cart cùng xuất hiện trên desktop đủ rộng.
- Checkout inline.
- QR manual confirmation.
- Owner PIN online cho price/discount override.
- Cart giữ giá snapshot khi catalog đổi và có stale warning.
- IndexedDB pending queue + idempotency.
- Quick edit catalog theo capability, audit và khóa offline.
- Receipt snapshot và mục tiêu in 58 mm.

### 6.2. Nên thêm trước cutover hoặc ngay sau P0

| Ưu tiên | Tính năng                                          | Lý do                                                            |
| ------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| P0      | Guard shortcut + confirm/undo xóa giỏ              | Ngăn mất cart và thu sai tiền.                                   |
| P0      | Sync Center + retry/conflict                       | Nhân viên phải biết sale offline đã lên server chưa.             |
| P0      | Sync sale qua ranh giới ca có audit/reconciliation | Policy đã xác nhận nhưng backend hiện từ chối ca cũ đã đóng.     |
| P0      | Inline validation tiền/QR/discount                 | Giảm lỗi tại quầy và round-trip server.                          |
| P0      | Variant/unit picker đúng product                   | Product thực tế có nhiều variants nhưng UI đang lấy variant đầu. |
| P0      | In/reprint đã UAT 58 mm                            | Hóa đơn là output bắt buộc của sale.                             |
| P1      | Cart draft restore                                 | Chống mất giỏ do reload/session/navigation.                      |
| P1 cao  | Giữ nhiều đơn/khôi phục đơn tạm                    | Nhu cầu vận hành đã được xác nhận.                               |
| P1      | Mệnh giá nhanh/tiền đủ                             | Tăng tốc cash checkout bằng bàn phím/chuột.                      |
| P1      | Tạo nhanh khách trong checkout                     | Cần khi phát sinh công nợ cho khách mới.                         |
| P1      | Hóa đơn gần nhất + in lại                          | Sau khi success bar tự ẩn vẫn thao tác được.                     |
| P1      | Scan error feedback                                | Nhân viên không phải đoán scanner có nhận hay không.             |
| P1      | Stock âm/hết/thấp rõ ràng                          | Hệ thống cho bán âm nhưng phải minh bạch.                        |
| P1      | Contract một quầy/một ca rõ ràng                   | Hiện chưa chặn cutover nhưng tránh lỗi khi mở rộng thêm máy.     |
| P2      | Bảng trợ giúp phím tắt                             | Dễ đào tạo nhân viên mới.                                        |

### 6.3. Nên giảm độ ưu tiên hoặc chuyển vị trí

- **Cảnh báo cận/hết hạn:** hiện là badge không có action. Nên cho click sang danh sách lô đã lọc hoặc chỉ hiện cho role cần xử lý; không để chiếm vùng trạng thái bán hàng nếu thu ngân không có quyền/hành động.
- **Quick edit sản phẩm:** nên giữ cho manager/owner, nhưng không xuất hiện hoặc không gây nhiễu cho cashier. Không mở rộng sheet sang conversion, ảnh, lot hoặc toàn bộ variants.
- **Hai nút `Xem hóa đơn` và `In`:** hiện cùng mở preview; nên tách đúng hành vi hoặc gộp lại.
- **Tự động in:** không triển khai. Sau checkout chỉ hiển thị lựa chọn `In`/`Không in` hoặc action in rõ ràng; không ép preview làm chậm khách không lấy hóa đơn.
- **Thông tin shortcut luôn hiện:** ở màn nhỏ nên thu vào nút trợ giúp để dành chỗ cho ca, quầy và sync state.

### 6.4. Chưa nên thêm trong giai đoạn hardening

- Dashboard/biểu đồ doanh thu trong màn POS.
- Animation trang trí, gradient, glassmorphism hoặc card lồng nhiều tầng.
- Checkout nhiều bước trong dialog.
- Loyalty/promotion engine phức tạp khi pricing, sync và recovery cơ bản chưa harden.
- Global state library chỉ để thay các hook hiện tại.

## 7. Layout đích đề xuất

### Desktop/laptop đủ rộng

```text
┌────────────────────────────────────────────────────────────────────┐
│ Online | Quầy 1 · CA-... | 2 HĐ pending [Chi tiết] | [Mở/đổi ca] │
├───────────────────────────┬────────────────────────────────────────┤
│ Scan/tìm kiếm (focus)     │ Hóa đơn hiện tại        [Giữ] [Xóa]  │
│ Category                  │ Dòng sản phẩm / qty / price / giảm     │
│                           │                                        │
│ Product grid              │                                        │
│                           ├────────────────────────────────────────┤
│                           │ Tạm tính · Giảm · PHẢI THU             │
│                           │ [Tiền đủ] [Mệnh giá nhanh] [Thanh toán]│
└───────────────────────────┴────────────────────────────────────────┘
```

### Tablet dọc/mobile fallback

```text
┌──────────────────────────────┐
│ Quầy/ca · network · pending  │
│ Scan/tìm kiếm                │
│ [Sản phẩm] [Giỏ (3)]         │
│                              │
│ Nội dung tab đang chọn       │
│                              │
├──────────────────────────────┤
│ PHẢI THU 125.000đ            │  ← sticky
│ [Thanh toán]                 │
└──────────────────────────────┘
```

Không nên cố ép bảng desktop năm cột xuống màn hình nhỏ. Cart mobile nên ưu tiên tên, unit, quantity và line total; giá/discount mở trong row detail hoặc sheet ngắn.

## 8. Lộ trình đề xuất

### Gate A — An toàn trước production

1. Sửa shortcut F8/Delete/F3/Enter và thêm test cho input target.
2. Bổ sung validation client sát field cho discount, QR, amount integer và empty input.
3. Hỗ trợ chọn đúng variant/unit từ card và text search; UAT trường hợp thùng/lon.
4. Hiển thị sync `pending/syncing/failed/conflict`, manual retry và lỗi từng sale.
5. Triển khai quyết định sync sale về ca gốc đã đóng với audit/reconciliation; không tự gán vào ca mới.
6. Hoàn thiện print-only CSS, receipt data và UAT 58 mm với lựa chọn in thủ công.
7. UAT full flow trên Chrome tại 1920×1080, scanner có suffix `Enter` và keyboard.
8. Ghi rõ constraint một máy/một ca; chuẩn bị ticket register identity trước khi mở rộng thêm máy.

### Gate B — Hiệu suất nhân viên

1. Nhiều cart draft, giữ đơn/khôi phục đơn tạm và restore sau reload.
2. Cảnh báo rời trang khi cart chưa rỗng.
3. Mệnh giá nhanh tối ưu cho bàn phím/chuột.
4. Tạo nhanh khách hàng khi còn nợ.
5. Hóa đơn gần nhất và in lại.
6. Feedback scan lỗi/collision và cảnh báo stock âm/hết.

### Gate C — Tinh chỉnh

1. Semantic token/dark mode.
2. Hoàn thiện combobox accessibility và focus order.
3. Benchmark catalog gần 3.000 sản phẩm và customer payload bằng dữ liệu MySQL staging.
4. Chỉ virtualize catalog hoặc phân tầng customer cache nếu số liệu chứng minh cần.

## 9. Checklist UAT bắt buộc

### 9.1. Thiết bị và viewport

- Google Chrome 1920×1080, zoom 100%, sidebar mở và thu gọn — đây là viewport nghiệm thu chính.
- Regression desktop: 1600×900, 1536×864, 1440×900, 1366×768 và 1280×720.
- Tablet/mobile chỉ kiểm tra fallback không vỡ layout; không cần tối ưu touch workflow trong phase hiện tại.
- Máy quét đang dùng tại cửa hàng, xác nhận mỗi scan kết thúc bằng `Enter` và không add hai lần.
- Máy in nhiệt/driver thực tế khổ 58 mm sau khi xác định được model.

### 9.2. Barcode và cart

- Scan exact barcode của đơn vị lẻ, lốc và thùng.
- Với product nhiều variants, chọn bằng card/text search và scan barcode của từng variant.
- Xác nhận input từ chối `1,5 thùng`; bán `1 thùng + 12 lon` theo hai unit và đối chiếu tiền/tồn.
- Scan lặp cùng barcode nhanh nhiều lần.
- Scan barcode không tồn tại và barcode mơ hồ/collision fixture.
- Tìm tiếng Việt có dấu/không dấu, SKU và chuỗi không có kết quả.
- Thêm sản phẩm hết/âm tồn và kiểm tra cảnh báo.
- Sửa quantity số nguyên và thập phân; xóa trắng rồi gõ lại.
- Sửa giá/discount online với PIN đúng/sai; thử offline.
- Catalog đổi giá khi item đã nằm trong cart.
- F8/Delete khi focus search, quantity, price, customer, PIN.

### 9.3. Checkout

- Cash đủ, cash dư và tiền thừa.
- F9 tiền đủ và Enter xác nhận.
- QR đúng total; QR lớn hơn total; chưa xác nhận QR.
- Cash + QR.
- Partial payment + khách có sẵn.
- Partial payment + khách mới nếu quick-create được triển khai.
- Discount bằng gross và lớn hơn gross.
- Double click/Enter liên tiếp trong processing state không tạo trùng sale.
- Ca bị đóng từ máy khác ngay trước checkout.

### 9.4. Offline và recovery

- Mất mạng trước checkout, trong request và ngay sau response.
- Queue sale, reload trang và kiểm tra pending còn nguyên.
- Online lại và sync thành công đúng một sale.
- Server trả validation/conflict; UI hiển thị lỗi từng sale và retry.
- Ca cũ đã đóng trước sync.
- Mở ca mới trong khi còn pending của ca cũ; sale cũ sync về đúng accounting shift và ca cần reconciliation.
- Browser storage bị từ chối/hết quota.
- Export recovery queue và đối chiếu tổng tiền/số dòng nếu tính năng được triển khai.

### 9.5. Receipt

- Tên sản phẩm dài, Unicode tiếng Việt.
- Nhiều dòng vượt một trang giấy.
- Số lượng thập phân, nhiều unit, discount, debt, cash + QR, change.
- Preview, in ngay và reprint hóa đơn gần nhất/cũ.
- Không in sidebar, overlay, button hoặc nền app.

## 10. Chỉ số nên đo trong pilot

- Scan-to-cart p50/p95.
- Thời gian từ scan item cuối đến hoàn tất cash checkout.
- Số lần sửa/xóa dòng trên 100 hóa đơn.
- Số lần validation server trả về trên 100 checkout.
- Tỷ lệ sale offline sync thành công lần đầu và thời gian pending lâu nhất.
- Số lần reprint.
- Số cart bị abandon/reload mất.
- Số sale âm kho và lý do.
- Số nhầm ca/quầy hoặc chênh lệch két.

Các chỉ số này giúp quyết định có thật sự cần virtualize catalog, phân tầng customer cache hoặc giới hạn bao nhiêu cart draft mở đồng thời; không nên tối ưu theo cảm giác.

## 11. Quyết định nghiệp vụ đã xác nhận và thông tin UAT còn thiếu

### 11.1. Quyết định đã chốt

| Chủ đề           | Quyết định                                            | Ảnh hưởng tới thiết kế                                           |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Thiết bị         | Máy tính bàn 1920×1080, bàn phím, không cảm ứng       | Keyboard-first; regression thêm các viewport desktop phổ biến.   |
| Ca/quầy          | Một máy, một ca/chi nhánh, nhiều nhân viên dùng chung | Chưa cần flow join cá nhân; vẫn phải hiển thị quầy/ca rõ.        |
| Scanner          | Gửi `Enter` sau barcode                               | Giữ exact barcode + Enter contract; test không add trùng.        |
| Browser          | Google Chrome                                         | Chrome là browser UAT/production chính.                          |
| Quy mô cart      | Trung bình khoảng năm dòng                            | Bảng cart hiện tại đủ mật độ; không cần virtualize cart.         |
| Quy mô catalog   | Gần 3.000 sản phẩm                                    | Giữ local index; benchmark payload lồng variants/units/barcodes. |
| Khách xen kẽ     | Có nhu cầu thực tế                                    | Nhiều cart draft/giữ đơn là P1 cao.                              |
| In hóa đơn       | Nhân viên tự chọn, phần lớn khách không lấy           | Không auto-print; action in nhanh, không bắt buộc preview.       |
| Máy in           | Chưa xác định model/driver                            | Không chặn thiết kế; bắt buộc bổ sung trước UAT phần cứng.       |
| Offline qua ca   | Mở ca mới; sale cũ ghi về ca gốc và reconciliation    | Quyết định đã chốt; source hiện chưa hỗ trợ.                     |
| Product variants | Một product có nhiều variants                         | Variant/unit picker là P0; không mặc định `variants[0]`.         |
| Unit đóng gói    | Không nhập `1,5 thùng`; dùng `1 thùng + 12 lon`       | Integer validation cho thùng; hai dòng dùng giá từng unit.       |
| Âm kho           | Chỉ cảnh báo                                          | Không thêm approval/lý do bắt buộc; cần badge/text minh bạch.    |

### 11.2. Không còn câu hỏi nghiệp vụ chặn thiết kế

Các quyết định cần để lập kế hoạch triển khai đã đủ. Những thông tin còn lại có thể thu thập trong staging/UAT:

- model máy in 58 mm, driver và khổ giấy cấu hình trên Chrome;
- số variants, product units, barcodes và customers chính xác sau final migration;
- kích thước payload `/pos`, thời gian initial load, build index và scan-to-cart trên máy quầy;
- viewport CSS thực tế nếu Windows display scaling hoặc Chrome zoom không ở mức 100%.

## 12. Quyết định đề xuất

Không cần redesign toàn bộ màn hình. Hướng hợp lý nhất là **giữ cấu trúc hiện tại, harden theo các lát cắt nhỏ**:

1. xử lý an toàn shortcut và validation;
2. sửa chọn multiple variants/unit và làm rõ pricing cho thùng/lon;
3. hoàn thiện offline recovery qua ranh giới ca;
4. UAT desktop/scanner/print trên thiết bị thật;
5. triển khai nhiều cart draft/giữ đơn;
6. sau đó mới bổ sung mệnh giá nhanh, tạo khách và polish visual.

Cách này bảo toàn những phần POS đang làm tốt, giảm rủi ro thay đổi lớn trước cutover và tạo ra cải thiện trực tiếp cho tốc độ cũng như độ tin cậy của nhân viên tại quầy.
