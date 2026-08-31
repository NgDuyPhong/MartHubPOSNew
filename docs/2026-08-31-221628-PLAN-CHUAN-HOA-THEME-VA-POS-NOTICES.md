# Kế hoạch chuẩn hóa theme và vòng đời thông báo POS

> Ngày lập: 31/08/2026  
> Trạng thái: Đã triển khai và kiểm chứng review follow-up  
> Phạm vi chính: semantic color tokens, shared `Alert`/`Badge`/`Button`, các surface trạng thái và `PosNotices`

> Cập nhật triển khai: 01/09/2026 — đã bổ sung warning text token, owner lifecycle hook/tests, keyboard focus coverage và responsive wrapping; các frontend checks đã pass.

## 1. Mục tiêu

1. Đảm bảo nội dung và action trên các surface `info`, `success`, `warning` và `destructive` đọc rõ trong cả light theme và dark theme.
2. Sửa lỗi chữ trắng trên nền xanh nhạt tại `PosNotices` và lỗi button `outline`/`ghost` kế thừa màu chữ không phù hợp từ parent.
3. Chuẩn hóa màu ở cấp semantic token và shared primitive, tránh vá từng component bằng màu hard-code hoặc chuỗi `dark:` rời rạc.
4. Giữ `PosNotices` trong document flow như hiện tại, nhưng tự động ẩn các notice tạm thời sau thời gian phù hợp để trả lại chiều cao cho catalog/cart.
5. Không tự động ẩn cảnh báo nghiệp vụ hoặc lỗi vận hành vẫn còn hiệu lực.
6. Bảo toàn keyboard, barcode focus, offline sync, checkout, receipt và print behavior của POS.

## 2. Kết luận audit hiện trạng

### 2.1. Nguyên nhân lỗi màu

`resources/css/app.css` hiện dùng cùng một token foreground cho hai loại surface khác nhau:

```text
Nền màu đặc:  bg-info          + text-info-foreground
Nền màu nhạt: bg-info-muted    + text-info-foreground
```

Trong light theme, `--info-muted` là xanh gần trắng nhưng `--info-foreground` là trắng. Vì vậy cặp đang dùng tại `PosNotices` có độ tương phản rất thấp:

```tsx
bg-info-muted text-info-foreground
```

`success` có cùng vấn đề trong light theme. Trong dark theme, `info`, `success` và `warning` có thể gặp vấn đề ngược lại vì foreground dành cho nền màu đặc được đặt lên nền muted tối.

Kết luận: token foreground cho nền màu đặc và nền muted phải là hai contract khác nhau.

### 2.2. Nguyên nhân button có màu chữ trắng

Hai variant trong `resources/js/components/ui/button.tsx` chưa khai báo màu chữ mặc định:

```text
outline -> có background/border, không có text color mặc định
ghost   -> chỉ có text color khi hover
```

Khi đặt trong `PosNotices`, button kế thừa `text-info-foreground` từ parent. Ở light theme, màu kế thừa này là trắng nên button `Hoàn tác` và `Đóng` khó đọc trên nền control sáng.

Button primary dùng `bg-primary text-primary-foreground` vẫn là cặp hợp lệ; không thay toàn bộ button chữ trắng một cách cơ học.

### 2.3. Ảnh hưởng layout của `PosNotices`

Tại `resources/js/pages/pos/index.tsx`, thứ tự layout hiện là:

```text
PosStatusBar
PosNotices
Catalog + Cart grid
```

`PosNotices` nằm trong normal document flow. Khi render, component chiếm chiều cao thật và làm grid `flex-1` phía dưới co lại. Khi component trả về `null`, catalog/cart nhận lại phần chiều cao đó.

Quyết định đã chốt:

- Giữ notice inline trong document flow, không chuyển thành overlay/toast.
- Notice tạm thời phải tự ẩn.
- Cảnh báo đang phản ánh trạng thái nghiệp vụ thật phải tiếp tục chiếm chỗ cho tới khi điều kiện được xử lý.
- Không thêm animation làm thay đổi layout mạnh; nếu có transition thì chỉ dùng chuyển màu/opacity ngắn và tôn trọng reduced motion.

### 2.4. `message` hiện chưa biểu diễn đủ ngữ nghĩa

State hiện tại là:

```ts
const [message, setMessage] = useState<string | null>(null);
```

Một chuỗi đơn đang đại diện cho nhiều loại phản hồi:

| Nguồn                                     | Loại đề xuất          | Vòng đời đề xuất                          |
| ----------------------------------------- | --------------------- | ----------------------------------------- |
| Đồng bộ hóa đơn offline thành công        | success               | Tự ẩn                                     |
| Tạo và chọn khách hàng thành công         | success               | Tự ẩn                                     |
| Đổi quy cách và reset giá/giảm giá        | info                  | Tự ẩn                                     |
| Xóa hóa đơn hiện tại                      | info + undo           | Tự ẩn có action                           |
| Cập nhật giá conflict thành công          | success/info          | Tự ẩn                                     |
| Không thể cache snapshot catalog          | warning/error         | Giữ tới khi dismiss hoặc phục hồi         |
| Không thể refresh tài nguyên POS          | warning/error         | Giữ; tự xóa khi recovery callback chạy    |
| Không thể tải catalog hoặc xử lý conflict | error                 | Giữ tới khi dismiss hoặc retry thành công |
| Giá trong cart đã cũ                      | warning derived state | Không tự ẩn                               |
| Dòng hàng không còn khả dụng              | error derived state   | Không tự ẩn                               |

Nếu gắn một timer chung cho mọi chuỗi, lỗi quan trọng có thể biến mất trước khi thu ngân đọc hoặc xử lý.

### 2.5. Lỗi tiềm ẩn của undo snapshot

Khi đóng notice hiện tại, page chỉ gọi `setMessage(null)`. `undoCart` không được xóa cùng lúc. Vì `undoCartCount` không tự làm component render khi không có `message`, snapshot undo có thể nằm ẩn và xuất hiện lại khi một message mới được phát sinh.

Manual dismiss và auto-dismiss của notice xóa giỏ phải đồng thời kết thúc cửa sổ undo và giải phóng snapshot cũ.

## 3. Phạm vi source

### 3.1. File trung tâm dự kiến thay đổi

- `resources/css/app.css`;
- `resources/js/components/ui/button.tsx`;
- `resources/js/components/ui/alert.tsx`;
- `resources/js/components/ui/badge.tsx`;
- `resources/js/features/pos/components/pos-notices.tsx`;
- `resources/js/features/pos/components/pos-notices.test.tsx`;
- `resources/js/features/pos/hooks/use-pos-notice.ts`;
- `resources/js/pages/pos/index.tsx`.

### 3.2. Consumer cần audit và cập nhật nếu đang ghép sai token

- `resources/js/features/pos/components/receipt-preview.tsx`;
- `resources/js/features/pos/components/pos-status-bar.tsx`;
- `resources/js/features/pos/components/cart-summary.tsx`;
- `resources/js/features/pos/components/open-shift-dialog.tsx`;
- `resources/js/features/pos/components/quick-customer-dialog.tsx`;
- `resources/js/features/pos/components/sync-center.tsx`;
- `resources/js/features/customers/components/debt-payment-dialog.tsx`;
- `resources/js/features/products/components/product-quick-edit-sheet.tsx`;
- `resources/js/pages/inventory/index.tsx`;
- `resources/js/pages/stock-receipts/index.tsx`;
- `resources/js/pages/dashboard.tsx`;
- các consumer khác được tìm thấy bằng audit semantic class trước khi sửa.

### 3.3. Test dự kiến bổ sung hoặc cập nhật

- `resources/js/components/ui/button.test.tsx`;
- test cho `Alert`/`Badge` nếu chưa có coverage phù hợp;
- `resources/js/features/pos/components/pos-notices.test.tsx`;
- `resources/js/features/pos/components/sync-center.test.tsx`;
- page/hook test gần nhất nếu lifecycle được giữ ở owner `pages/pos/index.tsx`.

### 3.4. Ngoài phạm vi

- Không đổi visual language tổng thể của ứng dụng.
- Không thay palette brand, primary action hoặc chart colors nếu contrast hiện hợp lệ.
- Không cài thêm package cho toast, animation hoặc color.
- Không chuyển toàn bộ flash message của ứng dụng sang hệ thống mới trong cùng thay đổi.
- Không sửa nghiệp vụ checkout, sync repository, IndexedDB schema hoặc receipt 58 mm.

## 4. Thiết kế semantic color đích

### 4.1. Tách foreground theo loại surface

Bổ sung các token:

```text
info-muted-foreground
success-muted-foreground
warning-muted-foreground
warning-text
```

Nếu audit cho thấy destructive muted được dùng lặp lại và cần contract riêng, bổ sung đồng bộ:

```text
destructive-muted
destructive-muted-foreground
```

Không tạo token destructive mới chỉ để thay cho pattern hiện tại `bg-destructive/10 text-destructive` nếu pattern đó đã đạt contrast và nhất quán.

Mapping Tailwind CSS v4 trong `@theme` phải trỏ tới CSS variable tương ứng:

```css
--color-info-muted-foreground: var(--info-muted-foreground);
--color-success-muted-foreground: var(--success-muted-foreground);
--color-warning-muted-foreground: var(--warning-muted-foreground);
--color-warning-text: var(--warning-text);
```

### 4.2. Contract sử dụng

| Surface                     | Class contract                                   |
| --------------------------- | ------------------------------------------------ |
| Info đặc                    | `bg-info text-info-foreground`                   |
| Info muted                  | `bg-info-muted text-info-muted-foreground`       |
| Success đặc                 | `bg-success text-success-foreground`             |
| Success muted               | `bg-success-muted text-success-muted-foreground` |
| Warning đặc                 | `bg-warning text-warning-foreground`             |
| Warning muted               | `bg-warning-muted text-warning-muted-foreground` |
| Warning text surface thường | `text-warning-text`                              |
| Destructive đặc             | `bg-destructive text-destructive-foreground`     |
| Destructive nhẹ hiện tại    | `bg-destructive/10 text-destructive`             |

Foreground phải được kiểm tra trên đúng background mà nó phục vụ trong cả `:root` và `.dark`. Không dùng một giá trị chỉ vì hợp light theme rồi vá dark theme tại từng component.

`warning-text` dành cho nội dung warning nằm trên `bg-card`, `bg-background` hoặc surface trung tính. Giữ `text-warning` cho accent/icon khi phù hợp; không dùng `warning-foreground` của solid surface làm màu chữ độc lập.

### 4.3. Shared primitives

`Alert` và `Badge` phải dùng contract muted mới cho các variant `info`, `success` và `warning`.

`Button` cần độc lập với màu chữ kế thừa trong các variant neutral:

- `outline`: có màu chữ mặc định semantic, hover vẫn dùng `accent-foreground`;
- `ghost`: có màu chữ mặc định semantic, hover vẫn dùng `accent-foreground`;
- `link`, `default`, `secondary`, `destructive`: giữ contract variant hiện có nếu audit không phát hiện lỗi;
- focus-visible, disabled, icon sizing và border contract không thay đổi.

Sau khi sửa primitive, phải audit consumer trên sidebar/header/surface màu để tránh làm mất trường hợp chủ động kế thừa foreground theo context. Consumer thực sự cần màu context-specific phải truyền class semantic rõ ràng.

### 4.4. Audit token bổ sung

Kiểm tra tất cả cặp `background/foreground`, đặc biệt `sidebar-primary/sidebar-primary-foreground` trong dark theme. Chỉ sửa token khi cặp đó thực sự được dùng như một semantic pair và kết quả contrast không đạt; không mở rộng thành redesign sidebar.

## 5. Thiết kế vòng đời `PosNotices`

### 5.1. Model notice

Thay chuỗi đơn bằng một model có ngữ nghĩa ở owner gần nhất:

```ts
type PosNotice = {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  autoDismissMs?: number;
  kind?: 'standard' | 'cart-cleared';
};
```

Nguyên tắc:

- `id` thay đổi mỗi lần phát notice để cùng một nội dung xuất hiện lần nữa vẫn reset timer;
- `tone` quyết định semantic surface và ARIA behavior;
- không có `autoDismissMs` nghĩa là persistent;
- `kind` chỉ dùng khi cleanup có liên quan tới nghiệp vụ undo; không nhúng callback tùy ý vào state nếu không cần.

State tiếp tục thuộc page POS vì page đang sở hữu nguồn message, `undoCart` và recovery callbacks. `PosNotices` chỉ quản lý presentation/timer cục bộ hoặc nhận lifecycle props rõ ràng; không thêm global store.

### 5.2. Thời lượng

Quyết định mặc định:

- Notice success/info thông thường: `5000 ms`, nhất quán với `SaleSuccessBar` hiện có.
- Notice có action `Hoàn tác`: `8000 ms` để thu ngân có đủ thời gian nhận biết và thao tác.
- Warning/error vận hành: persistent, không đặt timer.
- Derived warning/error (`hasStaleCartPrice`, `unavailableCartLineCount`): persistent cho tới khi state nguồn thay đổi.

Các giá trị phải khai báo thành constant có tên, không rải magic number tại nhiều call site.

### 5.3. Timer contract

- Tạo timer khi notice có `autoDismissMs` và đang visible.
- Cleanup timer khi component unmount, notice đổi hoặc manual dismiss.
- Notice mới luôn bắt đầu timer mới theo `id`.
- Pause countdown khi pointer đang hover hoặc focus nằm trong notice có action; resume với thời gian còn lại hoặc restart theo contract đơn giản đã test rõ.
- Auto-dismiss và manual dismiss dùng chung handler cleanup.
- Không chuyển focus vào notice khi xuất hiện.
- Không làm mất focus của barcode/search input.

### 5.4. Undo contract

Khi notice `cart-cleared` kết thúc theo một trong các đường sau:

| Sự kiện              | Kết quả                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| Bấm `Hoàn tác`       | Restore cart, xóa `undoCart`, đóng notice                                |
| Bấm `Đóng`           | Không restore cart, xóa `undoCart`, đóng notice                          |
| Hết timer            | Không restore cart, xóa `undoCart`, đóng notice                          |
| Notice khác thay thế | Kết thúc cửa sổ undo cũ và xóa snapshot cũ trước khi hiển thị notice mới |

Không để snapshot undo cũ sống ẩn sau khi action không còn hiển thị.

### 5.5. Derived notices

`hasStaleCartPrice` và `unavailableCartLineCount` tiếp tục được render độc lập với notice tạm thời:

- stale price dùng warning semantic;
- unavailable line dùng destructive semantic và `role="alert"`;
- không có nút đóng nếu state nguồn vẫn còn;
- không auto-hide;
- khi cùng xuất hiện với notice tạm thời, layout dùng `gap-2`, không chồng lớp hoặc che cart.

## 6. Responsive và accessibility

### 6.1. Responsive

- Desktop/tablet: notice nằm trên grid và dùng chiều rộng khả dụng.
- Màn hình hẹp: nội dung và action được phép wrap có chủ đích; không ép một hàng làm tràn viewport.
- Button action giữ touch target phù hợp với size `sm` hiện tại.
- Nội dung dài dùng `min-w-0` và wrap; action không bị co tới mức mất nhãn.

### 6.2. ARIA

- Success/info: `role="status"`, `aria-live="polite"`.
- Warning không chặn thao tác: `role="status"` hoặc `aria-live="polite"`.
- Error chặn checkout/unavailable item: `role="alert"`.
- Không đặt nhiều `aria-live` lồng nhau cho cùng một message.
- Nút đóng phải có accessible name rõ ràng; nếu giữ text `Đóng` thì text đã là accessible name.
- Màu không phải tín hiệu duy nhất: tone phải đi kèm nội dung rõ, icon chỉ bổ trợ nếu được thêm.

### 6.3. Motion

- Không cần animation để hoàn thành task.
- Nếu thêm transition, chỉ dùng 150–250 ms cho opacity/color và hỗ trợ `motion-reduce`.
- Timer không phụ thuộc animation end event.

## 7. Kế hoạch triển khai

### Bước 1 — Chuẩn hóa token

- Thêm muted foreground mappings trong `@theme`.
- Thêm `warning-text` mapping cho warning content trên surface trung tính.
- Định nghĩa giá trị light/dark trong `:root` và `.dark`.
- Kiểm tra cặp solid hiện tại để không làm hỏng dashboard/status badge.
- Kiểm tra token sidebar có độ tương phản bất thường.

### Bước 2 — Sửa shared primitives

- Chuyển `Alert` và `Badge` muted variants sang muted foreground mới.
- Làm `Button` `outline/ghost` có default text color rõ ràng.
- Bổ sung test class contract cho variants bị ảnh hưởng.

### Bước 3 — Cập nhật consumer

- Thay các cặp `bg-*-muted text-*-foreground` bằng foreground đúng loại.
- Audit mọi `text-warning` dạng nội dung chữ; chuyển sang `text-warning-text` nếu nền không phải `bg-warning`/`bg-warning-muted`.
- Giữ các cặp solid đúng contract.
- Audit direct class usage bằng `rg`, không chỉ sửa danh sách file đã biết.
- Kiểm tra các button nằm trong colored surface ở POS và shared flash messages.

### Bước 4 — Refactor state notice tại POS

- Đổi `message` sang `PosNotice | null` với helper tạo notice có id ổn định theo lần phát.
- Phân loại từng `setMessage` hiện tại theo bảng vòng đời.
- Giữ recovery callback có quyền xóa đúng notice lỗi đang active mà không xóa notice mới hơn.
- Thêm cleanup cho `undoCart` khi dismiss/timeout/replacement.
- Đưa owner notice/undo transition vào hook feature-local để có thể kiểm chứng độc lập mà vẫn giữ state ở page POS.

### Bước 5 — Hoàn thiện `PosNotices`

- Render tone bằng semantic contract mới.
- Thêm timer có cleanup và reset theo id.
- Thêm pause khi hover/focus cho notice có action.
- Giữ derived operational notices persistent.
- Giữ component inline, không chuyển sang portal/fixed overlay.
- Cho phép action group wrap có chủ đích trên màn hình hẹp và giữ một hàng ở breakpoint `sm` trở lên.

### Bước 6 — Test và UAT

- Chạy test mục tiêu trước, sau đó chạy frontend checks theo phạm vi.
- Kiểm tra trực quan light/dark ở các consumer quan trọng.
- Kiểm tra layout POS ở desktop/tablet và màn hình thấp.
- Kiểm tra keyboard, barcode focus, hover/focus pause và checkout không regression.

## 8. Ma trận kiểm thử tự động

### 8.1. `PosNotices`

1. Không render khi không có notice hoặc derived warning.
2. Render đúng message và tone.
3. Success/info tự đóng sau thời lượng cấu hình.
4. Persistent warning/error không tự đóng khi advance fake timers.
5. Timer cũ được clear khi notice mới thay thế.
6. Cùng text nhưng id mới vẫn reset timer.
7. Manual dismiss chỉ gọi cleanup một lần.
8. Undo restore cart và đóng notice.
9. Timeout/manual close của cart-cleared xóa undo snapshot.
10. Hover/focus giữ notice có action; rời hover/focus tiếp tục countdown.
11. `hasStaleCartPrice` vẫn hiển thị sau khi transient notice biến mất.
12. `unavailableCartLineCount` vẫn là `role="alert"` và không auto-hide.
13. Mỗi tone POS có foreground class và ARIA live contract đúng.
14. Owner undo snapshot bị xóa sau timeout, manual dismiss và notice replacement.

### 8.2. Shared primitives

1. `Alert` info/success/warning có muted foreground đúng variant.
2. `Badge` info/success/warning có muted foreground đúng variant.
3. `Button` outline/ghost có foreground mặc định và hover foreground đúng.
4. Default/destructive/secondary/link variants không regression.
5. Focus-visible và disabled classes vẫn tồn tại.
6. Warning content trên neutral surface dùng token có contrast đạt chuẩn ở light/dark.

### 8.3. Verification commands

Chạy tối thiểu:

```powershell
npm run test -- resources/js/features/pos/components/pos-notices.test.tsx resources/js/features/pos/components/sync-center.test.tsx resources/js/components/ui/button.test.tsx
npm run format:check
npm run lint:check
npm run typecheck
npm run test
npm run build
```

Nếu chỉ định nhiều file test không được Vitest script hiện tại chuyển tiếp đúng, chạy từng file hoặc dùng trực tiếp command Vitest tương đương đã có trong project. Không thay dependency để phục vụ verification.

## 9. Ma trận UAT light/dark

| Khu vực                      | Light    | Dark     | Trạng thái cần kiểm tra                         |
| ---------------------------- | -------- | -------- | ----------------------------------------------- |
| POS notice info              | Bắt buộc | Bắt buộc | Text, border, outline/ghost button, hover/focus |
| POS stale price              | Bắt buộc | Bắt buộc | Warning muted, persistent                       |
| POS unavailable line         | Bắt buộc | Bắt buộc | Destructive, alert, checkout blocked            |
| Sale success bar             | Bắt buộc | Bắt buộc | Text và ba button                               |
| POS online/offline badges    | Bắt buộc | Bắt buộc | Solid và muted variants                         |
| Alert/Badge shared consumers | Bắt buộc | Bắt buộc | Dashboard, inventory, stock receipt             |
| App logo/sidebar primary     | Bắt buộc | Bắt buộc | Background/foreground contrast                  |

Viewport POS tối thiểu:

- 1920×1080;
- 1366×768;
- 1280×720;
- một viewport tablet phù hợp với layout hiện tại.

UAT thao tác:

1. Xóa cart rồi quan sát notice/undo và chiều cao grid.
2. Hover/focus action để xác nhận notice không biến mất giữa thao tác.
3. Đợi timeout và xác nhận grid nhận lại chiều cao, undo cũ không xuất hiện lại.
4. Phát notice mới trước khi notice cũ hết hạn và xác nhận timer được reset.
5. Giả lập stale price/unavailable line và xác nhận không auto-hide.
6. Chuyển light/dark khi notice đang mở và xác nhận màu cập nhật ngay.
7. Scan barcode hoặc dùng keyboard trong lúc notice xuất hiện; focus không bị chiếm.

## 10. Acceptance criteria

- Không còn chữ trắng trên `info-muted`/`success-muted` light theme.
- Không còn chữ quá tối trên muted surface dark theme.
- Button `outline` và `ghost` không phụ thuộc màu chữ kế thừa từ colored parent.
- Solid status surfaces vẫn dùng đúng solid foreground.
- `PosNotices` vẫn chiếm chiều cao khi visible và trả lại chiều cao sau khi transient notice tự ẩn.
- Success/info tạm thời tự ẩn theo thời lượng đã chốt.
- Lỗi vận hành, stale price và unavailable line không tự biến mất khi điều kiện còn tồn tại.
- Undo snapshot không còn tồn tại ẩn sau manual dismiss, timeout hoặc notice replacement.
- Không làm mất barcode focus, keyboard navigation hoặc checkout behavior.
- Light/dark UAT đạt ở các consumer trong ma trận.
- Test mục tiêu, format, lint, TypeScript, full frontend test và production build đều pass.

## 11. Thứ tự commit khuyến nghị

1. Semantic tokens và shared primitive tests.
2. Consumer color migration.
3. POS notice model, timer, undo cleanup và tests.
4. UAT fixes nếu phát hiện regression.

Tách theo thứ tự này giúp lỗi token/primitive được xác nhận độc lập trước khi thêm thay đổi lifecycle của POS.
