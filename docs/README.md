# Kế hoạch chuyển đổi MartHub POS

## Mục tiêu

Bộ tài liệu này là đặc tả triển khai cho `MartHubPOSNew`. Mục tiêu chuyển đổi là:

- giữ đầy đủ các chức năng đang sử dụng được trong hệ thống cũ;
- giữ mô hình thao tác và bố cục đủ quen để nhân viên không phải học lại quy trình bán hàng;
- cho phép cải tiến giao diện, độ ổn định, bảo mật và tính toàn vẹn dữ liệu;
- không sao chép nguyên trạng các lỗi kiến trúc, schema hoặc giới hạn role của hệ thống cũ.

Tài liệu tại `old/docs/legacy-system` là bằng chứng hiện trạng. Khi có khác biệt về phạm vi hoặc thứ tự triển khai, bộ tài liệu trong thư mục này là nguồn quyết định cho source mới.

## Hiện trạng source mới

`MartHubPOSNew` đã có domain và các vertical slice vận hành chính cho POS, catalog, inventory, invoice, ca/két, công nợ, đổi trả và offline queue. Source vẫn chưa được coi là sẵn sàng cutover cho tới khi hoàn thành ETL từ backup MySQL, rehearsal trên MySQL staging và UAT thiết bị thật. Trạng thái chi tiết được ghi tại `migration/2026-08-11-211454-06-trang-thai-trien-khai.md`.

Không bắt buộc giữ role hay giao diện mặc định của starter kit. Authentication hiện có được tận dụng làm nền; phân quyền sẽ thiết kế theo capability để không bị khóa vào bộ role cứng.

## Quyết định phạm vi

1. Parity được đánh giá theo hành vi người dùng và kết quả nghiệp vụ, không theo việc sao chép component hoặc endpoint cũ.
2. Các màn hình đang chạy trong source cũ là phạm vi bắt buộc trước cutover: POS, hóa đơn, import sản phẩm, danh mục và đơn vị.
3. Offline sale, cache sản phẩm và đồng bộ hóa đơn là phạm vi bắt buộc trước cutover vì đã tồn tại trong luồng người dùng cũ.
4. Các mục menu cũ chưa có route thật (`Kho hàng`, `Khách hàng`, `Báo cáo`) không được xem là parity đã hoàn thành. Chúng vẫn được đưa vào backlog để hoàn thiện sản phẩm mới.
5. Không tái sử dụng nguyên khối migrations, controllers hoặc mô hình pricing cũ. Dữ liệu legacy được đưa sang bằng ETL có mapping và đối soát.
6. Không cutover chỉ dựa trên việc “đã có màn hình”. Mỗi luồng phải đạt acceptance criteria về nghiệp vụ, dữ liệu, quyền, responsive và bàn phím.
7. Unit test được hoãn đến sau khi hoàn tất toàn bộ chức năng; chủ dự án sẽ thực hiện giai đoạn này. Trong khi phát triển vẫn chạy migration/build/type-check/lint và smoke test tối thiểu để bảo đảm source có thể tích hợp.
8. Cấu hình hiện tại được chốt cho một cửa hàng, một chi nhánh và một máy POS; vẫn giữ `branch_id`/`device_id` trong dữ liệu để tránh khóa khả năng mở rộng.
9. SQLite dùng cho phát triển local, MySQL là môi trường production và là database bắt buộc cho rehearsal/cutover.
10. Dữ liệu MySQL legacy một năm được chuyển bằng ETL có dry-run, mapping và đối soát; không dùng trực tiếp schema cũ cho application mới.

## Cấu trúc tài liệu

1. [2026-08-11-211454-01-pham-vi-ke-thua.md](migration/2026-08-11-211454-01-pham-vi-ke-thua.md): baseline, phạm vi bắt buộc và nguyên tắc kế thừa.
2. [2026-08-11-211454-02-ma-tran-chuc-nang.md](migration/2026-08-11-211454-02-ma-tran-chuc-nang.md): ma trận chức năng cũ sang mới và tiêu chí nghiệm thu.
3. [2026-08-11-211454-03-dinh-huong-giao-dien.md](migration/2026-08-11-211454-03-dinh-huong-giao-dien.md): UI continuity, bố cục và quy tắc cải tiến.
4. [2026-08-11-211454-04-kien-truc-va-du-lieu.md](migration/2026-08-11-211454-04-kien-truc-va-du-lieu.md): kiến trúc đích, ranh giới nghiệp vụ và migration dữ liệu.
5. [2026-08-11-211454-05-ke-hoach-trien-khai.md](migration/2026-08-11-211454-05-ke-hoach-trien-khai.md): kế hoạch theo milestone, dependency và Definition of Done.
6. [2026-08-11-211454-06-trang-thai-trien-khai.md](migration/2026-08-11-211454-06-trang-thai-trien-khai.md): phần đã code, kiểm tra đã chạy và các gate còn thiếu trước cutover.
7. [2026-08-13-231447-07-ke-hoach-export-import-du-lieu-legacy.md](migration/2026-08-13-231447-07-ke-hoach-export-import-du-lieu-legacy.md): contract và kế hoạch triển khai chức năng export nhanh ở source cũ, import nhanh ở source mới và đối soát cutover.

## Kế hoạch chuyên đề

- [2026-08-14-222010-PLAN-NANG-CAP-UX-TOAN-DIEN.md](2026-08-14-222010-PLAN-NANG-CAP-UX-TOAN-DIEN.md): audit và roadmap UX toàn hệ thống, gồm search/filter/pagination cho các collection và sửa nhanh sản phẩm từ màn POS.
- [2026-08-13-233731-PLAN-TOI-UU-POS-CATALOG-SEARCH.md](2026-08-13-233731-PLAN-TOI-UU-POS-CATALOG-SEARCH.md): tối ưu riêng cho search, barcode và rendering catalog POS.
- [2026-08-12-185415-PLAN-REFACTOR-FRONTEND.md](2026-08-12-185415-PLAN-REFACTOR-FRONTEND.md): kiến trúc feature, dependency boundary và lộ trình refactor frontend.

## Thứ tự ưu tiên tổng quát

```text
Baseline + quyết định nghiệp vụ
  → nền tảng dữ liệu và quyền
  → catalog/import
  → POS online
  → hóa đơn/hoàn tác/in
  → offline + đồng bộ
  → migration rehearsal + UAT
  → unit test và hardening sau khi hoàn tất chức năng
  → cutover
```

Các phần khách hàng, kho vận hành và báo cáo được làm song song theo dependency, nhưng không được làm chậm parity của luồng bán hàng cốt lõi.
