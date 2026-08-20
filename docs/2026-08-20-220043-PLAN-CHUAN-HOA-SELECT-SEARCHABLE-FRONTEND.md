# Kế hoạch chuẩn hóa Select và Searchable Select trên Frontend

## 1. Thông tin tài liệu

- Trạng thái: Draft — sẵn sàng tách thành các ticket triển khai.
- Ngày lập: 2026-08-20.
- Phạm vi: toàn bộ frontend React/Inertia trong `resources/js`.
- Mục tiêu: xác định trường hợp nào cần tìm kiếm, trường hợp nào nên giữ native select, và chuẩn hóa một pattern dùng chung.
- Ngoài phạm vi của tài liệu này: triển khai code, thay đổi API, thay đổi database hoặc cài thêm dependency.

## 2. Tóm tắt quyết định

Không nên chuyển toàn bộ `<select>` sang searchable select. Search chỉ có giá trị khi người dùng đang chọn một thực thể động như danh mục hoặc đơn vị và danh sách có thể tăng theo dữ liệu cửa hàng. Các lựa chọn enum cố định như trạng thái, phương thức thanh toán, loại giao dịch và kiểu sắp xếp nên tiếp tục dùng native select để thao tác nhanh, dễ truy cập và ít lỗi hơn.

Kết quả audit hiện tại:

- Có 27 native `<select>` trong 18 file frontend.
- Chưa có feature nào sử dụng Radix `Select`; component tại `resources/js/components/ui/select.tsx` mới chỉ là primitive có sẵn.
- Dự án đã có `@headlessui/react`, vì vậy có thể xây dựng searchable combobox mà không thêm dependency.
- Có 7 vị trí nên chuyển sang searchable combobox hoặc searchable filter.
- Có 2 vị trí chọn quầy thu ngân nên giữ native select ở quy mô hiện tại và chỉ nâng cấp khi số lượng quầy thực tế đủ lớn.
- Các select enum còn lại nên giữ native select.

Hướng triển khai đề xuất:

1. Xây một primitive `SearchableSelect` dùng chung trên Headless UI Combobox.
2. Áp dụng trước cho danh mục sản phẩm, đơn vị tính và danh mục cha.
3. Giữ native select cho enum và danh sách ngắn, ổn định.
4. Chỉ thêm tìm kiếm phía server khi có số liệu chứng minh danh sách lớn.
5. Bổ sung quy tắc này vào skill `frontend-ui-style`; không tạo skill mới chỉ cho Select.

## 3. Mục tiêu và tiêu chí thành công

### 3.1. Mục tiêu sản phẩm

- Người dùng tìm được danh mục hoặc đơn vị bằng tên/mã mà không phải cuộn một danh sách dài.
- Người dùng vẫn hoàn thành nhanh các lựa chọn đơn giản như trạng thái hoặc phương thức thanh toán.
- Hành vi tìm kiếm hỗ trợ tiếng Việt có dấu và không dấu.
- Không làm gián đoạn luồng quét mã vạch và thao tác bàn phím tại POS.
- Các màn hình dùng cùng một quy tắc, giao diện và hành vi bàn phím.

### 3.2. Chỉ số đánh giá sau triển khai

- Thời gian chọn danh mục/đơn vị giảm hoặc không tăng so với hiện tại.
- Không phát sinh lỗi validation do giá trị đã chọn bị mất khi lọc.
- Không có regression về focus trên màn hình POS.
- Không có danh sách client-side quá lớn gây giật hoặc chậm mở popover.
- Tất cả use case bàn phím trong phần kiểm thử đều đạt.

## 4. Hiện trạng kỹ thuật

### 4.1. Primitive và dependency

- `resources/js/components/ui/select.tsx`: Radix Select, phù hợp với danh sách lựa chọn nhưng không có ô tìm kiếm tích hợp.
- `@headlessui/react`: đã được cài và đang được dùng trong source; Combobox phù hợp để làm searchable select.
- `resources/js/lib/vietnamese-search.ts`: có thể tái sử dụng để chuẩn hóa chuỗi tìm kiếm tiếng Việt.
- Chưa có test runner frontend chuyên biệt như Vitest; bước đầu xác minh bằng TypeScript, ESLint, build và browser UAT.

### 4.2. Vấn đề hiện tại

- Các entity select đang hiển thị toàn bộ options và buộc người dùng cuộn thủ công.
- Cùng một loại dữ liệu, ví dụ danh mục, xuất hiện ở nhiều màn hình nhưng chưa có UX dùng chung.
- Native select không cho phép tìm theo tên hoặc mã.
- Nếu thay tất cả select bằng component tùy biến, hệ thống sẽ phức tạp hơn mà không tạo thêm giá trị cho enum ngắn.
- Việc tải toàn bộ options về client sẽ không còn phù hợp nếu dữ liệu của một tenant tăng lên hàng trăm hoặc hàng nghìn bản ghi.

## 5. Quy tắc phân loại

### 5.1. Giữ native select khi

- Dữ liệu là enum cố định hoặc thay đổi rất ít.
- Có khoảng 2–8 lựa chọn dễ nhận biết.
- Người dùng thường chọn theo vị trí quen thuộc hơn là nhớ tên để tìm.
- Native control mang lại lợi thế trên mobile và accessibility.
- Ví dụ: trạng thái, phương thức thanh toán, loại hoàn trả, chiều sắp xếp.

### 5.2. Dùng searchable combobox khi

- Options là entity do người dùng hoặc doanh nghiệp tạo ra.
- Danh sách có khả năng vượt 10–15 lựa chọn.
- Người dùng có nhu cầu tìm theo tên, mã hoặc từ khóa phụ.
- Cùng một entity xuất hiện trong nhiều form/filter.
- Ví dụ: danh mục sản phẩm, đơn vị tính, danh mục cha.

### 5.3. Dùng tìm kiếm phía server khi

- Số lượng options thường xuyên vượt khoảng 100–200 bản ghi.
- Payload options ảnh hưởng rõ rệt đến thời gian tải trang.
- Danh sách thay đổi thường xuyên hoặc không thể tải toàn bộ an toàn.
- Cần tìm trên nhiều trường hoặc quan hệ mà client không có sẵn.

Ngưỡng số lượng chỉ là heuristic. Quyết định cuối cùng phải xét tần suất sử dụng, loại dữ liệu và workflow, không chỉ dựa vào số options.

## 6. Inventory và quyết định cho toàn bộ Select

### 6.1. Sản phẩm

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `pages/products/index.tsx` | Bộ lọc danh mục | Entity động | Searchable | Danh mục tăng theo tenant; cần tìm nhanh theo tên |
| `pages/products/index.tsx` | Trạng thái | Enum ngắn | Giữ native | Ít lựa chọn, dễ quét bằng mắt |
| `pages/products/index.tsx` | Sắp xếp theo | Enum ngắn | Giữ native | Danh sách cố định |
| `pages/products/index.tsx` | Chiều sắp xếp | Enum 2 lựa chọn | Giữ native | Search không có giá trị |
| `features/products/components/product-form.tsx` | Danh mục | Entity động | Searchable | Form chính tạo/sửa sản phẩm |
| `features/products/components/product-form-dialog.tsx` | Danh mục | Entity động | Searchable nếu còn dùng | Cần đồng nhất; ưu tiên xác minh và loại bỏ nếu là component cũ |
| `features/products/components/product-quick-edit-sheet.tsx` | Danh mục | Entity động | Searchable | Đồng nhất với form chính |
| `features/products/components/product-units-editor.tsx` | Đơn vị tính | Entity động | Searchable | Cần tìm theo tên và mã đơn vị |

### 6.2. Danh mục

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `pages/categories/index.tsx` | Trạng thái | Enum ngắn | Giữ native | Danh sách cố định |
| `pages/categories/index.tsx` | Bộ lọc danh mục cha | Entity động | Searchable | Danh sách có thể dài và có cấu trúc cây |
| `pages/categories/index.tsx` | Danh mục cha trong form | Entity động | Searchable | Cần tìm theo tên; phải thể hiện cấp cây và loại node không hợp lệ |

### 6.3. Khách hàng và công nợ

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `pages/customers/index.tsx` | Trạng thái | Enum ngắn | Giữ native | Ít lựa chọn |
| `pages/customers/index.tsx` | Tình trạng công nợ | Enum ngắn | Giữ native | Ít lựa chọn |
| `features/customers/components/debt-payment-dialog.tsx` | Phương thức thanh toán | Enum ngắn | Giữ native | Tiền mặt/QR, không cần search |

Khách hàng trong dialog thanh toán công nợ đã được xác định trước, nên không cần thêm customer searchable select tại đây.

### 6.4. Kho, bán hàng, ca làm việc và đơn vị

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `pages/inventory/index.tsx` | Trạng thái tồn kho | Enum ngắn | Giữ native | Danh sách cố định |
| `pages/sales/index.tsx` | Trạng thái/phương thức thanh toán | Enum ngắn | Giữ native | Ít lựa chọn |
| `pages/sales/index.tsx` | Nguồn bán | Enum ngắn | Giữ native | Danh sách cố định |
| `pages/sales/index.tsx` | Sắp xếp | Enum ngắn | Giữ native | Danh sách cố định |
| `pages/shifts/index.tsx` | Trạng thái ca | Enum ngắn | Giữ native | Ít lựa chọn |
| `pages/units/index.tsx` | Trạng thái đơn vị | Enum ngắn | Giữ native | Ít lựa chọn |
| `components/shared/pagination.tsx` | Số dòng mỗi trang | Enum ngắn | Giữ native | Các mốc cố định, search gây dư thừa |

### 6.5. Hoàn trả và giao dịch tiền mặt

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `features/sales/components/return-dialog.tsx` | Loại hoàn trả | Enum ngắn | Giữ native | Danh sách cố định |
| `features/sales/components/return-dialog.tsx` | Phương thức hoàn tiền | Enum ngắn | Giữ native | Danh sách cố định |
| `features/sales/components/return-items-table.tsx` | Tình trạng từng sản phẩm | Enum ngắn | Giữ native | Thao tác lặp lại; native select nhanh hơn |
| `features/shifts/components/cash-movement-dialog.tsx` | Thu/chi | Enum 2 lựa chọn | Giữ native | Search không có giá trị |

### 6.6. Quầy thu ngân và POS

| Vị trí | Trường | Loại dữ liệu | Quyết định | Lý do |
|---|---|---|---|---|
| `features/shifts/components/open-shift-dialog.tsx` | Quầy thu ngân | Entity theo chi nhánh | Giữ native có điều kiện | Thường là danh sách ngắn; nâng cấp nếu thực tế vượt 10–15 quầy |
| `features/pos/components/open-shift-dialog.tsx` | Quầy thu ngân | Entity theo chi nhánh | Giữ native có điều kiện | Ưu tiên tốc độ và ổn định focus trong POS |

`pages/pos/index.tsx` không có select sản phẩm trực tiếp. Việc chọn sản phẩm đã được xử lý bằng catalog search và barcode, vì vậy không nên thay bằng searchable select.

## 7. Thiết kế component mục tiêu

### 7.1. Vị trí và trách nhiệm

Tạo primitive dùng chung:

`resources/js/components/ui/searchable-select.tsx`

Primitive chỉ chịu trách nhiệm cho:

- Input tìm kiếm, popup options và trạng thái chọn.
- Điều hướng bàn phím và ARIA.
- Hiển thị loading, empty, disabled, selected và clear action.
- Client-side filtering khi options đã được truyền vào.

Primitive không được biết về Product, Category, Unit, route, controller hoặc API. Fetch dữ liệu, debounce request, map dữ liệu domain và xử lý lỗi thuộc feature/page hook.

### 7.2. Contract đề xuất

```ts
export type SearchableOption = {
    value: string;
    label: string;
    searchText?: string;
    disabled?: boolean;
};

type SearchableSelectProps = {
    id?: string;
    value: string | null;
    options: SearchableOption[];
    onValueChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    loadingText?: string;
    disabled?: boolean;
    loading?: boolean;
    clearable?: boolean;
    invalid?: boolean;
    onSearchChange?: (query: string) => void;
    renderOption?: (option: SearchableOption) => React.ReactNode;
};
```

Tên prop cuối cùng có thể điều chỉnh theo convention sau khi đối chiếu các component sibling. Không đưa object domain trực tiếp vào API generic nếu chỉ cần `value` và `label`.

### 7.3. Cơ chế lọc client-side

- Chuẩn hóa query và `searchText` bằng helper tiếng Việt hiện có.
- Cho phép tìm không dấu, ví dụ `dien thoai` khớp `Điện thoại`.
- Category tìm theo tên và có thể thêm breadcrumb vào `searchText`.
- Unit tìm theo cả tên và mã, ví dụ `Kilogram kg`.
- Giới hạn phần options hiển thị nếu cần, nhưng không làm mất khả năng chọn giá trị hiện tại.
- Không mutate hoặc sort mảng options đầu vào trong primitive.

### 7.4. Hiển thị options theo domain

- Category: label chính là tên; dòng phụ hoặc prefix thể hiện cấp cây nếu dữ liệu có hierarchy.
- Unit: label chính là tên; mã đơn vị hiển thị dạng metadata ngắn.
- Parent category: current category và descendants phải disabled hoặc bị loại khỏi options từ feature; backend vẫn phải validation độc lập.

## 8. UX và accessibility contract

Searchable select phải đáp ứng các hành vi sau:

- Label liên kết đúng với control qua `id`/`htmlFor`.
- Có role combobox/listbox phù hợp và thông báo trạng thái expanded.
- `ArrowDown`/`ArrowUp`: di chuyển active option.
- `Enter`: chọn active option.
- `Escape`: đóng danh sách và không làm mất dữ liệu đã chọn.
- `Tab`: rời control theo thứ tự focus tự nhiên.
- Khi clear: giá trị trở về `null` hoặc giá trị "Tất cả" do feature quy định.
- Active và selected state không chỉ phân biệt bằng màu; cần icon hoặc dấu hiệu bổ sung.
- Focus ring phải rõ trong light và dark mode.
- Loading, empty và error phải là ba trạng thái riêng biệt.
- Giá trị đã chọn vẫn hiển thị đúng ngay cả khi options đang tải lại.
- Sau khi dialog/sheet đóng, focus trở về trigger hợp lý.
- Không tự động chọn option đầu tiên chỉ vì query thay đổi.
- Không submit form khi người dùng nhấn Enter để chọn option.

Trên mobile/tablet:

- Vùng chạm tối thiểu khoảng 40–44 px.
- Popover không vượt viewport và có giới hạn chiều cao hợp lý.
- Danh sách options cuộn độc lập, không khóa sai scroll của dialog/sheet.
- Không phụ thuộc hover để truyền đạt trạng thái.

## 9. Ràng buộc riêng cho POS

- Searchable component không được tự động focus nếu có thể cướp focus của barcode input.
- Không gắn global keyboard listener trong primitive.
- Việc mở/đóng combobox phải được coi là trạng thái đang nhập chủ động để barcode handler không nhận nhầm phím.
- Register select tiếp tục dùng native select trong giai đoạn đầu.
- Nếu sau này register cần search, phải kiểm thử riêng luồng: mở ca bằng chuột, bàn phím, scanner và màn hình cảm ứng.
- Catalog search/barcode hiện tại là pattern đúng để chọn sản phẩm; không chuyển catalog thành select.

## 10. Chiến lược dữ liệu

### 10.1. Giai đoạn client-side

Áp dụng khi số lượng category/unit còn nhỏ hoặc trung bình:

- Dùng props Inertia hiện có.
- Filter trong browser.
- Không tạo endpoint mới.
- Giảm phạm vi thay đổi và dễ rollout.

Trước triển khai nên ghi nhận số options theo tenant: p50, p95 và max cho categories, units và registers. Nếu p95 thấp hơn khoảng 100, client-side là lựa chọn hợp lý.

### 10.2. Giai đoạn server-side tùy chọn

Chỉ triển khai nếu số liệu cho thấy cần thiết:

- Endpoint tìm category/unit phải tenant-scoped và authorization đầy đủ.
- Query tối thiểu 1–2 ký tự tùy domain.
- Debounce khoảng 250–300 ms.
- Giới hạn 20–50 kết quả mỗi request.
- Response chỉ trả trường cần thiết: id, label, code/breadcrumb, disabled nếu có.
- Abort hoặc bỏ qua response cũ khi query mới đã được gửi.
- Preload giá trị đang chọn để form edit hiển thị đúng dù nó không nằm trong trang kết quả đầu tiên.
- Backend vẫn validation `exists`, tenant ownership, active state và constraint danh mục cha.

Không tải toàn bộ hàng nghìn options rồi chỉ ẩn bớt bằng CSS hoặc filter client-side.

## 11. Kế hoạch triển khai theo ticket

### SEL-00 — Xác nhận baseline và dữ liệu thực tế

Phạm vi:

- Chốt inventory 27 select trước khi code.
- Xác minh `product-form-dialog.tsx` còn được import hay là component cũ.
- Đo số lượng category, unit và register theo tenant.
- Chụp baseline UX cho form sản phẩm, trang sản phẩm và trang danh mục.

Đầu ra:

- Bảng p50/p95/max.
- Quyết định client-side hay async cho từng entity.
- Danh sách component cũ cần loại bỏ hoặc migration.

Acceptance criteria:

- Không còn select nào ngoài inventory mà chưa được phân loại.
- Có quyết định rõ cho component product form cũ.

### SEL-01 — Chuẩn hóa rule và tạo primitive

Phạm vi:

- Tạo `SearchableSelect` bằng Headless UI Combobox.
- Dùng design token hiện có; không hardcode màu semantic mới.
- Tích hợp helper tìm kiếm tiếng Việt.
- Hoàn thiện loading, empty, invalid, disabled, clearable.
- Bổ sung reference về Select/Combobox cho skill frontend.

Acceptance criteria:

- Hoạt động bằng chuột, bàn phím và touch.
- Có label/ARIA/focus state đúng.
- Không phụ thuộc domain và không fetch data bên trong primitive.
- Không thêm dependency mới.
- TypeScript, lint và build pass.

### SEL-02 — Product form và đơn vị tính

Phạm vi:

- Chuyển category trong `product-form.tsx` sang searchable.
- Chuyển category trong quick edit sang searchable.
- Chuyển unit trong product units editor sang searchable theo tên + mã.
- Migration hoặc loại bỏ `product-form-dialog.tsx` theo kết quả SEL-00.

Acceptance criteria:

- Create/edit/quick edit gửi cùng payload như trước.
- Giá trị cũ hiển thị đúng khi mở form edit.
- Search tiếng Việt có dấu/không dấu hoạt động.
- Unit được chọn không xuất hiện sai hoặc tạo duplicate ngoài business rule hiện tại.
- Validation backend hiển thị đúng ở control.

### SEL-03 — Product list filter

Phạm vi:

- Chuyển category filter trên trang sản phẩm sang searchable.
- Đồng bộ clear action với trạng thái "Tất cả danh mục".
- Giữ nguyên status, sort và direction native select.
- Đảm bảo query string/Inertia reload giữ nguyên các filter khác.

Acceptance criteria:

- Chọn/clear category cập nhật đúng URL và dữ liệu danh sách.
- Back/forward browser khôi phục đúng lựa chọn.
- Không reset search text, sort hoặc pagination ngoài chủ đích hiện tại.

### SEL-04 — Category parent filter và form

Phạm vi:

- Chuyển parent filter sang searchable.
- Chuyển parent category trong create/edit form sang searchable.
- Hiển thị hierarchy dễ đọc.
- Loại hoặc disable current category và descendants.

Acceptance criteria:

- Không thể tạo cycle từ UI.
- Backend vẫn từ chối payload tạo cycle nếu request bị chỉnh sửa thủ công.
- "Không có danh mục cha" và "Tất cả danh mục cha" được phân biệt rõ.
- Search khớp tên node và, nếu có, breadcrumb.

### SEL-05 — Async entity search nếu đạt ngưỡng

Phạm vi:

- Tạo API/route tìm kiếm scoped theo tenant cho entity cần thiết.
- Tách hook/controller state khỏi UI primitive.
- Thêm debounce, request cancellation và preload selected option.
- Giới hạn response và index/query phù hợp nếu cần.

Acceptance criteria:

- Không có request cho mỗi keypress không debounce.
- Response cũ không ghi đè kết quả query mới.
- Không lộ entity khác tenant hoặc entity người dùng không có quyền xem.
- Thời gian phản hồi ở ngưỡng chấp nhận được với dữ liệu lớn.

Ticket này có thể bỏ qua nếu SEL-00 cho thấy dữ liệu đủ nhỏ.

### SEL-06 — Regression, UAT và cleanup

Phạm vi:

- Chạy kiểm tra kỹ thuật và UAT theo ma trận bên dưới.
- Xóa import/component cũ chỉ khi đã xác minh không còn sử dụng.
- Kiểm tra dark mode, responsive và accessibility.
- Ghi nhận các select mới phát sinh trong thời gian triển khai.

Acceptance criteria:

- Tất cả Definition of Done đạt.
- Không có regression POS focus/barcode.
- Không còn hai pattern searchable khác nhau cho cùng use case.

## 12. Kiểm thử kỹ thuật

### 12.1. Static verification

- Chạy formatter trên các file thay đổi.
- Chạy TypeScript type checking theo script hiện có.
- Chạy ESLint theo script hiện có.
- Chạy production build.
- Tìm lại toàn source để đối chiếu inventory native select và searchable select.

### 12.2. Component behavior

- Mở/đóng bằng click.
- Mở, điều hướng, chọn và đóng hoàn toàn bằng bàn phím.
- Search có dấu và không dấu.
- Search theo mã đơn vị.
- Không có kết quả.
- Clear giá trị.
- Disabled toàn control và disabled từng option.
- Loading không làm mất giá trị hiện tại.
- Error/invalid state liên kết với message của form.
- Options cập nhật khi props thay đổi.
- Không tự submit form khi chọn bằng Enter.

### 12.3. Integration behavior

- Tạo sản phẩm với category và nhiều unit.
- Sửa sản phẩm giữ đúng category/unit cũ.
- Quick edit category cập nhật đúng dữ liệu.
- Filter sản phẩm theo category, sau đó đổi sort và chuyển trang.
- Tạo/sửa category root và category con.
- Chặn category tự làm cha hoặc chọn descendant.
- Server validation fail rồi trả lại form vẫn giữ giá trị hợp lý.

## 13. Ma trận UAT

| Khu vực | Desktop | Tablet | Mobile | Keyboard | Dark mode | Dữ liệu lớn |
|---|---:|---:|---:|---:|---:|---:|
| Product create/edit | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| Product quick edit | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Khuyến nghị |
| Product units editor | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| Product category filter | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| Category form/filter | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc |
| POS open shift | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Bắt buộc | Không áp dụng giai đoạn đầu |

Thiết bị/viewports nên phủ ít nhất:

- Desktop khoảng 1440 px.
- Tablet khoảng 768–1024 px.
- Mobile khoảng 360–430 px.
- Một phiên dùng bàn phím, không dùng chuột.
- Một tenant có danh sách category/unit lớn mô phỏng theo p95 hoặc max.

## 14. Rollout và rollback

### 14.1. Rollout

- Merge primitive trước nhưng chưa migration toàn bộ màn hình trong một commit lớn.
- Rollout theo domain: product form → product filter → category.
- Mỗi PR giữ nguyên contract request/response nếu không thực sự cần async.
- Theo dõi lỗi validation, lỗi console và phản hồi thao tác sau từng phase.

### 14.2. Rollback

- Mỗi migration component nên độc lập để có thể trả về native select mà không ảnh hưởng backend.
- Nếu async endpoint gây lỗi, feature có thể tạm fallback về options Inertia hiện có khi dữ liệu còn trong giới hạn.
- Không xóa primitive cũ hoặc component cũ trong cùng bước trước khi các import đã được kiểm chứng.

## 15. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Combobox cướp focus barcode tại POS | Cao | Không áp dụng ở catalog; register giữ native; UAT scanner riêng |
| Giá trị edit không nằm trong kết quả async đầu tiên | Cao | Preload selected option và merge không trùng |
| Mất filter khác khi Inertia reload | Trung bình | Preserve query hiện tại và test back/forward |
| Category tạo cycle | Cao | Filter/disable ở FE và validation bắt buộc ở backend |
| Search tiếng Việt không nhất quán | Trung bình | Dùng chung helper normalize hiện có |
| Component generic chứa logic domain | Trung bình | Feature chịu trách nhiệm map/fetch/validation domain |
| Danh sách lớn làm chậm browser | Trung bình | Đo dữ liệu trước; chuyển async khi vượt ngưỡng |
| Hai form sản phẩm cũ/mới lệch hành vi | Trung bình | Xác minh usage và cleanup trong SEL-00/SEL-02 |

## 16. Rule frontend đề xuất

Không nên tạo một skill mới chỉ cho Select vì phạm vi quá hẹp và thuộc trực tiếp tiêu chuẩn UI/accessibility hiện có. Nên bổ sung file:

`.agents/skills/frontend-ui-style/references/selects-and-comboboxes.md`

Sau đó thêm mục routing tương ứng trong `frontend-ui-style/SKILL.md`.

Nội dung rule cốt lõi đề xuất:

> Dùng native Select cho enum hoặc danh sách ngắn, ổn định. Dùng searchable Combobox cho entity động khi người dùng cần tìm theo tên/mã hoặc danh sách có khả năng vượt 10–15 options. Với hơn khoảng 100–200 options, ưu tiên tìm kiếm phía server có debounce, giới hạn kết quả và preload giá trị đang chọn. Primitive UI không chứa fetch hoặc logic domain. Mọi Combobox phải hỗ trợ keyboard, ARIA, loading/empty/error, clear state và tìm kiếm tiếng Việt. Trong POS, không tự động focus hoặc cướp focus của barcode workflow.

Các mục rule chi tiết cần ghi:

- Ma trận native select / Radix Select / searchable combobox.
- API contract và ranh giới primitive/feature.
- Keyboard và accessibility checklist.
- Client-side/server-side threshold.
- Quy tắc normalize tiếng Việt.
- POS focus safety.
- Test/UAT checklist.

Nếu sau này dự án tạo `.ai/rules`, có thể record một rule ngắn cho các path `resources/js/**` để quyết định này được áp dụng ngoài ngữ cảnh skill. Hiện tại không cần tạo thêm hệ thống rule song song chỉ cho kế hoạch này.

## 17. Definition of Done

Kế hoạch được xem là triển khai hoàn tất khi:

- 7 vị trí entity select đã được migration hoặc có quyết định loại bỏ rõ ràng.
- 20 select còn lại được chủ động giữ native và không bị thay đổi chỉ để đồng bộ hình thức.
- Hai register select có số liệu và quyết định được ghi nhận.
- Chỉ có một primitive searchable select dùng chung.
- Không thêm dependency mới nếu Headless UI đáp ứng đủ yêu cầu.
- Search category/unit hỗ trợ tiếng Việt có dấu và không dấu.
- Keyboard, ARIA, light/dark và responsive UAT đạt.
- Product create/edit/quick edit và category create/edit không có regression.
- POS barcode/focus không có regression.
- TypeScript, lint, build và các test backend liên quan đều pass.
- Rule frontend đã được cập nhật cùng implementation, không chỉ tồn tại trong tài liệu plan.

## 18. Ngoài phạm vi

- Thay đổi toàn bộ native select chỉ để thống nhất giao diện.
- Thay catalog sản phẩm POS bằng combobox.
- Cài thư viện select mới khi dependency hiện có đáp ứng được.
- Thêm endpoint async khi chưa có số liệu quy mô dữ liệu.
- Thay đổi business rule category, unit, register hoặc payment method.
- Thiết kế lại toàn bộ filter bar của các trang quản trị.

## 19. Các quyết định cần chốt trước khi bắt đầu code

1. `product-form-dialog.tsx` còn là luồng production hay có thể loại bỏ?
2. Số category/unit/register p50, p95 và max theo tenant hiện tại là bao nhiêu?
3. Category hierarchy hiện có breadcrumb/path sẵn hay cần map từ parent relation?
4. Search async có cần ngay ở phase đầu hay chỉ giữ như phương án mở rộng?
5. Rule frontend sẽ được cập nhật trong cùng PR với primitive hay một PR riêng?

Khuyến nghị mặc định: giữ client-side search cho phase đầu, cập nhật rule cùng PR tạo primitive, và chỉ mở SEL-05 khi số liệu thực tế vượt ngưỡng.
