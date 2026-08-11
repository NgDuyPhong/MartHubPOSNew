# Phạm vi kế thừa và nguyên tắc chuyển đổi

## 1. Baseline đã rà soát

Nguồn phân tích:

- toàn bộ tài liệu trong `old/docs/legacy-system`;
- route và các màn hình React trong `old/frontend/src`;
- các luồng API, database và rủi ro đã được ghi trong hồ sơ legacy;
- `composer.json`, `package.json`, routes, migrations và resources hiện tại của `MartHubPOSNew`.

Kết luận: source cũ có giá trị lớn nhất ở trải nghiệm thao tác POS, snapshot hóa đơn, import preview và khả năng làm việc khi mất mạng. Source mới có nền Laravel/Inertia phù hợp để viết lại theo modular monolith, nhưng domain hiện chưa tồn tại.

## 2. Định nghĩa “giữ lại”

Một chức năng chỉ được coi là đã kế thừa khi thỏa cả bốn điều kiện:

1. Người dùng hoàn thành được cùng mục tiêu nghiệp vụ như source cũ.
2. Các thao tác quen thuộc quan trọng vẫn nằm ở vị trí, thứ tự và phím tắt dễ nhận biết.
3. Dữ liệu được server kiểm tra và lưu đúng, không lặp lại lỗ hổng của source cũ.
4. Có UAT cho luồng chính; unit test được gom thành giai đoạn hardening sau khi hoàn tất toàn bộ chức năng.

Không yêu cầu giống 100% pixel, dùng lại Ant Design, giữ URL cũ hoặc giữ shape API cũ.

## 3. Phân lớp phạm vi

### P0 — parity bắt buộc trước cutover

- đăng nhập và xác định người thao tác;
- POS: tải/tìm/quét/lọc sản phẩm, chọn nhóm giá, số lượng, giỏ hàng, giảm giá và checkout;
- thêm nhanh và sửa nhanh sản phẩm từ ngữ cảnh POS;
- cấu hình nhiều đơn vị theo từng sản phẩm: một đơn vị cơ sở, hệ số quy đổi, barcode và giá bán riêng cho lon/lốc/thùng;
- trang quản lý sản phẩm/kho, số dư tồn, movement, điều chỉnh cơ bản và đối soát tồn âm;
- nhập kho bằng form hoặc import Excel; có file template đúng phiên bản để tải xuống;
- giá vốn hiện tại dùng giá nhập gần nhất và được snapshot trên từng dòng bán;
- tiền khách đưa, mệnh giá nhanh, tiền thừa và thanh toán tiền mặt;
- thanh toán tiền mặt/QR, cho phép nhiều payment trên một hóa đơn, thanh toán một phần và ghi nợ phần còn lại;
- khách hàng và sổ công nợ; khi ghi nợ bắt buộc có tên/mã khách nhưng số điện thoại là tùy chọn;
- cho phép bán âm kho có cảnh báo, audit và danh sách chờ đối soát;
- một ca/két dùng chung trên máy POS, nhiều nhân viên có thể tham gia và mỗi giao dịch vẫn ghi actor;
- QR được thu ngân kiểm tra thủ công trước khi xác nhận đã nhận tiền;
- sửa giá/giảm giá tại POS cần PIN chủ cửa hàng và tạo approval audit;
- phím tắt đang hoạt động: F2, F3, F8, F9, F12, Enter, Delete, Escape;
- hóa đơn: thống kê tóm tắt, tìm/lọc/phân trang, xem chi tiết snapshot, hủy/hoàn tác toàn phần;
- đổi/trả theo từng dòng hoặc số lượng, hoàn payment/công nợ và cộng kho theo base quantity;
- in/reprint receipt khổ 58 mm;
- danh mục và đơn vị: danh sách, tìm kiếm, tạo, sửa, ngừng sử dụng/xóa có kiểm soát;
- import CSV/XLS/XLSX/dữ liệu tab, preview, validate, tạo mới/cập nhật và báo lỗi;
- cache catalog, chỉ báo online/offline, queue hóa đơn và đồng bộ lại an toàn;
- offline không bị khóa theo thời gian; dữ liệu pending phải bền vững trên một máy POS;
- theo dõi lô/hạn dùng tùy chọn khi nhập, FEFO và cảnh báo trước hạn 7 ngày;
- responsive tối thiểu cho desktop quầy, tablet và mobile barcode scanner.

### P1 — hoàn thiện vận hành, ưu tiên cao

- tồn kho hiện tại, lịch sử movement và cảnh báo tồn thấp;
- báo cáo ngày/doanh thu, ca/két, công nợ, tồn âm và hàng cận hạn;
- audit cho thay đổi dữ liệu và thao tác nhạy cảm.

### P2 — mở rộng sau khi parity ổn định

- nhập hàng/đơn đặt hàng/nhà cung cấp;
- kiểm kê nâng cao, chuyển kho và quy trình duyệt điều chỉnh;
- nhiều chi nhánh nâng cao;
- promotion, loyalty, hóa đơn điện tử và tích hợp kế toán.

Schema-only hoặc menu-only trong legacy không tự động trở thành yêu cầu P0. Chỉ nâng ưu tiên khi có xác nhận đây là nghiệp vụ đang thực sự vận hành bên ngoài phần code đã rà soát.

## 4. Những hành vi phải sửa, không được kế thừa nguyên trạng

- server không nhận giá/tổng tiền từ client làm nguồn sự thật;
- không hard-code `user_id = 1` hoặc phương thức thanh toán;
- không cho phép mutation public;
- không chặn bán vượt tồn trong cấu hình hiện tại, nhưng bắt buộc cảnh báo, ghi movement âm và đưa vào đối soát;
- không dùng retry HTTP thiếu idempotency cho hóa đơn offline;
- không xóa cascade lịch sử bán hàng/tài chính;
- không coi đổi trạng thái hóa đơn là đủ để hoàn tiền và hoàn kho;
- không nhập tất cả settings hoặc secret từ database cũ;
- không tiếp tục ba mô hình giá chồng lấn.

## 5. Giả định mặc định để triển khai

Các giả định này giúp bắt đầu mà không khóa kiến trúc vào role cũ:

- giai đoạn đầu chạy một organization và một branch mặc định, nhưng dữ liệu nghiệp vụ có `branch_id`;
- chỉ có một máy POS; một ca có thể dùng chung bởi nhiều nhân viên và nên hỗ trợ đổi actor nhanh bằng PIN;
- mọi người dùng phải đăng nhập;
- quyền là capability như `pos.sell`, `sales.cancel`, `catalog.manage`, `imports.run`, `reports.view`; role chỉ là nhóm capability có thể đổi;
- VND được lưu dạng integer ở tầng domain/database;
- giá lẻ/sỉ/lốc/thùng được biểu diễn bởi một price book thống nhất;
- kho chỉ lưu theo đơn vị cơ sở; mọi đơn vị bán/nhập quy đổi trực tiếp về đơn vị cơ sở theo cấu hình riêng của từng sản phẩm;
- completed sale không sửa trực tiếp; hủy/hoàn tác tạo movement và transaction đảo;
- completed sale và sale item là snapshot bất biến; thay đổi product/unit/barcode/price/cost sau này không làm đổi hóa đơn cũ;
- payment hỗ trợ cash, QR và debt allocation trong cùng một sale;
- QR là manual-confirmed payment ở phiên bản đầu; actor xác nhận được audit;
- price/discount override yêu cầu owner PIN, PIN không lưu plaintext;
- owner PIN chỉ được xác thực online; khi POS offline, khóa sửa giá/discount override và tiếp tục bán bằng giá/policy đã cache;
- current cost dùng last purchase cost; sale item giữ cost snapshot tại thời điểm bán;
- lô/hạn dùng là optional; barcode sản phẩm được giữ nguyên và không bắt buộc in barcode riêng cho từng lô;
- cảnh báo lô còn tối đa 7 ngày và lô đã hết hạn; chỉ cảnh báo, không chặn checkout;
- offline là yêu cầu cutover, không giới hạn tuổi nghiệp vụ, nhưng được triển khai sau khi sale online ổn định để dùng cùng một contract;
- SQLite là database local; MySQL là production target và môi trường rehearsal bắt buộc;
- ảnh sản phẩm lưu bằng đường dẫn trong database, file thật nằm ở storage persistent trên server;
- migration production có cửa sổ dừng bán tối đa 12 giờ và hiện không có hóa đơn offline legacy pending.

## 6. Quyết định đã xác nhận

- mô hình hiện tại: cửa hàng nhỏ, một chi nhánh, một máy POS;
- cho phép bán âm kho mà không cần chặn, nhưng phải audit/đối soát;
- một ca/két được nhiều nhân viên dùng chung;
- payment: cash, QR, partial payment và debt;
- QR được kiểm tra thủ công trên ứng dụng ngân hàng;
- sửa giá/giảm giá cần PIN chủ cửa hàng;
- khi offline không cho dùng owner PIN hoặc override giá/discount; phải chờ online;
- nhập kho hỗ trợ form thủ công, import Excel và export template;
- giá vốn dùng giá nhập gần nhất;
- phiên bản đầu có đổi/trả từng sản phẩm;
- receipt dùng khổ giấy 58 mm;
- customer phone optional; khách ghi nợ cần tên và mã nội bộ;
- offline không giới hạn theo thời gian nghiệp vụ;
- lot/expiry optional, cảnh báo trước 7 ngày, hàng hết hạn vẫn được bán sau cảnh báo;
- chưa cần purchasing/supplier và hóa đơn điện tử trong phiên bản đầu;
- legacy production dùng MySQL và có thể cung cấp backup;
- local dùng SQLite, production mới dùng MySQL;
- product image lưu trong folder persistent trên server;
- legacy không có hóa đơn offline pending tại thời điểm xác nhận;
- cửa sổ cutover tối đa 12 giờ.

Các chi tiết còn chốt trong giai đoạn implementation: giới hạn giá/discount, thời hạn/quy tắc đổi trả, nội dung mẫu in 58 mm, PIN chuyển nhân viên và ngưỡng chênh lệch két cần duyệt.
