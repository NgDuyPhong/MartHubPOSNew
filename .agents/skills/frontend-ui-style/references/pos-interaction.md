# POS Interaction Rules

Đọc file này khi task liên quan màn POS, catalog, barcode, cart, checkout, ca/két, offline sync, receipt hoặc keyboard/focus.

## Mục lục

- [Ưu tiên vận hành](#ưu-tiên-vận-hành)
- [Layout](#layout)
- [Barcode và focus](#barcode-và-focus)
- [Cart và money](#cart-và-money)
- [Checkout](#checkout)
- [Shift và permission](#shift-và-permission)
- [Offline và sync](#offline-và-sync)
- [Receipt và print](#receipt-và-print)
- [POS UAT tối thiểu](#pos-uat-tối-thiểu)

## Ưu tiên vận hành

Ưu tiên theo thứ tự:

1. Bán hàng nhanh và kết quả tiền chính xác.
2. Barcode/keyboard/touch interaction ổn định.
3. Cart, tổng tiền và action thanh toán luôn dễ quan sát.
4. Trạng thái ca, quyền và kết nối rõ ràng.
5. Trang trí và animation.

Không hy sinh mật độ thông tin cần thiết chỉ để tạo khoảng trắng như landing page.

## Layout

Trên desktop/tablet, giữ catalog và cart cùng lúc khi có đủ không gian. Giữ cart summary và primary checkout action ổn định, tránh layout shift khi:

- tìm kiếm sản phẩm;
- thay đổi số lượng;
- tải catalog cache;
- chuyển online/offline;
- hiển thị validation hoặc sync status.

Trên màn hình nhỏ, tạo fallback có chủ đích; không chỉ thu nhỏ toàn bộ desktop UI. Giữ total và action quan trọng dễ truy cập.

## Barcode và focus

- Không chiếm focus barcode bằng interaction phụ sau navigation/render.
- Trả focus về đúng vùng sau add-to-cart, đóng panel hoặc hoàn tất transaction theo contract hiện tại.
- Không chặn phím Enter/Escape/F-key nếu task không chủ động thay đổi shortcut.
- Không dùng component có focus trap cho workflow bán hàng dài.
- Kiểm thử bằng cả chuột và bàn phím sau khi tách component.

## Cart và money

- Giữ product name, unit, quantity, price, discount và line total phân biệt rõ.
- Dùng định dạng số/tiền `vi-VN` qua formatter dùng chung.
- Không tính authoritative money/inventory chỉ ở client.
- Hiển thị thay đổi giá, discount và owner approval rõ nhưng không làm chậm luồng bình thường.
- Tránh destructive cart action quá gần primary checkout action.

## Checkout

Dùng inline checkout cho workflow nhiều bước. Chỉ dùng Dialog cho confirmation ngắn hoặc nội dung bổ trợ.

Phân biệt rõ:

- cash, QR và debt;
- paid, remaining debt và change;
- QR đã xác nhận thủ công;
- validation error và server error;
- đang submit và đã hoàn thành.

Không tự retry mutation tạo sale nếu chưa có idempotency contract phù hợp.

## Shift và permission

- Hiển thị active shift và register đủ rõ trước khi checkout.
- Mở ca phải có success/error feedback và đóng UI nhập liệu sau success.
- Đóng ca, thu/chi và override giá phải thể hiện hậu quả rõ.
- Không cho phép owner override khi offline nếu nghiệp vụ hiện tại cấm.

## Offline và sync

Hiển thị riêng các trạng thái:

```text
online
offline
pending locally
syncing
synced
sync failed
```

IndexedDB giữ pending sale; UI chỉ orchestration/feedback. Không cache HTML Inertia `/pos` để hỗ trợ offline. Service Worker không được trả document HTML cho request có header `X-Inertia`.

Không báo “đã bán” nếu payload chưa được lưu chắc chắn vào server hoặc offline repository. Cho người dùng biết khi nào cần thử lại hoặc kiểm tra kết nối.

## Receipt và print

- Bảo toàn snapshot dữ liệu hóa đơn.
- Bảo toàn print CSS khổ 58 mm trong `resources/css/app.css`.
- Ẩn control không thuộc hóa đơn bằng print-specific selector.
- Kiểm tra item dài, số lượng thập phân, discount, debt và return information.
- Không để responsive screen styles phá chiều rộng bản in.

## POS UAT tối thiểu

Kiểm tra các luồng liên quan sau mỗi thay đổi đáng kể:

- mở ca;
- scan/tìm sản phẩm và add cart;
- sửa số lượng/xóa dòng;
- cash, QR và debt checkout;
- owner PIN/override nếu bị ảnh hưởng;
- offline queue rồi reconnect/sync;
- receipt preview và in 58 mm;
- keyboard shortcuts và focus restoration.
