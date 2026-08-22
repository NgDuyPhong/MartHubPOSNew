# Đánh giá lại plan và implementation Phase 0A

> Ngày đánh giá: 22/08/2026  
> Source baseline: commit `0042173`; đánh giá trên toàn bộ working tree bằng `git diff`, các file untracked liên quan, route list, source hiện tại và test thực tế  
> Phạm vi: plan minimart đã cập nhật, capability/account lifecycle, owner PIN, register/shift, offline actor recovery, Inertia shared capability, UI POS và tài liệu trạng thái  
> Giới hạn: chưa chạy MySQL concurrency test, chưa UAT scanner/browser/IndexedDB/print trên thiết bị thật và không kết luận pháp lý

## 1. Kết luận

**Plan sau khi sửa đã tốt và đủ rõ để làm source of truth cho các implementation plan tiếp theo.** Những điểm còn mơ hồ ở lần review trước đã được xử lý đúng hướng: thống nhất frontend test harness, mô tả terminal binding, bổ sung actor recovery policy, định nghĩa performance budget, làm rõ scoped freeze và bổ sung Thông tư 91/2026/TT-BTC.

**Implementation hiện tại là một vertical slice Phase 0A có giá trị nhưng chưa đạt gate Phase 0A và chưa nên đánh dấu hoàn thành/production-ready.** Middleware account active, capability server/UI, CSRF protection và client token lifecycle, khóa dòng register, snapshot actor offline và owner PIN throttle/audit đều đã có nền tảng đúng hướng. Session revocation đã cải thiện cho database session và remember token nhưng chưa bao phủ đầy đủ cookie session. Sau lần sửa này, các khoảng cách lớn còn lại là terminal binding, explicit actor recovery workflow, cookie-session revocation và capability matrix.

Khuyến nghị kết luận trạng thái:

- Plan: **đạt, có thể dùng để lập implementation plan chi tiết**.
- Implementation authorization/account lifecycle: **đã triển khai một phần; CSRF và inactive login đã được sửa, owner PIN đã harden, session revocation vẫn partial với cookie driver**.
- Implementation register/terminal binding: **mới là fail-closed tạm thời cho deployment một quầy, chưa triển khai contract đã chốt**.
- Implementation offline actor recovery: **đã fail-closed actor mismatch và giữ queue ở conflict, chưa có workflow takeover/cancel explicit đúng plan**.
- Production eligibility: **chưa đạt**.

## 2. Những phần làm tốt

### 2.1. Plan đã xử lý đầy đủ các góp ý chính

- Xung đột về frontend test runner đã được giải quyết rõ trong `docs/2026-08-12-185415-PLAN-REFACTOR-FRONTEND.md`: cho phép Vitest + React Testing Library có phạm vi P0, không biến thành dự án coverage toàn frontend.
- `docs/migration/2026-08-11-211454-06-trang-thai-trien-khai.md` đã bỏ nhận định cũ rằng toàn bộ unit/feature test bị hoãn.
- Terminal binding đã có contract server-side, quy tắc bind/rebind/revoke, fail-closed và recovery khi mất thiết bị.
- Offline actor recovery đã phân biệt original actor và recovery actor, yêu cầu explicit conflict, reason, audit và idempotency.
- Benchmark đã có môi trường, dataset, số lượt chạy và budget p95 cụ thể.
- Stocktake đã phân biệt business freeze lưu trong DB với row lock ngắn trong transaction và có công thức variance rõ.
- Compliance track đã bổ sung Thông tư 91/2026/TT-BTC và tiếp tục giữ nguyên nguyên tắc phải có xác nhận của người có thẩm quyền.

### 2.2. Implementation có các nền tảng đúng hướng

- `EnsureActiveAccount` logout, invalidate session và trả JSON `401` cho request kỳ vọng JSON.
- Web routes đã bật lại CSRF mặc định; frontend request client gửi token theo nguồn cookie/meta cho mutation.
- Capability được enforce cả route middleware và Form Request; UI sidebar dùng cùng danh sách capability từ Inertia shared props.
- `OpenShiftAction` khóa dòng register trước khi kiểm tra/tạo shift, đúng hướng để chống race trên cùng register.
- Password update/reset đã gọi `SessionRevocationService` thay vì chỉ đổi hash mật khẩu.
- Sale offline giữ `original_actor_id` theo payload; actor mismatch hiện fail-closed và chưa tự ghi `recovered_by`.
- Migration mới là additive, nullable cho dữ liệu cũ và có `down()`.
- Các file frontend thay đổi pass Prettier riêng, ESLint, TypeScript và production build.

## 3. Findings cần xử lý

### CRITICAL-01 — Owner PIN throttle và audit thất bại bị rollback cùng sale — ĐÃ SỬA

**Bằng chứng**

- Toàn bộ `CreateSaleAction` chạy trong `DB::transaction()` tại `app/Actions/Sales/CreateSaleAction.php:43`.
- Owner PIN được kiểm tra bên trong transaction tại `app/Actions/Sales/CreateSaleAction.php:126`.
- Trước khi sửa, `OwnerApprovalService` vừa gọi `RateLimiter::hit()` vừa tạo `ApprovalEvent` bên trong transaction sale.
- Code hiện tại ném `OwnerApprovalRejectedException`; `CreateSaleAction` ghi rejected audit sau khi transaction đã rollback rồi rethrow `ValidationException`: `app/Exceptions/OwnerApprovalRejectedException.php`, `app/Actions/Sales/CreateSaleAction.php`.
- Rate limiter dùng cache store riêng qua `cache.limiter`, mặc định là `file`; test dùng `CACHE_LIMITER=array`, nên counter không phụ thuộc transaction sale: `config/cache.php`, `phpunit.xml`.

**Ảnh hưởng**

- Hai rủi ro trên đã được loại bỏ trong implementation hiện tại.
- Test đã bao phủ 5 lần PIN sai, lần thứ 6 bị throttle, 6 rejected audit tồn tại sau rollback và không tạo sale: `tests/Feature/PosSaleFeatureTest.php`.

**Kết quả sửa**

- Các lệnh `RateLimiter` vẫn được gọi trong transaction sale, nhưng state được lưu ở store độc lập (`cache.limiter`) nên không bị rollback theo connection giao dịch.
- Rejected security audit được ghi sau rollback; approved audit vẫn commit cùng sale.
- Không ghi PIN hoặc hash vào event context.

### CRITICAL-02 — CSRF bị tắt cho toàn bộ ứng dụng — ĐÃ SỬA

**Bằng chứng trước khi sửa**

- `bootstrap/app.php` từng cấu hình `$middleware->validateCsrfTokens(except: ['*'])`, khiến mọi route trong nhóm `web` bị loại khỏi kiểm tra CSRF.
- Phạm vi ảnh hưởng gồm sale, return, thu nợ, đóng ca, đổi mật khẩu và import; đây là production blocker độc lập với các thay đổi Phase 0A khác.

**Kết quả sửa**

- Đã xóa wildcard exception khỏi `bootstrap/app.php`; Laravel `web` middleware trở lại áp dụng `ValidateCsrfToken` cho các request thay đổi dữ liệu.
- Frontend `requestJson` đã gửi `X-XSRF-TOKEN` lấy từ cookie khi dùng POST/PUT/PATCH/DELETE. Không thêm exception mới cho route nghiệp vụ.
- Nếu sau này có webhook ngoài hệ thống, chỉ được thêm exception theo URI cụ thể và phải có chữ ký webhook riêng; không được dùng wildcard.

### MEDIUM-03 — Client CSRF token đọc từ meta có thể stale — ĐÃ SỬA MỘT PHẦN

**Bằng chứng trước khi sửa**

- `app.blade.php` render một meta token tại thời điểm document được tạo.
- `resources/js/lib/http/csrf.ts` trước đây chỉ đọc `meta[name="csrf-token"]`.
- Logout, đổi mật khẩu và inactive-account flow đều có thể `invalidate()` session và `regenerateToken()` mà Inertia không reload toàn bộ document; vì vậy meta có thể cũ trong khi cookie `XSRF-TOKEN` đã đổi.

**Kết quả sửa**

- `csrf.ts` hiện đọc cookie `XSRF-TOKEN` làm nguồn chính và chỉ fallback về meta khi cookie chưa có.
- `requestJson` gửi token qua `X-XSRF-TOKEN` khi lấy từ cookie, đúng với cơ chế Laravel giải mã/đối chiếu cookie; nếu chỉ còn meta fallback thì dùng `X-CSRF-TOKEN` với plain token. Không thay đổi server CSRF protection.
- Chưa có browser integration runner trong `package.json`, nên chưa thể tự động chứng minh chuỗi logout → login hoặc đổi mật khẩu → login → tạo sale. Đây vẫn là test cần chạy trên browser thật/Playwright hoặc harness frontend P0.

### HIGH-01 — Code đang enforce “đúng một register/branch”, trái terminal binding đã chốt

**Bằng chứng**

- `OpenShiftAction` đếm active register theo branch và từ chối nếu số lượng khác `1`: `app/Actions/Shifts/OpenShiftAction.php:20-23`.
- `PosDataService::availableRegisters()` trả collection rỗng nếu branch không có đúng một active register: `app/Services/PosDataService.php:133-142`.
- Test mới còn đóng đinh hành vi từ chối branch có hai active register: `tests/Feature/ShiftFeatureTest.php:57-70`.
- Plan mới đã chốt authoritative binding là `terminal/device → branch → register`, đồng thời yêu cầu hai register khác nhau trong cùng branch không bị domain rule ngăn mở ca.

**Ảnh hưởng**

- Fail-closed hiện tại an toàn cho deployment một quầy, nhưng biến giới hạn triển khai thành invariant trong domain action.
- Khi thêm quầy thứ hai, cả hai quầy đều không thể mở ca dù mỗi terminal có register riêng.
- Chưa có terminal record, opaque installation credential, bind/rebind/revoke, audit hoặc offline binding cache như plan.

**Cần sửa**

- Ghi nhận implementation hiện tại là guard tạm thời, không phải hoàn thành P0A-03.
- Tạo server-side terminal binding; resolve register từ terminal credential thay vì tin `register_id` do browser tự chọn.
- Giữ lock register row để bảo vệ invariant một ca mở/register, nhưng bỏ rule `activeRegisterCount !== 1` khỏi domain action sau khi binding có hiệu lực.
- Thay test “branch nhiều register phải fail” bằng test terminal chưa bind/revoked fail, hai terminal bind hai register có thể mở hai ca, và hai request cùng register không tạo hai ca.

### HIGH-02 — Offline recovery auto-takeover — ĐÃ SỬA MỘT PHẦN

**Bằng chứng**

- Trước khi sửa, nếu `original_actor_id` khác user đang sync và user có `offline.sales.recover`, `CreateSaleAction` tự gán `recovered_by` rồi tiếp tục tạo sale.
- Code hiện tại từ chối actor mismatch bằng lỗi validation `original_actor_id`; `offline-sale-sync.ts` chuyển HTTP 422 thành record `conflict` với mã `ACTOR_RECOVERY_REQUIRED`. Queue không bị xóa và không được tự takeover: `app/Actions/Sales/CreateSaleAction.php`, `resources/js/features/pos/api/offline-sale-sync.ts`.
- Không có field `recovery_reason`, explicit confirmation hoặc trạng thái `resolved_cancelled` trong request/schema.
- Code không yêu cầu actor gốc phải thực sự inactive/revoked mới dùng recovery path.
- `useConnectivity` tự gọi `syncNow()` khi page mount online và khi nhận sự kiện online: `resources/js/features/pos/hooks/use-connectivity.ts:72-79`.
- Test hiện đã mô phỏng actor khác còn active và xác nhận server trả conflict, không tạo sale; chưa mô phỏng revoked actor hoặc explicit takeover workflow: `tests/Feature/PosOfflineSyncFeatureTest.php`.

**Ảnh hưởng**

- Manager đăng nhập cùng browser profile không còn tự động takeover và post queue của actor khác.
- Audit event hiện chỉ có `source` và `original_actor_id`; thiếu reason, branch/register/terminal và loại conflict ban đầu.
- Queue cũ tạo trước thay đổi này không có `original_actor_id`; server mặc định actor gốc thành user đang sync, có thể làm sai lịch sử khi manager đăng nhập để recovery.
- Chưa có đường hủy có kiểm soát hoặc correction/refund cho sale đã thu tiền.

**Còn thiếu để đóng finding**

- Server hiện đã fail-closed actor mismatch; cần chuẩn hóa thêm mã conflict theo nguyên nhân như `ACTOR_INACTIVE`/`CAPABILITY_REVOKED`.
- Sync Center cần action explicit “Quản lý tiếp nhận”, preview payload/tác động tiền, nhập reason và xác nhận.
- Recovery endpoint/service phải kiểm tra cùng organization/branch/register/terminal, original shift, capability recovery và idempotency.
- Định nghĩa migration/runbook cho pending record cũ thiếu actor snapshot; không mặc định user đang sync là actor gốc.
- Bổ sung test actor inactive, capability revoked, cashier không được takeover, manager cùng branch được takeover có reason, khác branch/org bị từ chối, retry cùng key không duplicate và cancel có audit.

### HIGH-03 — Capability matrix được code hóa trước khi có business approval và test allow/deny đầy đủ

**Bằng chứng**

- `User::ROLE_CAPABILITIES` hiện cấp cashier `customer.manage`, `debt.collect`, `report.view`, `sales.view`, `shift.close` và `shift.open`: `app/Models/User.php:20-52`.
- `customer.manage` cho phép cả quick-create ở POS lẫn tạo/cập nhật customer đầy đủ; `report.view` mở dashboard doanh thu, payment, nợ và cảnh báo kho.
- Test authorization mới chỉ có một deny case cho cashier truy cập catalog và một unit assertion cho inactive capability: `tests/Feature/AuthorizationFeatureTest.php:7-25`.
- Plan yêu cầu mỗi capability có ít nhất một allow và deny qua HTTP, cùng owner nghiệp vụ và role mặc định được xác nhận.

**Ảnh hưởng**

- Không có bằng chứng rằng chủ cửa hàng đã chấp thuận phạm vi quyền khá rộng của cashier.
- Quyền đang bị gộp theo màn hình: nhu cầu tạo nhanh khách tại POS vô tình kéo theo quyền sửa toàn bộ customer.
- Nếu `report.view` chỉ được cấp để tránh redirect dashboard sau login bị `403`, security policy đang bị điều chỉnh theo navigation thay vì least privilege.

**Cần sửa**

- Ghi capability matrix chính thức: capability, endpoint/action, branch/org scope, owner nghiệp vụ, role mặc định và lý do.
- Cân nhắc tách `customer.quick_create` khỏi `customer.manage`, và redirect sau login tới route đầu tiên user có quyền thay vì mặc định ép mọi role có `report.view`.
- Dùng dataset để test allow/deny theo capability/role; bao phủ request trực tiếp cho sale, return, debt, shift, inventory, import, report và catalog.
- Bổ sung cross-organization/cross-branch tests cho các route có model binding hoặc ID trong payload.

### HIGH-04 — Session revocation chưa thu hồi đầy đủ mọi loại session — ĐÃ SỬA MỘT PHẦN

**Bằng chứng**

- `SessionRevocationService` trước đây dùng trực tiếp `DB::table('sessions')`.
- Code hiện tại đọc `config('session.connection')` và `config('session.table')`; database session được xóa đúng connection/table: `app/Services/SessionRevocationService.php`.
- Password update hiện rotate `remember_token`; password reset đã làm điều này từ trước: `app/Http/Controllers/Settings/PasswordController.php`, `app/Http/Controllers/Auth/NewPasswordController.php`.
- Với `cookie` session driver, không có row server-side để xóa. Service chỉ có thể bỏ qua; cookie session hiện tại vẫn cần session-version/revocation marker nếu acceptance criterion là thu hồi mọi session.
- Service mới được gọi khi đổi/reset password. Source chưa có action deactivate user gọi revoke; middleware chỉ chặn ở request kế tiếp.
- Test password update đã kiểm tra password hash, rotate `remember_token` và độ dài token; chưa tạo nhiều database session rồi assert tất cả bị thu hồi.

**Ảnh hưởng**

- Rủi ro xóa sai connection/table đã được xử lý.
- Remember cookie cũ bị vô hiệu hóa sau đổi/reset mật khẩu nhờ rotate `remember_token`.
- Cookie session đang hoạt động và deactivation lifecycle vẫn chưa được thu hồi đầy đủ.

**Kết quả sửa và phần còn thiếu**

- Đã dùng connection/table từ config, rotate remember token ở cả hai luồng password và bổ sung test remember token.
- Không mô tả cookie driver là “đã revoke”; cần thiết kế session-version/revocation marker nếu muốn đáp ứng “mọi session”.
- Deactivation lifecycle và multi-session test vẫn cần bổ sung khi admin user management được triển khai.

### MEDIUM-02 — Inactive login vẫn authenticate tạm thời rồi mới logout — ĐÃ SỬA

**Bằng chứng**

- `LoginRequest` hiện truyền thêm điều kiện `is_active => true` ngay trong `Auth::attempt`: `app/Http/Requests/Auth/LoginRequest.php`.

**Ảnh hưởng**

- Inactive user không còn được authenticate thành công tạm thời trước khi bị logout.

**Kết quả sửa**

- Đã đưa `is_active => true` vào additional authentication conditions, giữ nguyên generic error message và throttle key.

### LOW-01 — Tài liệu trạng thái chưa khớp bằng chứng chạy mới nhất

**Bằng chứng**

- Tài liệu trạng thái ghi số cũ `60 test pass (248 assertions), 3 test fail`.
- Lần chạy mới nhất trong review này đạt `67 passed (300 assertions), 3 failed` với `php artisan test --compact`.
- Cụm “đường restore/import đã diễn tập” tại dòng 19 và 68 dễ được hiểu là đã hoàn thành, trong khi bước tiếp theo dòng 79 vẫn yêu cầu hoàn thiện recovery restore/import.

**Kết quả cập nhật**

- Số liệu verification trong file này đã được cập nhật theo cùng working tree; tài liệu trạng thái migration cũng cần đồng bộ cùng command và thời điểm.
- Giữ nguyên kết luận chưa có đường restore/import được diễn tập đầy đủ; fast path import hiện có không đồng nghĩa production cutover.

## 4. Kết quả verification

| Kiểm tra | Kết quả |
| --- | --- |
| `git diff --check` | Pass |
| Pint `vendor/bin/pint --dirty --format agent` | Pass |
| Affected Pest tests | **21 passed, 112 assertions** (`AuthenticationTest`, `AuthorizationFeatureTest`, `ShiftFeatureTest`, `PosOfflineSyncFeatureTest`, `PosSaleFeatureTest`, `PasswordUpdateTest`) |
| Full Pest suite | **67 passed, 3 failed, 300 assertions** (`php artisan test --compact`, 22/08/2026) |
| Ba failure full suite | Hai `RegistrationTest` còn kỳ vọng public registration; `ExampleTest` còn kỳ vọng `/` trả 200 thay vì redirect 302 |
| ESLint | Pass |
| TypeScript `tsc --noEmit` | Pass |
| Vite production build | Pass; còn warning chunk `exceljs` lớn đã biết |
| Prettier các file frontend thay đổi | Pass |
| Toàn bộ `npm run format:check` | Fail trên 16 file không nằm trong diff hiện tại; vì command dùng `&&`, `npm run check` dừng tại bước này |
| MySQL concurrency | Chưa chạy; SQLite tests không chứng minh invariant MySQL |
| Browser/device UAT | Chưa chạy |
| CSRF configuration review | Pass; wildcard exception đã xóa, không có route nghiệp vụ được exclude |
| CSRF client token lifecycle | Đã đọc cookie `XSRF-TOKEN` và gửi `X-XSRF-TOKEN`; browser logout/login regression chưa chạy |

Pint đã chạy sau các thay đổi PHP và pass. MySQL concurrency và browser/device UAT vẫn là gate chưa thực hiện.

## 5. Thứ tự xử lý khuyến nghị

1. Đã sửa CRITICAL-01 và bổ sung owner PIN throttle/rejected-audit tests có assert message throttle.
2. Đã bật lại CSRF cho toàn bộ web routes; cần kiểm tra các integration/webhook tương lai chỉ dùng exception theo URI cụ thể.
3. Quyết định rõ vertical slice hiện tại chỉ là single-register guard tạm thời; lập ticket terminal binding đúng contract trước khi đóng P0A-03.
4. Giữ actor mismatch ở conflict ngay bây giờ; triển khai explicit recovery endpoint/UI trước khi cho queue conflict post production.
5. Xác nhận capability matrix với chủ nghiệp vụ, giảm quyền cashier nếu cần và bổ sung HTTP allow/deny matrix.
6. Đã làm session revocation config-aware và rotate remember token; thiết kế session-version cho cookie driver, multi-session/deactivation tests ở phase admin/security hardening.
7. Đã sửa inactive login condition và đồng bộ số liệu verification; tiếp tục cập nhật tài liệu trạng thái migration.
8. Chạy Pint, affected tests, full suite, MySQL concurrency và device UAT theo gate.

## 6. Vì sao chưa sửa hết các finding

Phần này phân biệt **lỗi implementation có thể sửa ngay** với **gap workflow/kiến trúc cần triển khai trọn vertical slice**. Không sửa tạm các gap lớn không có nghĩa là bỏ qua finding; mục tiêu là không tạo một trạng thái trung gian nguy hiểm hơn trạng thái fail-closed hiện tại.

### 6.1. Những mục đã sửa ngay

- **CRITICAL-01 — owner PIN:** Đây là lỗi logic độc lập, có acceptance criteria rõ và có thể sửa mà không cần quyết định nghiệp vụ mới. Đã tách rejected audit khỏi transaction sale, dùng limiter store độc lập với transaction và thêm regression test kiểm tra message throttle.
- **CRITICAL-02 — CSRF:** Đây là cấu hình bảo mật rõ ràng. Đã bỏ wildcard exception; không cần thay đổi từng controller nghiệp vụ.
- **MEDIUM-03 — CSRF client token:** Đây là lỗi lifecycle phía client. Đã ưu tiên cookie `XSRF-TOKEN` thay vì meta token cố định; browser regression vẫn cần harness/UAT.
- **HIGH-02 — actor mismatch:** Có thể fail-closed ngay vì frontend đã giữ record khi nhận 422. Đã ngăn auto-takeover; explicit recovery workflow vẫn để vertical slice sau.
- **HIGH-04 — session config/remember token:** Đã dùng `session.connection`/`session.table` và rotate `remember_token`; cookie session vẫn mở vì cần session-version/revocation marker, nên finding chỉ được đóng một phần.
- **MEDIUM-02 — inactive login:** Đây là lỗi authentication flow độc lập. Đã đưa `is_active=true` vào credentials của `Auth::attempt`.
- **LOW-01 — trạng thái tài liệu:** Đã cập nhật số test và diễn đạt lại rằng fast-path export/import chưa phải rehearsal restore/cutover production.

### 6.2. HIGH-01 chưa sửa bằng một patch nhỏ: terminal binding

Finding này đúng, nhưng thay `activeRegisterCount !== 1` bằng một điều kiện khác chưa phải là sửa. Plan yêu cầu nguồn sự thật là `terminal/device → branch → register`, vì vậy cần đồng thời có:

1. terminal record và opaque installation credential;
2. bind/rebind/revoke online, quyền thực hiện và audit;
3. server resolve register từ credential, không tin `register_id` trong browser;
4. xử lý mất máy, xóa browser data, offline binding cache và queue đang chờ;
5. test hai terminal/hai register và concurrency trên MySQL.

Nếu bỏ guard một register ngay bây giờ mà chưa có các thành phần trên, browser có thể tự chọn register hoặc sync nhầm branch. Hậu quả là sale, ca và tiền mặt bị ghi sai quầy; đây là rủi ro dữ liệu nghiêm trọng hơn việc deployment hiện tại fail-closed. Vì vậy code hiện tại được giữ như **guard tạm thời**, còn finding vẫn mở cho ticket P0A-03.

### 6.3. HIGH-02 đã fail-closed, nhưng chưa có explicit recovery workflow

Finding này đúng, nhưng recovery không chỉ là thêm một field. Cần một state machine và boundary rõ giữa auto-sync và thao tác quản lý:

- server phải trả conflict có mã ổn định khi actor bị khóa/thu hồi quyền;
- Sync Center phải cho xem payload, tiền, tồn kho, ca/register và lý do conflict;
- manager phải bấm takeover, nhập reason, xác nhận và chịu idempotency;
- phải có đường cancel/correction với audit, không xóa queue âm thầm;
- queue cũ thiếu `original_actor_id` cần migration/runbook, không được đoán actor theo người đang đăng nhập;
- phải kiểm tra organization/branch/register/terminal và original shift.

Đã chặn actor mismatch ngay vì `offline-sale-sync.ts` giữ record ở trạng thái `conflict` khi server trả 422; queue không bị mất. Điều này giải quyết production risk nghiêm trọng nhất mà chưa cần chờ UI takeover đầy đủ. Queue conflict hiện chưa thể post thành công cho tới khi có explicit recovery endpoint/UI, nên đây vẫn là gap workflow cần triển khai tiếp, không phải finding đã đóng hoàn toàn.

### 6.4. HIGH-03 không thể tự quyết định thay chủ cửa hàng: capability matrix

Finding này đúng về thiếu business approval và test matrix. Tuy nhiên quyền cashier hiện tại ảnh hưởng trực tiếp đến vận hành (bán hàng, thu nợ, mở/chốt ca, báo cáo). Tự giảm quyền có thể làm POS không vận hành được; tự giữ nguyên hoặc mở thêm quyền có thể vi phạm least privilege.

Vì vậy cần owner xác nhận capability matrix trước khi đổi `User::ROLE_CAPABILITIES`. Sau khi được xác nhận mới triển khai dataset allow/deny, tách `customer.quick_create` nếu cần, route redirect theo capability và cross-organization/cross-branch tests. Đây là quyết định nghiệp vụ còn thiếu, không nên đoán trong một patch kỹ thuật.

### 6.5. Các phần chưa sửa vì không phải lỗi code đơn lẻ

- Deactivation user management chưa có endpoint/UI/admin policy để gắn session revocation đúng lifecycle.
- MySQL concurrency và browser/device UAT cần môi trường thật; SQLite test không thể thay thế hai gate này.
- Ba starter tests đỏ phản ánh public registration đã tắt và `/` redirect 302. Có thể cập nhật test kỳ vọng, nhưng đó là hardening test scaffold, không phải mở lại public registration hay đổi route chỉ để làm suite xanh.

### 6.6. MEDIUM-03 đã sửa client nhưng chưa có browser regression

Đây là lỗi có thể sửa độc lập trong client nên đã xử lý ngay: cookie `XSRF-TOKEN` là nguồn có lifecycle theo response/session, còn meta chỉ là fallback cho lần khởi tạo. Không thêm test giả lập bằng unit test PHP vì unit test không chạy qua browser cookie, Inertia navigation và `fetch` thật. Cần bổ sung browser/integration test cho hai chuỗi:

1. login → sale → logout → login lại → sale;
2. login → đổi mật khẩu → login lại → sale.

Trong khi chưa có browser harness, verification chỉ khẳng định source đã dùng cookie và TypeScript/build pass; chưa tuyên bố đã chứng minh runtime 419 không xảy ra.

## 7. Quyết định review

**Không cần sửa lại cấu trúc tổng thể của plan.** Plan mới đủ tốt để tiếp tục phân rã implementation plan theo vertical slice.

**Chưa chấp thuận đánh dấu implementation Phase 0A hoàn thành.** CRITICAL-01 và CRITICAL-02 đã được xử lý; HIGH-02 đã fail-closed nhưng chưa có recovery workflow; MEDIUM-03 đã sửa client nhưng chưa có browser regression; HIGH-01, HIGH-03 và HIGH-04 vẫn còn gap thật. Implementation phải giữ trạng thái “partial/not production-ready” cho tới khi có workflow, test và UAT tương ứng. Việc chưa đóng hoàn toàn các mục này là có chủ đích và có lý do kỹ thuật/nghiệp vụ nêu ở mục 6, không phải bỏ qua review.
