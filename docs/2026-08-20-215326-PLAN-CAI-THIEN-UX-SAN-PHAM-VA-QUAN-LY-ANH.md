# Kế hoạch cải thiện UX “Sản phẩm & đơn vị bán” và quản lý ảnh sản phẩm

## 1. Thông tin tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái | Draft để review |
| Ngày lập | 2026-08-20 |
| Phạm vi chính | Trang quản lý sản phẩm, đơn vị bán, vòng đời sản phẩm, ảnh upload và ảnh liên kết ngoài |
| Stack hiện tại | Laravel 12.65, Inertia.js 2.0, React 19, TypeScript, Tailwind CSS 4, shadcn/Radix, Pest 3 |
| Mức ưu tiên đề xuất | P1 cho lifecycle ảnh và hành động ngừng bán; P2 cho tái cấu trúc form và URL ảnh ngoài |
| Mục tiêu review | Chốt quyết định UX, data model, policy ảnh ngoài, phạm vi dependency và thứ tự triển khai trước khi viết code |

Tài liệu này là kế hoạch triển khai, chưa phải đặc tả đã được duyệt. Các mục có nhãn **Cần chốt khi review** phải được xác nhận trước khi bắt đầu pha tương ứng.

---

## 2. Tóm tắt quyết định đề xuất

1. **Không thêm hard-delete cho từng sản phẩm.** Dùng hành động nhanh **Ngừng bán/Bán lại**. Dữ liệu giao dịch, tồn kho và lịch sử nhập hàng phải được giữ nguyên.
2. **Giữ upload ảnh làm nguồn mặc định**, nhưng chuẩn hóa resize/nén, xóa file cũ sau khi thay ảnh và cung cấp thao tác gỡ ảnh.
3. **Hỗ trợ URL ảnh trực tiếp như nguồn tùy chọn**, không hỗ trợ URL trang sản phẩm và không scrape website trong phạm vi này.
4. Lưu riêng `image_path` cho ảnh do hệ thống quản lý và `external_image_url` cho ảnh liên kết ngoài. Frontend chỉ sử dụng contract thống nhất `image_url` và `image_source`.
5. Tách workflow thêm/sửa sản phẩm dài ra khỏi dialog sang Inertia page riêng; trang danh sách chỉ làm nhiệm vụ tìm kiếm, lọc, sắp xếp và điều hướng.
6. Hành động cập nhật trạng thái và mọi mutation thay đổi catalog phải tăng catalog resource version để POS nhận dữ liệu mới.
7. Không thêm frontend test runner hoặc state library mới. Dùng Pest feature tests, TypeScript/lint/build và manual UAT.
8. Không thêm thư viện xử lý ảnh trong scope mặc định. Dùng GD hiện có qua một service cô lập; deployment phải kiểm tra GD/WebP trước khi bật chức năng tối ưu ảnh.

---

## 3. Bối cảnh và hiện trạng

### 3.1. Trang danh sách

Trang `resources/js/pages/products/index.tsx` hiện có:

- tìm theo tên, SKU hoặc barcode;
- lọc theo danh mục và trạng thái;
- sắp xếp và phân trang phía server;
- hiển thị quy cách bán, tồn đơn vị gốc, giá vốn và trạng thái;
- phân quyền theo `canManageCatalog`;
- mở dialog để thêm/sửa toàn bộ sản phẩm và đơn vị bán.

Các hạn chế hiện tại:

- header tự xây lại thay vì dùng `PageHeader`, chưa tối ưu khi màn hình hẹp;
- filter và sort nằm ở hai card riêng, trong khi sort card chỉ có một control;
- trang bọc card bên ngoài và `ProductTable` tự bọc card lần nữa;
- bảng không hiển thị thumbnail, dù POS có sử dụng ảnh;
- action mỗi dòng mới chỉ có “Sửa”;
- nhãn “Tên A-Z” không đảm bảo khớp `direction`, do backend mặc định `desc` và UI chưa có control chiều sắp xếp;
- chưa có loading/background-processing state rõ cho mutation theo dòng;
- chưa có confirmation flow cho ngừng bán/bán lại.

### 3.2. Form sản phẩm

`ProductFormDialog` đang chứa đồng thời:

- thông tin cơ bản;
- file ảnh;
- cấu hình theo dõi lô/HSD;
- danh sách đơn vị bán động;
- barcode, hệ số, giá, đơn vị gốc, đơn vị bán mặc định và bán lẻ.

Đây là workflow dài, có thể tăng chiều cao đáng kể khi có nhiều đơn vị bán. Các hạn chế:

- dialog phải cuộn toàn bộ nội dung;
- action lưu không sticky;
- không có URL riêng để reload, bookmark hoặc mở ở tab khác;
- không preview file mới;
- không hiển thị ảnh hiện tại khi sửa;
- không có “Gỡ ảnh”;
- không phân biệt rõ “giữ ảnh cũ”, “thay bằng upload”, “thay bằng URL” và “xóa ảnh”;
- lỗi `sku`, `image`, `category_id` và lỗi từng dòng như `units.0.barcode` chưa được hiển thị đầy đủ cạnh control;
- một số label chưa liên kết `htmlFor`/`id`;
- dùng màu hard-code như `bg-white`, `text-red-600`, `text-blue-700` thay vì semantic token;
- cấu trúc row đơn vị rất rộng, chủ yếu dựa vào horizontal compression ở breakpoint trung bình.

### 3.3. Lưu ảnh hiện tại

Luồng hiện tại:

```text
Chọn File
  → Inertia forceFormData
  → StoreProductRequest kiểm tra image tối đa 4 MB
  → ProductController lưu vào disk public, thư mục products/
  → products.image_path lưu đường dẫn tương đối
  → POS tự ghép /storage/{image_path}
```

Vấn đề:

- ảnh gốc không được resize/nén;
- file tối đa 4 MB có thể được phục vụ chỉ để render thumbnail nhỏ;
- thay ảnh tạo file mới nhưng không xóa file cũ;
- không có cleanup ảnh mồ côi;
- frontend tự biết cấu trúc `/storage`, nên khó chuyển sang S3/CDN;
- legacy import cũng ghi trực tiếp vào `image_path`;
- chưa có fallback rõ khi ảnh hỏng hoặc không tải được;
- chưa có source badge để người quản trị biết ảnh do hệ thống quản lý hay hotlink bên ngoài.

### 3.4. Quan hệ dữ liệu và lý do không hard-delete

`products` liên kết đến variant, đơn vị bán, barcode, tồn kho, biến động kho, nhập hàng và đơn hàng.

Hiện có các policy foreign key khác nhau:

- product → product variant: cascade;
- variant → inventory lots/balances/movements: cascade;
- sale item → variant/unit: null khi xóa, nhưng giữ snapshot tên/SKU/giá;
- stock receipt item → variant/unit: restrict khi xóa.

Vì vậy hard-delete có thể:

- bị database từ chối nếu đã có nhập kho;
- hoặc xóa cascade lịch sử tồn kho trong một số trường hợp;
- tạo hành vi không đồng nhất tùy dữ liệu sản phẩm;
- làm khó audit và đối soát.

`is_active` đã tồn tại và POS chỉ lấy sản phẩm active. Đây là cơ chế lifecycle phù hợp hơn.

---

## 4. Mục tiêu

### 4.1. Mục tiêu nghiệp vụ

- Người quản lý thêm/sửa sản phẩm và đơn vị bán ít sai sót hơn.
- Người quản lý biết ảnh hiện tại đến từ đâu, xem được preview và chủ động thay/gỡ ảnh.
- Cho phép dùng ảnh từ CDN/nhà cung cấp khi chỉ cần URL trực tiếp.
- Giảm dung lượng lưu và bandwidth của ảnh upload.
- Không làm mất lịch sử tồn kho, nhập hàng hoặc bán hàng khi ngừng bán sản phẩm.
- POS nhận trạng thái và ảnh mới sau mutation thông qua cơ chế catalog freshness hiện tại.

### 4.2. Mục tiêu kỹ thuật

- Có một contract ảnh thống nhất cho mọi frontend consumer.
- Tách side effect file khỏi controller và quản lý đúng khi transaction thất bại.
- Không để file cũ trở thành orphan sau flow thay/gỡ ảnh bình thường.
- Validation server là authoritative; frontend validation chỉ hỗ trợ UX.
- Giữ Inertia page mỏng và business component trong `features/products`.
- Các thay đổi có thể rollout và rollback theo từng pha.

### 4.3. Chỉ số thành công đề xuất

- 100% ảnh upload mới được chuẩn hóa kích thước và định dạng mục tiêu.
- Không còn tạo orphan file trong các flow create/update/remove thông thường.
- Mọi field backend trả lỗi đều có vị trí hiển thị trong form hoặc error summary.
- Ngừng bán/bán lại cập nhật catalog version và snapshot POS đúng.
- Không có route hard-delete sản phẩm trong UI quản trị.
- Frontend không còn tự ghép `/storage/${image_path}`.
- TypeScript, format, lint, build và các Pest tests liên quan đều pass.

---

## 5. Ngoài phạm vi

- Không scrape ảnh từ URL trang sản phẩm.
- Không xây crawler, Open Graph parser hoặc đồng bộ ảnh từ marketplace.
- Không tải ảnh URL ngoài về server tự động trong MVP.
- Không xây Digital Asset Management hoặc thư viện media dùng chung toàn hệ thống.
- Không thêm bulk delete sản phẩm.
- Không thay đổi cách tính tồn kho, giá vốn hoặc lịch sử hóa đơn.
- Không cache ảnh vào Service Worker trong scope này.
- Không thêm Redux/Zustand, React Hook Form, Zod, TanStack Table hoặc frontend test runner.
- Không chuyển toàn bộ public storage sang S3 trong cùng ticket; chỉ chuẩn bị contract để việc đó khả thi sau này.
- Không xóa migration cũ hoặc sửa migration đã chạy; mọi schema change dùng migration mới.

---

## 6. Các quyết định cần chốt khi review

### D1. Lifecycle sản phẩm

**Đề xuất:** không hard-delete; dùng `is_active` với hai action “Ngừng bán” và “Bán lại”.

Khi ngừng bán:

- sản phẩm biến mất khỏi catalog POS sau refresh;
- không xóa tồn kho, lô, movement, receipt hoặc sale item;
- vẫn xuất hiện khi lọc “Ngừng bán” trong trang quản lý;
- vẫn có thể chỉnh sửa và kích hoạt lại.

### D2. Vị trí form thêm/sửa

**Đề xuất:** chuyển full form sang page riêng:

- `GET /products/create`;
- `GET /products/{product}/edit`.

Lý do:

- workflow dài và có danh sách đơn vị động;
- URL riêng hỗ trợ reload, back, mở tab mới;
- dễ chia section, sticky footer và responsive;
- tránh dialog cuộn cao 90vh.

Phương án ít thay đổi hơn là giữ dialog và cải thiện preview/error/sticky footer. Phương án này nhanh hơn nhưng không giải quyết triệt để khả năng mở rộng form.

### D3. Data model ảnh

**Đề xuất:** giữ `image_path`, thêm `external_image_url`; source được suy ra:

```text
image_path != null          → upload
external_image_url != null  → external
cả hai null                 → none
```

Invariant bắt buộc: không được đồng thời có cả `image_path` và `external_image_url`.

Không lưu thêm `image_source` trong database để tránh state trùng lặp. Backend trả computed field `image_source` cho frontend.

### D4. Chính sách URL ảnh ngoài

**Đề xuất mặc định:**

- chỉ URL ảnh trực tiếp;
- chỉ HTTPS;
- tối đa 2048 ký tự;
- chặn `localhost`, hostname `.local`, IP literal, private/link-local address;
- không dùng `active_url` làm yêu cầu bắt buộc vì việc lưu URL không nên phụ thuộc DNS tại thời điểm submit;
- hỗ trợ allowlist hostname qua config; allowlist rỗng nghĩa là cho phép public HTTPS nhưng hiển thị cảnh báo về hotlink.

**Cần chốt:** production có bắt buộc allowlist hay không.

### D5. Tối ưu ảnh upload

**Đề xuất mặc định:** dùng GD đã có trong môi trường, đóng gói trong service riêng:

- input: JPEG, PNG hoặc WebP;
- giới hạn file: 4 MB;
- giới hạn kích thước nguồn: tối đa 6000 × 6000 px;
- không upscale;
- fit trong 640 × 640 px;
- output: WebP, quality 82;
- giữ transparency khi nguồn hỗ trợ;
- tên file ngẫu nhiên, không dùng tên client;
- path có organization để dễ quản lý tenant.

Path đề xuất:

```text
products/{organization_id}/{YYYY}/{MM}/{uuid}.webp
```

Deployment phải fail preflight nếu không có `gd` hoặc `imagewebp`; không âm thầm lưu ảnh gốc không tối ưu.

### D6. Ảnh ngoài có được tải về server không?

**Đề xuất MVP:** không. Trình duyệt tải trực tiếp từ URL ngoài.

Hệ quả được chấp nhận:

- ảnh có thể hỏng, hết hạn hoặc bị chặn hotlink;
- ảnh ngoài không đáng tin cậy khi POS offline;
- cần fallback icon;
- cần `referrerPolicy="no-referrer"` để giảm rò rỉ thông tin nguồn trang.

Nếu sau này cần độ tin cậy cao, tạo milestone riêng để tải/cache ảnh ngoài qua queue với SSRF protection, timeout, MIME/size limit và allowlist.

### D7. Cleanup ảnh orphan

**Đề xuất:** flow bình thường xóa file cũ sau commit. Ngoài ra có command bảo trì tùy chọn:

```text
php artisan products:prune-orphan-images --dry-run
php artisan products:prune-orphan-images --older-than=7
```

Command phải dry-run trước, chỉ đụng prefix `products/`, không xóa file mới hơn grace period và phải tính cả legacy images đang được tham chiếu.

### D8. Optimistic concurrency cho status

**Đề xuất:** request ngừng bán/bán lại gửi `updated_at`. Nếu sản phẩm đã được sửa nơi khác, server trả 409 và yêu cầu tải lại trước khi đổi trạng thái.

### D9. Ảnh hiện tại trong trang danh sách

**Đề xuất:** thêm thumbnail 40–48 px cạnh tên sản phẩm, fallback icon khi thiếu/hỏng, và badge nhỏ “Liên kết ngoài” chỉ khi cần phân biệt source.

### D10. Hard-delete trong tương lai

**Đề xuất:** không thiết kế route/UI hard-delete trong milestone này. Nếu cần purge dữ liệu test hoặc sản phẩm tạo nhầm chưa từng phát sinh nghiệp vụ, lập ticket riêng với điều kiện server-side nghiêm ngặt.

---

## 7. UX mục tiêu

### 7.1. Trang danh sách sản phẩm

Cấu trúc mục tiêu:

```text
ProductsIndexPage
├── PageHeader
│   ├── Title + description
│   └── “Thêm sản phẩm”
├── FilterBar
│   ├── SearchField
│   ├── Category select
│   ├── Status select
│   ├── Sort select
│   └── Direction control hoặc sort option đã gắn direction
├── ProductTable
│   ├── Thumbnail + name + SKU
│   ├── Category
│   ├── Selling units
│   ├── Stock
│   ├── Last cost
│   ├── Status
│   └── RowActions
├── CollectionState
└── Pagination
```

Chi tiết:

- dùng `PageHeader`, `FilterBar`, `CollectionState`, `Pagination`, `RowActions` hiện có;
- một vùng chỉ có một primary action: “Thêm sản phẩm”;
- gộp sort vào filter bar;
- bỏ card wrapper lồng nhau;
- “Sửa” là action dễ thấy;
- action secondary nằm trong dropdown: “Ngừng bán” hoặc “Bán lại”;
- không hiển thị destructive “Xóa”;
- khi status mutation đang chạy, disable action của đúng row;
- khi lỗi 409, hiển thị message yêu cầu refresh;
- giữ server-side search/filter/pagination;
- `preserveState` và `preserveScroll` khi đổi trạng thái nếu không làm dữ liệu khó hiểu;
- khi sản phẩm biến mất khỏi filter hiện tại sau mutation, pagination phải được server trả lại hợp lệ.

### Sort contract

Không để label và direction lệch nhau. Có thể chọn một trong hai cách:

1. Giữ `sort` + `direction`, khi chọn “Tên A-Z” đặt đồng thời `sort=name&direction=asc`.
2. Dùng UI value kết hợp:

```text
latest_desc
name_asc
name_desc
sku_asc
sku_desc
```

Backend vẫn nhận hai query param hiện tại để giảm thay đổi. Phương án 2 dễ hiểu hơn cho người dùng và tránh một button direction riêng.

### Responsive

- header xếp dọc ở mobile, action xuống hàng;
- filter bar xếp dọc ở mobile, wrap ở desktop;
- table được phép scroll ngang có chủ đích;
- cột action sticky bên phải chỉ cân nhắc nếu không gây lỗi shadow/overflow;
- không ẩn tên, trạng thái hoặc action chính;
- thumbnail giữ kích thước cố định để tránh layout shift.

### 7.2. Trang thêm/sửa sản phẩm

Cấu trúc mục tiêu:

```text
ProductCreatePage / ProductEditPage
├── PageHeader
│   ├── Title + SKU context
│   └── Back to list
├── FormErrorSummary
├── ProductForm
│   ├── Section: Thông tin cơ bản
│   ├── Section: Ảnh sản phẩm
│   ├── Section: Theo dõi kho
│   ├── Section: Quy cách / đơn vị bán
│   └── Sticky action footer
```

### Section “Thông tin cơ bản”

- Tên sản phẩm: required, autofocus khi tạo mới.
- SKU: required.
- Danh mục: optional.
- Mỗi field có `Label htmlFor`, description nếu cần và error ngay dưới control.

### Section “Ảnh sản phẩm”

UI source selector:

```text
[ Tải ảnh lên ] [ Dùng URL ảnh ] [ Không dùng ảnh ]
```

Khi sửa và chưa thao tác, trạng thái nội bộ là `keep`.

#### Upload mode

- drop zone hoặc file input rõ ràng;
- accept JPEG/PNG/WebP;
- mô tả “Tối đa 4 MB, hệ thống tự tối ưu”;
- preview ảnh bằng object URL;
- revoke object URL khi thay file/unmount;
- hiển thị tên và dung lượng file;
- nút “Chọn ảnh khác” và “Gỡ ảnh”;
- error `image` nằm ngay dưới field.

#### External mode

- input URL;
- helper text: “Dùng URL ảnh trực tiếp bắt đầu bằng https://, không phải link trang sản phẩm”;
- preview sau debounce hoặc khi blur;
- nếu `<img>` lỗi, hiển thị fallback và cảnh báo không thể tải preview;
- không tự coi preview thành validation server;
- badge “Ảnh liên kết ngoài”;
- error `external_image_url` nằm ngay dưới input.

#### None/remove mode

- hiển thị placeholder sản phẩm;
- khi sửa ảnh hiện có, yêu cầu xác nhận nhẹ “Ảnh sẽ bị gỡ khi bấm Cập nhật”; không cần dialog thứ hai nếu hành vi còn có thể hủy trước submit.

### Section “Theo dõi kho”

- dùng Checkbox primitive hiện có;
- “Theo dõi lô” và “Theo dõi hạn sử dụng” có description ngắn;
- xác định dependency: nếu theo dõi HSD bắt buộc theo dõi lô theo nghiệp vụ thì thêm validation; nếu hiện tại không bắt buộc thì không tự thay đổi trong ticket này.

### Section “Quy cách / đơn vị bán”

- mỗi row có id ổn định, không dùng array index làm key cho row đã tồn tại;
- layout desktop dạng grid/table;
- layout mobile xếp field theo nhóm;
- radio đơn vị gốc và bán mặc định có fieldset/legend phù hợp;
- disable hệ số của đơn vị gốc và cố định bằng 1;
- không cho xóa row cuối;
- lỗi từng row map đúng:
  - `units.{index}.unit_id`;
  - `units.{index}.conversion_to_base`;
  - `units.{index}.sale_price`;
  - `units.{index}.barcode`;
  - `units.{index}.is_base`;
  - `units.{index}.is_default_sale`.
- khi xóa row đã tồn tại, frontend chỉ loại khỏi payload; backend tiếp tục deactivate như behavior hiện tại, không hard-delete product unit.

### Sticky action footer

- action chính: “Lưu sản phẩm” hoặc “Cập nhật sản phẩm”;
- action phụ: “Hủy”;
- processing state có text “Đang lưu…”;
- disable submit khi processing;
- footer không che row cuối;
- submit lỗi scroll/focus tới error đầu tiên hoặc error summary.

### 7.3. Flow ngừng bán

```text
Row action “Ngừng bán”
  → Confirmation dialog
  → Giải thích: sản phẩm biến mất khỏi POS, dữ liệu kho/lịch sử vẫn giữ
  → Nếu tồn hiện tại > 0, hiển thị cảnh báo nhưng vẫn cho phép
  → PATCH status với is_active=false + updated_at
  → Server authorize + organization scope + concurrency check
  → Update product + bump catalog version after commit
  → Refresh danh sách hiện tại
```

Không dùng chữ “Xóa” trong flow này.

### 7.4. Flow bán lại

```text
Row action “Bán lại”
  → Confirmation dialog hoặc xác nhận trực tiếp tùy review
  → Server kiểm tra có active variant và active default-sale unit
  → PATCH status với is_active=true + updated_at
  → Bump catalog version
  → POS snapshot lại chứa sản phẩm
```

Nếu sản phẩm không còn quy cách bán hợp lệ, trả validation/conflict rõ ràng và hướng người dùng tới trang chỉnh sửa.

---

## 8. Data model và contract

### 8.1. Migration

Tạo migration mới bằng Artisan:

```text
add_external_image_url_to_products_table
```

Thay đổi:

```text
products.external_image_url  nullable text
```

Không sửa migration `create_catalog_tables` cũ.

Lý do dùng `text`:

- URL có thể dài hơn 255 ký tự;
- không cần index;
- validation application giới hạn 2048 ký tự.

Không cần backfill vì:

- record cũ có `image_path` tiếp tục được hiểu là source upload;
- record không có ảnh giữ cả hai field null.

Down migration chỉ drop `external_image_url`; rollback application phải được thực hiện trước rollback schema để tránh code đọc column không tồn tại.

### 8.2. Product invariant

Sau mọi create/update:

| Source | `image_path` | `external_image_url` |
|---|---:|---:|
| none | null | null |
| upload | non-null | null |
| external | null | non-null |

Không dựa duy nhất vào database constraint vì SQLite/MySQL portability và vì logic chuyển nguồn còn cần side effect xóa file. Invariant được enforce trong request/action và test.

### 8.3. Form request contract

Form gửi:

```ts
type ProductImageAction = 'keep' | 'remove' | 'upload' | 'external';

type ProductFormData = {
    name: string;
    sku: string;
    category_id: number | '';
    image_action: ProductImageAction;
    image: File | null;
    external_image_url: string;
    track_lot: boolean;
    track_expiry: boolean;
    is_active: boolean;
    units: UnitRow[];
};
```

Rules:

- create không chấp nhận `keep`; frontend mặc định `remove` nếu không có ảnh;
- update mặc định `keep`;
- `image` required khi `image_action=upload`, prohibited ở mode khác;
- `external_image_url` required khi `image_action=external`, prohibited ở mode khác;
- URL chỉ HTTPS và public host theo policy;
- `remove` đặt cả hai DB field thành null;
- `upload` đặt `external_image_url=null`;
- `external` đặt `image_path=null`;
- `keep` không thay đổi hai field.

Không suy luận action từ việc field file có mặt hay không, vì multipart update cần phân biệt rõ keep và remove.

### 8.4. Response contract

Frontend Product nhận:

```ts
type ProductImageSource = 'none' | 'upload' | 'external';

type ProductImage = {
    image_url: string | null;
    image_source: ProductImageSource;
};
```

`image_path` và `external_image_url` là chi tiết persistence; frontend không tự ghép URL.

Quy tắc resolve:

```text
external_image_url tồn tại → trả nguyên URL đã chuẩn hóa
image_path tồn tại         → Storage::disk(configuredDisk)->url(image_path)
không có                   → null
```

Contract này phải được dùng ở:

- products index;
- products edit page;
- POS initial props/snapshot;
- catalog fingerprint/selector;
- mọi component hiển thị ảnh sản phẩm.

### 8.5. Image state transition

| State cũ | Action | State mới | File cũ managed |
|---|---|---|---|
| none | keep | invalid khi create; no-op khi update | không có |
| none | remove | none | không có |
| none | upload | upload mới | không có |
| none | external | URL ngoài | không có |
| upload | keep | giữ upload | giữ |
| upload | remove | none | xóa sau commit |
| upload | upload | upload mới | xóa sau commit |
| upload | external | URL ngoài | xóa sau commit |
| external | keep | giữ URL | không xóa file |
| external | remove | none | không xóa file |
| external | upload | upload mới | không có file cũ managed |
| external | external | URL mới | không xóa file |

---

## 9. Thiết kế backend

### 9.1. Routes đề xuất

```text
GET    /products                     products.index
GET    /products/create              products.create
POST   /products                     products.store
GET    /products/{product}/edit      products.edit
PUT    /products/{product}           products.update
PATCH  /products/{product}/status    products.status.update
PATCH  /products/{product}/quick-update  products.quick-update
```

Không thêm `DELETE /products/{product}`.

Route create phải đặt trước route parameter nếu route ordering có thể gây ambiguity.

### 9.2. Authorization và tenant scope

- create/store/update/status tiếp tục yêu cầu `canManageCatalog()`;
- product route binding phải được kiểm tra `organization_id` như hiện tại hoặc chuyển sang policy/scoped binding nếu làm đồng nhất toàn feature;
- không được cho user organization A tham chiếu category/unit/product của organization B;
- `units.*.id` không chỉ validate tồn tại toàn cục: phải xác nhận product unit thuộc variant của product đang sửa;
- status update phải kiểm tra organization trước concurrency và mutation;
- cashier nhận 403.

### 9.3. Form Requests

### `StoreProductRequest`

Có thể tiếp tục dùng cho create/update để giảm diff, nhưng cần:

- thêm rules image action/URL;
- chuyển file rule sang fluent `File::image()` nếu phù hợp conventions;
- giới hạn extension/MIME JPEG, PNG, WebP;
- giới hạn byte và dimensions;
- thêm message tiếng Việt cho image action, MIME, size, dimensions, URL scheme và host;
- validate product-unit ownership khi update;
- giữ validation đúng một base unit và một default-sale unit;
- chuẩn hóa boolean như hiện tại.

Tên `StoreProductRequest` dùng cho update không hoàn toàn chính xác. Việc rename sang `SaveProductRequest` chỉ thực hiện nếu diff không làm review phức tạp; không bắt buộc trong milestone.

### `UpdateProductStatusRequest`

Fields:

```text
is_active  required boolean
updated_at required date
```

Sau validation:

- nếu activate, xác nhận sản phẩm có active variant;
- variant có ít nhất một active unit;
- có đúng một default-sale unit hợp lệ;
- nếu không hợp lệ trả 409 hoặc validation error có hướng xử lý.

### 9.4. Product image service

Tạo service cô lập, tên đề xuất:

```text
app/Services/ProductImageService.php
```

Trách nhiệm:

- kiểm tra capability GD/WebP;
- decode input an toàn;
- đọc kích thước;
- sửa orientation JPEG nếu EXIF extension khả dụng;
- resize giữ aspect ratio, không upscale;
- tạo canvas hỗ trợ transparency;
- encode WebP quality cấu hình;
- ghi file vào disk cấu hình với tên ngẫu nhiên;
- trả managed relative path;
- resolve public URL;
- xóa managed path an toàn;
- từ chối xóa path ngoài prefix `products/`;
- log delete failure với product id/path, không log dữ liệu nhạy cảm.

Service không:

- update Product model;
- bump resource version;
- gửi redirect/flash;
- tải external URL;
- biết JSX hoặc Inertia.

Config đề xuất:

```text
catalog.images.disk = public
catalog.images.directory = products
catalog.images.max_width = 640
catalog.images.max_height = 640
catalog.images.webp_quality = 82
catalog.images.external_hosts = []
catalog.images.orphan_grace_days = 7
```

Không đọc `env()` trực tiếp ngoài config.

### 9.5. Create/update actions

Controller hiện xử lý product, variant, unit, barcode và file trong cùng method. Đề xuất tách:

```text
app/Actions/Catalog/CreateProductAction.php
app/Actions/Catalog/UpdateProductAction.php
app/Actions/Catalog/UpdateProductStatusAction.php
```

Không cần tạo base action hoặc generic repository.

### Thuật toán create với upload

```text
1. Request validate và authorize.
2. Nếu action=upload, ProductImageService ghi file mới.
3. Bắt đầu DB transaction.
4. Tạo Product với đúng image fields.
5. Tạo default variant, units và barcodes.
6. Đăng ký bump catalog after commit.
7. Commit.
8. Nếu DB transaction fail, xóa file mới vừa ghi rồi rethrow.
9. Redirect với flash success.
```

### Thuật toán update với thay ảnh

```text
1. Snapshot old image_path và old external_image_url.
2. Nếu action=upload, ghi file mới trước transaction.
3. DB transaction cập nhật Product, variant, units, barcodes và image fields.
4. Đăng ký bump catalog after commit.
5. Commit.
6. Nếu transaction fail, xóa file mới rồi rethrow; giữ file cũ.
7. Sau commit, nếu old managed path không còn được tham chiếu, xóa file cũ.
8. Nếu xóa file cũ fail, log warning; không rollback dữ liệu đã commit.
```

Lý do không coi filesystem là một phần transaction: database rollback không thể tự rollback file đã ghi/xóa. Trình tự trên ưu tiên không mất ảnh cũ và chấp nhận orphan tạm thời an toàn hơn broken reference.

### 9.6. URL ảnh ngoài

Tạo validator/value object nhỏ chỉ khi logic đủ phức tạp, ví dụ:

```text
app/Rules/PublicHttpsImageUrl.php
```

Kiểm tra tối thiểu:

- parse URL thành công;
- scheme chính xác là `https`;
- có hostname;
- không có username/password trong URL;
- hostname không phải localhost hoặc local suffix;
- không dùng IP literal/private/link-local;
- hostname thuộc allowlist nếu config có allowlist;
- không cố fetch URL trong request validation.

Không thể xác minh chắc chắn nội dung là ảnh nếu không fetch. UI phải diễn đạt đây là “URL ảnh” và có fallback khi nguồn không hợp lệ/hết hạn.

### 9.7. Product image URL serialization

Ưu tiên một nơi resolve URL. Hai phương án:

1. Computed accessor trên Product, append `image_url` và `image_source`.
2. Mapper/resource cho view model.

**Đề xuất:** dùng accessor hoặc methods trên Product, nhưng chỉ append nếu không vô tình mở rộng payload ở mọi nơi. Nếu serialization hiện tại cần kiểm soát, map rõ trong `ProductController` và `PosDataService`.

Không để React tự biết disk hoặc `/storage` prefix.

### 9.8. POS catalog freshness

Các mutation phải bump `catalog`:

- create product;
- update product/units/image;
- ngừng bán;
- bán lại;
- quick update.

`PosDataService::catalog()` phải:

- tiếp tục chỉ trả product active;
- select đủ image fields;
- trả `image_url`, `image_source`;
- không trả raw private storage path nếu frontend không cần.

Catalog fingerprint phía frontend chuyển từ `image_path` sang `image_url`/`image_source`; `updated_at` vẫn là phần của fingerprint.

Khi ngừng bán:

- freshness version tăng;
- snapshot mới không chứa product;
- checkout online phải authoritative-check trước khi cho bán product stale;
- cart đã có item không được âm thầm đổi giá hoặc xóa mà không có message phù hợp.

### 9.9. Legacy import

`LegacyImportService::copyProductImage()` tiếp tục lưu managed image, nhưng nên đi qua contract/service chung hoặc tối thiểu giữ invariant:

- `image_path` có giá trị;
- `external_image_url=null`;
- URL resolve được qua cùng disk;
- không bị orphan cleanup xóa nếu còn tham chiếu;
- cân nhắc tối ưu ảnh legacy trong ticket riêng, không bắt buộc rewrite toàn bộ import trong milestone đầu.

### 9.10. Orphan cleanup command

Chỉ triển khai sau khi lifecycle chính đã ổn định.

Quy trình:

1. liệt kê tất cả file dưới configured `products/` prefix;
2. lấy tập `products.image_path` non-null;
3. loại mọi referenced path;
4. loại file mới hơn grace period;
5. mặc định in báo cáo dry-run;
6. chỉ xóa khi có flag xác nhận rõ;
7. log count/bytes, không log URL ngoài;
8. test path normalization để không đi ra ngoài prefix.

Không chạy tự động khi deploy lần đầu.

---

## 10. Thiết kế frontend

### 10.1. Cấu trúc file mục tiêu

```text
resources/js/pages/products/
├── index.tsx
├── create.tsx
└── edit.tsx

resources/js/features/products/
├── components/
│   ├── product-form.tsx
│   ├── product-image-field.tsx
│   ├── product-information-fields.tsx      # chỉ tách nếu component đủ rõ
│   ├── product-units-editor.tsx
│   ├── product-table.tsx
│   └── product-status-dialog.tsx
├── model/
│   ├── types.ts
│   ├── validation.ts
│   └── form-data.ts                        # chỉ tạo nếu create/edit dùng chung transform đáng kể
└── index.ts
```

Không bắt buộc tạo mọi file ngay. Chỉ tách khi có code thật và boundary rõ.

### Dependency direction

```text
pages/products
  → features/products
      → components/shared
          → components/ui
      → lib
```

Không để `components/ui` import type Product hoặc route sản phẩm.

### 10.2. Inertia pages

### `products/index.tsx`

Chỉ chịu trách nhiệm:

- nhận props;
- quản lý list query;
- compose PageHeader/FilterBar/ProductTable/Pagination;
- mở confirmation status dialog;
- gửi status mutation hoặc gọi feature hook nhỏ nếu state đủ phức tạp.

Không giữ state full product form.

### `products/create.tsx`

- khởi tạo `useForm` với một base/default unit;
- image action mặc định `remove`;
- submit `POST products.store` với `forceFormData`;
- hiển thị progress nếu Inertia form cung cấp;
- redirect server quyết định nơi đến sau success.

### `products/edit.tsx`

- nhận full product edit DTO;
- image action mặc định `keep`;
- giữ current image URL/source riêng với form draft;
- submit bằng `POST` + `_method=put` để hỗ trợ multipart;
- không gửi lại raw image path.

### 10.3. Giữ trạng thái danh sách khi quay lại

Các query list được whitelist:

```text
search, category_id, status, sort, direction, per_page, page
```

Khi điều hướng sang create/edit, truyền `return_query` đã serialize từ đúng các key trên. Server hoặc frontend không nhận arbitrary `return_url` để tránh open redirect.

Sau save/cancel:

- quay lại products index với query cũ;
- nếu item không còn thuộc filter hiện tại, hiển thị flash giải thích;
- page vượt quá trang cuối phải được paginator normalize.

Nếu cơ chế này làm scope quá lớn, phase đầu có thể dùng browser back cho cancel và redirect index mặc định sau save; nhưng phải ghi nhận UX debt.

### 10.4. Image preview component

Component phải hỗ trợ:

- current URL;
- object URL của file mới;
- external draft URL;
- loading state tối thiểu nếu cần;
- `onError` fallback;
- alt text có nghĩa ở trang quản trị, ví dụ `Ảnh sản phẩm {name}`;
- POS có thể dùng alt rỗng nếu tên sản phẩm đã ở ngay cạnh và ảnh chỉ trang trí;
- `loading="lazy"`, `decoding="async"` cho list/POS;
- `referrerPolicy="no-referrer"` cho external URL;
- không loop retry khi ảnh lỗi.

Chỉ tạo shared `ImageWithFallback` nếu có ít nhất hai consumer thật và contract không mang business logic.

### 10.5. Product units editor

Cải thiện:

- dùng stable client id cho row mới;
- field wrapper nhất quán `Label → Control → Error`;
- map nested errors;
- semantic token thay hard-coded color;
- group radio bằng fieldset;
- action xóa đơn vị có tooltip/accessible name;
- touch target đủ lớn ở tablet;
- không tự gọi API;
- tất cả mutation row qua callbacks hoặc reducer/hook thuộc feature;
- giữ `hasValidBaseUnit` như client guard, server vẫn authoritative.

### 10.6. Status dialog

Props tối thiểu:

```ts
type ProductStatusDialogProps = {
    product: ProductSummary | null;
    open: boolean;
    processing: boolean;
    onOpenChange(open: boolean): void;
    onConfirm(): void;
};
```

Nội dung thay đổi theo active/inactive:

- ngừng bán: giải thích ảnh hưởng POS và việc dữ liệu kho không bị xóa;
- bán lại: giải thích sản phẩm sẽ xuất hiện lại ở POS;
- tồn > 0: warning semantic, không dùng màu làm tín hiệu duy nhất;
- button confirm ngừng bán dùng destructive style vì làm gián đoạn bán hàng, nhưng không gọi là xóa;
- button bán lại dùng primary/default;
- focus vào action an toàn theo dialog convention;
- Escape/Cancel hoạt động.

### 10.7. Error handling

- dùng `FormErrorSummary` ở đầu form;
- đồng thời hiển thị lỗi cạnh field;
- dedupe message trong summary nếu nested errors trùng;
- 409 concurrency có message riêng;
- 422 map vào form errors;
- 403 không biến thành generic validation error;
- network/server error giữ dữ liệu form để thử lại;
- file preview không bị reset chỉ vì server validation fail;
- success flash dùng hệ thống flash hiện có.

### 10.8. Accessibility

- mọi Label gắn đúng id;
- image mode dùng radio/toggle có accessible name;
- fieldset/legend cho nhóm checkbox/radio;
- icon-only button có `aria-label` và tooltip;
- focus visible giữ nguyên;
- error summary có `role=alert` và focus target nếu cần;
- table header semantic;
- status không chỉ biểu đạt bằng màu;
- keyboard có thể hoàn thành create/edit/status flow;
- không tự focus preview hoặc làm mất focus sau list refresh.

### 10.9. Tailwind/design-system

- dùng semantic tokens `background`, `card`, `muted`, `destructive`, `border`, `ring`;
- bỏ `bg-white`, `text-red-600`, `text-blue-700` khỏi feature khi có token tương ứng;
- spacing theo `gap-2/3/4/6/8`;
- page padding `p-4 md:p-5 lg:p-6` hoặc pattern management page hiện tại;
- control height 36–40 px, touch target quan trọng 44 px;
- không tạo breakpoint arbitrary;
- không tạo Card cho mọi section nếu border/heading đã đủ;
- sticky footer dùng background/border rõ, không shadow quá mạnh;
- light/dark theme phải giữ contrast.

---

## 11. Bảo mật và độ tin cậy

### 11.1. Upload

- authorize trước mutation;
- validate MIME/type/size/dimensions server-side;
- không tin filename hoặc extension client;
- generated filename ngẫu nhiên;
- decode ảnh và re-encode để loại metadata/payload không cần thiết;
- không phục vụ original chưa xử lý;
- path nằm trong tenant/prefix quản lý;
- không cho user gửi `image_path` trực tiếp;
- test file giả mạo extension;
- giới hạn request body ở web server/PHP phải lớn hơn validation limit nhưng không quá rộng.

### 11.2. External URL

- chỉ owner/manager có quyền cấu hình qua quyền catalog hiện tại;
- chỉ HTTPS;
- chặn credential trong URL;
- chặn local/private target;
- không fetch server-side trong MVP nên không phát sinh SSRF request trực tiếp từ backend;
- thêm `referrerPolicy="no-referrer"`;
- fallback khi source lỗi;
- cân nhắc CSP `img-src` khi production có CSP;
- không lưu data URL/blob URL;
- không chấp nhận URL trang HTML với kỳ vọng hệ thống tự tìm ảnh.

### 11.3. File deletion

- chỉ xóa path do hệ thống quản lý dưới prefix `products/`;
- normalize và kiểm tra path trước delete;
- không xóa file cũ trước DB commit;
- không xóa external URL;
- delete failure được log và để command cleanup xử lý;
- không để client truyền path cần xóa.

### 11.4. Tenant isolation

- path chứa organization id;
- query Product/Category/Unit/ProductUnit phải scope organization/product;
- external allowlist là config toàn hệ thống hoặc organization policy được thiết kế rõ; MVP ưu tiên config toàn hệ thống;
- test cross-organization cho create/update/status.

---

## 12. Hiệu năng và chi phí lưu trữ

### 12.1. Ước lượng

Nếu giữ tối đa 4 MB và không resize:

| Số ảnh | Dung lượng lý thuyết tối đa |
|---:|---:|
| 1.000 | khoảng 4 GB |
| 10.000 | khoảng 40 GB |

Nếu chuẩn hóa trung bình 100 KB:

| Số ảnh | Dung lượng ước tính |
|---:|---:|
| 1.000 | khoảng 100 MB |
| 10.000 | khoảng 1 GB |

Resize/nén và lifecycle cleanup là biện pháp giảm chi phí đáng tin cậy hơn hotlink tùy ý.

### 12.2. Tối ưu response

- products index chỉ cần thumbnail URL/source, không cần binary/base64;
- POS snapshot chỉ truyền URL string;
- không inline base64 trong Inertia props/IndexedDB catalog;
- `<img loading="lazy" decoding="async">`;
- giữ width/height hoặc class kích thước cố định để tránh layout shift;
- output WebP có cache header phù hợp ở web server/CDN;
- filename immutable ngẫu nhiên giúp cache dài hạn; khi thay ảnh URL đổi;
- `Storage::url()` chuẩn bị cho public disk/S3/CDN.

### 12.3. External image trade-off

External URL giảm storage của hệ thống nhưng đổi lại:

- phụ thuộc uptime/bandwidth bên thứ ba;
- có thể chặn hotlink;
- có thể thay nội dung tại cùng URL;
- có thể mất ảnh khi offline;
- khó kiểm soát kích thước file tải xuống client;
- có thể chậm hơn ảnh do mình quản lý/CDN.

UI cần mô tả đây là lựa chọn tiết kiệm storage nhưng có độ tin cậy thấp hơn upload.

---

## 13. Kế hoạch triển khai theo pha

### Pha 0 — Chốt quyết định và baseline

### Công việc

- [ ] Review và chốt D1–D10.
- [ ] Xác nhận production có GD và `imagewebp`.
- [ ] Xác nhận policy external host: allow all public HTTPS hay allowlist.
- [ ] Xác nhận full form chuyển sang page riêng hay giữ dialog trong milestone đầu.
- [ ] Chụp baseline screenshot desktop/tablet/mobile nếu môi trường browser khả dụng.
- [ ] Ghi nhận số product có `image_path`, tổng file/tổng bytes dưới `products/`, số path thiếu file.
- [ ] Không xóa bất kỳ file nào trong baseline audit.
- [ ] Chạy test hiện tại cho catalog/freshness và frontend quality gate.

### Exit criteria

- Các quyết định blocking được duyệt.
- Có baseline test và storage inventory.
- Không có mutation production/data trong pha này.

### Pha 1 — Sửa UX danh sách ít rủi ro

### Công việc

- [ ] Dùng `PageHeader`.
- [ ] Gộp filter/sort bằng `FilterBar`.
- [ ] Sửa contract “Tên A-Z” và direction.
- [ ] Bỏ nested card wrapper.
- [ ] Thêm thumbnail/fallback dựa trên contract hiện tại tạm thời hoặc chờ `image_url` ở pha 2.
- [ ] Dùng `RowActions`.
- [ ] Chuẩn hóa semantic color và spacing.
- [ ] Kiểm tra horizontal table overflow.
- [ ] Giữ pagination/filter behavior.

### Exit criteria

- Label sort khớp kết quả thực tế.
- Header/filter responsive.
- Không regression search, category/status filter, pagination.
- Chưa thêm hard-delete.

### Pha 2 — Backend image foundation

### Công việc

- [ ] Tạo migration `external_image_url`.
- [ ] Cập nhật Product fillable/computed image contract.
- [ ] Thêm config catalog image.
- [ ] Tạo `ProductImageService`.
- [ ] Thêm validation `image_action`, upload và external URL.
- [ ] Tách create/update action hoặc ít nhất tách toàn bộ image side effect khỏi controller.
- [ ] Implement state transition table.
- [ ] Xóa old managed image sau successful commit.
- [ ] Cleanup new file khi transaction fail.
- [ ] Trả `image_url`, `image_source` ở product DTO và POS catalog.
- [ ] Chuyển POS consumer khỏi raw `/storage` path.
- [ ] Cập nhật catalog fingerprint.
- [ ] Giữ legacy import tương thích.
- [ ] Thêm Pest tests cho tất cả transition quan trọng.

### Exit criteria

- Existing image_path vẫn hiển thị được.
- Upload mới được tối ưu.
- Thay/gỡ ảnh không để old file trong normal flow.
- External URL hiển thị được với fallback.
- Frontend consumer không tự ghép `/storage`.
- POS freshness test pass khi ảnh thay đổi.

### Pha 3 — Product form UX

### Công việc

- [ ] Thêm create/edit routes/pages nếu D2 được duyệt.
- [ ] Tạo `ProductForm` dùng chung.
- [ ] Tạo `ProductImageField` với source mode và preview.
- [ ] Revoke object URL đúng lifecycle.
- [ ] Chia form thành section.
- [ ] Thêm sticky action footer.
- [ ] Map đầy đủ nested errors.
- [ ] Cải thiện ProductUnitsEditor responsive/accessibility.
- [ ] Giữ multipart POST + `_method=put` cho update file.
- [ ] Giữ/khôi phục list query khi quay lại.
- [ ] Xóa `ProductFormDialog` sau khi không còn consumer; không để hai flow create/edit song song lâu dài.

### Exit criteria

- Create/edit hoàn thành được bằng keyboard.
- Preview upload/external/current/remove đúng.
- Validation fail không làm mất draft.
- Mọi server error có thể nhìn thấy.
- Form nhiều đơn vị vẫn thao tác được trên tablet/mobile.

### Pha 4 — Ngừng bán/Bán lại

### Công việc

- [ ] Thêm status route/request/action.
- [ ] Thêm concurrency check `updated_at`.
- [ ] Thêm row action và confirmation dialog.
- [ ] Cảnh báo khi còn tồn nhưng không block deactivation.
- [ ] Kiểm tra điều kiện trước reactivation.
- [ ] Bump catalog after commit.
- [ ] Cập nhật/viết `PosFreshnessFeatureTest` qua route status thực.
- [ ] Kiểm tra checkout stale-product behavior.

### Exit criteria

- Không có nút/route hard-delete.
- Ngừng bán loại product khỏi snapshot mới.
- Bán lại đưa product trở lại snapshot nếu catalog hợp lệ.
- Inventory/history không đổi.
- User sai quyền/organization bị chặn.

### Pha 5 — Cleanup, quan sát và tối ưu vận hành

### Công việc

- [ ] Tạo orphan audit/prune command nếu được duyệt.
- [ ] Dry-run trên staging trước.
- [ ] Ghi nhận count/bytes trước và sau.
- [ ] Thêm log có context khi image encode/store/delete fail.
- [ ] Tài liệu deployment kiểm tra GD, storage disk, storage link/CDN URL.
- [ ] Cân nhắc cache headers cho immutable product image.
- [ ] Không bật scheduler prune tự động trong release đầu.

### Exit criteria

- Có thể audit orphan an toàn.
- Không xóa referenced/legacy image.
- Có rollback và log đủ để điều tra.

---

## 14. Kế hoạch test tự động

### 14.1. Product image feature tests

Tạo file đề xuất:

```text
tests/Feature/ProductImageFeatureTest.php
```

Dùng `Storage::fake('public')` và `UploadedFile::fake()->image()`.

Cases:

1. owner tạo product không ảnh;
2. owner tạo product với upload hợp lệ;
3. output file tồn tại và DB lưu managed path;
4. DB external URL null khi upload;
5. upload sai MIME bị reject;
6. upload quá size bị reject;
7. upload quá dimensions bị reject;
8. cashier không được upload;
9. category/unit organization khác bị reject;
10. create với external HTTPS hợp lệ;
11. reject HTTP nếu policy chỉ HTTPS;
12. reject localhost/private IP/credential URL;
13. reject data/blob/javascript scheme;
14. update `keep` giữ file/path cũ;
15. update `remove` clear DB và xóa old file sau commit;
16. update upload→upload tạo file mới và xóa file cũ;
17. update upload→external xóa file cũ, set URL;
18. update external→upload clear URL, lưu file;
19. update external→external thay URL không đụng storage;
20. transaction failure xóa new file nhưng giữ old file;
21. URL resolver trả đúng Storage URL cho upload;
22. URL resolver trả nguyên external URL;
23. invariant không cho cả path và URL sau action;
24. legacy image path vẫn resolve được.

Nếu test cần GD, test suite phải kiểm tra extension hoặc CI phải cài GD; không silently skip test quan trọng trong CI production-equivalent.

### 14.2. Product management tests

Cập nhật hoặc bổ sung `CatalogUxFeatureTest.php`:

- products index trả image URL/source;
- filter/sort direction đúng;
- create/edit page chỉ owner/manager truy cập;
- edit product organization khác trả 403/404 theo policy đã chốt;
- nested unit ownership bị enforce;
- full update tiếp tục quản lý base/default unit đúng;
- removed unit được deactivate, không hard-delete;
- return query chỉ nhận whitelist nếu được triển khai.

### 14.3. Status/freshness tests

Cập nhật `PosFreshnessFeatureTest.php`:

- lấy catalog version ban đầu;
- gửi `PATCH products.status.update` thực sự;
- xác nhận version tăng;
- snapshot không còn product inactive;
- activate lại qua route;
- version tăng lần nữa;
- snapshot chứa lại product;
- stale `updated_at` trả 409 và không bump version;
- cashier/cross-org bị chặn;
- tồn kho/movement/receipt count không đổi sau deactivate/reactivate.

Không tự gọi `ResourceVersionService::bump()` trong test mutation, vì điều đó che giấu việc controller/action quên bump.

### 14.4. POS regression tests

- initial POS catalog có `image_url`;
- snapshot refresh khi ảnh đổi;
- archived product bị authoritative checkout chặn khi online;
- reactivated product có thể bán sau fresh snapshot;
- broken external image không làm crash catalog component;
- product không ảnh dùng fallback.

### 14.5. Quality gates

Sau mỗi ticket:

```text
php artisan test --compact <affected-test-file>
vendor/bin/pint --dirty --format agent
npm run format:check
npm run lint:check
npm run typecheck
npm run build
```

Chạy test nhỏ nhất trước; full relevant suite trước merge.

---

## 15. Manual UAT matrix

### 15.1. Danh sách

| Case | Desktop | Tablet | Mobile |
|---|---:|---:|---:|
| Header + Add button | ✓ | ✓ | ✓ |
| Search accent-insensitive | ✓ | ✓ | ✓ |
| Category/status filter | ✓ | ✓ | ✓ |
| Sort A-Z/Z-A/latest | ✓ | ✓ | ✓ |
| Table overflow/action | ✓ | ✓ | ✓ |
| Empty filtered state/reset | ✓ | ✓ | ✓ |
| Permission read-only | ✓ | ✓ | ✓ |

### 15.2. Form

| Case | Expected |
|---|---|
| Create không ảnh | Save thành công, fallback hiển thị |
| Create upload JPEG/PNG/WebP | Preview đúng, output managed image hiển thị |
| Upload > 4 MB | Lỗi cạnh field, draft khác còn nguyên |
| Upload kích thước quá lớn | Lỗi rõ ràng |
| Edit giữ ảnh | Không tạo file mới |
| Edit thay upload | Ảnh mới hiển thị, file cũ được cleanup |
| Edit gỡ ảnh | Sau submit dùng fallback |
| Edit dùng URL HTTPS | Preview và source badge đúng |
| URL trang HTML | Preview fail có hướng dẫn dùng direct image URL |
| URL ngoài hỏng sau save | POS/list fallback, không crash |
| Nhiều đơn vị bán | Scroll/layout/action ổn |
| Duplicate barcode | Lỗi đúng row |
| Không đủ base/default | Summary và lỗi section rõ |
| Server/network error | Draft và preview còn để retry |

### 15.3. Status

| Case | Expected |
|---|---|
| Ngừng bán product tồn = 0 | Confirm, biến mất khỏi active list/POS |
| Ngừng bán product tồn > 0 | Có warning, vẫn cho phép, tồn không đổi |
| Bán lại product hợp lệ | Xuất hiện lại ở active list/POS |
| Bán lại thiếu default unit | Block với hướng dẫn sửa |
| Mutation stale | 409, yêu cầu refresh |
| Cashier | Không thấy action/403 nếu gọi trực tiếp |

### 15.4. Theme và accessibility

- light/dark nếu shell hỗ trợ;
- Tab order hợp lý;
- Enter submit đúng form;
- Escape đóng confirmation;
- focus visible;
- screen reader đọc label/error/status;
- ảnh decorative trong POS không lặp lại tên không cần thiết;
- contrast warning/destructive đạt yêu cầu.

---

## 16. Deployment

### 16.1. Pre-deploy

- backup database;
- kiểm tra `gd`, `imagewebp`, `fileinfo` trên production;
- kiểm tra configured public disk writable;
- kiểm tra `storage:link` nếu dùng local public disk;
- nếu dùng CDN/S3, kiểm tra `Storage::url()` trả URL đúng;
- kiểm tra CSP cho external `img-src`;
- chạy migration trên staging;
- chạy feature tests và frontend build;
- audit file count/bytes nhưng chưa prune.

### 16.2. Thứ tự deploy

1. Deploy code có khả năng đọc column mới nhưng chưa dùng external mode nếu cần two-step rollout.
2. Chạy migration thêm nullable column.
3. Bật backend contract và tests.
4. Deploy frontend dùng `image_url`.
5. UAT upload/replace/remove/external.
6. Bật status action.
7. Theo dõi log encode/store/delete.
8. Chỉ chạy orphan dry-run sau thời gian ổn định.

Vì column nullable và `image_path` cũ vẫn giữ, migration có tính backward-compatible tốt.

### 16.3. Rollback

### Rollback application

- frontend cũ vẫn có thể dùng `image_path` trong giai đoạn compatibility;
- backend cũ sẽ bỏ qua `external_image_url`, vì vậy không drop column ngay nếu đã có data external;
- nếu rollback frontend nhưng có product chỉ dùng external URL, ảnh có thể tạm fallback; dữ liệu vẫn còn trong column.

### Rollback schema

- export/kiểm tra các `external_image_url` non-null trước khi drop;
- chỉ rollback migration sau khi application không còn đọc/ghi column;
- không khôi phục file managed đã được người dùng chủ động thay bằng URL nếu file cũ đã cleanup; đó là expected transition, không phải rollback tự động.

### Feature flag tùy chọn

Nếu muốn rollout thận trọng, external mode có thể được ẩn bằng config trong release đầu, trong khi upload lifecycle và contract mới đã chạy ổn định.

---

## 17. Rủi ro và giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Xóa nhầm file còn được tham chiếu | Cao | Chỉ xóa old path sau commit; path prefix guard; test transition; prune dry-run + grace period |
| DB commit fail sau khi ghi file mới | Trung bình | Catch exception và xóa new file; giữ old file |
| File delete fail sau commit | Thấp/Trung bình | Log warning; DB vẫn đúng; orphan command xử lý |
| External URL hỏng/hết hạn | Trung bình | Source badge, preview, fallback, helper text, optional allowlist |
| External URL tải file rất lớn xuống POS | Trung bình | Khuyến nghị trusted CDN/allowlist; không thể kiểm soát hoàn toàn nếu hotlink trực tiếp |
| SSRF nếu sau này backend fetch URL | Cao | Không fetch trong MVP; milestone riêng với public-IP validation, redirect revalidation, timeout/size/MIME limit |
| POS offline mất ảnh external | Trung bình | Fallback icon; upload là default; không hứa offline image availability |
| GD khác nhau giữa local/production | Trung bình | Preflight capability, CI/staging test, fail rõ thay vì fallback original |
| Form page migration làm mất list filters | Thấp/Trung bình | Whitelist return query; UAT back/save/cancel |
| Archive product vẫn nằm trong cart stale | Cao | Catalog version bump, ensureFresh trước checkout, authoritative server validation |
| React object URL leak | Thấp | Revoke khi thay file/unmount |
| Nested unit validation map sai index | Trung bình | Stable row key; server key mapping tests/UAT |
| Hard-delete được thêm lại vì nhầm tên action | Cao | Không route delete; wording “Ngừng bán”; acceptance criteria rõ |

---

## 18. Tiêu chí nghiệm thu tổng

### Danh sách

- [ ] Tìm kiếm/lọc/sort/phân trang đúng và responsive.
- [ ] “Tên A-Z” thực sự sắp xếp tăng dần.
- [ ] Có thumbnail/fallback ổn định.
- [ ] Không có card lồng không cần thiết.
- [ ] Có “Ngừng bán/Bán lại”, không có “Xóa sản phẩm”.

### Form

- [ ] Full workflow phù hợp page/Sheet đã được review chốt.
- [ ] Có current/new/external preview.
- [ ] Có keep/replace/remove rõ ràng.
- [ ] Mọi lỗi field/nested unit hiển thị được.
- [ ] Processing/error state không làm mất draft.
- [ ] Keyboard và mobile/tablet dùng được.

### Backend ảnh

- [ ] Upload được validate và tối ưu.
- [ ] Tên/path do server sinh.
- [ ] Old managed file cleanup đúng transition.
- [ ] Transaction fail không làm mất ảnh cũ.
- [ ] External URL theo policy HTTPS/public host.
- [ ] `image_url`/`image_source` là contract thống nhất.
- [ ] Existing/legacy images vẫn dùng được.

### Lifecycle/POS

- [ ] Deactivate không xóa inventory/history.
- [ ] Catalog version tăng qua route mutation thật.
- [ ] Snapshot loại product inactive và trả lại product reactivated.
- [ ] Checkout xử lý catalog stale an toàn.
- [ ] Cross-org/cashier bị chặn.

### Chất lượng

- [ ] Pest tests liên quan pass.
- [ ] Pint pass cho PHP dirty files.
- [ ] Format/lint/typecheck/build pass.
- [ ] Manual UAT matrix hoàn thành.
- [ ] Có deployment/rollback checklist đã chạy trên staging.

---

## 19. Definition of Done cho từng ticket

- Phạm vi ticket nhỏ đủ để review và rollback độc lập.
- Không thay đổi nghiệp vụ tồn kho/giá ngoài acceptance criteria.
- Mutation được authorize và tenant-scoped.
- Validation server đầy đủ; frontend hiển thị được lỗi.
- Không tạo abstraction/dependency không cần thiết.
- Không đưa business logic vào `components/ui`.
- Không để page JSX chứa filesystem/request orchestration phức tạp.
- Loading, empty, error, disabled, permission và responsive states đã được xét.
- Product/catalog types không bị trùng contract mâu thuẫn giữa POS và products.
- Catalog resource version được bump sau commit khi dữ liệu POS thay đổi.
- Test tự động và quality gate tương ứng pass.
- Manual UAT cập nhật trạng thái trong tài liệu/ticket.
- Không đánh dấu hoàn thành chỉ vì code đã merge nếu production/staging behavior chưa được xác nhận theo risk của ticket.

---

## 20. Breakdown ticket đề xuất

| Ticket | Nội dung | Kích thước tương đối | Phụ thuộc |
|---|---|---:|---|
| PROD-UX-01 | Sửa header/filter/sort/nested card/responsive list | S | Không |
| PROD-IMG-01 | Migration + image contract + URL resolver | M | Review D3/D4 |
| PROD-IMG-02 | ProductImageService + upload optimization | M/L | PROD-IMG-01, GD production |
| PROD-IMG-03 | Image transition lifecycle + cleanup old file + tests | L | PROD-IMG-02 |
| PROD-IMG-04 | External URL validation + fallback contract | M | PROD-IMG-01 |
| PROD-POS-01 | POS dùng image_url/image_source + freshness regression | M | PROD-IMG-01/04 |
| PROD-FORM-01 | Tạo create/edit pages + ProductForm sections | L | Review D2 |
| PROD-FORM-02 | ProductImageField preview/modes/errors | M | PROD-IMG-03/04, PROD-FORM-01 |
| PROD-FORM-03 | Unit editor nested errors/responsive/accessibility | M | PROD-FORM-01 |
| PROD-STATUS-01 | Status route/request/action/concurrency | M | Review D1/D8 |
| PROD-STATUS-02 | Row action/dialog + POS freshness tests | M | PROD-STATUS-01 |
| PROD-MAINT-01 | Orphan image audit/prune command | M | PROD-IMG-03 ổn định |

Không gom tất cả ticket trên vào một PR.

---

## 21. Thứ tự PR đề xuất

1. **PR 1 — List UX fixes:** ít rủi ro, không đổi schema.
2. **PR 2 — Image schema/contract compatibility:** thêm column nullable, URL resolver, giữ frontend cũ hoạt động.
3. **PR 3 — Managed upload lifecycle:** service, optimize, replace/remove, tests.
4. **PR 4 — External URL mode:** validation, backend contract, fallback.
5. **PR 5 — POS image contract migration:** bỏ raw `/storage` usage.
6. **PR 6 — Create/edit page refactor:** form structure và error mapping.
7. **PR 7 — Status lifecycle:** ngừng bán/bán lại + freshness.
8. **PR 8 — Orphan maintenance:** dry-run trước, không auto schedule.

Nếu muốn giảm thời gian đến giá trị, PR status lifecycle có thể làm trước form refactor vì độc lập với external image.

---

## 22. Checklist review trước khi implement

- [ ] Đồng ý không có hard-delete sản phẩm?
- [ ] Đồng ý wording “Ngừng bán/Bán lại”?
- [ ] Có cho deactivate khi tồn > 0 và chỉ cảnh báo?
- [ ] Full form chuyển sang page riêng hay giữ dialog?
- [ ] Đồng ý schema `image_path` + `external_image_url`, source suy ra?
- [ ] External URL cho phép mọi public HTTPS hay chỉ allowlist?
- [ ] Đồng ý không scrape URL trang sản phẩm?
- [ ] Đồng ý external image không đảm bảo offline?
- [ ] Đồng ý dùng GD hiện có và output WebP 640×640 quality 82?
- [ ] Production đã có/cho phép GD + WebP?
- [ ] Có cần giữ original ảnh upload hay chỉ giữ optimized output? Đề xuất: chỉ optimized output.
- [ ] Có cần URL ảnh lớn hơn 2048 ký tự? Đề xuất: không.
- [ ] Có duyệt orphan command và grace period 7 ngày?
- [ ] Có cần feature flag external image cho rollout?
- [ ] Có cần object storage/CDN trong milestone kế tiếp?

---

## 23. Hướng mở rộng sau milestone

Chỉ cân nhắc sau khi scope hiện tại ổn định:

- object storage S3-compatible + CDN;
- queue tải external image về managed storage;
- multiple image/gallery;
- bulk import URL ảnh theo SKU;
- ảnh riêng theo variant;
- thumbnail sizes theo consumer;
- WebP/AVIF content negotiation;
- media usage report;
- scheduled orphan cleanup sau nhiều lần dry-run an toàn;
- hard purge command dành cho dữ liệu test, với audit và điều kiện không có transaction reference;
- supplier-domain allowlist theo organization;
- image health checker cho broken external links.

Các hướng này không được đưa vào implementation hiện tại nếu chưa có ticket và acceptance criteria riêng.
