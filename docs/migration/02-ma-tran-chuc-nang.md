# Ma trận chức năng kế thừa

## 1. Quy ước

- **Parity**: bắt buộc có trước cutover vì source cũ đã có luồng sử dụng được.
- **Improve**: giữ mục tiêu/thói quen nhưng sửa thiết kế hoặc mở rộng tối thiểu.
- **New**: source cũ chỉ có schema, API rời rạc hoặc menu placeholder.

## 2. POS và thanh toán

| ID | Hành vi legacy | Yêu cầu source mới | Mức | Tiêu chí nghiệm thu chính |
|---|---|---|---|---|
| POS-01 | Danh sách sản phẩm ở trái, giỏ hàng ở phải | Giữ bố cục hai vùng trên desktop; responsive thành các vùng chuyển đổi rõ ràng trên màn nhỏ | Parity | Nhân viên nhận biết được vùng tìm hàng và giỏ ngay khi mở màn hình |
| POS-02 | Cache sản phẩm, trạng thái online/offline, lần cập nhật | Sync catalog có version/cursor, hiển thị trạng thái và thời điểm sync cuối | Improve | Mất mạng vẫn tìm được catalog hợp lệ trong policy |
| POS-03 | Tìm không dấu theo tên/barcode | Tìm theo tên chuẩn hóa, barcode chính/phụ và SKU | Parity | Các case tiếng Việt không dấu và barcode được kiểm tra trong UAT; unit test bổ sung ở giai đoạn hardening |
| POS-04 | Quét barcode bằng camera mobile | Giữ camera scanner và hỗ trợ scanner dạng bàn phím | Improve | Quét đúng sẽ thêm/chọn sản phẩm mà không cần chạm thêm |
| POS-05 | Lọc danh mục | Giữ bộ lọc nhanh, hỗ trợ cây danh mục | Parity | Đổi danh mục không làm mất giỏ |
| POS-06 | Nhập số lượng trước khi thêm | Giữ ô số lượng và tăng/giảm nhanh | Parity | Số lượng/đơn vị hợp lệ được phản ánh đúng trong giỏ |
| POS-07 | Nhóm khách retail/wholesale/VIP/distributor | Giữ selector quen thuộc nhưng map vào customer segment/price book thật | Improve | Giá hiển thị và giá server resolve trùng nhau |
| POS-08 | Giá lẻ/sỉ/lốc/thùng | Hiển thị các lựa chọn đang có dữ liệu, kèm đơn vị/quy đổi rõ | Improve | Không tồn tại ba nguồn giá cạnh tranh trong backend |
| POS-09 | Thêm nhanh, sửa nhanh sản phẩm | Giữ modal ngay trong POS; kiểm soát quyền và validate server | Parity | Lưu xong catalog/giá hiển thị được refresh nhất quán |
| POS-10 | Chọn nhiều dòng, sửa số lượng/giảm giá/loại giá, xóa | Giữ thao tác dòng và chọn nhiều; bổ sung giới hạn quyền discount | Parity | Tổng được server tính lại; client không thể ép giá trái policy |
| POS-11 | Thông tin hóa đơn thu gọn/mở rộng | Giữ customer, nhân viên, ngày, ghi chú; actor lấy từ session | Improve | Không cho client giả danh nhân viên |
| POS-12 | Popup thanh toán, mệnh giá nhanh, tiền đủ, tiền thừa | Giữ modal và thứ tự thao tác quen thuộc | Parity | `received`, `change`, payment được lưu đúng và in lại được |
| POS-13 | Checkout cash | Hỗ trợ cash và QR; một sale có thể nhận nhiều payment | Improve/P0 | Sale, payments và stock movement cùng transaction; QR không cộng vào tiền két |
| POS-14 | Lưu hóa đơn offline khi mất mạng | Queue có local ID/idempotency key, trạng thái retry/conflict và xác nhận server ID; không khóa theo tuổi queue | Improve/P0 | Retry/timeout không tạo trùng sale; pending không mất khi reload |
| POS-15 | Hỗ trợ phím tắt | Giữ mapping đã hoạt động; hiển thị bảng trợ giúp | Parity | Không kích hoạt nhầm khi đang nhập text; kiểm tra keyboard trong UAT và bổ sung unit test sau |
| POS-16 | Legacy có thể tạo tồn âm ngoài ý muốn | Chủ động cho bán âm kho, cảnh báo và ghi nhận actor/reason để đối soát | New/P0 | Không mất sale; sản phẩm âm xuất hiện trong báo cáo đối soát |
| POS-17 | Legacy luôn coi hóa đơn trả đủ | Cho phép partial payment; phần thiếu tạo customer debt ledger | New/P0 | Không ghi nợ cho khách lẻ; phone optional nhưng customer ID/name bắt buộc |
| POS-18 | Chưa có ca/két | Một ca dùng chung trên một quầy, hỗ trợ nhiều actor, mở/thu/chi/đếm/đóng ca | New/P0 | Tiền két dự kiến chỉ tính cash; chênh lệch có lý do/audit |
| POS-19 | QR chưa có luồng thực tế | QR manual confirmation: thu ngân kiểm tra app ngân hàng rồi xác nhận nhận tiền | New/P0 | Lưu actor/time/reference tùy chọn; chọn QR không tự động coi là paid |
| POS-20 | Sửa giá/discount chưa có approval đáng tin | Owner PIN approval online cho price/discount override; offline khóa override | Improve/P0 | PIN được hash; approval ghi approver, actor, lý do và giá trước/sau; không cache verifier PIN ở client |

Mapping phím bắt buộc:

| Phím | Hành vi |
|---|---|
| F2 | Sửa dòng cuối trong giỏ |
| F3 | Focus và chọn nội dung ô tìm sản phẩm |
| F8 | Xóa toàn bộ giỏ sau xác nhận |
| F9 | Điền đúng số tiền cần thanh toán trong modal |
| F12 | Mở thanh toán khi giỏ hợp lệ |
| Enter | Xác nhận modal/thanh toán khi hợp lệ |
| Delete | Xóa các dòng giỏ đã chọn, không chạy khi đang nhập text |
| Escape | Đóng/hủy modal hiện tại |

F1 “đơn mới”, F5 “chọn khách”, F6 “discount” và F7 “in” chỉ xuất hiện trong bảng trợ giúp cũ ở trạng thái sắp có. Source mới chỉ kích hoạt khi chức năng tương ứng đã hoàn chỉnh.

## 3. Hóa đơn

| ID | Hành vi legacy | Yêu cầu source mới | Mức | Tiêu chí nghiệm thu chính |
|---|---|---|---|---|
| SAL-01 | Card tổng hóa đơn, doanh thu, lợi nhuận, paid/pending | Giữ summary dễ quét; định nghĩa metric và loại chứng từ hủy nhất quán | Improve | Số liệu khớp truy vấn đối soát |
| SAL-02 | Tìm mã hóa đơn/khách, lọc ngày/trạng thái, phân trang | Giữ filter và page size; sort/filter có whitelist | Parity | Filter có thể reset và không mất ngoài ý muốn khi xem detail |
| SAL-03 | Bảng hóa đơn và modal chi tiết | Giữ cột cốt lõi, snapshot sản phẩm, tổng/giảm/đã trả/tiền thừa | Parity | Hóa đơn lịch sử hiển thị độc lập dữ liệu product hiện tại |
| SAL-04 | Hủy toàn phần và hoàn tồn | Dùng reversal/refund idempotent, có lý do, actor và quyền | Improve | Hai request đồng thời không hoàn kho hai lần |
| SAL-05 | Badge số hóa đơn offline và sync tay | Giữ badge/nút sync, thêm trạng thái từng item và cách xử lý lỗi | Improve | Người dùng biết pending/syncing/failed/conflict/synced |
| SAL-06 | Chưa có print/reprint | Bổ sung receipt/reprint tối ưu cho giấy 58 mm | New/P0 | Mẫu in được UAT trên máy in thực, không phụ thuộc dữ liệu product hiện tại |
| SAL-07 | Legacy chỉ có hủy toàn phần | Trả một phần theo dòng/số lượng, đổi hàng và hoàn cash/QR/debt tương ứng | New/P0 | Return tham chiếu sale item gốc; không trả vượt base quantity đã bán |
| SAL-08 | Snapshot invoice item legacy là phần cần giữ | Sale header/item snapshot bất biến gồm identity, unit, conversion, price, discount, cost và totals tại lúc bán | Improve/P0 | Sửa product/unit/price/cost không thay đổi hóa đơn lịch sử |

## 4. Catalog, danh mục, đơn vị và import

| ID | Hành vi legacy | Yêu cầu source mới | Mức | Tiêu chí nghiệm thu chính |
|---|---|---|---|---|
| CAT-01 | Tạo/sửa product nhanh trong POS | Giữ luồng nhanh; trang quản lý đầy đủ được bổ sung riêng | Parity | Barcode unique, giá và tồn khởi tạo trong transaction |
| CAT-02 | Danh mục cha-con, tìm, tạo, sửa, xóa | Giữ dạng cây và modal/form quen thuộc; ưu tiên deactivate nếu đã tham chiếu | Parity | Không tạo cycle/orphan, không mất lịch sử sale |
| CAT-03 | Đơn vị: tên, ký hiệu, mô tả, trạng thái | Giữ CRUD danh mục unit; conversion được cấu hình tại product unit, không đặt trên unit master | Parity | Đơn vị đã dùng không bị hard-delete |
| CAT-04 | Import file hoặc dán dữ liệu tab | Giữ cả hai đầu vào CSV/XLS/XLSX/tab | Parity | File lớn có giới hạn rõ và không treo request |
| CAT-05 | Preview 5 dòng, số hợp lệ/lỗi/tổng | Giữ bước preview trước import | Parity | Preview và execute dùng cùng mapping/version |
| CAT-06 | 18 cột theo vị trí | Hỗ trợ preset legacy 18 cột và mapping theo header | Improve | Import lại cùng batch không tạo trùng ngoài quy tắc update |
| CAT-07 | Thông báo created/updated/errors | Dùng import batch, progress, downloadable error report | Improve | Có thể trace từng dòng về file/batch nguồn |
| CAT-08 | Menu Kho hàng chưa có page | Xây trang products + tồn hiện tại + movement/điều chỉnh cơ bản | New/P0 | Hỗ trợ đối soát tồn âm; không gắn nhãn parity legacy |
| CAT-09 | Legacy có unit text, base unit và conversion chưa thống nhất | Tab `Đơn vị & Barcode` theo từng sản phẩm: một base unit, nhiều sell/purchase units, conversion trực tiếp về base | Improve/P0 | Kho chỉ lưu base quantity; không đặt conversion toàn cục trên danh mục unit |
| CAT-10 | Barcode chủ yếu gắn trực tiếp với product | Mỗi barcode gắn với đúng product unit để scan lon/lốc/thùng tự chọn đơn vị | Improve/P0 | Barcode unique toàn hệ thống; barcode inactive không dùng tại POS |
| CAT-11 | Giá lon/lốc/thùng nằm ở nhiều nguồn | Giá/price-book entry gắn product unit, có thể fallback từ base price × conversion khi chưa cấu hình | Improve/P0 | Server resolve đúng unit price và lưu price/conversion snapshot |
| CAT-12 | Legacy import tập trung master product, nhập tồn chưa thành quy trình | Nhập kho nhanh bằng form hoặc Excel; có nút tải template versioned | New/P0 | Preview/validate trước khi ghi; quantity quy đổi về base; hỗ trợ lot/expiry optional |
| CAT-13 | Giá vốn legacy không có quy tắc cập nhật rõ | Current cost lấy theo giá nhập gần nhất; mỗi sale item snapshot cost tại lúc bán | New/P0 | Nhập kho mới không làm đổi profit lịch sử |

## 5. Khách hàng, báo cáo và cấu hình

| ID | Hiện trạng legacy | Yêu cầu source mới | Mức |
|---|---|---|---|
| CRM-01 | Backend customer có, POS chỉ nhập tên | Selector tìm theo mã/tên/phone, hỗ trợ khách lẻ không tạo record rác | Improve/P0 |
| CRM-02 | Menu khách hàng chưa có route | Trang danh sách/CRUD, lịch sử mua, dư nợ và lịch sử thu nợ | New/P0 |
| CRM-03 | Chưa có công nợ đáng tin cậy | Customer credit ledger; thu nợ bằng cash/QR và phân bổ vào invoice | New/P0 |
| REP-01 | Menu báo cáo chưa có route, chỉ có invoice statistics | Báo cáo ngày và mặt hàng bán chạy sau khi metric được định nghĩa | New/P1 |
| REP-02 | Chưa có báo cáo vận hành | Báo cáo ca/két, công nợ, tồn âm và hàng hết/cận hạn | New/P0 |
| SET-01 | Nút settings chưa hoạt động | Settings có scope, typed và phân quyền; không chứa secret thô | New/P1 |
| IAM-01 | Auth legacy placeholder | Tận dụng auth source mới; capability-based authorization | Improve/P0 |

## 6. Kho, lô/hạn dùng và ca/két

| ID | Yêu cầu | Mức | Tiêu chí nghiệm thu chính |
|---|---|---|---|
| INV-01 | Inventory movements bất biến và balance projection, cho phép balance âm | P0 | Mọi thay đổi tồn có reference, actor, thời gian và reason |
| INV-02 | Lot/expiry optional theo product; stock không theo lô dùng `lot_id = null` | P0 | Không bắt người dùng nhập lô; không tạo lô giả |
| INV-03 | FEFO tự động khi bán; phần thiếu tồn đi vào bucket chưa phân bổ | P0 | Không gán phần âm vào một lô không có thật |
| INV-04 | Scheduler cảnh báo lô còn 7 ngày, hết hạn hôm nay và đã hết hạn | P0 | Job idempotent; UI vẫn tính live nếu scheduler lỗi |
| INV-05 | Cảnh báo sản phẩm hết hạn nhưng cho phép tiếp tục bán | P0 | Confirmation được audit, checkout không bị khóa |
| INV-06 | Không bắt buộc barcode riêng cho lot; chuẩn bị khả năng in/đọc tem lot sau này | P1 | Barcode sản phẩm hiện tại vẫn dùng bình thường |
| SHF-01 | Mở ca với opening float trên một register/device | P0 | Không bán khi chưa có ca nếu quản lý ca đang bật |
| SHF-02 | Cash in/out, cash refund, cash debt collection và QR tách riêng | P0 | Expected cash không cộng QR hoặc debt chưa thu |
| SHF-03 | Blind cash count, variance, reason và approval threshold | P0 | Ca đóng bất biến; sửa sai bằng correction event |
| SHF-04 | Nhiều nhân viên tham gia cùng ca, giao dịch ghi actor | P0 | Đổi nhân viên không phải đóng ca |

## 7. Điều kiện parity tổng thể

Không đánh dấu “đạt parity” nếu chỉ có UI mock. Một mục P0 cần đồng thời có:

- route/page dùng được;
- validation và authorization server-side;
- persistence đúng transaction boundary;
- loading/empty/error/offline state phù hợp;
- smoke test/UAT cho logic chính trong giai đoạn triển khai;
- unit test không phải điều kiện đóng từng backlog item và sẽ do chủ dự án thực hiện sau khi hoàn tất toàn bộ chức năng;
- UAT bằng kịch bản người dùng legacy;
- không có lỗi P0/P1 mở liên quan đến mất dữ liệu, sai tiền hoặc sai tồn.
