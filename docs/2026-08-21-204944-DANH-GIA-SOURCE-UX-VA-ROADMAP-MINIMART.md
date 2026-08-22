# Đánh giá source POS, UX và roadmap tính năng siêu thị mini

> Ngày đánh giá: 21/08/2026  
> Cập nhật quyết định roadmap: 22/08/2026  
> Source baseline: commit `0042173` (`main`)  
> Phạm vi chính: `resources/js/pages/pos/index.tsx`, `resources/js/features/pos/**`, `resources/js/components/ui/searchable-select.tsx`, các API/controller/action liên quan và toàn bộ route/module hiện có  
> Phương pháp: static source review, đối chiếu rule dự án, Laravel 12, Inertia 2, React 19, Tailwind CSS 4 và tài liệu POS đã có; không phải đánh giá runtime hay kết luận tư vấn pháp lý

## 1. Kết luận ngắn

Source hiện tại đã vượt qua mức “POS thử nghiệm đơn giản”. Hệ thống có nền tảng nghiệp vụ khá tốt: bán theo nhiều đơn vị/barcode, nhiều giỏ tạm, ca/két, cash + QR + công nợ, owner approval, tồn kho/lô/hạn dùng, đổi trả, queue offline, idempotency, đồng bộ lại ca cũ, receipt snapshot và refresh catalog theo version.

Điểm cần ưu tiên tiếp theo không phải là làm giao diện bắt mắt hơn, mà là **phân quyền đúng, tuân thủ pháp lý, an toàn vận hành, an toàn thao tác và khả năng hiểu trạng thái hệ thống**. Các nhóm việc phải đi trước mở rộng tính năng là:

1. Capability matrix, account lifecycle và server authorization cho POS, return, debt, shift, inventory, import và report chưa đồng nhất.
2. Register/shift binding hiện phù hợp một máy nhưng chưa có invariant concurrency và contract multi-register rõ ràng.
3. Phạm vi áp dụng hóa đơn điện tử, mô hình thuế và yêu cầu dữ liệu hóa đơn chưa được xác minh.
4. MySQL rehearsal, backup/restore, offline queue recovery, monitoring, UAT thiết bị thật và cutback chưa đạt gate production.
5. Phím tắt toàn cục vẫn chạy phía sau một số Dialog/Sheet.
6. Hoàn tác xóa giỏ có thể ghi đè giỏ mới hoặc áp dụng nhầm sang draft khác.
7. Reprice hóa đơn offline không có màn hình so sánh và không giải thích tác động tới tiền đã thu/công nợ.

Scan/tìm bằng Enter thất bại hoặc có nhiều kết quả nhưng không phản hồi là vấn đề UX ưu tiên cao ở Phase 1A. Implementation hiện chạy local và đồng bộ, vì vậy không có bằng chứng source cho nhận định “kết quả đến chậm làm thêm trùng”.

Bản audit không chấm điểm tổng hợp vì static review chưa có trọng số, benchmark runtime, dữ liệu production hoặc UAT thiết bị thật. Mọi kết luận readiness phải dựa trên gate có bằng chứng thay vì một điểm số cảm tính.

### 1.1. Quan hệ tài liệu và source of truth

Tài liệu này là **audit delta và backlog đề xuất**, không thay thế toàn bộ bộ kế hoạch migration:

| Phạm vi quyết định | Source of truth |
| --- | --- |
| Chỉ mục, thứ tự ưu tiên tổng quát và quan hệ tài liệu | [`README.md`](README.md) |
| Phạm vi parity và ma trận chức năng | [`migration/2026-08-11-211454-01-pham-vi-ke-thua.md`](migration/2026-08-11-211454-01-pham-vi-ke-thua.md), [`migration/2026-08-11-211454-02-ma-tran-chuc-nang.md`](migration/2026-08-11-211454-02-ma-tran-chuc-nang.md) |
| Cutover, migration rehearsal, backup/restore và go-live gate | [`migration/2026-08-11-211454-05-ke-hoach-trien-khai.md`](migration/2026-08-11-211454-05-ke-hoach-trien-khai.md), [`migration/2026-08-11-211454-06-trang-thai-trien-khai.md`](migration/2026-08-11-211454-06-trang-thai-trien-khai.md), [`migration/2026-08-13-231447-07-ke-hoach-export-import-du-lieu-legacy.md`](migration/2026-08-13-231447-07-ke-hoach-export-import-du-lieu-legacy.md) |
| Kiến trúc và dependency frontend | [`2026-08-12-185415-PLAN-REFACTOR-FRONTEND.md`](2026-08-12-185415-PLAN-REFACTOR-FRONTEND.md) |
| Search/barcode/catalog POS | [`2026-08-13-233731-PLAN-TOI-UU-POS-CATALOG-SEARCH.md`](2026-08-13-233731-PLAN-TOI-UU-POS-CATALOG-SEARCH.md) |
| Findings còn lại, ưu tiên UX và roadmap minimart sau baseline | Tài liệu hiện tại |

Khi có khác biệt, tài liệu chuyên trách ở bảng trên quyết định chi tiết trong phạm vi của nó; tài liệu hiện tại chỉ ghi phần thay đổi ưu tiên và dependency giữa các phạm vi. Trạng thái triển khai thực tế chỉ cập nhật tại tài liệu trạng thái migration, tránh duy trì nhiều roadmap cùng báo phần trăm hoàn thành.

## 2. Những điểm source đang làm tốt

### 2.1. Kiến trúc frontend đúng hướng

- Page compose component/hook từ `features/pos`, không đưa business logic vào `components/ui`.
- API, IndexedDB repository, selector, validation và view component đã được tách theo feature.
- Catalog search dùng local index và `useDeferredValue`, phù hợp barcode/keyboard; không debounce luồng scan.
- Dữ liệu giỏ và payment draft được giữ trong IndexedDB, có debounce write và scope theo organization/branch.
- `SearchableSelect` dựa trên Headless UI, có keyboard semantics, loading/empty/error state và tìm tiếng Việt không dấu.

### 2.2. Nghiệp vụ tiền và tồn kho có guardrail server

- `CreateSaleAction` tính lại total, discount, payment, debt và change ở server trong transaction.
- Giá/discount override yêu cầu owner PIN; override bị khóa offline.
- QR phải được thu ngân xác nhận thủ công và không cho QR lớn hơn tổng hóa đơn.
- Sale item lưu snapshot tên, SKU, đơn vị, conversion, giá, discount và cost.
- Inventory movement và lot consumption được ghi cùng transaction; FEFO được áp dụng cho lô có tồn.
- Idempotency key giúp retry request/queue không chủ động tạo trùng sale.

### 2.3. Offline đã có nền tảng phục hồi thực tế

- Pending sale nằm trong IndexedDB, có `pending/syncing/failed/conflict`.
- Có Sync Center, retry từng sale, export recovery JSON và reprice conflict.
- Sale offline giữ ca gốc; sale đến muộn sau khi đóng ca đánh dấu ca cần đối soát.
- Receipt offline được lưu local, có nhãn chờ đồng bộ và có thể xem lại.

### 2.4. Các cải thiện so với audit POS ngày 18/08/2026

Những hạng mục cũ đã được xử lý hoặc cải thiện đáng kể:

- F8 đã đi qua confirmation; Delete không chạy khi đang nhập text.
- Có hoàn tác sau xóa giỏ.
- Có picker variant/unit thay vì bỏ qua sản phẩm nhiều quy cách.
- Có giữ nhiều đơn và phục hồi payment draft theo từng đơn.
- Có Sync Center và policy đồng bộ về ca gốc đã đóng.
- Có validation quantity nguyên/thập phân và discount không vượt gross.
- Có quick customer, customer debt, receipt gần nhất và CSS in 58 mm.
- Có freshness/version, cart reconciliation và cảnh báo sản phẩm/giá không còn hợp lệ.

Tài liệu này vì vậy chỉ tập trung vào **khoảng trống còn lại của source hiện tại**.

## 3. Phát hiện ưu tiên cao

### P0A-01 — Capability matrix và server authorization chưa bao phủ nghiệp vụ nhạy cảm

**Bằng chứng**

- `User::hasCapability()` hiện mới tập trung vào `catalog.manage`: `app/Models/User.php:72-78`.
- Bán hàng, trả hàng, thu nợ, mở/đóng/đối soát ca và cash movement chủ yếu chỉ kiểm tra user active, ví dụ `app/Http/Requests/StoreSaleRequest.php:10-12`.
- Nhập kho và legacy import có role check trực tiếp, cho thấy authorization đang phân tán thay vì dùng một contract thống nhất.
- `resources/js/config/navigation.ts:6-16` khai báo menu tĩnh và không phản ánh capability của user.

**Ảnh hưởng**

- Một tài khoản active có thể gọi nghiệp vụ nhạy cảm ngoài phạm vi công việc dự kiến.
- Việc ẩn menu hoặc button ở client, nếu bổ sung đơn lẻ, không ngăn request trực tiếp.
- Role hard-code và capability rời rạc dễ tạo sai khác giữa backend, menu và acceptance test.

**Hướng sửa**

- Xây capability matrix tối thiểu cho POS, sale history/return, debt collection, shift/cash movement, inventory/stock receipt, legacy import, report và catalog.
- Enforce mọi quyền đọc/ghi tại server bằng policy, gate hoặc `FormRequest::authorize()` theo convention được chọn; UI chỉ phản ánh quyền server đã chia sẻ.
- Ghi audit event cho override và mutation nhạy cảm cùng lúc triển khai từng capability.
- Màn hình quản trị user/role/capability có thể ở Phase 3; server contract và dữ liệu capability cho frontend phải hoàn thành ở Phase 0A.

**Tiêu chí nghiệm thu**

- Capability matrix có owner nghiệp vụ, action, role mặc định và test allow/deny.
- Request trực tiếp bị từ chối đúng khi user không có quyền, kể cả khi tự sửa DOM hoặc URL.
- Menu/action không hiển thị hoặc được disable có giải thích theo cùng capability server; frontend không phải enforcement boundary.

### P0A-02 — Account lifecycle và owner approval chưa đủ an toàn

**Bằng chứng**

- `app/Http/Requests/Auth/LoginRequest.php:41-55` chỉ dùng email/password khi `Auth::attempt()`, chưa chặn `is_active=false` tại login.
- Nhóm route nghiệp vụ chỉ có middleware `auth`; chưa có active-account middleware tập trung để chặn session đang tồn tại sau khi user bị khóa.
- Session mặc định dùng database và có `user_id`, nhưng chưa có quy trình thu hồi session khi deactivate/reset password.
- `app/Services/OwnerApprovalService.php:10-29` kiểm tra PIN trực tiếp, chưa có rate limit riêng hoặc security audit cho lần nhập sai.

**Quyết định**

- Login phải từ chối user inactive bằng cùng thông báo lỗi chung, không tiết lộ trạng thái tài khoản.
- Mọi route authenticated phải qua middleware kiểm tra account active; khi phát hiện inactive, logout, invalidate session và từ chối truy cập.
- Khi deactivate hoặc reset password, thu hồi toàn bộ database session của user. Thay đổi role/capability có hiệu lực ở request kế tiếp nhờ server authorize lại; không phụ thuộc việc xóa session để enforce quyền.
- Rate-limit owner PIN theo organization + requester + IP + loại action; audit cả thành công và thất bại nhưng không log PIN/hash.
- Sale offline sync và mọi request nhạy cảm phải authorize bằng trạng thái/capability hiện tại, không dùng quyền snapshot lúc queue được tạo.

**Policy khi actor của sale offline bị khóa hoặc thu hồi quyền**

- Queue phải giữ bất biến `original_actor_id`, snapshot nhận diện actor, organization, branch, register/terminal, `occurred_at` và idempotency key. Không ghi đè actor gốc khi xử lý recovery.
- Nếu actor không còn active hoặc không còn quyền tại thời điểm sync, server trả conflict không tự retry như `ACTOR_INACTIVE` hoặc `CAPABILITY_REVOKED`; client giữ payload, hiển thị next action và không tự xóa/reassign sale.
- Manager/owner cùng branch có capability recovery riêng có thể takeover khi online. Sale vẫn ghi actor gốc là người thực hiện tại quầy và ghi thêm người duyệt/người recovery, lý do, thời điểm cùng audit event; request dùng lại idempotency key và phải qua toàn bộ kiểm tra giá, payment, inventory, terminal/register cùng policy original-shift/reconciliation.
- Manager/owner chỉ được đánh dấu `resolved_cancelled` khi có lý do, audit và cách xử lý tiền/hoàn tiền rõ ràng. Sale mà khách đã thanh toán không được âm thầm drop; phải recovery hoặc ghi nhận correction/refund có truy vết.
- Organization mismatch luôn bị từ chối, không cho takeover. Recovery import/restore phải đi qua cùng resolver và policy, không có đường bypass authorization.

**Tiêu chí nghiệm thu**

- Inactive user không đăng nhập được và session đang mở bị chặn ở request tiếp theo.
- Deactivate/reset password thu hồi session theo user trên session store production.
- Role/capability bị hạ không thể tiếp tục mutation bằng tab cũ hoặc request trực tiếp.
- Có test cross-organization, cross-branch, inactive session, revoked capability và owner PIN throttle/audit.
- Có test sale được queue trước khi actor bị khóa/thu hồi quyền, manager takeover, hủy có kiểm soát, idempotency khi recovery và cấm takeover khác organization.

### P0A-03 — Register/shift binding chưa có invariant production rõ ràng

**Bằng chứng**

- `OpenShiftAction` kiểm tra ca mở theo `register_id`, không phải theo branch: `app/Actions/Shifts/OpenShiftAction.php:17-20`.
- `PosDataService::activeShift()` lấy `first()` trong các ca mở của branch: `app/Services/PosDataService.php:106-117`.
- Schema chưa có database constraint riêng bảo đảm chỉ một shift open/register; query `lockForUpdate()` trên tập rỗng chưa phải invariant concurrency đủ mạnh trên mọi database.

**Quyết định**

- Domain invariant là tối đa một ca mở trên mỗi register; không tạo rule một ca mở/branch.
- Deployment hiện tại phải bảo đảm branch chỉ có một active register và POS bind rõ vào register đó.
- Khi mở ca, transaction phải khóa dòng register trước khi kiểm tra/tạo shift; bổ sung concurrency test trên MySQL.
- Binding authoritative là record phía server theo contract terminal/device → branch → register. Browser chỉ giữ installation credential dạng opaque và bản binding đã xác minh gần nhất để hỗ trợ offline; `register_id` trong local/browser storage không phải nguồn sự thật.
- Bind/rebind/revoke chỉ thực hiện khi online bởi owner/manager có capability quản lý terminal, bắt buộc lý do và audit. Thu ngân không có register picker và không được tự bind thiết bị.
- Terminal chưa bind, binding bị revoke hoặc không còn hợp lệ phải fail closed đối với mở ca/bán hàng, kể cả branch chỉ có một active register. Nếu có nhiều active register thì tuyệt đối không auto-pick bằng `first()`.
- Rebind chỉ cho phép khi local queue bằng `0` hoặc queue/draft đã được export và xử lý theo recovery runbook. Xóa browser data tạo một installation mới ở trạng thái chưa bind; mất máy được xử lý bằng revoke terminal cũ, provision terminal mới và recovery có audit nếu còn payload ngoài thiết bị.
- Khi offline, POS chỉ tiếp tục trên binding đã được server xác minh trước đó; không được bind/rebind offline. Khi reconnect, trạng thái server thắng cache và mọi sync vẫn authorize lại terminal, register, shift và actor.

**Tiêu chí nghiệm thu**

- Hai request đồng thời không thể tạo hai shift open cho cùng register trên MySQL.
- Hai register khác nhau trong cùng branch không bị domain rule ngăn mở ca khi multi-register được bật sau này.
- POS luôn biết register được bind và không chọn ngẫu nhiên một ca của branch.
- Có test terminal chưa bind/bị revoke, nhiều active register, rebind khi còn queue, xóa browser data, binding cache khi offline và binding server thay đổi khi reconnect.

### P0A-04 — Compliance discovery và nền tảng hóa đơn điện tử

**Cơ sở**

- Nghị định 254/2026/NĐ-CP có hiệu lực từ 01/07/2026 và quy định nghĩa vụ lập hóa đơn điện tử khi bán hàng hóa, dịch vụ, ngoại trừ các trường hợp tại Điều 7: [Cổng thông tin văn bản Chính phủ](https://vanban.chinhphu.vn/?docid=218689&pageid=27160&typegroupid=4), [toàn văn và nội dung áp dụng](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-254-2026-nd-cp-ve-hoa-don-dien-tu-chung-tu-dien-tu-119260713164251972.htm).
- Thông tư 91/2026/TT-BTC có hiệu lực từ 01/07/2026 và hướng dẫn thi hành về hóa đơn điện tử, chứng từ điện tử: [Cổng thông tin văn bản Chính phủ](https://vanban.chinhphu.vn/?docid=219006&pageid=27160), [tóm tắt điểm mới chính thức](https://xaydungchinhsach.chinhphu.vn/nhung-diem-moi-cua-nghi-dinh-254-2026-nd-cp-va-thong-tu-91-2026-tt-btc-ve-hoa-don-dien-tu-chung-tu-dien-tu-119260717143502375.htm).
- Nghị định 70/2025 đã đề cập doanh nghiệp bán trực tiếp đến người tiêu dùng, gồm siêu thị và bán lẻ, cùng các nhóm hộ/cá nhân kinh doanh theo điều kiện áp dụng: [thông tin chính thức về Nghị định 70/2025](https://xaydungchinhsach.chinhphu.vn/tu-1-6-ca-nhan-kinh-doanh-doanh-nghiep-nao-se-phai-su-dung-hoa-don-dien-tu-khoi-tao-tu-may-tinh-tien-119250402153802661.htm).
- `database/migrations/2026_08_09_164700_create_sales_tables.php:11-62` chưa có taxable base, VAT rate/amount, buyer tax information hoặc trạng thái/vòng đời hóa đơn điện tử.

**Quyết định**

- Phase 0A phải xác minh loại hình pháp lý, doanh thu, phương pháp thuế, trường hợp miễn trừ, loại hóa đơn đang dùng và yêu cầu của đơn vị cung cấp hóa đơn.
- Đầu ra bắt buộc là biên bản áp dụng được kế toán/người có thẩm quyền xác nhận, data mapping và quyết định go/no-go cho compliance track.
- Nếu thuộc diện áp dụng, tax model và invoice lifecycle chuyển thành hạng mục chặn go-live ở Phase 0B/1; không để toàn bộ hóa đơn điện tử mặc định ở Phase 3 hoặc Phase 4.
- Tích hợp phải có boundary/adapter nhà cung cấp. Thiết kế cần bao phủ snapshot thuế theo dòng, tiền trước thuế/tiền thuế, buyer/seller information, external ID, phát hành, retry/idempotency, thay thế/điều chỉnh/hủy và audit. Không giữ transaction/lock tạo sale trong lúc gọi provider; lưu issuance intent/outbox cùng sale rồi phát hành bằng workflow retry an toàn sau commit.
- Data mapping phải nối từng trường pháp lý → tax snapshot nội bộ → payload/schema provider, đồng thời chốt authentication/chữ ký/chứng thư, mã ngoài hệ thống, timeout/retry/idempotency, webhook hoặc polling, error/status mapping, đối soát và archive/export. Trạng thái provider-specific chỉ tồn tại ở adapter boundary.
- Phase 3 chỉ chứa quản trị/tích hợp nâng cao không bắt buộc cho compliance ban đầu.

Tài liệu này xác định mức ưu tiên kỹ thuật, không tự kết luận cửa hàng thuộc hoặc không thuộc diện áp dụng; kết luận đó phải đến từ đầu ra compliance discovery.

**Thuật ngữ dùng thống nhất**

| Thuật ngữ | Nghĩa trong hệ thống |
| --- | --- |
| Phiếu bán hàng/receipt 58 mm | Bản in vận hành từ sale snapshot để giao khách và tái in; tự nó không được coi là hóa đơn điện tử pháp lý. |
| Hóa đơn điện tử pháp lý | Chứng từ điện tử chịu yêu cầu pháp luật, có dữ liệu thuế, số/mã/ký hiệu/chữ ký và trạng thái pháp lý theo trường hợp áp dụng. |
| Invoice intent/provider lifecycle | Yêu cầu phát hành nội bộ và vòng đời đã chuẩn hóa như pending, submitting, issued, rejected, adjusted, replaced, cancelled; adapter ánh xạ trạng thái riêng của provider sang model này. |

### P0A-05 — Go-live gates chưa hoàn tất

**Bằng chứng từ bộ migration**

- `docs/README.md` và tài liệu trạng thái xác định source chưa sẵn sàng cutover trước khi ETL từ MySQL backup, staging rehearsal và UAT thiết bị thật hoàn tất.
- `migration/2026-08-11-211454-05-ke-hoach-trien-khai.md` và `migration/2026-08-13-231447-07-ke-hoach-export-import-du-lieu-legacy.md` đã yêu cầu backup/restore, monitoring, runbook cutover/cutback và tiêu chí NO-GO.

**Gate bắt buộc trước production**

- Rehearsal trên MySQL với dữ liệu production-like hoặc bản sao dữ liệu thật đã xử lý an toàn.
- Backup thành công và diễn tập restore có bằng chứng về thời gian/độ đầy đủ.
- Monitoring lỗi ứng dụng, offline backlog, sync conflict, tồn âm, lệch két và trạng thái import.
- UAT scanner, máy in 58 mm, keyboard flow và tình huống mất/kết nối lại mạng trên thiết bị thật.
- Startup check IndexedDB và yêu cầu browser storage persistence. Nếu persistence không được cấp, vẫn cho bán online nhưng khóa offline sale và hiển thị hướng khắc phục; không âm thầm nhận rủi ro mất queue.
- Dùng browser profile vận hành cố định, không dùng incognito/private mode. Không dùng heuristic phát hiện incognito làm security boundary.
- Recovery queue phải có cả export và đường restore/import hoặc runbook hỗ trợ đã diễn tập; file recovery phải được lưu ra ngoài thiết bị POS. Khi queue khác `0`, UI giữ cảnh báo persistent và yêu cầu export trước khi đóng browser, reset hoặc thay thiết bị.
- UAT reload/browser restart, browser data bị xóa và mô phỏng hỏng/thay thiết bị bằng bản recovery đã xuất. Xác nhận queue bằng `0` trước cutover, reset browser hoặc thay máy.
- Runbook rollback/cutback, tiêu chí NO-GO, người chịu trách nhiệm và kênh xử lý sự cố.

Đây là release gate chạy song song với Phase 0B, không phải dashboard backup để chờ tới Phase 3. Không deploy production nếu còn gate bắt buộc chưa đạt.

### P0B-01 — Phím tắt chạy phía sau overlay

**Bằng chứng**

- `usePosShortcuts` chỉ được khóa khi `clearDialogOpen`, `pickerProduct` hoặc `quickEditProduct` đang mở: `resources/js/pages/pos/index.tsx:420-426`.
- Page còn có `openShiftOpen`, `quickCustomerOpen`, `syncCenterOpen`, `receiptPreviewOpen`: `resources/js/pages/pos/index.tsx:538-563`.
- `HeldCartsPanel` tự giữ state của hai Dialog nên page không biết chúng đang mở: `resources/js/features/pos/components/held-carts-panel.tsx:76-151`.
- F9/F12 không kiểm tra `typingTarget`; chúng có thể đổi cash/checkout và chuyển focus trong khi người dùng đang thao tác trong Dialog: `resources/js/features/pos/hooks/use-pos-shortcuts.ts:32-43`.

**Ảnh hưởng**

- F3 có thể cố lấy focus về scanner phía sau Dialog.
- F9/F12 có thể thay đổi checkout hoặc scroll/focus phía sau modal.
- F8/Delete có thể mở thêm confirmation hoặc tác động giỏ trong những overlay không được page theo dõi.
- Khi Dialog mở ca bắt buộc xuất hiện cùng draft được phục hồi, rủi ro thao tác nhầm đặc biệt khó hiểu.

**Hướng sửa**

- Chốt outcome `isInteractionBlocked`: shortcut chỉ chạy khi POS canvas là interaction layer trên cùng.
- Ưu tiên lift trạng thái overlay về owner gần nhất và derive `isInteractionBlocked` cục bộ. Chỉ tạo registry/context khi overlay nội bộ ở nhiều component chứng minh state lifting không còn đủ rõ; registry không phải kiến trúc bắt buộc.
- Shortcut destructive/checkout phải dùng cùng blocking policy; shortcut chỉ phục vụ nhập liệu được xem xét riêng theo focus contract.
- Vẫn cho Escape đóng overlay theo contract của Radix; không đồng thời collapse checkout phía sau.
- Không nối boolean rời rạc thiếu contract; mọi overlay mới phải tham gia cùng blocking policy và test.

**Tiêu chí nghiệm thu**

- Mở lần lượt Open Shift, Quick Customer, Held Carts, Delete Held Cart, Variant Picker, Sync Center, Receipt Preview và Quick Edit; F3/F8/F9/F12/Delete không tác động phía sau.
- Sau khi đóng overlay, scanner được trả focus đúng một lần.

### P0B-02 — Hoàn tác xóa giỏ có thể ghi đè dữ liệu mới hoặc nhầm draft

**Bằng chứng**

- Undo chỉ lưu một mảng `CartLine[]`, không lưu `activeCartId`, thời gian hết hạn hay phiên bản cart: `resources/js/pages/pos/index.tsx:96`.
- Confirm lưu snapshot rồi clear: `resources/js/pages/pos/index.tsx:279-284`.
- Undo gọi thẳng `replaceCart(undoCart)`: `resources/js/pages/pos/index.tsx:285-290`.
- Nút hoàn tác vẫn xuất hiện chừng nào `undoCart.length > 0`, kể cả khi người dùng đã scan hàng mới hoặc đổi đơn: `resources/js/pages/pos/index.tsx:449-463`.

**Kịch bản lỗi**

1. Xóa giỏ A.
2. Scan sản phẩm mới hoặc chuyển sang giỏ B.
3. Bấm “Hoàn tác”.
4. Source thay toàn bộ cart hiện tại bằng snapshot cũ.

**Hướng sửa**

- Lưu undo command có `{ cartId, snapshot, createdAt, expectedEmptyVersion }`.
- Chỉ restore tại đúng cart và khi cart chưa phát sinh thay đổi sau lệnh clear.
- Nếu cart đã thay đổi, action an toàn là “Khôi phục thành đơn đang giữ”, không overwrite.
- Tự hết hạn action sau 8–10 giây và hủy khi switch/delete draft.
- Notice và undo action phải cùng một object; không giữ `message` và `undoCart` độc lập.

**Tiêu chí nghiệm thu**

- Undo đúng giỏ trong thời gian cho phép.
- Scan mới, switch cart hoặc tạo cart mới không thể bị undo cũ ghi đè.
- Reload sau khi clear không làm xuất hiện action undo không còn hợp lệ.

### P0B-03 — Reprice sale offline thiếu bước kiểm tra tác động tài chính

**Bằng chứng**

- Reprice thay `item.unit_price` bằng giá catalog hiện tại: `resources/js/features/pos/api/offline-sale-repository.ts:181-208`.
- Payload `payments` không được điều chỉnh.
- Sync Center chỉ hiển thị idempotency key, ca, attempts và lỗi; không hiển thị sản phẩm, tổng cũ, tổng mới, cash/QR/debt: `resources/js/features/pos/components/sync-center.tsx:34-79`.
- Action “Cập nhật giá hiện tại” thực hiện ngay, không có preview/confirmation.

**Ảnh hưởng**

- Giá tăng có thể tạo thêm công nợ ngoài ý định; nếu là khách lẻ thì sync tiếp tục conflict.
- Giá giảm có thể tạo tiền thừa chưa thực tế trả cho khách.
- Thu ngân không có cách biết hóa đơn nào, khách nào và lệch bao nhiêu trước khi xác nhận.

**Hướng sửa**

- Reprice phải là hai bước: `preview diff` → `explicit confirm`.
- Preview hiển thị từng dòng thay đổi, tổng cũ/mới, chênh lệch, tiền đã thu, debt/change mới và customer.
- Không tự sửa payment. Người dùng phải chọn policy rõ: giữ giá offline bằng approval online, thu thêm, hoàn phần chênh lệch, chuyển công nợ cho khách hợp lệ, hoặc hủy/recovery thủ công.
- Mọi quyết định reprice/approval phải có audit event.

**Tiêu chí nghiệm thu**

- Không có mutation giá khi chưa xem và xác nhận diff.
- Không thể sync sale có debt mới nếu chưa có customer.
- Receipt/sale snapshot cuối cùng phản ánh đúng số tiền thực tế đã thu hoặc phải thu/hoàn.

### P1A-01 — Scan/tìm bằng Enter thất bại im lặng

**Bằng chứng**

- Exact barcode được add ngay.
- Nếu không exact và số match khác 1, handler chỉ `return`: `resources/js/pages/pos/index.tsx:403-415`.

**Ảnh hưởng**

- Thu ngân không biết scanner chưa đọc, barcode chưa khai báo hay có nhiều kết quả.
- Có thể scan lại nhiều lần hoặc phải dừng để kiểm tra bằng mắt vì hệ thống không nói trạng thái 0/nhiều kết quả; handler hiện tại chạy local và đồng bộ, không có bằng chứng về kết quả bất đồng bộ đến chậm.

**Hướng sửa**

- 0 kết quả: notice/error ngay cạnh ô scan, đọc lại barcode, giữ focus và select nội dung để scan lại.
- 1 kết quả: add, highlight dòng vừa thêm và phát tín hiệu thành công ngắn; chỉ bổ sung âm thanh khi UAT thiết bị thật chứng minh có ích và luôn có tín hiệu hình ảnh tương đương.
- Nhiều kết quả: mở danh sách lựa chọn keyboard-friendly, focus item đầu, Enter chọn, Escape quay lại scanner.
- Phân biệt “barcode exact” và “text search Enter”; không tự chọn mơ hồ.

**Tiêu chí nghiệm thu**

- Mọi lần nhấn Enter đều tạo ra kết quả quan sát được: add thành công, chọn thêm hoặc lỗi rõ.
- Scan liên tục 20 mã không mất focus và không tạo layout shift đáng kể.

## 4. Các cải thiện UX/code tiếp theo

| ID | Mức | Hiện trạng | Cải thiện phù hợp |
| --- | --- | --- | --- |
| UX-01 | P1 | Customer combobox tự dựng chỉ có role cơ bản, không có active descendant/arrow navigation/outside close rõ ràng. | Dùng `SearchableSelect`/Headless UI hiện có; render tên + code + phone + debt bằng `optionContent`. |
| UX-02 | P1 | `message: string` gộp success, warning, refresh error, checkout error và undo. | Dùng typed notice `{id, tone, title, detail, action, persistent}`; error tiền/validation nằm cạnh control và có `role="alert"`. |
| UX-03 | P1 | Badge Online dựa vào `navigator.onLine`; có mạng LAN nhưng server lỗi vẫn có thể báo Online. | Trạng thái `offline/checking/online/degraded/syncing/conflict`, kèm thời điểm refresh/sync thành công gần nhất. |
| UX-04 | P1 | Sync Center chưa có processing state ở cấp UI; nút vẫn có thể bấm lại trong lúc module-level lock đang chạy. | Expose `isSyncing`, disable action liên quan, hiển thị progress, failed/conflict count và kết quả lần gần nhất. |
| UX-05 | P1 | Nút “In” trong success bar chỉ mở preview, không in: `receipt-preview.tsx:146-151`. | Đổi nhãn thành “Xem & in”; chỉ gọi print sau khi receipt preview sẵn sàng hoặc có setting auto-print được cấu hình. |
| UX-06 | P1 | Cart table có `min-w-[680px]`; dưới desktop rộng phải cuộn ngang. | Ở tablet dùng layout hai cột linh hoạt hoặc cart row compact; giữ product/qty/line total, đưa price/discount vào expandable row. |
| UX-07 | Có điều kiện | Nút +/- và quantity input cao 28 px. Thiết bị chính đã chốt là desktop không cảm ứng. | Không tạo setting density ở giai đoạn hiện tại. Chỉ bổ sung layout/control cho `pointer: coarse` hoặc tablet khi có thiết bị và UAT xác nhận nhu cầu; vẫn kiểm tra focus/khả năng bấm trên desktop. |
| UX-08 | P1 | Catalog card có cả wrapper `tabIndex=0` và button con, tạo hai điểm focus/card; Enter trên wrapper không add. | Chỉ có một primary interactive target; secondary quick edit vào menu, hỗ trợ Enter/Space và accessible name đầy đủ. |
| UX-09 | P1 | Cash/QR và price/discount dùng `type=number` thô, khó đọc số tiền lớn. | Dùng money input hiển thị phân nhóm nghìn, giữ integer model, select-all on focus và paste an toàn. |
| UX-10 | P1 | Expiry badge chỉ hiển thị số, không có action. | Link sang tồn kho với filter expiry; tooltip/nội dung nói rõ hết hạn/cận hạn và số lô cần xử lý. |
| UX-11 | P1 | Không có register thì dialog mở ca chỉ render select trống và `register_id=0`. | Empty state có lý do, khóa submit, action sang cấu hình quầy hoặc liên hệ quản lý. |
| UX-12 | P0A | `activeShift()` dùng `first()` trong các ca mở của chi nhánh, trong khi domain mở ca theo register. | Dùng server-side terminal → register binding, fail closed khi chưa bind/bị revoke và không auto-pick. Enforce tối đa một ca mở/register dưới concurrency; không tạo unique rule một ca/branch. |
| UX-13 | P1B | Sau mỗi sale refresh toàn catalog, categories, customers và expiry. | Đo payload/query/index rebuild/scan p95 trước. Chỉ thiết kế delta refresh hoặc tách refresh customer khi benchmark production-like chứng minh full refresh vượt budget. |
| UX-14 | P1 | Không hiển thị “dòng vừa thêm” hoặc cart auto-scroll. | Highlight 0,8–1,2 giây, scroll row vào view khi cần, aria-live ngắn: tên + số lượng hiện tại. |
| UX-15 | P2 | Category filter render toàn bộ button ngang. | Giữ chip với danh sách ngắn; khi category lớn, thêm nhóm/overflow có chủ đích, không biến mọi category thành searchable select. |
| UX-16 | P2 | Stock label dùng quantity base nhưng không ghi đơn vị base, dễ hiểu nhầm với unit đang bán. | Hiển thị `còn X <unit bán>` hoặc `X <base unit>` và quy đổi; cảnh báo tồn âm nhưng không chặn theo policy hiện tại. |
| UX-17 | P0A/1A/3 | Receipt header/tên cửa hàng đang hard-code. | Compliance track chốt seller/buyer/tax fields bắt buộc; Phase 1A sửa nhãn/preview/print và footer cơ bản; Phase 3 mới làm UI quản trị đầy đủ cho store/receipt/printer settings. Mọi dữ liệu dùng để in phải snapshot vào sale/receipt. |

### 4.1. Quyết định loại Select cho POS

Theo đặc điểm dữ liệu và luồng thao tác hiện tại:

| Trường | Pattern phù hợp | Lý do |
| --- | --- | --- |
| Khách hàng | Searchable select | Danh sách tăng dần; cần tìm theo code, tên, phone và xem debt. |
| Quầy khi mở ca | Select thường | Danh sách ngắn, ổn định; search chỉ tạo thêm bước. |
| Category POS | Chip/filter trực tiếp | Đây là thao tác lặp nhanh, cần nhìn và bấm ngay. Chỉ thêm overflow khi số lượng lớn. |
| Variant/unit của một sản phẩm | Picker trực tiếp | Số lựa chọn theo một sản phẩm thường ngắn; phải thấy giá, quy đổi và tồn cùng lúc. |
| Sản phẩm trong nhập kho | Searchable select | Dataset lớn, cần tên/SKU/barcode và đã dùng đúng pattern hiện tại. |

Đối với `SearchableSelect` dùng chung:

- Client-side search nên mặc định phản hồi ngay; `searchDebounceMs=150` hiện tại tạo độ trễ không cần thiết cho danh sách local.
- Không mở rộng `SearchableSelect` thành server-search contract khi chưa có consumer thực tế và benchmark cho thấy client-side options không đạt budget. Khi điều kiện đó xảy ra, thiết kế contract theo consumer cụ thể với query, loading/error, debounce request và latest-request-wins.
- Khi selected option vẫn tồn tại và người dùng gõ query, hai nút xóa query/xóa lựa chọn có thể cùng hiện gần nhau; cần chỉ giữ một clear affordance theo state.
- Nếu dùng `maxVisibleOptions`, phải báo còn bao nhiêu kết quả chưa hiển thị hoặc có action xem thêm.

## 5. Điểm cần cải thiện về cấu trúc source

### 5.1. `PosPage` vẫn giữ quá nhiều orchestration

`resources/js/pages/pos/index.tsx` dài 605 dòng và quản lý đồng thời:

- server prop mirror;
- catalog/customer/shift refresh;
- connectivity/offline sync;
- cart drafts;
- checkout;
- receipt persistence;
- overlay state;
- notification/undo;
- keyboard shortcut;
- quick edit catalog.

Không nên chuyển tất cả vào một mega-hook. Hướng tách phù hợp:

```text
PosPage (props + compose)
├── usePosResources        catalog/customer/shift versions + refresh
├── usePosSession          active cart + checkout draft + receipt
├── usePosConnectivity     connection state + queue + sync result
├── usePosInteractionScope overlay state + blocking policy + shortcuts + focus restore
└── usePosNotices          typed notice + scoped undo command
```

Mỗi hook vẫn gọi repository/service riêng; view component chỉ nhận state và callback cần thiết.

### 5.2. Backend sale action có quá nhiều trách nhiệm

`CreateSaleAction` đang làm idempotency, shift policy, product lookup, pricing, approval, sale persistence, payments, credit ledger, inventory, lot FEFO và shift reconciliation trong một class. Transaction boundary hiện tại là đúng và phải giữ.

Không chốt trước tên hoặc số lượng service. Thứ tự refactor phù hợp là:

1. Viết characterization test cho pricing, discount, payment, debt/change, offline closed-shift và idempotency hiện tại.
2. Tách các phép tính giá/payment không ghi database thành calculator/value object thuần khi ranh giới đã rõ và test độc lập tạo giá trị.
3. Giữ `CreateSaleAction` điều phối transaction, lock, persistence và thứ tự side effect.
4. Chỉ tách write action khi có contract nghiệp vụ độc lập, có ít nhất một consumer thật hoặc làm transaction/audit dễ kiểm chứng hơn.

Không tách sale creation thành nhiều request/job. Sale, payment, debt, inventory, invoice data và idempotency record vẫn phải commit/rollback theo boundary nhất quán.

### 5.3. Query/payload POS cần benchmark

- Catalog bootstrap tải toàn bộ product → variant → unit → barcode → balance.
- Customer bootstrap tải toàn bộ customer kèm aggregate debt.
- Snapshot yêu cầu riêng `categories` vẫn trả cả catalog.
- Sau mỗi sale, client yêu cầu lại catalog, categories, customers và expiry.

Local SQLite hiện có khoảng 2.157 sản phẩm nên đủ cơ sở để benchmark catalog bước đầu. Tuy nhiên chỉ có một customer, một register và bốn sale, vì vậy không dùng dữ liệu local để quyết định customer server search, multi-register hoặc hiệu năng báo cáo. Cần đo với dữ liệu production-like:

- JSON payload compressed/uncompressed;
- server query time;
- parse + search-index rebuild trên main thread;
- IndexedDB cache write;
- scan-to-cart p95 trong lúc background refresh.

Version + delta theo variant/inventory/customer là phương án mở rộng, không phải implementation đã chốt. Chỉ thực hiện sau khi benchmark vượt performance budget; barcode scan vẫn phải local và không chuyển thành server search theo từng ký tự.

### 5.4. Thiếu automated frontend interaction tests

Source có Pest feature tests tốt cho quantity, stale price, offline closed shift, freshness, catalog scope và shift. Tuy nhiên chưa có test tự động cho:

- shortcut/overlay scope;
- undo theo cart;
- customer combobox keyboard;
- checkout validation focus;
- held cart persistence;
- Sync Center processing/conflict actions;
- scan 0/1/nhiều kết quả;
- receipt action và print DOM.

Test không được dồn sau khi hoàn thành toàn bộ Phase 0. Quyết định source of truth cho quality gate frontend là:

- Mỗi capability, shortcut scope, undo, offline reprice và idempotency change phải có test cùng vertical slice.
- Backend dùng Pest cho allow/deny, money, idempotency và transaction behavior; concurrency/locking phải có lượt xác minh trên MySQL, không chỉ SQLite.
- Cho phép bổ sung Vitest + React Testing Library với môi trường jsdom làm frontend test runner tối thiểu cho regression P0. Đây là ngoại lệ có phạm vi đã chốt so với quyết định cũ trong plan refactor frontend, không phải yêu cầu phủ unit test toàn frontend.
- Ticket đầu tiên của Phase 0B phải thêm dependency/script/lockfile cần thiết và một smoke test chạy được; không cài dependency trong giai đoạn lập kế hoạch này. Browser UAT vẫn bắt buộc cho focus thực, scanner, IndexedDB/service worker và print 58 mm vì component test không thay thế được thiết bị/trình duyệt thật.
- Quyết định cũ về hoãn test toàn hệ thống không loại bỏ affected tests bắt buộc cho security, financial correctness và regression P0. Không biến harness thành dự án platform độc lập.

## 6. Tính năng hiện có và khoảng trống của hệ thống siêu thị mini

### 6.1. Đã có hoặc đã có nền tảng

| Nhóm | Mức hiện tại | Nhận xét |
| --- | --- | --- |
| POS bán hàng | Khá đầy đủ | Barcode, unit, cash/QR/debt, override, offline. |
| Sản phẩm/category/unit/barcode | Có | CRUD, status, hierarchy, quick edit, import legacy. |
| Nhập kho | Có mức cơ bản | Phiếu nhập, lot/expiry, Excel/template; supplier mới là text. |
| Tồn kho | Có primitive nền tảng | `AdjustInventoryAction` đã lock balance, cập nhật số lượng và ghi movement. Chưa có chứng từ điều chỉnh độc lập, UI, reason taxonomy, approval và stocktake draft → review → post. |
| Khách hàng/công nợ | Có | Danh sách, sale debt, thu nợ, ledger nền tảng. |
| Ca/két | Có | Mở/đóng, thu/chi, cash count, reconciliation. |
| Receipt/đổi trả | Có | Lịch sử sale, receipt snapshot, return/exchange theo item; chưa đồng nghĩa đã có tax model và vòng đời hóa đơn điện tử. |
| Dashboard | Có mức cơ bản | Doanh thu ngày, payment mix, debt, tồn âm, expiry. |
| Phân quyền | Chưa đủ production | Capability tập trung chủ yếu ở catalog; request nhạy cảm còn active-only hoặc role check phân tán, menu chưa phản ánh quyền. |
| Offline/recovery | Khá tốt | Queue, retry/conflict, recovery export, last receipt. |

### 6.2. Bắt buộc xác minh hoặc hoàn thành trước production

| Hạng mục | Vì sao bắt buộc | Ưu tiên |
| --- | --- | --- |
| Capability matrix + server authorization | Bán hàng, trả hàng, thu nợ, ca/két, kho, import và báo cáo đều chứa dữ liệu hoặc mutation nhạy cảm. | Phase 0A |
| Account lifecycle + owner PIN security | Inactive user hiện vẫn có thể login; session đang mở và approval PIN chưa có revoke/throttle/audit contract tập trung. | Phase 0A |
| Register/shift invariant | Domain là một ca mở/register nhưng POS hiện lấy ca đầu tiên của branch; deployment một máy phải bind register rõ và concurrency phải được bảo vệ. | Phase 0A |
| Compliance discovery | Phải xác định đúng nghĩa vụ thuế/hóa đơn trước khi chốt schema và cutover. | Phase 0A |
| Tax/invoice foundation nếu thuộc diện áp dụng | Thiếu tax snapshot và invoice lifecycle có thể làm dữ liệu sale không đủ phát hành/điều chỉnh hóa đơn. | Phase 0B/1, chặn go-live |
| MySQL rehearsal, backup/restore, monitoring, offline queue recovery và device UAT | Database backup không bảo vệ pending sale chỉ còn trong IndexedDB; recovery phải có persistent storage, export ra ngoài thiết bị và restore drill. | Phase 0A, chặn go-live |
| Audit event cho mutation nhạy cảm | Viewer có thể làm sau, nhưng bằng chứng hành động phải được ghi từ khi nghiệp vụ bắt đầu chạy. | Cùng từng vertical slice |

### 6.3. Phù hợp cao cho vận hành siêu thị mini

| Tính năng | Vì sao phù hợp | Phase |
| --- | --- | --- |
| Kiểm kê kho (stocktake) | Cần đếm thực tế, ghi variance, cutoff, reason, actor và post movement có kiểm soát trong khi POS vẫn có thể hoạt động. | 2A |
| Chứng từ điều chỉnh tồn | Hàng hỏng, dùng nội bộ, thất thoát, hết hạn và sửa sai cần reason/approval/audit riêng. | 2A |
| Đảo phiếu nhập đã post | Phiếu nhập hiện completed ngay và tăng tồn/cost; sửa sai phải tạo reversal document/movement liên kết phiếu gốc, không sửa hoặc xóa lịch sử. | 2A |
| Mức tồn min/max + low-stock worklist | Chuyển cảnh báo hết/tồn thấp thành danh sách hành động dựa trên min/max thủ công; chưa gọi là tối ưu nhập hàng. | 2B1 |
| Nhà cung cấp master | Thay supplier text tự do bằng code, liên hệ, trạng thái và lịch sử nhập. | 2B1 |
| Reorder rule nâng cao | Chỉ tính đề xuất có ý nghĩa khi có preferred supplier, lead time, safety stock, MOQ, pack multiple và supplier-product/unit mapping. | 2B2 |
| Barcode/tem giá | Hỗ trợ nhập hàng, đổi giá, hàng không có barcode nhà sản xuất và kiểm kê; cần UAT máy in riêng. | 2B2 |
| Quản trị user/role/register/branch | Cho chủ cửa hàng vận hành capability đã enforce ở server mà không sửa seed/manual DB. | 3 |
| Báo cáo phân tích | Doanh thu/lãi gộp (gross margin), payment, công nợ, tồn, cận hạn, thất thoát và top/bottom product sau khi có dữ liệu đủ lớn. Chưa gọi là lợi nhuận ròng/P&L khi chưa có expense. | 3 |
| Audit viewer | Tra cứu approval, adjustment, sync conflict, return và import; event generation không chờ viewer. | 3 |

Các báo cáo kiểm soát bắt buộc để go-live như lệch két, tồn âm, offline backlog, sync conflict và lỗi import thuộc Phase 0A/1, không chờ báo cáo phân tích Phase 3.

### 6.4. Phù hợp có điều kiện, chỉ làm khi có business case

| Tính năng | Khi nào nên làm | Ưu tiên gợi ý |
| --- | --- | --- |
| Trả hàng nhà cung cấp | Khi cửa hàng có quy trình trả hàng lỗi/hết hạn; đây là outbound document riêng, không đồng nhất với reversal sửa sai phiếu nhập. | Phase 2B1 sau reversal foundation |
| Đơn đặt hàng nhà cung cấp (PO) | Khi cần đề xuất → duyệt → đặt → nhận và theo dõi thiếu hàng; stock receipt hiện tại vẫn đáp ứng luồng mua đơn giản. | Phase 4 hoặc kéo lên sau 2B nếu có nhu cầu thật |
| Công nợ nhà cung cấp | Khi có mua chịu/đối soát thanh toán; không dùng customer ledger cho supplier. | Phase 4 |
| Promotion/price rule | Khi có combo, mua X tặng Y, khuyến mãi theo giờ/category/customer; server phải resolve và snapshot rule cùng tác động thuế. | Phase 4 |
| Customer segment/loyalty | Khi tỷ lệ khách định danh đủ cao và có policy điểm/hạng rõ. | Phase 4 |
| Chi phí cửa hàng | Khi cần P&L vận hành; tách expense document khỏi cash movement của ca. | Phase 4 |
| Chuyển kho/chi nhánh | Chỉ khi thực sự có từ hai kho/chi nhánh; cần in-transit state và reconciliation. | Phase 4 |
| Dynamic QR/bank confirmation | Khi có ngân hàng/provider ổn định và webhook/reconciliation contract. | Phase 4 |
| Tích hợp hóa đơn điện tử nâng cao | Chỉ phần quản trị nhiều provider, dashboard đối soát hoặc automation ngoài compliance tối thiểu. | Phase 3/4 |
| Camera barcode | Khi có workflow kiểm kê mobile/tablet; không ưu tiên cho quầy desktop dùng scanner keyboard. | Phase 4 |

### 6.5. Chưa phù hợp ở giai đoạn hiện tại

- Full ERP/kế toán tổng hợp.
- Advanced WMS như wave picking, bin routing, cross-docking.
- E-commerce/omnichannel đồng bộ đơn nếu chưa có kênh bán online thật.
- AI forecasting trước khi có dữ liệu bán sạch, stocktake đáng tin cậy và lead time nhà cung cấp.
- Microservice/event bus chỉ để “chuẩn bị mở rộng”; modular monolith hiện tại phù hợp hơn.

## 7. Roadmap đề xuất theo phase

Effort dưới đây là tương đối cho một vertical slice hoàn chỉnh gồm backend, frontend, test và UAT; không phải cam kết lịch.

### Phase 0A — Security, register/shift, compliance và go-live gate

**Mục tiêu:** xác nhận hệ thống có thể được phép vận hành và có đường lui an toàn trước khi mở rộng tính năng.

- Hoàn thành P0A-01 capability matrix và server authorization; UI nhận capability để phản ánh quyền.
- Hoàn thành P0A-02 account lifecycle: inactive login/session, session revoke, capability downgrade, owner PIN throttle/audit và recovery có kiểm soát cho offline sale khi actor bị thu hồi quyền.
- Hoàn thành P0A-03 register/shift invariant: server-side terminal binding, bind/rebind/revoke runbook, fail-closed khi chưa bind, khóa register khi mở ca và MySQL concurrency test.
- Hoàn thành P0A-04 compliance discovery và biên bản kết luận đã được người có thẩm quyền xác nhận.
- Nếu thuộc diện hóa đơn điện tử: lập compliance track cho tax model, invoice lifecycle, provider adapter và migration dữ liệu liên quan; track này chặn go-live.
- Hoàn thành P0A-05: MySQL rehearsal, backup/restore drill, offline queue export + restore drill, monitoring, device UAT và cutback ownership.
- Bổ sung audit event generation cùng từng mutation nhạy cảm; chưa cần audit viewer.
- Viết Pest allow/deny test theo từng capability ngay khi enforce, không chờ hết Phase 0.

**Engineering effort:** L–XL tùy kết luận compliance và phạm vi session/queue recovery.  
**External/rehearsal effort:** không gộp vào engineering estimate; phụ thuộc kế toán/nhà cung cấp hóa đơn, dữ liệu MySQL, thiết bị thật, lịch diễn tập và người chịu trách nhiệm vận hành.  
**Gate kết thúc:** không còn endpoint nhạy cảm active-only ngoài quyết định có chủ đích; compliance có kết luận và backlog bắt buộc; toàn bộ go-live gate có bằng chứng PASS. Phase 0A có thể chạy song song Phase 0B, nhưng production bị chặn nếu Phase 0A chưa đạt.

### Phase 0B — POS correctness và regression protection

**Mục tiêu:** không mất cart, không thao tác phía sau overlay, không đổi tiền offline mà người dùng không biết và không tạo sale trùng dưới retry/concurrency.

- P0B-01 shortcut/overlay scope.
- P0B-02 scoped undo command.
- P0B-03 preview và policy reprice offline.
- Thiết lập Vitest + React Testing Library harness tối thiểu trước hoặc cùng P0B-01 theo quyết định tại mục 5.4; browser UAT vẫn bao phủ scanner/focus/print.
- Bổ sung affected Pest test cho reprice/payment/debt/idempotency; xác minh concurrency/locking trên MySQL.
- Mỗi P0B hoàn thành cùng automated test và UAT liên quan, không làm xong toàn bộ rồi mới bổ sung test.

**Effort:** M–L.  
**Gate kết thúc:** không còn Sev-1/Sev-2 chưa xử lý trong các nhóm mất/ghi đè cart, sai tiền, duplicate sale và shortcut xuyên overlay; test P0B và MySQL concurrency scenario đạt. Sev-1/Sev-2 phải có định nghĩa, owner và bằng chứng fix/retest; không đóng bằng chấp nhận rủi ro miệng.

### Phase 1A — Feedback, accessibility và độ rõ trạng thái POS

**Mục tiêu:** thu ngân mới có thể hiểu và thao tác nhanh mà không cần nhớ trạng thái ngầm.

- P1A-01 feedback scan 0/1/nhiều kết quả; kiểm tra barcode uniqueness/integrity riêng ở backend/data import.
- Thay customer combobox bằng searchable select chuẩn.
- Typed notice + inline errors + focus lỗi đầu tiên.
- Connection/sync state machine và last successful refresh.
- Last-added highlight, cart auto-scroll, optional sound feedback.
- Money input format và quick tender ergonomics.
- Receipt action đúng nhãn, preview/print/footer cơ bản và UAT 58 mm. Seller/buyer/tax fields bắt buộc thuộc compliance track; UI quản trị settings đầy đủ thuộc Phase 3.
- Giữ desktop operational layout; chỉ thêm `pointer: coarse`/tablet adaptation khi có thiết bị và UAT xác nhận, không tạo density setting.
- No-register empty state; expiry badge có action.

**Effort:** L.  
**Gate kết thúc:** keyboard-only smoke pass; production acceptance tại 1920×1080 và regression desktop 1600×900, 1536×864, 1440×900, 1366×768, 1280×720; 1024 px chỉ là safe-fallback smoke test; scan-to-cart không regression khi background refresh.

### Phase 1B — Benchmark và tối ưu theo số liệu

**Mục tiêu:** chỉ thay đổi data contract khi đo được bottleneck thật.

- Môi trường chuẩn: production build trên desktop quầy 1920×1080, Chrome stable hiện hành, zoom 100%, scanner keyboard thật, MySQL staging và mạng LAN production-like. Ghi lại CPU/RAM, phiên bản browser, build/hash và trạng thái cold/warm cache trong báo cáo.
- Dataset chuẩn dùng bản sao production đã xử lý an toàn; nếu chưa có thì dùng tối thiểu 3.000 sản phẩm với phân bố variant/unit/barcode gần thực tế và 1.000 customer synthetic. Local 2.157 sản phẩm chỉ là baseline bổ sung, không thay thế dataset chuẩn.
- Mỗi run gồm tối thiểu 100 lần scan barcode exact-match và 30 lần background refresh; báo cáo p50, p95, max cho payload compressed/uncompressed, server query/snapshot, parse/index rebuild, IndexedDB write và scan-to-cart.
- Performance budget ban đầu: scan Enter → item hiển thị trong cart p95 ≤ 100 ms khi idle và ≤ 150 ms khi background refresh; không mất hoặc thêm trùng scan trong 100 lần exact-match.
- Background refresh từ request đến cache/UI settle p95 ≤ 1,5 giây; server snapshot/query p95 ≤ 500 ms; full catalog payload compressed ≤ 2 MB tại dataset chuẩn; longest main-thread task ≤ 100 ms và total blocking time ≤ 200 ms mỗi refresh.
- Ghi decision record: giữ full refresh hoặc triển khai delta theo variant/inventory/customer dựa trên kết quả đo và UAT.
- Customer server search chỉ được mở khi có dữ liệu production đủ lớn và selector/search p95 không đạt 100 ms với client-side options trong hai run liên tiếp.
- Multi-register và report performance chỉ đánh giá bằng dữ liệu production-like; local một register và bốn sale không đủ căn cứ.
- Nếu một critical budget bị vượt trong hai run liên tiếp, Phase 1B phải tạo decision record và ticket tối ưu phù hợp như delta refresh/off-main-thread index; retest cùng dataset trước khi đóng phase. Không tối ưu chỉ vì một lần đo đơn lẻ.

**Effort:** S để benchmark; effort tối ưu được ước lượng sau kết quả đo.  
**Gate kết thúc:** có benchmark lặp lại được, baseline so với các budget trên và decision record go/no-go; critical budget đạt hoặc có tối ưu được retest đạt, không triển khai speculative delta/server-search contract.

### Phase 2A — Stocktake và inventory adjustment

**Mục tiêu:** tồn hệ thống có thể đối soát với hàng thật bằng chứng từ và workflow có kiểm soát.

- Stocktake session: draft, count, recount, review, scoped freeze, post adjustment.
- `Scoped freeze` là khóa nghiệp vụ có trạng thái lưu trong database theo variant/lot, không phải giữ `lockForUpdate()` trong lúc con người kiểm đếm. Draft/count ban đầu vẫn cho phép inventory movement và số đếm ở giai đoạn này chỉ là provisional.
- Khi chuyển sang `frozen`, một transaction ngắn khóa stocktake/scope và balance theo lock order thống nhất, ghi freeze active, chụp `cutoff_movement_id`/watermark cùng `system_quantity_at_cutoff` cho từng variant/lot rồi commit và nhả row lock. Recount cuối diễn ra khi business freeze đang active; không giữ database transaction qua thời gian recount.
- Công thức post theo base unit là `variance = final_physical_count_base - system_quantity_at_cutoff`. Post chạy trong transaction ngắn, kiểm tra lại freeze/cutoff, gọi `AdjustInventoryAction` với delta này, ghi document/movement rồi chuyển stocktake sang posted và release freeze.
- Mọi inventory mutation gồm sale, return, stock receipt, receipt reversal, manual adjustment, legacy/import và stocktake post phải gọi một freeze guard tập trung bên trong transaction. Không có đường ghi balance trực tiếp được phép bypass guard.
- Movement sau cutoff trong scope frozen phải bằng `0`. Nếu phát hiện movement do race, legacy code hoặc bypass, post fail closed và yêu cầu cancel/re-freeze/recount; không âm thầm cộng movement sau cutoff vào variance.
- Freeze không tự hết hạn. Sau 30 phút không hoạt động, hệ thống cảnh báo stale; manager/owner có capability riêng chỉ được cancel/release khi stocktake không ở trạng thái posting, phải ghi lý do và audit. Recovery runbook phải bao phủ crash hoặc freeze bị bỏ dở.
- Authoritative count là base unit; UI có thể nhận sale/purchase unit rồi quy đổi. Product track lot/expiry phải count đến cấp lot.
- Hỗ trợ partial/cycle count theo scope; full stocktake là cùng workflow với scope toàn bộ. Capability mặc định: cashier/manager/owner có thể count; manager/owner có thể recount, review và post. Server capability mới là enforcement boundary, không dựa vào việc ẩn button.
- Chứng từ điều chỉnh độc lập với reason taxonomy: damage, expiry, internal use, loss, correction.
- Mọi stocktake phải qua review trước post; mọi variance khác `0` và mọi inventory adjustment đều cần reason. Không dùng threshold chưa chốt để bỏ qua review trong MVP.
- Dùng `AdjustInventoryAction` làm primitive movement hiện có; workflow bọc document + balance + movement trong transaction thống nhất.
- Lock/idempotency để một stocktake hoặc adjustment không post hai lần.
- Chứng từ reversal phiếu nhập liên kết phiếu gốc, đảo quantity/lot movement theo phần còn có thể đảo và không sửa/xóa receipt đã post. Không tự rollback `last_cost_base` nếu có receipt mới hơn; trường hợp tồn/lot không đủ phải thành conflict cần xử lý có quyền.

**Effort:** L–XL.  
**Gate kết thúc:** mọi thay đổi tồn có document, source, actor, reason và timestamp; draft/count/recount/freeze/post, công thức variance, tất cả mutation path qua freeze guard, sale cạnh cutoff, stale-freeze recovery, concurrent posting, reversal toàn phần/một phần và conflict tồn/lot được test.

### Phase 2B1 — Supplier và low-stock worklist

**Mục tiêu:** hỗ trợ nhập hàng có cấu trúc và biến cảnh báo tồn thành danh sách hành động đơn giản, giải thích được.

- Minimum/target maximum thủ công theo product variant/branch.
- Low-stock worklist; quantity gợi ý MVP bằng `target max - available`, làm tròn theo pack size nếu đã cấu hình. Gọi đây là rule-based suggestion, không phải tối ưu nhập hàng.
- Supplier master và liên kết stock receipt bằng `supplier_id` nhưng giữ supplier snapshot.
- Trả hàng nhà cung cấp chỉ triển khai khi cửa hàng xác nhận có quy trình; dùng outbound document riêng và không tái sử dụng reversal sửa sai.

**Effort:** L.  
**Gate kết thúc:** worklist truy vết được min/max, available và quy tắc làm tròn; receipt giữ supplier snapshot; supplier return nếu có phải đối soát movement/lot.

### Phase 2B2 — Reorder nâng cao và tem/barcode

**Mục tiêu:** chỉ nâng cấp đề xuất nhập khi dữ liệu đầu vào đã được duy trì đủ tin cậy; tách hardware printing khỏi supplier foundation.

- Preferred supplier, lead time, safety stock, MOQ, bội số đóng gói và supplier-product/unit mapping.
- Reorder suggestion tính từ dữ liệu trên; không dùng nhãn “optimized” nếu chưa có forecast/quality metric.
- Barcode/price label print cơ bản, template và UAT trên máy in thật.

**Effort:** L–XL, ước lượng riêng reorder engine và label printing.  
**Gate kết thúc:** mọi quantity suggestion hiển thị dữ liệu đầu vào/công thức; rounding theo MOQ/pack đúng; label scan lại đúng barcode/unit/price trên thiết bị thật.

### Phase 3 — Quản trị và báo cáo vận hành

**Mục tiêu:** chủ cửa hàng tự quản lý hệ thống và ra quyết định từ số liệu có định nghĩa.

- User/role/capability/register/branch administration.
- Store, receipt, printer và operational policy settings.
- Báo cáo ngày/ca/payment/gross margin/debt/inventory/expiry/loss. Chỉ gọi là lãi gộp; P&L/lợi nhuận ròng chờ expense và cost allocation ở Phase 4.
- Export CSV/XLSX theo quyền và filter.
- Audit viewer cho approval, inventory, sync conflict, return và import.
- Quản trị/tích hợp hóa đơn điện tử nâng cao nếu compliance track yêu cầu; nền tảng bắt buộc không chờ phase này.
- Màn hình trạng thái backup chỉ làm nếu hạ tầng cung cấp dữ liệu tin cậy; backup/restore runbook đã là gate Phase 0A.

**Effort:** L–XL.  
**Gate kết thúc:** metric có định nghĩa, scope branch/org đúng, số liệu đối soát được với sale/payment/movement gốc.

### Phase 4 — Tăng trưởng có chọn lọc

Chỉ chọn module có business case thật:

- purchase order + supplier debt;
- promotion/price book;
- loyalty/customer segment;
- expense/P&L;
- multi-branch transfer;
- dynamic QR, camera scanner hoặc phần mở rộng e-invoice ngoài compliance tối thiểu.

Mỗi module cần feature flag/permission, migration rollback, audit, report impact và UAT riêng; không triển khai đồng loạt.

## 8. Tiêu chí UX/UAT đề xuất

### 8.1. POS và keyboard

- F3 luôn focus + select scanner khi không có overlay.
- F8/Delete không chạy khi nhập text hoặc có overlay.
- F9/F12 không thay đổi checkout phía sau Dialog/Sheet.
- 20 lần scan liên tục không mất focus; mỗi scan có feedback quan sát được.
- Add cùng barcode tăng đúng quantity và highlight đúng row.
- Clear/undo/switch/new/hold/delete cart không ghi đè draft khác.

### 8.2. Checkout và tiền

- Cash only, QR only, mixed, debt và change đều hiển thị đúng trước submit.
- QR chưa confirm không submit được và focus tới vùng xác nhận.
- Discount/price override online cần PIN; offline bị khóa với lý do rõ.
- Network timeout sau khi server đã commit không tạo duplicate khi queue retry.
- Reprice offline luôn có diff và confirmation.

### 8.3. Offline/sync

- Phân biệt offline, degraded, pending, syncing, failed và conflict bằng text + icon.
- Queue sống qua reload/browser restart.
- Sale ca cũ sync vào ca gốc và đánh dấu reconciliation đúng.
- Failed/conflict luôn có next action; recovery export mở được và scope đúng.
- Startup kiểm tra IndexedDB và trạng thái persistent storage; browser profile vận hành không dùng incognito/private mode.
- Recovery JSON restore/import được bằng công cụ hoặc runbook đã diễn tập; file recovery nằm ngoài thiết bị POS.
- Mô phỏng xóa browser data/thay thiết bị phục hồi được từ bản export gần nhất; phần phát sinh sau bản export được ghi nhận là data-loss window trong runbook.
- Queue bằng `0` trước cutover, reset browser hoặc thay máy.
- Không báo “đã bán” nếu chưa lưu chắc chắn vào server hoặc IndexedDB.

### 8.4. Responsive/accessibility/print

- Desktop 1920×1080: production acceptance chính; catalog, cart, total và checkout action cùng quan sát được.
- Regression desktop tại 1600×900, 1536×864, 1440×900, 1366×768 và 1280×720: không mất action; cart không bắt buộc cuộn ngang cho thao tác phổ biến.
- 1024 px: safe-fallback smoke test, không phải cam kết tối ưu toàn bộ workflow. Touch/coarse-pointer chỉ thành acceptance gate khi có thiết bị vận hành thật.
- Keyboard focus visible, label/accessible name đầy đủ, không có card hai tab stop không cần thiết.
- Customer selector dùng Arrow/Enter/Escape đúng combobox contract.
- Receipt item dài, quantity thập phân, discount, debt, return và pending sync in đúng 58 mm trên thiết bị thật.

### 8.5. Authorization, compliance và production readiness

- Mỗi capability có test ít nhất một trường hợp allow và deny qua HTTP; không chỉ test menu ẩn.
- User không có quyền không thể bán hàng, trả hàng, thu nợ, đóng/đối soát ca, nhập kho, import hoặc xem báo cáo bằng request trực tiếp.
- Inactive user không login được; session đang mở bị chặn và deactivate/reset password thu hồi session theo user.
- Owner PIN có throttle/audit không chứa PIN; cross-organization/cross-branch và capability downgrade có test.
- Offline sale bị chặn do actor inactive/revoked không bị drop hoặc retry vô hạn; recovery/hủy giữ actor gốc, người takeover, lý do, idempotency và audit.
- Domain giữ tối đa một ca mở/register dưới MySQL concurrency; terminal binding phía server fail closed khi chưa bind/bị revoke, không auto-pick register và không enforce một ca/branch.
- Audit event có actor, action, subject, branch/register, thời gian và metadata đủ truy vết cho mutation nhạy cảm.
- Compliance discovery có đầu ra được xác nhận. Nếu thuộc diện áp dụng, sale/return/invoice flow đạt data mapping và lifecycle bắt buộc trước go-live.
- MySQL rehearsal, backup/restore, monitoring, scanner/printer UAT và cutback drill có bằng chứng PASS và người chịu trách nhiệm.

## 9. Thứ tự triển khai khuyến nghị

```text
Phase 0A: authorization + account lifecycle + register/shift +
          compliance + go-live/queue-recovery gates ───────┐
                                                           ├─→ production eligible
Phase 0B: test harness + shortcut + undo + reprice +       │
          idempotency/concurrency tests ────────────────────┘

Phase 1A: scan feedback + notice + customer + money + receipt UX
  → Phase 1B: benchmark; chỉ làm delta/server search khi số liệu yêu cầu
  → Phase 2A: stocktake + adjustment document/workflow
  → Phase 2B1: supplier + min/max + low-stock worklist
  → Phase 2B2: reorder inputs/rules + tem/barcode
  → Phase 3: admin UI + analytical reports + audit viewer
  → Phase 4: promotion + loyalty + PO + multi-branch theo business case
```

Phase 0A và 0B chạy song song khi dependency cho phép. Test đi cùng từng vertical slice, không nằm sau chuỗi P0. Compliance track phát sinh từ Phase 0A có thể chạy xuyên Phase 0B/1 nhưng vẫn chặn production cho đến khi đạt.

Không bắt đầu promotion, loyalty hoặc multi-branch trước khi Phase 0 và stocktake hoàn tất; nếu không, hệ thống sẽ tăng độ phức tạp trên nền quyền, cart, thuế và tồn chưa đủ an toàn.

## 10. Definition of Done chung

- Server vẫn authoritative cho money, inventory, permission và audit.
- Mọi action nhạy cảm có capability server, test allow/deny và UI phản ánh đúng capability đó.
- Active-account middleware, session revocation và owner PIN throttle/audit có security test; không log secret.
- POS dùng terminal binding authoritative phía server; bind/rebind/revoke có quyền và audit, thiết bị chưa bind/bị revoke fail closed. Invariant một shift open/register được kiểm tra dưới MySQL concurrency, không biến thành rule một shift/branch.
- Loading, empty, error, disabled, permission, online/offline và retry state được xử lý.
- Không mutation destructive hoặc financial nào chỉ dựa vào màu/ẩn state.
- Sale, payment, debt, inventory, tax snapshot/issuance intent và idempotency giữ transaction/locking contract nhất quán; không gọi provider ngoài hệ thống khi đang giữ transaction tạo sale. Concurrency quan trọng được xác minh trên MySQL.
- Keyboard/focus contract và scanner flow có automated test hoặc browser UAT lặp lại được.
- Inertia navigation dùng named route/`Link`; không hard-code URL mới.
- UI dùng semantic token, primitive hiện có và responsive behavior có chủ đích.
- PHP change chạy affected Pest tests và Pint; frontend change chạy format, lint, typecheck và production build.
- POS change đáng kể phải UAT mở ca, scan/cart, cash/QR/debt, offline sync, receipt 58 mm và shortcut.
- Offline queue change phải kiểm tra persistence, export, restore, actor bị thu hồi quyền và data-loss window khi browser/device bị mất; database backup không được coi là backup của IndexedDB.
- Không đánh dấu production-ready nếu compliance discovery hoặc bất kỳ go-live gate bắt buộc nào chưa PASS.
- Tài liệu trạng thái chỉ đánh dấu hoàn thành sau khi test/UAT đạt, không chỉ sau khi merge code.

## 11. Giới hạn của bản đánh giá

Bản audit dựa trên source và schema/route hiện tại, chưa đo runtime bằng scanner, printer và dữ liệu production. Local SQLite tại thời điểm review có khoảng 2.157 sản phẩm, một customer, một register và bốn sale:

- Catalog local đủ để tạo benchmark ban đầu, nhưng chưa đại diện hoàn toàn cho phân bố variant/unit/barcode/image và cấu hình máy production.
- Một customer không đủ căn cứ quyết định customer server search.
- Một register không đủ căn cứ thiết kế multi-register. Deployment hiện tại phải bind register rõ, còn domain invariant là một shift open/register chứ không phải một shift/branch.
- Bốn sale không đủ căn cứ cho performance hoặc độ đầy đủ báo cáo.

Các nhận xét về độ chật, latency, print và âm thanh feedback phải được xác nhận trên thiết bị quầy thật. Estimate tối ưu hiệu năng chỉ lập sau Phase 1B; kết luận pháp lý chỉ dựa trên đầu ra compliance discovery được người có thẩm quyền xác nhận.
