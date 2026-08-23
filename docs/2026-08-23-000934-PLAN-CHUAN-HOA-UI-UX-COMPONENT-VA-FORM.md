# Kế hoạch chuẩn hóa UI/UX, common component và form

## 1. Phạm vi và kết luận

Tài liệu này audit source frontend hiện tại, tập trung vào:

- Button, input và các control dùng chung;
- Component UI, shared pattern và feature component;
- Luồng tạo/sửa bằng page, dialog, sheet hoặc inline panel;
- Thứ tự trường trong form sản phẩm và các form còn lại;
- Nhập tiền có phân cách hàng nghìn;
- Date field và date range filter;
- Rule cần bổ sung sau khi refactor hoàn tất.

Kết luận ngắn:

1. Các action button thông thường gần như đã dùng Button common, nhưng chưa tuyệt đối. Hai CTA dạng Link ở Dashboard và Tồn kho vẫn tự style như button. Các thẻ sản phẩm, option combobox và nút nhúng trong control dùng native button là ngoại lệ hợp lý, không nên chuyển máy móc.
2. Input text, password, email và number phần lớn đã dùng Input common. Phần chưa common chủ yếu là checkbox/radio, date filter, file input và native select.
3. Hệ thống đã có đúng ba tầng: components/ui, components/shared và features/*/components. Vấn đề chính là shared pattern đang được dùng chưa đều, không phải thiếu toàn bộ common layer.
4. ProductFormDialog đã bị thay thế trong production bởi ProductForm trên hai route create/edit. ProductFormDialog không có consumer, chỉ còn được export và nên được xóa.
5. Không nên ép tất cả màn tạo/sửa thành dialog. Cần đồng bộ bằng decision rule: dialog cho tác vụ ngắn; sheet cho quick edit theo ngữ cảnh; page cho workflow dài; inline panel cho tác vụ vận hành cần giữ context.
6. Giá bán trong full product form đang nằm quá thấp so với tần suất sử dụng. Cần đưa section Giá & quy cách lên ngay sau Thông tin cơ bản, đồng thời cung cấp Sửa giá nhanh từ danh sách sản phẩm.
7. Hệ thống đã có formatter hiển thị tiền và ngày dùng chung, nhưng chưa có MoneyInput và DateRangeFilter dùng chung.
8. Hai ô ngày tại Hóa đơn bán hàng và Ca/két chỉ có aria-label, không có label nhìn thấy. Đây là lỗi discoverability rõ ràng.
9. formatDateTime hiện dùng cùng cấu hình với formatDate nên không hiển thị phần thời gian dù tên hàm và UI kỳ vọng có thời gian.

## 2. Nguồn đã đối chiếu

Các nhóm source chính đã kiểm tra:

- resources/js/app.tsx và resources/css/app.css;
- toàn bộ resources/js/components/ui;
- toàn bộ resources/js/components/shared;
- toàn bộ resources/js/features/*/components;
- các page quản trị, auth, settings và POS;
- formatter tại resources/js/lib/format;
- route sản phẩm và lịch sử Git của hai product form;
- các tài liệu frontend, UX, searchable select và product UX trong docs;
- rules hiện có tại .ai/rules.

Giới hạn:

- In-app Browser không khả dụng trong phiên audit này, nên chưa có visual UAT trực tiếp.
- Các kết luận dựa trên source, route, import graph và docs đã chốt.
- Mỗi phase có thay đổi UI phải được kiểm tra lại bằng browser trên desktop, tablet và mobile trước khi đánh dấu hoàn tất.

## 3. Audit Button

### 3.1. Mức độ chuẩn hóa

Button common đã là primitive chính của hệ thống. Số liệu định lượng được cố định theo commit audit và chuyển xuống Phụ lục A để không bị hiểu nhầm là số liệu luôn đúng sau mỗi phase triển khai.

### 3.2. Các native button hợp lý

Các trường hợp sau không nên bị ép dùng Button common vì chúng là một phần của composite widget hoặc có visual contract riêng:

- Nút clear nằm bên trong SearchField;
- Option của customer combobox trong CartSummary;
- Toàn bộ product card và menu action trong CatalogPanel;
- Held cart item trong HeldCartsPanel;
- Tab chọn giao diện trong AppearanceTabs;
- Sidebar rail;
- Nút nội bộ của SearchableSelect;
- Nút submit nằm trong Button asChild tại DeleteUser.

Button common phù hợp với action độc lập. Native button vẫn đúng cho option, tab, interactive card, rail hoặc control nhúng nếu component cha quản lý đầy đủ hover, focus, keyboard và accessible name.

### 3.3. Các vị trí cần chuyển sang Button common

Hai Link đang tự style thành CTA:

- Dashboard: Mở màn hình bán hàng;
- Tồn kho: Bổ sung tồn.

Nên chuyển thành Button asChild bọc Inertia Link để dùng chung:

- kích thước control;
- primary color;
- focus-visible;
- disabled/interaction contract;
- dark mode và semantic token.

### 3.4. Kết luận Button

Không cần refactor toàn bộ native button. Cần:

1. Chuyển các CTA độc lập đang tự style sang Button;
2. Giữ native button cho composite widget;
3. Review từng native button theo semantics, không dựa riêng vào tên tag;
4. Không tạo thêm Button wrapper mới vì components/ui/button.tsx đã đủ variant cơ bản.

## 4. Inventory common component

### 4.1. UI primitives

| Component | Đánh giá |
| --- | --- |
| Alert | Có common nhưng thiếu variant info/success/warning, nên nhiều màn vẫn tự style alert |
| Avatar | Đủ dùng cho app shell |
| Badge | Đang dùng tốt |
| Breadcrumb | Đủ dùng qua wrapper Breadcrumbs |
| Button | Common chính, đang dùng rộng |
| Card | Không cần ép mọi section thành Card; chỉ dùng khi có grouping thật |
| Checkbox | Có primitive nhưng business form vẫn dùng native checkbox nhiều |
| Collapsible | Primitive dự phòng, chưa có consumer |
| Dialog | Đang dùng rộng và đúng tầng |
| DropdownMenu | Đang dùng cho menu/action |
| Icon | Có dấu hiệu trùng với components/icon.tsx; chỉ cleanup sau khi xác minh starter shell |
| Input | Common chính, đang dùng rộng |
| Label | Common chính, nhưng checkbox/radio label vẫn chưa đồng nhất |
| NavigationMenu | App shell |
| PlaceholderPattern | Starter candidate, không liên quan trực tiếp business UX |
| SearchableSelect | Đang dùng đúng cho entity động |
| Select | Radix primitive chưa có consumer; native select đang được chủ động giữ cho enum ngắn |
| Separator | Đủ dùng |
| Sheet | Đúng cho navigation mobile và quick edit |
| Sidebar | App shell |
| Skeleton | Có nhưng loading state ở management page còn thiếu |
| Toggle | Dùng hạn chế |
| ToggleGroup | Primitive dự phòng |
| Tooltip | Có thể dùng thêm cho disabled/icon-only action |

Không xóa hàng loạt các primitive chưa dùng. Tài liệu kiến trúc hiện tại đã chốt rằng primitive shadcn không import sẽ không đi vào production chunk. Chỉ cleanup khi có milestone hardening riêng.

### 4.2. Shared application patterns

| Component | Đánh giá |
| --- | --- |
| CollectionState | Đang dùng tốt |
| FilterBar | Có common nhưng đang bị bỏ qua ở nhiều page có cùng wrapper |
| FlashMessages | Đang dùng tại app layout |
| FormErrorSummary | Đã tạo nhưng chưa được áp dụng |
| PageHeader | Có common nhưng nhiều management page vẫn tự dựng header |
| Pagination | Đang dùng tốt |
| RowActions | Chưa có consumer; loại khỏi critical path và chỉ đánh giá lại khi xác định được ít nhất hai consumer thật |
| SearchField | Đang dùng tốt |

Các pattern cần được áp dụng rộng hơn:

- PageHeader: Dashboard, Hóa đơn, Khách hàng, Tồn kho, Ca/két, Đơn vị, Nhập kho;
- FilterBar: Hóa đơn, Khách hàng, Tồn kho, Ca/két, Đơn vị, Nhập kho;
- FormErrorSummary: ProductForm, stock receipt và các dialog có nhiều lỗi;
- RowActions không thuộc roadmap hiện tại. Nếu sau rollout xuất hiện ít nhất hai table có cùng contract action và spacing thì mở follow-up riêng; nếu không, xóa component unused ở milestone cleanup.

### 4.3. App shell và starter components

Nhóm hiện có:

- AppContent, AppHeader, AppLogo, AppLogoIcon, AppShell;
- AppSidebar, AppSidebarHeader, Breadcrumbs;
- NavMain, NavFooter, NavUser;
- UserInfo, UserMenuContent;
- AppearanceDropdown, AppearanceTabs;
- Heading, HeadingSmall;
- InputError, TextLink, Icon, DeleteUser.

Nhóm này không nên được chuyển vào feature. Tuy nhiên InputError đang tạo một contract lỗi thứ hai:

- auth/settings dùng InputError với màu hard-code;
- feature form dùng paragraph inline với text-destructive;
- FormErrorSummary chưa có consumer.

Cần hợp nhất error presentation thành semantic component dùng chung.

### 4.4. Feature components

#### Customers

- CustomerFormDialog: dùng đúng cho form ngắn;
- CustomerTable: đúng tầng feature;
- DebtPaymentDialog: dùng đúng cho tác vụ thu nợ ngắn.

#### POS

- CartSummary;
- CartTable;
- CatalogPanel;
- HeldCartsPanel;
- OpenShiftDialog;
- PosStatusBar;
- QuickCustomerDialog;
- ReceiptPreview;
- SaleSuccessBar trong receipt-preview.tsx;
- SyncCenter;
- VariantUnitPicker.

Đây là component nghiệp vụ, không được đẩy xuống components/ui. Native button trong catalog, held carts và customer picker là một phần của interaction contract, không phải lỗi common.

#### Products

- ProductForm: full create/edit form đang dùng production;
- ProductFormDialog: component cũ, không còn consumer;
- ProductImageField;
- ProductQuickEditSheet;
- ProductStatusDialog;
- ProductTable;
- ProductUnitsEditor.

Chỉ ProductFormDialog cần cleanup ngay. Các component còn lại có ranh giới feature hợp lý.

#### Sales

- ReturnDialog;
- ReturnItemsTable;
- SaleReceipt.

Không nên tạo common ReturnForm vì đây là business component.

#### Shifts

- CashMovementDialog;
- CloseShiftDialog;
- OpenShiftDialog;
- ReconcileShiftDialog;
- ShiftTable.

Hai OpenShiftDialog ở POS và Shifts có cùng dữ liệu nhưng khác interaction contract. Không gộp máy móc:

- POS có required mode, focus restoration và khóa bán;
- management dialog là tác vụ chủ động.

Có thể tách phần field thuần nếu thật sự giảm lặp, nhưng giữ hai orchestrator riêng.

#### Stock receipts

- StockReceiptForm;
- StockReceiptHistory;
- StockReceiptItemsTable;
- ProductUnitPicker nội bộ StockReceiptItemsTable.

ProductUnitPicker là feature-specific vì biết product, SKU, barcode và unit. Không chuyển vào UI primitive.

## 5. Common component còn thiếu

### P0 — Nên tạo

#### MoneyInput

Vị trí đề xuất: resources/js/components/shared/money-input.tsx.

Contract đã chốt:

```ts
type MoneyValue = number | '';

type MoneyInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'inputMode' | 'value' | 'onChange'> & {
    value: MoneyValue;
    onValueChange: (value: MoneyValue) => void;
    min?: number;
    max?: number;
    invalid?: boolean;
};
```

- Empty state duy nhất là chuỗi rỗng `''`; không dùng `null` hoặc `undefined` cho controlled value.
- Khi người dùng xóa hết, component emit `''`, giữ ô rỗng và không tự ép thành `0`. Field `required` hiển thị lỗi sau blur/submit và server validation vẫn là authoritative.
- Format theo `vi-VN` sau mỗi lần nhập hoặc paste hợp lệ, không đợi blur. Ví dụ `100000` thành `100.000`, `010000` thành `10.000`.
- Dùng `type="text"` và `inputMode="numeric"`; chỉ nhận chữ số cho VND nguyên, bỏ dấu phân cách khi parse và không đưa ký hiệu `đ` vào editable value.
- `min`/`max` không clamp hoặc tự sửa dữ liệu. Giá trị ngoài khoảng vẫn được giữ để người dùng thấy và sửa; control đặt `aria-invalid`, consumer hiển thị `FieldError`, client chặn submit và backend tiếp tục validate.
- Caret được bảo toàn theo vị trí chữ số, không theo vị trí ký tự dấu chấm. Phải test chèn/xóa ở đầu, giữa, cuối và paste chuỗi đã format.
- Khi prop `value` thay đổi do Inertia `reset`, đổi record hoặc phản hồi server, display string phải đồng bộ lại ngay. Không giữ draft của record trước.
- Với CRUD `useForm`, kiểu field tiền chuyển thành `MoneyValue`; `''` được gửi như empty để Laravel trả lỗi `required/numeric`, không normalize thành `0` trước request.
- State tính toán tiền của POS vẫn là `number`. Mỗi consumer POS giữ một draft `MoneyValue` cục bộ; chỉ ghi vào cart/checkout owner khi draft là `number`. Nếu blur/Enter khi draft là `''`, adapter khôi phục numeric value gần nhất và không làm tổng tiền thành `NaN` hoặc `0` ngoài ý muốn.
- Không đưa business rule như số tiền tối đa của khoản nợ hoặc tổng hóa đơn vào component common; consumer truyền `max` và message nghiệp vụ.

Áp dụng cho 11 monetary input hiện tại:

- Giá bán trong ProductUnitsEditor;
- Giá bán trong ProductQuickEditSheet;
- Giá nhập trong StockReceiptItemsTable;
- Thu công nợ;
- Tiền đầu ca ở management và POS;
- Số tiền thu/chi;
- Tiền mặt và QR trong checkout;
- Đơn giá và giảm giá trong POS cart.

Không áp dụng MoneyInput cho:

- số lượng;
- hệ số quy đổi;
- số tờ theo mệnh giá;
- số lượng hoàn trả.

Các trường này cần decimal/integer input riêng để không làm sai nghiệp vụ.

#### DateRangeFilter

Vị trí đề xuất: resources/js/components/shared/date-range-filter.tsx.

Contract UI đã chốt:

- Hai label nhìn thấy: Từ ngày và Đến ngày;
- Dùng Input common với type date;
- Có group label như Khoảng ngày;
- Hỗ trợ value, onFromChange, onToChange, min, max và disabled;
- Báo lỗi khi from lớn hơn to;
- Có thể clear một hoặc cả hai mốc;
- Responsive: xếp dọc trên mobile, cùng hàng khi đủ chỗ;
- Không thêm date picker package ở phase đầu.
- Nếu `from > to`, component hiển thị lỗi tại chỗ và không tự đảo hai mốc. Component không import Inertia router; consumer giữ draft range và chỉ gọi `router.get` khi `from <= to`.
- Query dùng chuỗi local date `YYYY-MM-DD`; khi thay filter phải reset `page` về 1, còn phân trang phải giữ nguyên `from`, `to` và các filter khác.

Consumer đầu tiên:

- Hóa đơn bán hàng;
- Ca/két.

Stock receipt expiry date là single date field trong table, không dùng DateRangeFilter.

Contract server đã chốt:

- Tạo `IndexSalesRequest` và `IndexShiftsRequest`; không tiếp tục parse date bằng regex trong controller.
- `from`: `nullable|date_format:Y-m-d`.
- `to`: `nullable|date_format:Y-m-d|after_or_equal:from`.
- Request từ URL không hợp lệ bị reject bằng validation redirect/error bag; backend không swap hoặc âm thầm bỏ filter.
- Ngày được hiểu theo timezone của organization, không theo timezone PHP mặc định hoặc browser.
- Với `from`, tạo đầu ngày local rồi đổi sang UTC và query `timestamp >= fromUtc`.
- Với `to`, tạo đầu ngày kế tiếp theo local timezone rồi đổi sang UTC và query `timestamp < toExclusiveUtc`. Dùng half-open interval để tránh lỗi microsecond ở cuối ngày.
- Tách phép đổi biên ngày vào `app/Support/OrganizationDateRange.php` để Sales và Shifts dùng chung; class chỉ nhận ngày đã validate và IANA timezone.
- Pest phải phủ from-only, to-only, range hợp lệ, range đảo, format sai, record sát nửa đêm, DST-safe IANA conversion và query pagination giữ filter.

#### NativeSelect

Vị trí đề xuất: resources/js/components/ui/native-select.tsx.

Lý do:

- Enum ngắn nên tiếp tục dùng native select theo quyết định UX đã chốt;
- Class height, border, focus, disabled, invalid và dark mode đang lặp và không hoàn toàn giống nhau.

NativeSelect chỉ bọc select HTML, không thêm search và không chứa business option.

### P1 — Nên chuẩn hóa

#### FieldError

Hợp nhất InputError và các paragraph lỗi inline thành một component semantic:

- text-destructive;
- id để nối aria-describedby;
- kích thước và spacing nhất quán;
- không hard-code red;
- dùng được cho auth/settings và feature.

#### Alert variants

Mở rộng Alert hiện tại với info, success và warning dùng semantic token đã có trong app.css. Migrate các alert tự style ở POS, nhập kho, dashboard và form.

#### Table primitives

Đưa ra khỏi critical path. Sau khi các vertical slice chính hoàn tất mới đánh giá một follow-up riêng cho `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead` và `TableCell`.

Chỉ tạo khi ít nhất hai table đã refactor chứng minh cùng contract. Không tạo generic DataTable; sorting, filtering, pagination và responsive behavior vẫn thuộc page/feature.

### Không nên tạo lúc này

- Generic CRUDForm;
- Generic EntityDialog;
- Generic DataTable có business behavior;
- Generic ProductPicker;
- Generic FormSection chỉ có một consumer;
- Global form store;
- Wrapper mới thay thế Button/Input hiện có.

## 6. ProductFormDialog và ProductForm

### 6.1. Bằng chứng

- GET products/create render resources/js/pages/products/create.tsx;
- GET products/{product}/edit render resources/js/pages/products/edit.tsx;
- Cả hai page compose ProductForm;
- ProductFormDialog không được import bởi page hoặc feature production;
- ProductFormDialog chỉ còn được export từ hai barrel file;
- ProductForm và create/edit pages được đưa vào ở commit mới hơn phần cấu trúc dialog cũ;
- Docs product UX đã chốt full form sang page riêng.

### 6.2. Kết luận

Đúng: ProductFormDialog đã bị thay thế bởi ProductForm trong luồng production.

Cleanup đề xuất:

1. Xóa resources/js/features/products/components/product-form-dialog.tsx;
2. Xóa export ProductFormDialog khỏi components/index.ts và features/products/index.ts;
3. Chạy rg xác minh không còn reference;
4. Chạy npm run check;
5. UAT create, edit, back navigation và validation error.

Không cần migrate consumer vì hiện không có consumer.

## 7. Rule chọn Page, Dialog, Sheet và Inline panel

Không đồng bộ hệ thống bằng cách biến mọi create/edit thành cùng một loại container. Đồng bộ đúng là dùng cùng decision matrix:

| Surface | Dùng khi | Ví dụ hiện tại |
| --- | --- | --- |
| Dialog | Confirmation hoặc form ngắn, ít field, không cần URL riêng | Category, Unit, Customer, thu nợ, mở ca |
| Sheet | Quick edit cần giữ context màn đang làm việc | ProductQuickEditSheet |
| Page | Form dài, nhiều section, dynamic rows, file, cần reload/deep link | Product create/edit |
| Inline panel | Tác vụ vận hành cần nhìn dữ liệu liên quan cùng lúc | Stock receipt manual form, POS checkout |

Tiêu chí bắt buộc chuyển khỏi Dialog:

- Có dynamic row;
- Có upload/preview file;
- Có nhiều hơn một section nghiệp vụ;
- Có khả năng vượt chiều cao màn hình thường xuyên;
- Cần URL riêng, reload, bookmark hoặc mở tab mới;
- Có workflow nhiều bước hoặc dữ liệu tài chính phức tạp.

Tiêu chí giữ Dialog:

- Khoảng 1–5 field độc lập;
- Hoàn thành nhanh;
- Không cần điều hướng riêng;
- Không có nested editor;
- Có thể mô tả hậu quả và action rõ trong một viewport.

## 8. Thứ tự ProductForm

### 8.1. Hiện tại

Thứ tự hiện tại:

1. Thông tin cơ bản: tên, SKU, danh mục;
2. Ảnh;
3. Theo dõi lô, HSD, trạng thái;
4. Quy cách/đơn vị bán, trong đó có giá;
5. Sticky actions.

Giá bán nằm gần cuối form, chưa phù hợp với tần suất cập nhật.

### 8.2. Thứ tự đề xuất

1. Thông tin cơ bản
   - Tên sản phẩm;
   - SKU;
   - Danh mục.
2. Giá & quy cách bán
   - Đơn vị bán mặc định;
   - Giá bán nổi bật;
   - Barcode;
   - Hệ số và đơn vị gốc;
   - Các đơn vị bán bổ sung.
3. Theo dõi kho
   - Theo dõi lô;
   - Theo dõi hạn sử dụng;
   - Cho phép bán lẻ theo từng đơn vị nếu liên quan.
4. Ảnh sản phẩm
5. Trạng thái
   - Đang bán;
   - Giải thích ảnh hưởng khi tắt.
6. Sticky actions

Không tách sale_price thành field độc lập nằm ngoài unit model vì một sản phẩm có thể có nhiều giá theo đơn vị. Thay vào đó:

- Đưa ProductUnitsEditor lên ngay sau identity;
- Làm row default sale nổi bật và xuất hiện đầu tiên;
- Đưa Giá bán lên trước Hệ số trong row;
- Nhóm checkbox/radio theo vai trò rõ hơn;
- Trên mobile chuyển mỗi unit thành card dọc thay vì ép grid ngang.

### 8.3. Luồng cập nhật giá thường xuyên

Reorder full form là cần nhưng chưa đủ. Với nhu cầu đổi giá liên tục:

- Thêm action **Sửa giá** tại mỗi row của `ProductTable`, cạnh action Sửa đầy đủ;
- Action chỉ sửa **đơn vị bán mặc định**. Không đặt nút trên từng chip đơn vị vì sẽ làm table quá dày; giá của đơn vị khác tiếp tục sửa trong full form;
- Nếu sản phẩm không có default active unit, disable action với tooltip “Sản phẩm chưa có đơn vị bán mặc định” và dẫn người dùng sang Sửa đầy đủ;
- Mở `ProductQuickEditSheet` với đúng `product_unit_id` của default unit; header hiển thị tên, SKU và tên đơn vị để tránh sửa nhầm;
- Thứ tự trong quick edit: Tên/SKU context, Giá bán, Danh mục;
- Dùng MoneyInput;
- Giữ full edit cho conversion, barcode, ảnh, tracking và nhiều unit.

Contract backend/audit:

- Giữ endpoint quick-update hiện có và permission hiện có; không cho client tự gửi tên nguồn audit.
- Đổi `ApprovalEvent.context.source` từ `pos_quick_edit` sang `catalog_quick_edit`. Đây là source theo loại mutation dùng chung cho POS và management, không tuyên bố sai rằng request luôn đến từ POS.
- Cập nhật `CatalogUxFeatureTest` để assert chính xác `action = catalog.quick_update`, `context.source = catalog_quick_edit`, đúng product/unit và actor.
- Quick edit chỉ thay giá của `product_unit_id` được gửi; test phải chứng minh các unit còn lại không đổi và cart item đã tồn tại vẫn giữ price snapshot theo contract hiện hành.

## 9. Đánh giá thứ tự các form còn lại

| Form | Hiện trạng | Đề xuất |
| --- | --- | --- |
| Customer create/edit | Tên, điện thoại, địa chỉ, ghi chú | Hợp lý; thêm Hủy, lỗi từng field và reset rõ khi đóng |
| Quick customer POS | Tên, điện thoại | Hợp lý; giữ ngắn |
| Debt payment | Số tiền, phương thức, xác nhận QR, ghi chú | Hợp lý; dùng MoneyInput và hiển thị lỗi/max rõ |
| Category | Tên/mã, cha, mô tả, trạng thái | Hợp lý; giữ Dialog |
| Unit | Mã, tên, trạng thái | Nên đổi thành Tên, Mã, Trạng thái vì tên là nhận diện chính |
| Open shift | Quầy, tiền đầu ca | Hợp lý; dùng MoneyInput, autofocus tiền sau khi đã có quầy |
| Cash movement | Loại, số tiền, lý do | Hợp lý; dùng MoneyInput |
| Close shift | Số tờ, tổng thực đếm, ghi chú | Hợp lý; số tờ giữ integer input, không dùng MoneyInput |
| Reconcile shift | Ghi chú | Hợp lý |
| Return sale | Danh sách hàng, loại xử lý, phương thức, lý do | Cơ bản hợp lý; nên có error summary và cancel rõ |
| Stock receipt | Nhà cung cấp/ghi chú, sản phẩm, số lượng, giá nhập, lô, HSD | Hợp lý theo trình tự nhập liệu; dùng MoneyInput cho giá nhập |
| Product quick edit | Tên, danh mục, giá | Nên đưa giá lên ngay sau identity/context |
| Profile | Tên, email | Hợp lý |
| Password | Mật khẩu hiện tại, mới, xác nhận | Hợp lý |
| Legacy import | Chọn file, preview, execute | Hợp lý theo từng bước |
| Sales date filter | Hai date input không có label nhìn thấy | Không hợp lý; dùng DateRangeFilter |
| Shifts date filter | Hai date input không có label nhìn thấy | Không hợp lý; dùng DateRangeFilter |

## 10. Audit Input, money và leading zero

### 10.1. Input common hiện tại

Text, password, email và numeric field chính đã đi qua Input common. Số lượng control tại thời điểm audit nằm trong Phụ lục A.

Raw input còn lại chủ yếu là:

- input nội bộ của Input primitive;
- hidden file input;
- product image file input;
- checkbox/radio;
- date filter.

Kết luận: nền tảng Input đã common, nhưng specialized input chưa common.

### 10.2. Cách format tiền vẫn nhập được

Không dùng type number cho field tiền cần format trực tiếp.

Luồng đề xuất:

Input text + inputMode numeric
→ đọc chuỗi người dùng nhập
→ bỏ ký tự phân cách và ký tự không hợp lệ
→ chuẩn hóa leading zero
→ lưu numeric value vào form
→ render lại bằng Intl.NumberFormat vi-VN

Ví dụ:

| Người dùng nhập | Giá trị form | Hiển thị |
| --- | ---: | ---: |
| 100000 | 100000 | 100.000 |
| 010000 | 10000 | 10.000 |
| 1.000.000 | 1000000 | 1.000.000 |
| rỗng | empty theo contract | rỗng |

Không dùng Number(value) trực tiếp cho mọi keypress vì:

- empty string bị biến thành 0;
- không có phân cách hàng nghìn;
- khó giữ caret khi sửa giữa chuỗi;
- type number có UI/behavior khác nhau giữa browser;
- vẫn cần phân biệt money với decimal quantity.

### 10.3. Date/time và timezone

`dateTimeFormatter` và `dateFormatter` hiện cùng dùng `Intl.DateTimeFormat('vi-VN')` không có `timeStyle`. Đồng thời app lưu/serialize timestamp theo UTC, organization có timezone mặc định `Asia/Ho_Chi_Minh`, formatter frontend đang ngầm dùng timezone browser, còn Sales/Shifts dùng `whereDate` trên UTC timestamp. Đây là một contract dữ liệu, không chỉ là lỗi format UI.

Contract đã chốt:

- Database và API/Inertia timestamp tiếp tục lưu, serialize bằng UTC.
- Ngày/giờ hiển thị và ngày người dùng nhập được hiểu theo IANA timezone của organization; không dùng timezone browser làm nguồn sự thật.
- `HandleInertiaRequests::share()` bổ sung `organization.timezone`, lấy từ organization của user và fallback về `config('app.timezone')` khi chưa đăng nhập/không có organization.
- `SharedData` TypeScript bổ sung `organization: { timezone: string }`.
- Formatter nhận timezone tường minh: `formatDate(value, timeZone)` chỉ hiển thị ngày; `formatDateTime(value, timeZone)` hiển thị ngày, giờ và phút. Page lấy shared timezone một lần và truyền xuống feature component; helper trong `lib` không gọi `usePage()`.
- Sales và Shifts bỏ `whereDate`; dùng UTC boundaries do `OrganizationDateRange` tạo từ local dates như contract tại `DateRangeFilter`.
- Cùng vertical slice này phải cập nhật Dashboard, Hóa đơn, Ca/két, Phiếu nhập và Held carts để mọi timestamp hiển thị theo organization timezone.
- Pest phải có timestamp ngay trước/sau nửa đêm UTC tương ứng với ngày local, timezone khác `Asia/Ho_Chi_Minh`, và assertion shared prop `organization.timezone`.

Phần này được triển khai cùng `DateRangeFilter` ở Phase 1, không trì hoãn đến hardening.

## 11. Các inconsistency UX bổ sung

### 11.1. Header và filter

PageHeader và FilterBar đã tồn tại nhưng nhiều page vẫn tự lặp cùng cấu trúc. Điều này tạo khác biệt:

- font-bold và font-semibold;
- text-slate hard-code và text-muted-foreground;
- spacing p-4 so với p-4/md:p-5/lg:p-6;
- behavior wrap trên mobile;
- action CTA tự style.

Cần migrate management page theo vertical slice, không format-only toàn bộ cùng lúc.

### 11.2. Form action

Thêm nút **Hủy** dạng `Button variant="outline" type="button"` tại đúng các dialog sau:

- `features/customers/components/customer-form-dialog.tsx`;
- `features/customers/components/debt-payment-dialog.tsx`;
- `features/shifts/components/open-shift-dialog.tsx`;
- `features/shifts/components/cash-movement-dialog.tsx`;
- `features/shifts/components/close-shift-dialog.tsx`;
- `features/sales/components/return-dialog.tsx`;
- `features/pos/components/open-shift-dialog.tsx` chỉ khi `required === false`.

Nút Hủy gọi đúng close/reset handler, không submit form và focus phải trở lại trigger. POS OpenShiftDialog ở `required === true` tiếp tục không có Hủy và không cho đóng vì chưa mở ca.

Checkbox common được migrate tại đúng các field production sau:

- `ProductForm`: `track_lot`, `track_expiry`, `is_active`;
- `ProductUnitsEditor`: `allows_fractional`;
- `pages/categories/index.tsx`: `is_active`;
- `pages/units/index.tsx`: `is_active`;
- `DebtPaymentDialog`: xác nhận đã nhận QR;
- `CartSummary`: xác nhận thanh toán QR.

Các checkbox trong `ProductFormDialog` không migrate vì file được xóa. Radio native trong unit editor giữ nguyên vì là một nhóm chọn đơn vị mặc định, không phải checkbox boolean.

### 11.3. Error presentation

Hiện có ba kiểu:

- InputError hard-code màu;
- paragraph inline text-destructive;
- FormErrorSummary chưa được dùng.

Cần thống nhất FieldError và FormErrorSummary. Mọi field tài chính phải có lỗi cạnh field; summary không thay thế field error.

### 11.4. Semantic token và dark mode

Dashboard, Sales, Inventory và một số feedback box còn dùng:

- bg-white;
- text-slate-*;
- text-blue-*;
- text-red-*;
- text-emerald-*;
- border-orange-*.

Cần chuyển phần được chạm trong từng phase sang semantic token. Không làm một PR đổi toàn bộ visual language.

### 11.5. Loading và disabled reason

Management list có collection state và processing ở một số mutation, nhưng chưa có loading/background filtering đồng đều. Disabled action như Thu nợ hoặc mở/sửa khi offline cần tooltip hoặc text giải thích, không chỉ disable.

### 11.6. Accessibility

Ưu tiên:

- Label nhìn thấy cho date range;
- htmlFor/id cho mọi field;
- aria-describedby nối field với error;
- accessible name cho icon-only delete;
- focus trở lại trigger sau Dialog/Sheet;
- không làm mất barcode focus trong POS;
- keyboard test cho SearchableSelect, quick edit và checkout.

## 12. Roadmap triển khai

### Phase 0 — Cleanup và baseline

Mục tiêu:

- Thiết lập Vitest + React Testing Library + user-event + jest-dom + jsdom;
- Thêm `npm run test`, `npm run test:watch` và đưa test vào `npm run check`;
- Xóa ProductFormDialog và exports cũ;
- Ghi lại danh sách raw control được phép giữ;
- Chụp baseline browser cho Product create/edit, Sales, Shifts và POS.

Trạng thái: hoàn tất test harness, smoke test `Button`, xóa `ProductFormDialog` khỏi production/export và thêm các guardrail test ngày 2026-08-23. Browser baseline/UAT vẫn là bước nghiệm thu thủ công.

Verification:

- rg không còn ProductFormDialog;
- npm run check;
- test harness tìm và chạy được file `*.test.ts`/`*.test.tsx` trong resources/js;
- UAT create/edit product.

### Phase 1 — Common controls P0

Mục tiêu:

- Tạo MoneyInput;
- Tạo NativeSelect;
- Tạo DateRangeFilter;
- Tạo/hợp nhất FieldError;
- Bổ sung Alert semantic variants.

Rollout:

1. MoneyInput trong Product full form và ProductQuickEditSheet;
2. MoneyInput trong DebtPaymentDialog, OpenShiftDialog management/POS và CashMovementDialog;
3. MoneyInput trong StockReceiptItemsTable;
4. MoneyInput trong CartTable/CartSummary checkout;
5. DateRangeFilter + organization timezone + formatDate/formatDateTime + Form Request/UTC boundary cho Sales và Shifts trong cùng một vertical slice;
6. NativeSelect theo từng management page.

Không rollout MoneyInput toàn hệ thống trong một commit vì POS money behavior cần UAT riêng.

Trạng thái: đã triển khai MoneyInput, NativeSelect, DateRangeFilter, FieldError và Alert semantic variants; các consumer tiền, date range Sales/Shifts, timezone organization và POS numeric adapter đã được migrate. Vitest, typecheck, lint và production build đang pass.

### Phase 2 — Product UX

Mục tiêu:

- Reorder ProductForm;
- Đưa unit mặc định và giá lên trước;
- Responsive unit cards;
- Thêm Sửa giá nhanh từ ProductTable cho default active unit, dùng source audit `catalog_quick_edit`;
- Migrate Checkbox common tại tám field production được liệt kê ở mục 11.2;
- Dùng FormErrorSummary và field errors;
- Bảo toàn catalog refresh, cart price snapshot và permission.

Trạng thái: đã triển khai. Product form đưa Giá & quy cách lên ngay sau Thông tin cơ bản; ProductTable có Sửa giá cho default active unit; quick update dùng audit source `catalog_quick_edit`; checkbox production và FormErrorSummary đã dùng common contract.

### Phase 3 — Management consistency

Mục tiêu:

- Migrate PageHeader;
- Migrate FilterBar;
- Chuyển CTA Link sang Button asChild;
- Áp dụng NativeSelect;
- Thêm Hủy vào bảy trường hợp được liệt kê ở mục 11.2, trong đó POS OpenShift chỉ áp dụng khi `required === false`;
- Chuẩn hóa padding, heading và semantic token.

Thứ tự:

1. Products;
2. Sales;
3. Customers;
4. Shifts;
5. Inventory;
6. Stock receipts;
7. Units/Categories;
8. Dashboard.

Trạng thái: đã triển khai cho các page quản trị chính (Products, Sales, Customers, Shifts, Inventory, Stock receipts, Units, Categories và Dashboard): PageHeader/FilterBar, NativeSelect, CTA `Button asChild`, semantic control spacing và Cancel theo decision matrix đã được áp dụng. Các native button còn lại là composite widget hoặc control có contract riêng theo mục 3.2.

### Phase 4 — States và hardening

Mục tiêu:

- Loading/background filter state;
- Error/retry state;
- Disabled reason và tooltip;
- Dark mode;
- Desktop/tablet/mobile UAT;
- Keyboard/focus UAT.

Trạng thái: đã triển khai loading/error/retry, semantic token cho dark mode, default-sale ordering/highlight, quick-edit metadata, accessibility labels và focus restoration cho Dialog/Sheet. Còn lại browser UAT responsive, keyboard/focus và dark-mode review trên môi trường chạy thật.

Follow-up ngoài critical path:

- Chỉ mở task Table primitives nếu có ít nhất hai consumer thật với cùng contract;
- Chỉ mở task RowActions nếu có ít nhất hai consumer thật; nếu vẫn không có consumer thì xóa component unused.

## 13. Rule đề xuất sau khi implementation ổn định

Không ghi rule ngay trong bước audit vì source hiện vẫn mixed. Rule chỉ được record sau khi các phase liên quan đã triển khai và trở thành convention thật.

### Rule 1 — Chọn surface cho form

- Glob: resources/js/**/*.tsx
- Title: Chọn Page, Sheet hoặc Dialog theo độ dài workflow
- Note đề xuất:
  - Chỉ dùng Dialog cho confirmation hoặc form ngắn, ít field và không cần URL riêng.
  - Dùng Sheet cho quick edit theo ngữ cảnh và Inertia page cho form dài có nhiều section, dynamic row, file hoặc yêu cầu reload/deep link.
  - Không duy trì song song page và dialog cho cùng một full form.

### Rule 2 — Monetary input

Chỉ record sau khi MoneyInput đã được rollout:

- Glob: resources/js/**/*.tsx
- Title: Dùng MoneyInput cho số tiền VND
- Note đề xuất:
  - Mọi field tiền VND editable dùng MoneyInput common để hiển thị vi-VN và trả numeric value chuẩn hóa.
  - Không dùng MoneyInput cho quantity, conversion hoặc denomination count.

### Rule 3 — Date range filter

Chỉ record sau khi Sales và Shifts đã migrate:

- Glob: resources/js/pages/**/*.tsx
- Title: Date range phải có label nhìn thấy
- Note đề xuất:
  - Bộ lọc from/to dùng DateRangeFilter common với label Từ ngày và Đến ngày nhìn thấy, validation from không lớn hơn to và query lưu trên URL.

Các rule phải được ghi bằng Laravel Boost record-rule, không sửa tay .ai/rules.

## 14. Verification và UAT

### Automated guardrail

Sau mỗi vertical slice:

- Chạy `npm run check` trước khi merge. Script này là nguồn duy nhất, lần lượt chạy Prettier check, ESLint check, TypeScript, Vitest và production build; không yêu cầu chạy lặp lại bốn script con trong checklist.
- Chạy Pest feature test cụ thể bằng `php artisan test --compact <test-file>` nếu request, validation, route, shared prop, timezone hoặc audit event thay đổi.
- Browser UAT vẫn bắt buộc cho responsive, focus restoration và luồng POS thật; UAT bổ sung chứ không thay thế automated test.

Test harness đã chốt và đã được thiết lập:

- Runner: Vitest với environment jsdom;
- Component queries/assertions: React Testing Library + jest-dom;
- Keyboard, paste và pointer interaction: user-event;
- Config: `vitest.config.ts`;
- Global setup: `resources/js/test/setup.ts`;
- Convention: test đặt cạnh source dưới dạng `*.test.ts` hoặc `*.test.tsx`;
- Scripts: `npm run test`, `npm run test:watch`; `npm run check` bao gồm `npm run test`;
- Smoke test đầu tiên: `resources/js/components/ui/button.test.tsx`.

Automated test bắt buộc khi implement roadmap:

- `MoneyInput`: initial format, nhập `100000`, leading zero, paste có dấu chấm/ký tự thừa, clear thành `''`, min/max không clamp, `required`, `aria-invalid`, `aria-describedby`, disabled, caret khi sửa giữa chuỗi và sync khi rerender với prop mới;
- POS money adapter: empty draft không ghi `0`/`NaN` vào numeric owner, blur/Enter khôi phục last valid value;
- `DateRangeFilter`: visible labels, accessible names, clear từng mốc, range đảo hiển thị lỗi, responsive class contract và consumer không gửi request khi range invalid;
- Dialog/Sheet được sửa: Escape/Cancel/close, focus trở lại trigger, required POS OpenShift không thể đóng;
- Product quick edit: chọn đúng default active unit và disabled reason khi thiếu default unit.

Pest test bắt buộc:

- Sales/Shifts: from-only, to-only, range, reversed/invalid format, UTC boundary sát nửa đêm, organization timezone và pagination giữ query;
- Inertia shared prop: `organization.timezone` đúng organization và fallback đúng;
- Quick update: permission, unit chỉ định, unit khác không đổi, cart snapshot không đổi và `context.source = catalog_quick_edit`.

### MoneyInput UAT

- Nhập 100000 hiển thị 100.000;
- Nhập 010000 hiển thị 10.000;
- Paste 1.000.000;
- Xóa hết giữ `''` thay vì tự ép 0; field required báo lỗi;
- Chèn/xóa số ở giữa không làm sai caret;
- min/max hoạt động;
- submit gửi numeric value;
- validation server trả lỗi cạnh field;
- POS cash, QR, discount, unit price và opening cash không regression.

### DateRangeFilter UAT

- Label Từ ngày/Đến ngày nhìn thấy;
- Screen reader có accessible name;
- from-only, to-only và cả hai mốc;
- from lớn hơn to có lỗi rõ;
- reset filter;
- URL query và pagination giữ đúng;
- mobile không tràn.

### Product UAT

- Create một unit và nhiều unit;
- Edit giữ đúng category, image và units;
- Unit mặc định luôn rõ;
- Giá nằm trong vùng nhìn thấy sớm;
- Quick price update đúng unit;
- Cart đã có giữ price snapshot;
- Status/permission/offline behavior không regression;
- Back navigation và validation error giữ context hợp lý.

## 15. Definition of Done

- ProductFormDialog và exports cũ được loại bỏ;
- Button CTA độc lập dùng Button common, composite widget giữ native khi có lý do;
- Monetary field dùng MoneyInput, quantity/conversion không bị đổi sai;
- MoneyInput đáp ứng đầy đủ `MoneyValue`, empty, min/max, caret, prop reset và POS adapter contract;
- Sales và Shifts dùng DateRangeFilter có label nhìn thấy, Form Request và UTC boundary theo organization timezone;
- `formatDate`/`formatDateTime` nhận timezone tường minh và shared prop `organization.timezone` đã được test;
- Product full form có Giá & quy cách ngay sau Thông tin cơ bản;
- ProductTable có Sửa giá cho đúng default active unit và audit source là `catalog_quick_edit`;
- PageHeader và FilterBar được áp dụng nhất quán trên management pages;
- FieldError/FormErrorSummary có contract thống nhất;
- Tám checkbox production và bảy trường hợp Cancel/Hủy ở mục 11.2 được xử lý đúng ngoại lệ;
- Dialog ngắn, Sheet quick edit, Page full form theo decision matrix;
- Không tạo generic abstraction chưa có ít nhất hai consumer thật;
- Semantic token, responsive, keyboard, focus và dark mode được kiểm tra;
- npm run check pass;
- Pest tests theo từng server contract pass;
- Table primitives và RowActions không chặn DoD; chỉ làm ở follow-up khi có ít nhất hai consumer thật;
- Rule chỉ được record sau khi implementation phản ánh đúng rule.

## Phụ lục A — Snapshot audit định lượng

Các số liệu dưới đây chỉ đúng tại commit `33064c31f7910ad6003f92c2787bb955e08c9397`. Sau khi triển khai, không cập nhật rời rạc từng con số trong phần phân tích; nếu cần đo lại thì tạo snapshot mới kèm commit mới.

### Control và markup

- Button common được import trong 50 file;
- 11 native button: 3 trong UI primitive, 8 trong app/shared/feature;
- Input common có 33 consumer file;
- 16 numeric input, trong đó 11 field tiền thuộc phạm vi MoneyInput;
- 5 date input;
- 11 native checkbox, trong đó 3 nằm trong ProductFormDialog sẽ bị xóa và 8 production field cần migrate;
- 20 native select;
- 14 table markup.

### UI primitive consumer

- Alert 2; Avatar 2; Badge 9; Breadcrumb 1; Button 50; Card 2; Checkbox 1;
- Collapsible 0; Dialog 19; DropdownMenu 4; Icon 0; Input 33; Label 25;
- NavigationMenu 1; PlaceholderPattern 0; SearchableSelect 7; Select 0;
- Separator 2; Sheet 3; Sidebar 7; Skeleton 1; Toggle 1; ToggleGroup 0; Tooltip 2.

### Shared pattern consumer

- CollectionState 7;
- FilterBar 2;
- FlashMessages 1;
- FormErrorSummary 0;
- PageHeader 4;
- Pagination 8;
- RowActions 0;
- SearchField 8.
