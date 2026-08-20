# Kế hoạch tối ưu MartHub POS

## 1. Mục tiêu

Kế hoạch này ưu tiên ba kết quả:

1. rút ngắn và làm liền mạch thao tác bán hàng tại quầy;
2. bảo đảm các giao dịch liên quan đến tiền, tồn kho và công nợ an toàn khi retry hoặc xử lý đồng thời;
3. đưa source về trạng thái có thể dựng, kiểm tra, migration và rehearsal lặp lại được trước cutover.

Thứ tự triển khai dựa trên rủi ro và dependency. Không mở rộng loyalty, supplier, multi-branch hoặc báo cáo nâng cao trước khi hoàn thành các pha nền tảng bên dưới.

## 2. Vấn đề UX ưu tiên: popup thanh toán gây gián đoạn

### Hiện trạng

Màn POS hiện mở một `Dialog` khi nhấn `Thanh toán`, sau đó tiếp tục mở một `Dialog` hóa đơn khi giao dịch thành công. Luồng này:

- che toàn bộ catalog và giỏ hàng;
- làm mất ngữ cảnh khi cần kiểm tra hoặc sửa dòng hàng;
- tạo hai lớp gián đoạn liên tiếp cho mỗi hóa đơn;
- khiến thao tác bàn phím và việc trả focus về ô quét mã khó đoán;
- không phù hợp nhịp bán liên tục tại quầy.

### Thiết kế đích

Thay popup thanh toán bằng **checkout inline trong cột giỏ hàng**:

```text
┌──────────────────────────────────────────────────────────┐
│ Hóa đơn hiện tại                                         │
├──────────────────────────────────────────────────────────┤
│ Danh sách dòng hàng                                      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Tạm tính | Giảm giá | Phải thu                           │
├──────────────────────────────────────────────────────────┤
│ [Tiền mặt] [QR] [Kết hợp] [Ghi nợ]                       │
│ Tiền khách đưa / mệnh giá nhanh                          │
│ QR + xác nhận đã nhận tiền                               │
│ Khách hàng (chỉ bắt buộc khi còn nợ)                     │
│ Tiền thừa / còn nợ                                       │
│                         [Xác nhận thanh toán — Enter]     │
└──────────────────────────────────────────────────────────┘
```

Quy tắc tương tác:

- `F12` mở rộng/focus vùng checkout inline, không mở modal;
- `F9` chọn tiền mặt, điền đúng số phải thu và focus nút xác nhận;
- `Enter` xác nhận khi dữ liệu hợp lệ;
- `Escape` thu gọn checkout và trả focus về ô tìm sản phẩm;
- nút `Quay lại` được thay bằng hành vi thu gọn, không xóa dữ liệu thanh toán;
- nếu sửa giỏ sau khi nhập tiền, tổng tiền và tiền thừa/công nợ cập nhật ngay;
- PIN chủ cửa hàng chỉ xuất hiện inline khi có sửa giá hoặc giảm giá;
- offline vẫn dùng cùng bố cục nhưng hiển thị rõ hành động `Lưu hóa đơn offline`.

Sau khi thanh toán thành công:

- không tự mở popup hóa đơn;
- hiển thị thanh trạng thái thành công trong cột giỏ với mã hóa đơn, tổng tiền, tiền thừa và các nút `In`, `Xem hóa đơn`, `Đơn mới`;
- tự tạo giỏ mới và trả focus về ô quét mã sau một khoảng ngắn hoặc ngay khi người dùng chọn `Đơn mới`;
- chỉ mở bản xem trước hóa đơn khi người dùng chủ động chọn `Xem hóa đơn`;
- hỗ trợ cấu hình `Tự động in sau thanh toán` sau khi đã UAT máy in thật.

### Responsive

- Desktop/tablet ngang: checkout nằm cố định ở đáy cột giỏ.
- Tablet dọc/mobile: checkout dùng panel toàn màn hình theo bước, nhưng không dùng modal nổi ở giữa màn hình.
- Vùng hành động chính có touch target tối thiểu 44 px.
- Khi bàn phím ảo mở, tổng tiền và nút xác nhận vẫn nhìn thấy.

### Acceptance criteria

- Bán cash đủ tiền bằng chuỗi `quét → F12 → F9 → Enter` mà không xuất hiện popup.
- Sau giao dịch, người dùng có thể quét đơn tiếp theo mà không phải đóng dialog.
- Cash, QR, kết hợp và ghi nợ đều dùng được bằng chuột lẫn bàn phím.
- QR không được hoàn tất nếu chưa xác nhận đã nhận tiền.
- Công nợ không được lưu nếu chưa chọn khách hàng.
- Sửa giá/discount vẫn yêu cầu owner PIN khi online và bị khóa khi offline.
- Lỗi validation hiển thị ngay tại trường liên quan; không chỉ hiển thị toast.
- Retry hoặc double click nút xác nhận không tạo hai hóa đơn.
- Receipt 58 mm vẫn in và reprint đúng từ snapshot server.

## 3. Pha 0 — Baseline có thể kiểm chứng

### Công việc

- Chuẩn hóa `.env.example` cho SQLite local và MySQL staging.
- Tạo quy trình bootstrap local có thể chạy lặp lại: app key, database, migrate và seed.
- Sửa test registration theo quyết định tắt public registration.
- Sửa Pint và ổn định TypeScript/frontend production build.
- Thêm CI tối thiểu cho migration, PHP test, Pint, TypeScript và Vite build.
- Kiểm tra thay đổi chưa commit trong `package-lock.json` trước khi cập nhật dependency.

### Exit criteria

- Một checkout sạch của repository có thể dựng và kiểm tra theo tài liệu.
- Mọi quality gate cơ bản pass ổn định.
- Không dùng kết quả test từ môi trường thiếu `APP_KEY` hoặc database làm bằng chứng nghiệm thu.

## 4. Pha 1 — Checkout inline và nhịp bán liên tục

### Công việc

1. Tách màn POS hiện tại thành các component nhỏ:
   - `CatalogPanel`;
   - `CartTable`;
   - `CartSummary`;
   - `InlineCheckout`;
   - `SaleSuccessBar`;
   - `ReceiptPreview` chỉ mở theo yêu cầu.
2. Thay state `checkoutOpen` bằng state rõ nghĩa như `cart|checkout|submitting|success`.
3. Giữ payment draft độc lập để thu gọn/mở lại checkout không mất dữ liệu.
4. Thêm mệnh giá nhanh, tiền đủ, tiền thừa và trạng thái còn nợ.
5. Quản lý focus tập trung cho F3, F9, F12, Enter và Escape.
6. Chặn submit lặp ở client, đồng thời vẫn dựa vào idempotency server.
7. Hiển thị lỗi theo field và summary lỗi có thể đọc bằng screen reader.
8. Không tự mở receipt dialog sau khi thanh toán thành công.
9. UAT với nhân viên quầy trước khi tối ưu màu sắc hoặc animation.

### Exit criteria

- Đạt toàn bộ acceptance criteria tại mục 2.
- Thời gian thao tác cash phổ biến không tăng so với hệ thống cũ.
- Không có regression ở QR, partial payment, debt, owner approval và offline sale.

## 5. Pha 2 — Phân quyền và invariant dữ liệu

### Công việc

- Chuyển role cứng sang capability/Policy cho bán hàng, hoàn trả, catalog, kho, ca và công nợ.
- Scope validation và route model theo organization/branch.
- Khóa invariant catalog:
  - đúng một base unit;
  - base conversion bằng 1;
  - đúng một default sale unit;
  - barcode unique;
  - category/unit thuộc cùng organization.
- Chuẩn hóa money bằng integer và quantity bằng decimal precision đã chốt.
- Bổ sung audit log chung cho mutation quan trọng.

### Exit criteria

- Người dùng không thể gọi trực tiếp endpoint ngoài capability.
- Không thể tham chiếu entity thuộc organization hoặc branch khác.
- Dữ liệu catalog sai invariant bị từ chối tại server.

## 6. Pha 3 — An toàn transaction và concurrency

### Công việc

- Tạo idempotency wrapper dùng chung, xử lý được hai request đồng thời.
- Cùng key và payload phải trả cùng receipt; cùng key nhưng payload khác trả conflict rõ ràng.
- Áp dụng idempotency cho sale, return, debt payment, stock receipt, cash movement và close shift.
- Khóa customer credit ledger khi thu/hoàn nợ.
- Chống double return, double refund và double stock reversal.
- Liên kết exchange bằng return document và sale mới thay vì sửa sale completed.
- Chạy concurrency test trên MySQL staging.

### Exit criteria

- Double click, timeout và retry không tạo trùng tiền, tồn hoặc hóa đơn.
- Hai request hoàn trả đồng thời không thể trả vượt số lượng đã bán.

## 7. Pha 4 — Offline có khả năng phục hồi

### Công việc

- Version hóa catalog cache và offline sale envelope.
- Dùng queue state: `pending → syncing → synced | retryable | conflict | rejected`.
- Lưu attempt count, lỗi cuối, thời gian, server sale ID và receipt.
- Không xóa payload trước khi lưu receipt server an toàn.
- Thêm backoff, chống nhiều tab sync đồng thời và export/import recovery queue.
- Xin persistent browser storage.
- Đồng bộ theo dependency `open shift → sale/payment/cash movement → close shift`.
- Xử lý stale catalog/pricing và timeout sau khi server đã commit.

### Exit criteria

- Reload, mất mạng hoặc timeout không làm mất hay nhân đôi hóa đơn.
- Người dùng nhìn thấy và xử lý được từng item conflict/rejected.

## 8. Pha 5 — Import và ETL legacy

### Công việc

- Nhận backup MySQL legacy và folder ảnh để profile read-only.
- Bổ sung import batches/rows, mapping version, preview, execute và error report.
- Chuyển parsing file lớn sang backend queue.
- Tạo staging/raw tables, `legacy_id_map`, checksum và reconciliation report.
- Import historical sale để tra cứu nhưng không phát lại inventory movement.
- Dùng opening stock đã kiểm kê/duyệt tại cutover.
- Rehearsal đầy đủ trên MySQL staging với volume production.

### Exit criteria

- ETL chạy lại được từ database sạch, không vá tay.
- Counts, doanh thu, barcode exception, ảnh và opening stock có báo cáo đối soát.

## 9. Pha 6 — UAT thiết bị, vận hành và cutover

### Công việc

- UAT checkout inline trên đúng độ phân giải quầy.
- Kiểm thử scanner và máy in nhiệt 58 mm thật.
- Kiểm thử cash, QR, partial debt, negative stock, return, shift và offline lâu ngày.
- Thêm monitoring failed jobs, offline backlog, idempotency conflict, tồn âm và lệch két.
- Diễn tập backup/restore, cutover/cutback trong cửa sổ 12 giờ.
- Hoàn thiện feature, unit, browser E2E, concurrency và migration fixture tests.

### Exit criteria

- Không còn lỗi có thể gây sai tiền, sai tồn, mất hoặc trùng sale.
- Người dùng bán liên tục không cần đóng popup giữa hai đơn.
- Reconciliation, UAT thiết bị và cutback rehearsal được ký duyệt.

## 10. Backlog thực thi đề xuất

Thứ tự ticket nên triển khai:

1. Bootstrap môi trường và CI baseline.
2. Ghi nhận baseline thời gian/click của luồng checkout hiện tại.
3. Tách component POS và định nghĩa checkout state machine.
4. Xây `InlineCheckout` cho cash đủ tiền.
5. Bổ sung QR, split payment, debt và owner approval inline.
6. Thay receipt tự mở bằng `SaleSuccessBar` không chặn thao tác.
7. Hoàn thiện keyboard/focus/responsive và UAT checkout.
8. Capability matrix + Policies/Gates.
9. Organization/branch-scoped validation và catalog invariants.
10. Idempotency wrapper chống concurrent.
11. Harden sale, return, debt, inventory và shift transaction.
12. Offline queue state machine và recovery.
13. Data profiling MySQL legacy.
14. Import backend + ETL + reconciliation.
15. UAT thiết bị, hardening và rehearsal cutover.

## 11. Definition of Done

Một ticket chỉ hoàn thành khi:

- acceptance criteria nghiệp vụ pass;
- authorization và validation chạy server-side;
- transaction/idempotency/audit được áp dụng nếu liên quan;
- loading, empty, error, offline và permission state đã xử lý;
- phím tắt và focus POS không bị regression;
- kiểm tra tự động phù hợp đã pass;
- đã UAT với dữ liệu và thiết bị đại diện nếu ticket ảnh hưởng thao tác quầy;
- tài liệu trạng thái chỉ ghi “hoàn thành” khi có bằng chứng kiểm chứng tương ứng.
