# Kế hoạch nâng cấp UX toàn diện MartHub POS

> Trạng thái triển khai: Phase 0–4 đã được code trong source; còn UAT MySQL, benchmark và hardening trước cutover.

> Ngày lập: 14/08/2026
>
> Phạm vi: `MartHubPOSNew-clean`
>
> Trạng thái: đã được chủ dự án review và chốt các quyết định nghiệp vụ; sẵn sàng tách ticket triển khai

## 1. Kết luận sau khi audit source

Source đã có nền tảng nghiệp vụ tốt hơn cảm nhận giao diện hiện tại: backend đã phân trang cho phần lớn collection, POS đã có search index cục bộ, incremental rendering, checkout inline, offline queue và tách feature tương đối rõ. Vấn đề chính là các khả năng này chưa được nối thành một UX hoàn chỉnh và nhất quán.

Các phát hiện quan trọng:

1. `ProductController`, `CustomerController`, `SaleController`, `InventoryController`, `ShiftController` và `StockReceiptController` đã gọi `paginate(30|50)`, nhưng các page TypeScript chỉ khai báo `{ data: T[] }` và không render `links`, `current_page`, `last_page`, `from`, `to`, `total`. Người dùng vì vậy chỉ thấy trang đầu và không có cách sang trang khác.
2. Các controller danh sách gần như chưa nhận `search`, `status`, `sort`, khoảng ngày hoặc page size. Search/filter phía server chưa có contract chung.
3. Source mới chưa có route/controller/page quản trị Danh mục và Đơn vị, dù migration/model đã có và tài liệu migration xác định hai màn này là P0.
4. Schema Danh mục hiện tại là danh sách phẳng; tài liệu đích yêu cầu category tree. Chưa có `parent_id`, validation chống cycle hoặc UI tree.
5. POS đã tối ưu tìm sản phẩm theo catalog cục bộ và render từng batch 100 card. Không nên thay bằng pagination/search API thông thường vì sẽ làm hỏng barcode latency và offline catalog.
6. Product card POS chưa có context action. Chỉ click trái để thêm hàng. Muốn sửa tên/giá phải rời POS sang màn Sản phẩm, và hiện không có deep link mở đúng sản phẩm.
7. Form sản phẩm hiện là dialog lớn chứa cả thông tin chung, ảnh và nhiều đơn vị. Dialog này quá dài cho workflow quản trị, lỗi theo từng unit chưa hiển thị đầy đủ, và UI chưa có control đổi trạng thái active/inactive dù state đã tồn tại.
8. Shared flash `success/error` đã được server cung cấp nhưng hầu như chỉ màn import legacy hiển thị. Nhiều thao tác CRUD đóng dialog sau success mà không có feedback toàn cục.
9. Các bảng dùng `overflow-hidden`, nhiều màu `slate/blue` hard-code và chưa có responsive pattern. Trên mobile/tablet dọc, cột và action dễ bị cắt thay vì cuộn ngang hoặc đổi layout.
10. Không có shared paginator, query toolbar, collection state, paginated type hay URL-query hook. Mỗi page đang tự dựng header/table và bỏ qua loading/error/filter state.
11. POS đang tải toàn bộ khách hàng; nhập kho đang tải toàn bộ product unit. Các dropdown này sẽ giảm chất lượng rõ rệt khi dữ liệu tăng.
12. Test hiện có chưa bao phủ search/filter/pagination, CRUD catalog hoặc POS quick edit.

## 2. Mục tiêu và nguyên tắc

### 2.1. Mục tiêu người dùng

- Tìm được bản ghi trong tối đa một thao tác nhập và một thao tác chọn.
- Không mất filter, sort hoặc trang hiện tại khi xem/sửa rồi quay lại.
- Luôn biết đang xem bản ghi số bao nhiêu trên tổng số bao nhiêu.
- Tạo/sửa thành công có feedback rõ; lỗi nằm cạnh field và có summary khi cần.
- Nhân viên POS có thể sửa nhanh tên/giá sản phẩm từ ngữ cảnh card mà không phá nhịp bán hàng.
- Chuột phải không phải con đường duy nhất: cùng action phải dùng được bằng nút menu, bàn phím và touch.
- Desktop, tablet và mobile có hành vi có chủ đích; không che lỗi bằng `overflow-hidden`.

### 2.2. Nguyên tắc kỹ thuật

1. Management list dùng server-side query; POS catalog dùng local index để giữ scanner/offline.
2. Filter/sort/page của management list nằm trong URL query string.
3. Inertia `router.get`/`router.visit` dùng `replace`, `preserveState`, `preserveScroll` và partial reload `only` khi phù hợp.
4. Search management list debounce khoảng 300 ms; không debounce input barcode POS.
5. Server whitelist field sort/filter/page size; không truyền trực tiếp tên cột tùy ý vào `orderBy`.
6. Query luôn scope theo organization/branch trước khi search.
7. Không thêm table framework mới trong phase đầu. Shared component nhỏ từ primitives hiện có là đủ cho pagination/filter đơn giản.
8. Không dùng toast làm nơi duy nhất chứa lỗi cần xử lý. Toast/flash dùng cho success hoặc lỗi ngắn; validation ở gần field.
9. Mọi thay đổi giá/tên/trạng thái catalog phải cập nhật version/cache POS và có audit actor/time/before/after.
10. Completed sale tiếp tục đọc snapshot; sửa tên/giá hiện tại không làm đổi hóa đơn lịch sử.

## 3. Hai mô hình collection cần tách biệt

### 3.1. Management list

Áp dụng cho Sản phẩm, Danh mục, Đơn vị, Hóa đơn, Khách hàng, Tồn kho, Phiếu nhập và Ca/két.

```text
URL query
  → Request validate/normalize
  → Eloquent scope theo organization/branch
  → search/filter/sort whitelist
  → paginate(perPage)->withQueryString()
  → Inertia Paginated<T>
  → SearchToolbar + DataTable + Pagination
```

Quy tắc đã chốt:

- page size: `25`, cho phép `25 / 50 / 100`;
- khi đổi search/filter/page size: reset `page=1`;
- khi đổi sort: giữ filter, reset `page=1`;
- khi back/forward: phục hồi đúng query và trang;
- khi xóa/ngừng sử dụng bản ghi cuối trang: tự quay về trang hợp lệ gần nhất;
- hiển thị `Từ X–Y trên tổng Z`;
- paginator desktop có first/previous/page/next/last, mobile chỉ previous/next và `Trang X/Y`;
- loading nền giữ nguyên table, phủ trạng thái nhẹ để tránh layout shift;
- empty toàn hệ thống khác với empty do filter.

### 3.2. POS catalog

POS không dùng management pagination:

- giữ toàn bộ catalog cần bán trong memory/IndexedDB cho offline;
- input cập nhật ngay, exact barcode dùng map;
- text result có thể dùng `useDeferredValue` như hiện tại;
- card render theo batch hiện tại, chỉ virtualize nếu benchmark yêu cầu;
- category filter và search không phát request theo từng ký tự;
- quick edit là mutation online riêng, sau success refresh catalog prop/cache;
- khi offline, action sửa master data bị khóa và giải thích lý do.

## 4. Shared UX foundation cần xây trước

### 4.1. Type và query contract

Tạo type dùng chung, ví dụ:

```ts
type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};
```

Mỗi list có typed filters riêng, không dùng một object `Record<string, any>` toàn hệ thống.

Page size phải có một nguồn cấu hình chung, không hard-code lại ở từng controller/page:

- server giữ nguồn authoritative, ví dụ `config/ux.php` với `pagination.default = 25` và `pagination.options = [25, 50, 100]`;
- Form Request/query object đọc whitelist từ config này;
- `HandleInertiaRequests` chia sẻ cấu hình tối thiểu qua prop `ui.pagination`;
- `SharedData` khai báo type tương ứng để `Pagination` và page-size selector cùng sử dụng;
- nếu một màn hình cần ngoại lệ vì nghiệp vụ, ngoại lệ phải được đặt tên và ghi lý do, không tạo số mới trực tiếp trong JSX/controller.

### 4.2. Shared component

Chỉ tạo các component đã có nhiều consumer thật:

- `PageHeader`: title, description, primary action, optional supporting actions;
- `SearchField`: label ẩn/hiện phù hợp, clear button, loading indicator;
- `FilterBar`: compose search/select/date controls, không chứa query nghiệp vụ;
- `Pagination`: Inertia `Link`, số trang, range/total, page-size selector;
- `CollectionState`: initial loading, filtered empty, empty collection, recoverable error;
- `FormErrorSummary`: link/focus về field lỗi;
- `FlashMessages`: render shared flash success/error ở app shell;
- `RowActions`: visible action chính và dropdown action phụ.

Không tạo generic `DataTable` quá lớn ở phase đầu. Table header/cell vẫn thuộc feature vì mỗi domain có responsive và semantic khác nhau.

### 4.3. Query hook cho management page

Tạo hook nhỏ như `useListQuery` nếu sau hai page đầu contract đã ổn định:

- nhận route name, current filters và danh sách prop cần reload;
- debounce search 300 ms;
- bỏ query rỗng khỏi URL;
- reset page khi filter thay đổi;
- hủy request cũ hoặc để Inertia chỉ giữ visit mới nhất;
- expose `isFiltering`, `setSearch`, `setFilter`, `setSort`, `resetFilters`;
- không chứa tên field/domain cụ thể.

### 4.4. Backend request/query convention

Mỗi index dùng Form Request hoặc query object rõ ràng:

- `search`: string trim, giới hạn độ dài;
- `status`: `all|active|inactive`;
- `sort`: enum/whitelist;
- `direction`: `asc|desc`;
- `per_page`: whitelist `25|50|100`;
- date range dùng format rõ và timezone cửa hàng;
- `withQueryString()` để link paginator giữ filter;
- chỉ select/with relation cần render;
- chạy `EXPLAIN`/benchmark trước khi thêm index database mới.

Search text phase đầu dùng prefix/contains có kiểm soát trên field cụ thể. Search tiếng Việt không dấu là P0 cho POS, Sản phẩm và Khách hàng.

Tái sử dụng phù hợp utility từ `old/frontend/src/utils/vietnameseSearch.ts` theo contract sau:

- chuyển `normalizeVietnamese`, `vietnameseIncludes` và `vietnameseEquals` sang utility chung của source mới, dự kiến `resources/js/lib/vietnamese-search.ts`;
- chuẩn hóa format/convention TypeScript của source mới và bổ sung case chuỗi rỗng, khoảng trắng, `đ/Đ`, Unicode composed/decomposed;
- POS catalog, customer combobox và các client-side selector dùng cùng utility, không tự viết lại `.toLowerCase()`/remove-diacritic ở từng feature;
- exact barcode/SKU lookup giữ normalizer riêng, không loại ký tự hoặc số `0` đầu;
- không sao chép nguyên trạng `highlightText()` trả HTML string. Nếu cần highlight, tạo React-safe segment/component, không dùng `dangerouslySetInnerHTML`;
- management list phía server không thể dùng trực tiếp utility TypeScript. MySQL collation/search strategy phải được benchmark và kiểm tra parity với SQLite; nếu collation không đáp ứng thì dùng normalized search column/index hoặc backend normalizer có cùng test vectors, không bọc hàm lên toàn bộ cột một cách làm mất index.

## 5. Kế hoạch theo từng màn hình

### 5.1. Sản phẩm — P0

Hiện tại:

- backend paginate 30 nhưng frontend chỉ render `products.data`;
- chưa search/filter/sort/page size;
- full edit nằm trong dialog lớn;
- chỉ có nút Sửa, chưa có status filter/deactivate UI;
- không render đầy đủ lỗi SKU và lỗi từng unit/barcode;
- không có deep link để POS mở đúng sản phẩm.

Thiết kế đích:

- toolbar: search tên/SKU/barcode, category, active status, stock state, lot/expiry, sort;
- summary nhẹ: tổng sản phẩm, active/inactive, hết tồn/tồn âm nếu query không quá nặng;
- table desktop: Sản phẩm, Danh mục, Đơn vị mặc định/giá, Tồn base, Giá vốn, Trạng thái, Thao tác;
- mobile: card/list có tên + SKU + giá + tồn + status; action trong menu;
- click row hoặc `Sửa đầy đủ` mở route có URL riêng, ưu tiên page/Sheet rộng thay dialog dài;
- form chia section `Thông tin chung`, `Ảnh & trạng thái`, `Đơn vị & Barcode`;
- lỗi indexed unit hiển thị ngay đúng row; focus field lỗi đầu tiên;
- ngừng sử dụng thay hard delete; giải thích ảnh hưởng tới POS nhưng không đổi lịch sử;
- sau create/update giữ filter hiện tại; nếu bản ghi không còn khớp filter thì báo rõ thay vì biến mất im lặng;
- hỗ trợ query `edit=<productId>` hoặc route edit riêng để mở từ POS.

Backend:

- search `products.name`, `products.sku`, barcode qua `whereHas` có scope;
- filter category/status/tracking và stock theo branch;
- sort whitelist name, sku, newest, stock, default sale price;
- paginator giữ query;
- trả `can.manageCatalog` cho UI action theo capability.

### 5.2. Danh mục — P0

Source hiện chưa có page/controller/route.

Thiết kế đích:

- menu `Danh mục` riêng;
- toolbar search tên/mã, status, parent/root filter;
- table paginated là view quản trị chính, hiển thị parent path và products count;
- tree view là view bổ trợ; không ép toàn bộ tree vào một paginator khó hiểu;
- create/edit bằng dialog ngắn hoặc Sheet: tên, mã, parent, màu, thứ tự, trạng thái;
- không cho chọn chính nó hoặc descendant làm parent;
- entity đã có product/child được ngừng sử dụng hoặc yêu cầu di chuyển rõ ràng, không hard-delete mơ hồ;
- category inactive không xuất hiện trong POS/add product mới nhưng vẫn hiện trên sản phẩm/hóa đơn lịch sử;
- filtered empty có nút reset; empty thật có nút tạo danh mục đầu tiên.

Khoảng trống schema cần xử lý nếu giữ yêu cầu tree trong docs:

- thêm `parent_id` nullable self-reference;
- cân nhắc `code` và `description` nếu legacy cần giữ;
- unique theo organization;
- validation chống cycle và orphan;
- quy tắc deactivate parent/children phải được chốt và test.

### 5.3. Đơn vị — P0

Source hiện chưa có page/controller/route.

Thiết kế đích:

- menu `Đơn vị` riêng;
- search theo tên/mã, status filter, sort tên/mã/số sản phẩm dùng;
- table: mã, tên, số product unit đang dùng, trạng thái, thao tác;
- create/edit dialog ngắn;
- conversion không nằm ở unit master; tiếp tục nằm ở product unit;
- unit đã được dùng không hard-delete; dùng deactivate và giải thích;
- không cho deactivate nếu đang là base/default sale mà chưa có phương án thay thế, hoặc cung cấp flow chuyển đổi có xác nhận;
- unit inactive vẫn render trong lịch sử/cấu hình cũ nhưng không cho thêm mới.

### 5.4. POS — menu chuột phải và sửa nhanh sản phẩm — P0

#### Interaction đích

Trên product card:

- click trái/Enter giữ nguyên hành vi thêm unit mặc định vào giỏ;
- chuột phải mở context action tại vị trí con trỏ;
- nút `…` nhìn thấy khi hover/focus và luôn có accessible name;
- `Shift+F10` hoặc phím Context Menu mở cùng action cho bàn phím;
- touch dùng nút `…`, không phụ thuộc long press vì long press dễ xung đột scroll;
- context action không chiếm hoặc làm mất vĩnh viễn focus ô scanner; đóng/hủy phải trả focus theo contract;
- không đặt interactive `span role=button` bên trong một `button`; tách card action và unit choices thành semantic buttons hợp lệ.

Menu đề xuất:

1. `Sửa nhanh tên & giá`;
2. `Sửa đầy đủ sản phẩm`;
3. `Sao chép SKU/barcode` nếu thật sự hữu ích;
4. `Ngừng bán` chỉ cho capability phù hợp và cần confirmation.

#### Quick edit Sheet

Quick edit chỉ chứa dữ liệu cần cho quầy:

- tên sản phẩm;
- danh mục;
- unit đang chọn hoặc default sale unit;
- giá bán unit;
- barcode chính của unit nếu được duyệt phạm vi;
- lý do thay đổi khi giá thay đổi;
- timestamp/version để phát hiện dữ liệu stale.

Không đưa conversion, base unit, ảnh, lot/expiry hoặc toàn bộ variants vào quick edit. Các field này đi qua `Sửa đầy đủ` để giảm rủi ro.

#### Request và consistency

- tạo endpoint/request riêng cho quick update; không gửi giả toàn bộ payload của `products.update`;
- validate product và product unit cùng organization/product;
- mutation chạy transaction;
- capability mặc định đề xuất: chỉ owner/manager hoặc `catalog.manage`;
- owner PIN dùng cho override giá trong một sale không mặc nhiên cấp quyền sửa giá master;
- ghi audit before/after, actor, reason, source=`pos_quick_edit`;
- nếu `updated_at/version` đã đổi, trả conflict và cho người dùng tải dữ liệu mới;
- success dùng Inertia partial reload `catalog` và `categories`, sau đó `useConnectivity` ghi catalog mới vào IndexedDB;
- giữ cart line hiện có như snapshot draft tại thời điểm add; không âm thầm đổi giá dòng đã nằm trong giỏ. Hiển thị cảnh báo `Giá catalog đã đổi; dòng trong giỏ giữ giá cũ` hoặc yêu cầu người dùng chủ động áp dụng giá mới;
- offline disable quick edit với message `Cần kết nối mạng để sửa dữ liệu sản phẩm`;
- nếu mutation thành công nhưng refresh catalog lỗi, hiển thị retry; không báo sai rằng local catalog đã cập nhật.

#### Tìm kiếm POS cần giữ

- tiếp tục local index và batch rendering đã triển khai;
- không thêm management pagination vào card catalog;
- xử lý barcode trùng thay vì map âm thầm match đầu tiên;
- dùng utility tìm kiếm tiếng Việt chung cho tên sản phẩm; barcode exact tiếp tục dùng normalizer riêng;
- sau quick edit, rebuild search index một lần theo catalog mới;
- benchmark lại input-to-paint, scan-to-cart và số card render.

### 5.5. Hóa đơn — P0

Hiện backend paginate 50 nhưng UI không có filter/paginator, trái với yêu cầu SAL-02.

Thiết kế đích:

- search mã hóa đơn, tên/mã/phone khách;
- filter khoảng ngày, payment state, source online/offline sync, có nợ/đã thanh toán, trạng thái hoàn trả;
- sort mới nhất/cũ nhất/tổng tiền;
- summary phải phản ánh phạm vi filter hoặc ghi rõ là tổng ngày/toàn bộ;
- paginator giữ filter khi mở detail rồi back;
- desktop ưu tiên detail drawer nếu không làm hỏng URL/print; mobile dùng page/full-screen Sheet;
- row có action xem, in lại, trả hàng theo quyền;
- no-result chỉ reset filter, không gợi ý tạo hóa đơn thủ công.

### 5.6. Khách hàng & công nợ — P0/P1

Hiện backend paginate 50, UI chỉ trang đầu; chỉ có create và thu nợ, chưa sửa khách.

Thiết kế đích:

- search mã/tên/phone;
- filter active/inactive, có nợ/không nợ, khoảng dư nợ;
- sort tên, nợ cao nhất, mới nhất;
- table/card có tổng nợ và action xem lịch sử, sửa, thu nợ;
- thu nợ disabled phải có tooltip giải thích thiếu active shift;
- customer selector trong POS đổi từ `<select>` toàn bộ sang searchable combobox theo mã/tên/phone;
- phase đầu cache toàn bộ active customer theo DTO tối thiểu `id/code/name/phone/balance` để offline vẫn chọn được khách ghi nợ; chỉ chuyển sang recent/paged cache nếu benchmark volume thật chứng minh cần;
- customer phone optional tiếp tục được giữ.

### 5.7. Tồn kho & hạn dùng — P0/P1

Hiện balance paginate 50 không có controls; `expiringLots` lấy toàn bộ không giới hạn.

Thiết kế đích:

- search SKU/tên/barcode;
- filter âm/hết/còn/thấp, category, track lot/expiry;
- sort quantity/name/updated;
- paginator cho balance;
- cảnh báo lô thành tab/panel riêng có search/filter expiry range và pagination/lazy loading;
- row action: xem movement, nhập bù, điều chỉnh theo capability;
- responsive giữ quantity/status dễ đọc, table cuộn ngang có chủ đích;
- summary số tồn âm/hết/cận hạn có định nghĩa và liên kết vào filter tương ứng.

### 5.8. Phiếu nhập kho — P1

Hiện history paginate 30 nhưng không có paginator/search. Product unit selector tải toàn bộ và sẽ khó dùng khi catalog lớn.

Thiết kế đích:

- history search mã phiếu/nhà cung cấp, filter nguồn/date, sort;
- paginator giữ trạng thái form nhập đang mở hợp lý;
- product row dùng combobox search barcode/SKU/tên/unit, hỗ trợ scanner;
- không render hàng nghìn option trong mỗi row;
- import preview hiển thị dòng lỗi cụ thể, summary và khả năng sửa/tải report;
- tách history và form bằng tabs/route nếu một page trở nên quá dài;
- phase sau chuyển parsing file lớn sang backend preview/queue như docs đã nêu.

### 5.9. Ca/két — P1

Hiện backend paginate 30 nhưng không có paginator/filter và ShiftTable thiếu empty state rõ.

Thiết kế đích:

- search mã ca/quầy;
- filter open/closed, register, date range, có chênh lệch;
- sort mở gần nhất/chênh lệch lớn;
- paginator;
- action chỉ xuất hiện theo trạng thái/capability;
- disabled action có lý do;
- thêm empty/no-result state;
- dialog đóng ca/thu chi giữ focus và lỗi field rõ.

### 5.10. Dashboard và Import legacy

- `recentSales` trên Dashboard là collection giới hạn có chủ đích, không cần paginator; thêm link `Xem tất cả` sang Hóa đơn có filter ngày hôm nay.
- Dashboard card phải là link tới list đã áp filter tương ứng khi có ý nghĩa.
- Import legacy là workflow, không ép generic pagination vào preview nhỏ. Nếu batch history được thêm sau này thì dùng management pattern chung.

## 6. Responsive, accessibility và visual consistency

### Management page

- page padding chuẩn `p-4 md:p-5 lg:p-6`;
- toolbar wrap theo hàng; mobile search full width, filter trong Sheet nếu quá nhiều;
- table dùng `overflow-x-auto`, sticky action chỉ khi không che dữ liệu;
- cột phụ có thể ẩn trên mobile, nhưng tên/trạng thái/action chính luôn còn;
- touch target action chính tối thiểu 44 px;
- sort button có `aria-sort`;
- icon-only action có accessible label/tooltip;
- focus visible và trả về row/action trigger sau khi đóng dialog/sheet;
- dùng semantic token thay hard-code `bg-white`, `text-slate-*`, `blue-*` khi refactor từng feature để light/dark không lệch.

### Collection states bắt buộc

Mỗi collection phải có:

1. initial loading/skeleton;
2. background filtering state không làm table nhảy;
3. empty collection có primary action phù hợp;
4. no-result có `Xóa bộ lọc`;
5. server error có retry;
6. permission/read-only state;
7. processing/disabled state;
8. success feedback;
9. stale/offline state nếu collection có cache.

## 7. Phân quyền và audit

Plan UX phụ thuộc việc thay role check cứng bằng capability như tài liệu kiến trúc đã yêu cầu.

Capability đề xuất:

- `catalog.view`, `catalog.manage`;
- `categories.manage`, `units.manage` nếu cần tách;
- `inventory.view`, `inventory.adjust`, `stock.receive`;
- `customers.view`, `customers.manage`, `debt.collect`;
- `sales.view`, `sales.return`, `sales.reprint`;
- `shifts.view`, `shifts.manage`.

Server là nguồn quyết định. UI chỉ dùng capability để ẩn/disable action và giải thích, không thay authorization server.

Audit bắt buộc cho:

- thay tên/SKU/barcode/giá/status product;
- thay conversion/base/default unit;
- deactivate category/unit;
- inventory adjustment;
- return/refund/debt/cash movement.

## 8. Lộ trình triển khai

### Phase 0 — Baseline và đóng gói contract đã chốt

- cụ thể hóa category tree gồm `parent_id`, cycle/orphan rule và deactivate behavior;
- cụ thể hóa capability `catalog.manage` và quick-edit payload chỉ gồm tên, danh mục, giá unit;
- tạo nguồn cấu hình page size chung: mặc định `25`, options `25/50/100`;
- đo data volume thật theo từng bảng;
- ghi baseline request time/payload/DOM/mobile screenshots;
- port utility tìm kiếm tiếng Việt phù hợp từ source cũ và xác định MySQL collation/backend search contract;
- lập capability matrix tối thiểu.

Exit criteria:

- contract schema/permission/search/pagination đã được ghi thành acceptance criteria có thể test;
- có test data đủ nhiều để thấy pagination/search thực sự hoạt động.

### Phase 1 — Shared list foundation

1. page-size config chung, `Paginated<T>` và typed filter contracts;
2. hoàn thiện các shared component trong mục 4.2: `PageHeader`, `SearchField`, `FilterBar`, `Pagination`, `CollectionState`, `FormErrorSummary`, `FlashMessages` và `RowActions`;
3. tích hợp global flash success/error vào app shell;
4. query convention backend và whitelist page size/sort;
5. áp dụng thử cho Sản phẩm và Hóa đơn;
6. sửa responsive table foundation và focus behavior.

Exit criteria:

- back/forward/share URL giữ đúng state;
- page links hoạt động và giữ filter;
- không có full-page reload;
- success/error hiển thị nhất quán.

### Phase 2 — Sản phẩm và POS quick edit

1. hoàn thiện search/filter/pagination Sản phẩm;
2. refactor product edit thành section/page hoặc Sheet phù hợp;
3. thêm endpoint quick update có authorization/audit/conflict detection;
4. thêm context action + visible menu + keyboard/touch equivalent;
5. refresh Inertia catalog và IndexedDB sau mutation;
6. xử lý cart-price consistency;
7. UAT barcode/focus/offline/owner permission.

Exit criteria:

- owner/manager sửa tên và giá từ POS không rời luồng bán;
- cashier không quyền không thể gọi endpoint;
- offline không sửa master data;
- hóa đơn lịch sử không đổi;
- scanner focus và cart không regression.

### Phase 3 — Danh mục và Đơn vị

1. hoàn thiện schema category cha-con theo quyết định đã chốt;
2. controllers/requests/policies/routes;
3. pages/features CRUD + search/filter/pagination;
4. deactivate guard và usage counts;
5. navigation/capability visibility;
6. UAT product form/POS filter sau thay đổi master data.

Exit criteria:

- đạt CAT-02/CAT-03 trong migration matrix;
- không cycle/orphan category;
- không hard-delete entity đã tham chiếu;
- inactive data không làm hỏng lịch sử.

### Phase 4 — Các collection vận hành còn lại

Triển khai theo thứ tự rủi ro/nghiệp vụ:

1. Hóa đơn;
2. Khách hàng & công nợ;
3. Tồn kho/cận hạn;
4. Phiếu nhập;
5. Ca/két.

Mỗi màn dùng cùng foundation nhưng filter/empty/action vẫn thuộc feature.

### Phase 5 — Large-data UX và hardening

- searchable customer selector POS;
- searchable product-unit selector nhập kho;
- backend import preview/queue cho file lớn;
- query/index benchmark trên MySQL staging;
- responsive/device/browser UAT;
- accessibility keyboard/screen reader smoke;
- đo lại Web Vitals/request/payload;
- chỉ cân nhắc virtualization/TanStack khi số liệu chứng minh cần.

## 9. Ticket backlog đề xuất

| Ticket | Hạng mục | Ưu tiên | Phụ thuộc |
| --- | --- | --- | --- |
| UX-001 | Audit data volume, query baseline và thiết bị | P0 | — |
| UX-002 | Shared page-size config + `Paginated<T>` + `Pagination` | P0 | UX-001 |
| UX-003 | Search/filter URL contract + Vietnamese search common + backend whitelist | P0 | UX-001 |
| UX-004 | Global flash + collection states | P0 | — |
| UX-005 | Products search/filter/pagination/responsive | P0 | UX-002–004 |
| UX-006 | Product edit UX và validation từng unit | P0 | UX-005 |
| UX-007 | POS context action accessible | P0 | UX-006 |
| UX-008 | POS quick-update endpoint/auth/audit | P0 | capability `catalog.manage` |
| UX-009 | Catalog refresh/cache/cart consistency | P0 | UX-007–008 |
| UX-010 | Category schema cha-con + CRUD/list/tree UX | P0 | UX-003 |
| UX-011 | Unit CRUD/list/deactivate UX | P0 | UX-003–004 |
| UX-012 | Sales search/filter/pagination | P0 | UX-002–004 |
| UX-013 | Customers search/filter/pagination/edit | P0 | UX-002–004 |
| UX-014 | Inventory search/filter/pagination | P1 | UX-002–004 |
| UX-015 | Stock receipt history + product selector | P1 | UX-002–004 |
| UX-016 | Shifts search/filter/pagination | P1 | UX-002–004 |
| UX-017 | POS customer searchable selector/offline fallback | P1 | lightweight customer cache |
| UX-018 | Cross-page responsive/accessibility pass | P0 | UX-005–016 |
| UX-019 | MySQL performance benchmark và index tuning | P0 | query implementation |
| UX-020 | UAT quầy/scanner/tablet/mobile | P0 | UX-009, UX-018 |

Không gom tất cả ticket vào một branch lớn. Mỗi vertical slice gồm query + page + states + test để có thể review/rollback độc lập.

## 10. Kiểm thử và quality gates

### Backend feature test

Mỗi list cần test:

- scope organization/branch;
- search theo từng field được công bố;
- kết hợp filter;
- sort whitelist và reject/fallback input lạ;
- page size whitelist;
- query string còn trong paginator link;
- page rỗng/out-of-range;
- unauthorized action.

Quick edit cần test:

- owner/manager/capability hợp lệ;
- cashier bị 403;
- cross-organization/product-unit bị từ chối;
- name/price validation;
- transaction và audit;
- stale version conflict;
- sale snapshot không đổi;
- catalog response/cache contract.

Category/unit cần test cycle, usage guard, deactivate và inactive visibility.

### Frontend guardrail

```bash
npm run format:check
npm run lint:check
npm run typecheck
npm run build
```

Không thêm frontend test runner chỉ cho phase này nếu chưa được duyệt. Tuy nhiên server behavior mới phải có Pest feature test; manual UAT không thay thế test authorization/query.

### Manual UAT tối thiểu

1. tìm sản phẩm theo tên/SKU/barcode, đổi filter và đi qua nhiều trang;
2. refresh/back/forward vẫn giữ query;
3. tạo/sửa làm paginator và result count đúng;
4. dùng keyboard tab/Enter/Escape trên toolbar, table, dialog/sheet;
5. right-click, `Shift+F10`, nút `…` và touch đều mở đúng quick edit;
6. sửa giá catalog khi một unit đang nằm trong cart và xác nhận hành vi giá;
7. thử sửa online/offline và với user không quyền;
8. scan ngay sau khi đóng quick edit, focus trở lại ô search;
9. xem/reprint hóa đơn cũ sau khi đổi tên/giá;
10. test table tại desktop quầy, tablet ngang/dọc và mobile.

## 11. Chỉ số nghiệm thu

- management search chỉ gửi tối đa một request sau debounce cho một chuỗi gõ liên tục;
- filter/page đổi không full reload và không mất shell state;
- 100% list paginated hiển thị range, total và navigation;
- không có list chỉ nhận `data` rồi bỏ paginator metadata;
- search/filter state có thể copy URL và mở lại đúng kết quả;
- query list đạt ngưỡng được chốt sau baseline trên MySQL staging;
- POS exact barcode/search latency không regression so với plan catalog hiện tại;
- quick edit success đến catalog card cập nhật không cần reload trình duyệt;
- không có action chỉ dùng được bằng chuột phải;
- không có lỗi validation chỉ xuất hiện trong toast;
- không có table bị cắt action trên viewport hỗ trợ;
- không sửa được catalog khi offline hoặc thiếu capability;
- tất cả guardrail/test/UAT liên quan pass.

## 12. Rủi ro và rollback

| Rủi ro | Giảm thiểu | Rollback |
| --- | --- | --- |
| Search query chậm do `whereHas` barcode | benchmark, select field, index theo số liệu | tắt filter barcode riêng, giữ tên/SKU |
| Category tree làm phức tạp pagination | table paginated là view chính, tree là view phụ | rollout flat table trước khi bật tree |
| Quick edit làm stale catalog/offline cache | version + partial reload + cache write result | feature flag action, dùng `Sửa đầy đủ` |
| Giá catalog đổi khi item đã vào cart | policy rõ, không âm thầm rewrite cart | giữ snapshot cart và cảnh báo |
| Permission UI khác server | capability prop từ server + feature tests | ẩn quick action, endpoint vẫn khóa |
| Shared component quá generic | chỉ extract sau hai consumer | đưa component về feature |
| URL query gây request race | debounce + cancel/latest visit | search khi Enter như fallback |
| Mobile table khó đọc | responsive column priority/card fallback | horizontal scroll an toàn |

## 13. Các quyết định đã được chủ dự án xác nhận

Các quyết định dưới đây là nguồn thực thi cho Phase 0–3, không còn là câu hỏi mở:

1. **Danh mục giữ cấu trúc cha-con.** Management table được phân trang là view chính; tree là view bổ trợ. Schema và validation phải hỗ trợ parent, chống cycle/orphan và bảo toàn dữ liệu đã tham chiếu.
2. **Chỉ user có capability `catalog.manage` được sửa master product từ POS.** Không tái sử dụng owner PIN của price/discount override trong một sale để cấp quyền sửa dữ liệu catalog lâu dài.
3. **Quick edit phase đầu chỉ gồm tên, danh mục và giá của unit đang chọn.** Barcode, trạng thái, conversion, base/default unit, ảnh và lot/expiry đi qua flow sửa đầy đủ.
4. **Dòng đã có trong cart giữ giá cũ khi catalog thay đổi.** UI cảnh báo giá catalog đã đổi; sản phẩm được thêm sau thời điểm refresh sử dụng giá mới. Không âm thầm rewrite draft cart.
5. **Management pagination mặc định 25, cho phép 25/50/100.** Page size và các component pagination/search/filter/collection state được triển khai common theo mục 4, không lặp ở từng page.
6. **Tái sử dụng phù hợp search tiếng Việt từ source cũ.** Port `normalizeVietnamese`, `vietnameseIncludes`, `vietnameseEquals` vào utility chung của source mới; áp dụng P0 cho POS, Sản phẩm và Khách hàng. Barcode exact dùng normalizer riêng. Highlight nếu cần phải trả React node/segment an toàn thay vì HTML string.

Các chi tiết chưa ảnh hưởng việc bắt đầu Phase 0, như ngưỡng chuyển customer cache sang paged cache hoặc nhu cầu highlight text, được quyết định bằng benchmark và không thay đổi các contract trên.

## 14. Definition of Done cho mỗi vertical slice UX

- query/filter/sort/page có contract typed và nằm trên URL;
- server scope/authorize/validate đầy đủ;
- paginator metadata được render, không chỉ `data`;
- loading, empty, no-result, error, disabled, permission và success state đã xử lý;
- desktop/tablet/mobile behavior được kiểm tra;
- keyboard/focus/accessibility không regression;
- semantic token/design system được dùng trong phần code chạm tới;
- test backend và frontend guardrail pass;
- POS barcode/offline/receipt behavior được UAT nếu slice tác động POS;
- diff đủ nhỏ để review và rollback riêng;
- tài liệu trạng thái chỉ đánh dấu hoàn thành sau UAT, không chỉ sau khi code xong.

## 15. Trạng thái code sau đợt triển khai này

Đã triển khai:

- foundation phân trang/query URL: config page-size `25/50/100`, `Paginated<T>`, `SearchField`, paginator Inertia, collection state, flash global, debounce query và responsive table wrapper;
- tìm kiếm tiếng Việt không dấu cho POS, sản phẩm, khách hàng; server dùng normalized `search_text` có migration backfill/index, POS/customer/nhập kho dùng chung utility client;
- sản phẩm: search, category/status/sort, page-size, paginator, empty state và quick edit Sheet;
- POS: context menu chuột phải, nút menu touch, `ContextMenu`/`Shift+F10`, focus trả về scanner, quick update có capability bridge, optimistic conflict, transaction/audit và khóa khi offline;
- danh mục/đơn vị: migration parent-child, cycle validation, CRUD/list/pagination, usage/deactivate guards và navigation;
- hóa đơn, khách hàng, tồn kho, phiếu nhập và ca/két: search/filter/date (theo domain), query URL, paginator, responsive/empty state; selector nhập kho và customer POS có tìm kiếm;
- dashboard có link vào toàn bộ hóa đơn.

Quality gate đã chạy: migration, Pest catalog tests (4 test, 32 assertions), `npm run typecheck`, `npm run lint:check`, `npm run build`. Full Pest còn 3 test starter-kit cũ fail vì source đang tắt public registration và `/` redirect dashboard; không liên quan vertical UX này.

Trước cutover vẫn cần UAT trên MySQL/thiết bị thật, benchmark query/payload, accessibility smoke, import preview backend cho file lớn và quyết định có thay capability bridge bằng permission store riêng hay không.
