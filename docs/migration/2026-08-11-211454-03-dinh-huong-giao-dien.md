# Định hướng giao diện và trải nghiệm chuyển đổi

## 1. Nguyên tắc continuity

Giữ “muscle memory” của người dùng thay vì giữ pixel:

- cùng mô hình màn hình: điều hướng cố định, catalog và giỏ luôn dễ nhận biết;
- cùng thứ tự thao tác: tìm/quét → thêm → chỉnh dòng → nhập thông tin → thanh toán;
- cùng thuật ngữ tiếng Việt cốt lõi: Bán hàng, Hóa đơn, Danh mục, Đơn vị, Import sản phẩm, Thanh toán;
- cùng phím tắt và hành vi focus;
- cùng màu ngữ nghĩa: xanh cho hành động chính/thành công, cam cho cảnh báo/giảm giá, đỏ cho thao tác phá hủy;
- không giấu trạng thái online/offline hoặc queue đồng bộ.

Có thể đổi icon set, font, spacing, radius, component library, dark mode và chi tiết responsive. Không duy trì header có các nút chỉ để trình bày nhưng không có hành vi.

## 2. App shell

Source cũ dùng sidebar tối dạng icon rộng khoảng 64–80 px và header sáng. Source mới nên tận dụng sidebar collapsible hiện có, nhưng thay menu starter bằng:

1. Bán hàng;
2. Hóa đơn;
3. Sản phẩm/Kho;
4. Import sản phẩm;
5. Danh mục;
6. Đơn vị;
7. Khách hàng;
8. Báo cáo;
9. Cài đặt.

Mục chưa triển khai không được dẫn tới trang trắng. Hoặc ẩn sau feature flag, hoặc hiển thị trạng thái “Đang phát triển” có chủ đích.

Header chỉ giữ nội dung có giá trị theo trang: tiêu đề, quầy/ca đang mở, actor hiện tại, trạng thái kết nối, queue offline và menu người dùng. Quick menu legacy chỉ được tái tạo khi đã có route thật. Vì một ca được nhiều nhân viên dùng chung, header cần thao tác đổi actor nhanh bằng PIN mà không đóng ca.

## 3. Màn hình POS desktop

Giữ tỷ lệ quen thuộc gần 40/60: catalog bên trái, giỏ bên phải.

```text
┌────────┬──────────────────────────────────────────────────────┐
│        │ Header: Bán hàng | chi nhánh | online | người dùng  │
│ Side   ├──────────────────────┬───────────────────────────────┤
│ bar    │ Catalog (2/5)        │ Giỏ hàng (3/5)               │
│        │ - trạng thái sync    │ - thông tin hóa đơn          │
│        │ - nhóm khách/giá     │ - bảng dòng hàng             │
│        │ - danh mục           │ - subtotal/discount/total    │
│        │ - tìm/barcode/sl     │ - Thanh toán / Xóa giỏ       │
│        │ - danh sách ảo       │                               │
└────────┴──────────────────────┴───────────────────────────────┘
```

Các cải tiến cho phép:

- category dùng chip/collapse gọn hơn;
- ưu tiên focus ô tìm khi mở POS;
- dòng sản phẩm và dòng giỏ có density phù hợp màn hình quầy;
- sticky summary và nút Thanh toán để không bị cuộn mất;
- hiển thị cảnh báo tồn âm nhưng không chặn thêm hàng/checkout;
- payment modal hỗ trợ cash, QR và ghi nợ phần còn thiếu; debt yêu cầu chọn khách hàng nhưng phone là optional;
- chọn QR hiển thị bước `Đã kiểm tra nhận tiền` và actor xác nhận; không tự hoàn tất chỉ vì đã chọn QR;
- sửa giá/giảm giá mở approval sheet yêu cầu PIN chủ cửa hàng, hiển thị giá cũ/mới và lý do;
- khi offline, nút sửa giá/discount override bị disable và giải thích `Cần kết nối mạng để chủ cửa hàng phê duyệt`; POS vẫn dùng giá/policy đã cache;
- tách modal “thêm/sửa nhanh” khỏi form quản trị đầy đủ;
- hiển thị giá/đơn vị/tồn rõ hơn, nhưng không tăng số click của luồng bán thường xuyên.

## 4. Tablet và mobile

- Tablet ngang có thể giữ hai cột nếu đủ rộng.
- Tablet dọc/mobile dùng hai tab hoặc drawer rõ ràng: `Sản phẩm` và `Giỏ (n)`; không xếp một trang dài khiến checkout khó tìm.
- Camera scanner là hành động nổi bật trên mobile.
- Sau khi quét/thêm hàng, feedback phải xuất hiện ngay và số lượng giỏ luôn nhìn thấy.
- Payment modal dùng full-screen sheet trên màn nhỏ, vẫn giữ mệnh giá nhanh và tiền thừa.
- Touch target tối thiểu 44 px cho hành động chính.

## 5. Màn hình hóa đơn

Giữ cấu trúc:

```text
Summary cards
  → thanh tìm kiếm và bộ lọc
  → bảng/danh sách hóa đơn
  → detail drawer/modal với snapshot sản phẩm
```

Cải tiến detail thành drawer trên desktop giúp không mất filter/page hiện tại. Trên mobile dùng trang hoặc full-screen sheet. Hủy/hoàn tác phải yêu cầu lý do, hiển thị tác động đến payment và stock, đồng thời yêu cầu xác nhận rõ ràng.

Badge queue offline nằm gần tiêu đề hoặc trạng thái kết nối; không chỉ hiển thị toast thoáng qua.

## 6. Danh mục, đơn vị và import

- Danh mục/đơn vị giữ pattern “tiêu đề + nút thêm + tìm kiếm + bảng + modal tạo/sửa”.
- Màn `Đơn vị` chỉ quản lý danh mục dùng chung như Lon, Lốc, Thùng; không lưu hệ số quy đổi toàn cục.
- Trang chi tiết sản phẩm có tab `Đơn vị & Barcode` với các cột: đơn vị, hệ số về base, barcode, giá bán, mặc định, cho phép bán/nhập và trạng thái.
- Khi tạo nhanh sản phẩm, người dùng chỉ cần chọn base unit; hệ thống tự tạo product unit hệ số 1. Lốc/thùng được cấu hình sau để không làm chậm luồng POS.
- Không cho sửa conversion đã có giao dịch; UI hướng dẫn ngừng cấu hình cũ và tạo product unit mới.
- Trạng thái active/inactive dùng badge và filter rõ.
- Xóa entity đã được sử dụng đổi thành ngừng sử dụng; dialog giải thích lý do.
- Import giữ hai phương thức: chọn file và dán bảng tính.
- Wizard import gồm: chọn nguồn → mapping/preset legacy → preview/validate → xác nhận → tiến độ/kết quả.
- Lỗi import có số dòng, trường, giá trị, lý do và file tải xuống.
- Màn `Nhập kho nhanh` hỗ trợ form nhiều dòng và import Excel, có nút `Tải file mẫu`; template chứa product/barcode, unit, quantity, last purchase cost, lot và expiry optional.
- Preview nhập kho hiển thị cả quantity nhập và base quantity sau quy đổi trước khi xác nhận.

### Hóa đơn, đổi trả và in

- Receipt/reprint dùng layout riêng cho giấy 58 mm, ưu tiên tên/barcode, đơn vị × số lượng, giá, discount, payment và công nợ.
- Detail hóa đơn đọc từ snapshot, không lấy lại tên/đơn vị/giá hiện tại của product.
- Luồng đổi/trả bắt đầu từ hóa đơn gốc, chọn dòng và số lượng, hiển thị base quantity, số tiền hoàn và tác động cash/QR/debt/tồn trước khi xác nhận.
- Đổi hàng được biểu diễn bằng return document và sale mới liên kết nhau, không sửa trực tiếp hóa đơn completed.

## 7. Trạng thái UI bắt buộc

Mỗi màn hình phải thiết kế đủ:

- loading/skeleton;
- empty state có hành động phù hợp;
- validation theo field;
- server error có request/reference ID khi có;
- offline/read-only;
- permission denied;
- destructive confirmation;
- success feedback không làm gián đoạn thao tác kế tiếp.

Toast không được là nơi duy nhất chứa thông tin lỗi cần người dùng xử lý.

## 8. Quy tắc accessibility và tốc độ thao tác

- mọi thao tác POS chính dùng được bằng bàn phím;
- focus trap và trả focus đúng sau modal;
- focus ring nhìn thấy được;
- icon quan trọng luôn có label/tooltip;
- màu không phải tín hiệu duy nhất;
- số tiền canh phải, dùng định dạng VND nhất quán;
- tránh animation dài trong luồng checkout;
- mục tiêu thao tác bán hàng phổ biến không tăng số bước so với legacy.

## 9. UAT về mức độ quen thuộc

Chọn ít nhất 3 người dùng quen hệ thống cũ và chạy các kịch bản:

1. tìm bằng tên không dấu và thêm số lượng;
2. quét barcode, đổi loại giá, giảm giá và sửa dòng cuối bằng F2;
3. thanh toán bằng F12/F9/Enter;
4. mất mạng, tạo đơn, xem pending và sync lại;
5. tìm hóa đơn, xem chi tiết và hoàn tác;
6. import file legacy, sửa lỗi và chạy lại;
7. tạo/sửa danh mục và đơn vị.

Bổ sung kịch bản đã chốt:

8. bán sản phẩm hết tồn và kiểm tra danh sách đối soát tồn âm;
9. thanh toán một phần cash/QR và ghi nợ phần còn lại;
10. thu nợ khách hàng không có số điện thoại;
11. nhiều nhân viên dùng chung một ca, thực hiện thu/chi, blind count và đóng ca;
12. nhập sản phẩm có/không có lot, xem cảnh báo còn hạn 7 ngày và tiếp tục bán sau cảnh báo hết hạn.
13. tải template, import phiếu nhập kho Excel và đối chiếu quantity/base quantity;
14. xác nhận QR thủ công và kiểm tra báo cáo ca không cộng QR vào két;
15. thử sửa giá/discount, nhập sai/đúng owner PIN và kiểm tra audit;
16. chuyển offline, xác nhận override bị khóa nhưng checkout theo giá cache vẫn hoạt động;
17. trả một phần, đổi hàng, hoàn payment/debt và in receipt 58 mm;
18. sửa tên/giá/unit sản phẩm rồi reprint hóa đơn cũ để xác nhận snapshot không thay đổi.

Tiêu chí: người dùng hoàn thành không cần hướng dẫn từng bước, không có nhầm lẫn nghiêm trọng về tổng tiền/trạng thái sync và thời gian thao tác không tăng đáng kể so với baseline đã đo.
