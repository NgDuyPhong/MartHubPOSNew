# Kế hoạch refactor frontend MartHub POS

> Cập nhật quyết định quality gate: 22/08/2026. Tên file giữ nguyên timestamp tạo tài liệu theo quy ước dự án.

## 1. Kết luận kiến trúc hiện tại

Frontend hiện tại **không được tổ chức theo Atomic Design đầy đủ**.

Source có một phần tương đương tầng atom:

- `resources/js/components/ui`: các UI primitive từ shadcn/Radix như `Button`, `Input`, `Dialog`, `Select`, `Badge`;
- `resources/js/components`: component dùng chung của app shell như sidebar, header, breadcrumb và user menu;
- `resources/js/layouts`: layout Inertia cho app, auth và settings;
- `resources/js/pages`: entry point tương ứng với các Inertia page;
- `resources/js/hooks`: hook dùng chung của starter kit;
- `resources/js/lib`: helper chung và IndexedDB/offline sale.

Tuy nhiên source không có ranh giới `atoms / molecules / organisms / templates / pages`, và phần nghiệp vụ chưa được chia thành component, hook, model và service riêng. Hiện tại page thường tự quản lý cả giao diện, state, validation, request và side effect.

### Quyết định kiến trúc đề xuất

Không chuyển source sang Atomic Design thuần. Dùng mô hình kết hợp:

- **UI primitives**: tiếp tục đặt trong `components/ui`; đây là tầng gần với atom;
- **shared application components**: đặt trong `components/shared`;
- **nghiệp vụ**: tổ chức theo feature/domain như `features/pos`, `features/sales`, `features/shifts`;
- **pages**: chỉ làm adapter nhận Inertia props, cấu hình layout và compose feature;
- **layouts**: chỉ quản lý khung trang, không chứa nghiệp vụ;
- **lib**: chỉ chứa hạ tầng không phụ thuộc domain.

Cách này giữ lợi ích tái sử dụng của Atomic Design nhưng giúp developer tìm code theo nghiệp vụ, thay vì phải đoán một component thanh toán là molecule hay organism.

### Công thức kiến trúc được chốt

```text
Feature-based architecture
  + Atomic UI / Design System
  + Colocation
  + TypeScript strict
  + Inertia cho page server state và form/navigation
  + TanStack Query có chọn lọc cho JSON server state client-driven
  + Zustand/Redux chỉ khi có global client state thật sự
  + ESLint + Prettier
  + dependency direction rõ ràng
```

Đây là phương án phù hợp với source hiện tại. Điểm cần lưu ý là TanStack Query không thay Inertia trên toàn ứng dụng; hai công cụ phải có ownership rõ để tránh cùng cache một dữ liệu.

### Architecture Decision Record — Page route và JSON API

Các URL hiện tại như `/pos`, `/products`, `/inventory` và `/sales` có hai vai trò cần được phân biệt rõ:

- **Page route** dùng để người dùng mở màn hình và để Laravel/Inertia render React page;
- **JSON API endpoint** dùng để frontend lấy dữ liệu hoặc thực hiện nghiệp vụ qua HTTP và nhận JSON.

Prefix `/api` không tự làm một endpoint trở thành REST. API phải có resource naming, HTTP method, status code, error contract và authentication nhất quán. Tên API ưu tiên danh từ số nhiều, không dùng action trong URL nếu có thể mô hình hóa thành resource.

Quyết định được chốt:

1. Giữ page route trong `routes/web.php`:
   - `GET /pos` — mở màn hình bán hàng;
   - `GET /products` — mở màn hình sản phẩm;
   - `GET /inventory` — mở màn hình tồn kho;
   - `GET /sales` — mở màn hình danh sách bán hàng;
   - `GET /sales/{sale}` — mở màn hình chi tiết hóa đơn khi response là Inertia page.
2. Page route không phải API name và không bắt buộc có prefix `/api`.
3. JSON endpoint client-driven được tách dần sang contract có version `/api/v1/...`.
4. Không chuyển toàn bộ Inertia route sang `routes/api.php`; chỉ tách những endpoint thực sự trả JSON hoặc cần dùng bởi POS/offline sync/TanStack Query.
5. Không để cùng một URL vừa là Inertia page response vừa là JSON API response tùy theo header nếu có thể tránh được; contract tách biệt giúp test, cache và xử lý lỗi dễ dự đoán hơn.
6. Việc đổi URL phải đi cùng phương án authentication và CSRF. Không chỉ đổi `POST /sales` thành `POST /api/v1/sales` khi route API chưa hỗ trợ session hoặc Sanctum phù hợp.

Ranh giới URL mục tiêu:

| Mục đích | Page route | JSON API mục tiêu |
| --- | --- | --- |
| Mở POS | `GET /pos` | Không cần API tương ứng chỉ để render page |
| Quản lý sản phẩm | `GET /products` | `GET/POST /api/v1/products`, `PUT/PATCH /api/v1/products/{product}` |
| Xem tồn kho | `GET /inventory` | `GET /api/v1/inventory` khi cần fetch/cache độc lập |
| Danh sách bán hàng | `GET /sales` | `GET /api/v1/sales` khi cần JSON client-driven |
| Chi tiết hóa đơn | `GET /sales/{sale}` | `GET /api/v1/sales/{sale}` khi cần JSON |
| Tạo giao dịch POS | Không dùng page route | `POST /api/v1/sales` |
| Tạo phiếu trả hàng | Không dùng page route | `POST /api/v1/sales/{sale}/returns` |
| Thu nợ khách hàng | Không dùng page route | `POST /api/v1/customers/{customer}/payments` |
| Ghi nhận thu/chi ca | Không dùng page route | `POST /api/v1/shifts/{shift}/cash-movements` |
| Đóng ca | Không dùng page route | Ưu tiên `POST /api/v1/shifts/{shift}/closures`; có thể dùng `PATCH /api/v1/shifts/{shift}` nếu contract chỉ cập nhật trạng thái |

Ví dụ luồng sau refactor:

```text
Browser → GET /products → Laravel/Inertia render ProductsPage
                               ↓
                    GET /api/v1/products (chỉ khi page cần JSON client-driven)
                               ↓
                         JSON server state
```

Không bắt buộc một page phải gọi lại JSON API ngay sau khi render. Nếu dữ liệu chỉ phục vụ một page visit và Inertia props đã đủ, tiếp tục dùng Inertia props để tránh request và cache trùng lặp.

### Architecture Decision Record — UI library

Quyết định đã chốt cho giai đoạn refactor:

- **Không sử dụng Ant Design**.
- Tailwind CSS + shadcn/Radix là Design System và UI primitive duy nhất của ứng dụng.
- Không cài thêm một UI framework chạy song song vì sẽ tạo hai hệ token, theme, interaction và styling priority.
- Các màn quản trị tiếp tục compose primitive hiện tại; bổ sung pattern dùng chung có kiểm soát khi có reuse thật.
- Component shadcn/Radix hiện chưa có consumer vẫn được giữ lại vì có thể dùng trong roadmap tiếp theo và source code không được bundle nếu không import.
- Chỉ xem xét xóa component khi project bước vào cleanup/hardening, component đã không dùng qua nhiều milestone và không nằm trong backlog gần.
- Không gỡ package Radix tương ứng chỉ dựa trên số import hiện tại; phải kiểm tra dependency nội bộ, roadmap và production build trước.

### Phân loại state và owner

| Loại state                      | Ví dụ trong MartHub POS                                                                         | Owner đề xuất                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| UI state cục bộ                 | dialog đang mở, tab, dòng đang chọn, checkout đang thu gọn                                      | component hoặc feature hook gần nhất                          |
| Client/domain state             | cart chưa submit, payment draft, keyboard focus contract                                        | reducer/hook trong `features/pos`                             |
| Inertia server state            | products page, sales page, customers, shifts, validation form                                   | Inertia props, `useForm`, partial reload                      |
| JSON server state client-driven | catalog sync cursor, offline queue server status, polling/telemetry                             | TanStack Query khi có endpoint/nhu cầu cache rõ               |
| Persistent local state          | pending offline sale, catalog cache, appearance                                                 | repository IndexedDB/localStorage; hook chỉ orchestration     |
| Global client state             | actor hiện tại trên nhiều vùng độc lập, device context nếu không nằm trong Inertia shared props | Context trước; Zustand/Redux chỉ khi Context/reducer không đủ |

Quy tắc ownership:

1. Không copy Inertia props vào Zustand/Redux hoặc TanStack Query nếu không có lý do về lifecycle/cache.
2. Không dùng TanStack Query cho state form hoặc cart.
3. Không dùng global store chỉ để tránh truyền props qua hai hoặc ba component trong cùng feature.
4. Mỗi server entity chỉ có một cache owner tại một thời điểm.
5. Mutation phải định nghĩa rõ dữ liệu nào được Inertia reload hoặc query key nào được invalidate.

### Khi nào dùng TanStack Query

Dùng khi dữ liệu được fetch qua JSON và cần một hoặc nhiều khả năng sau:

- polling/background refetch;
- cache theo query key độc lập navigation;
- request deduplication/cancellation;
- stale time và invalidation rõ;
- infinite query hoặc cursor sync;
- nhiều component độc lập cùng dùng một server state.

Không dùng mặc định cho:

- Inertia page props;
- CRUD form đang chạy tốt bằng `useForm`;
- dữ liệu chỉ cần trong một page visit;
- offline sale payload trong IndexedDB;
- cart và các UI state cục bộ.

Candidate đầu tiên để thử TanStack Query là endpoint catalog sync/queue monitoring sau khi API contract được tách ổn định. Không cài package chỉ để chuẩn bị trước.

### Colocation: file thay đổi cùng nhau đặt gần nhau

Mỗi feature tự giữ component, hook, type, selector, validation và API chỉ thuộc feature đó:

```text
features/pos/
├─ components/
├─ hooks/
├─ model/
├─ api/
└─ index.ts
```

Chỉ nâng một file lên `components/shared`, `hooks`, `lib` hoặc `types` cấp root khi đã có ít nhất hai feature thật sự sử dụng và contract đã ổn định. Không tạo sẵn các thư mục toàn cục `schemas`, `types`, `api`, `hooks` để chứa mọi thứ của mọi domain.

### Design System

Design System được chia thành ba tầng:

1. **Tokens** trong CSS: màu, spacing, radius, typography, breakpoint và semantic state.
2. **Primitives** trong `components/ui`: Button, Input, Dialog, Select; không chứa nghiệp vụ.
3. **Patterns** trong `components/shared`: PageHeader, EmptyState, FormErrorSummary; chỉ thêm khi có reuse thật.

Feature component được phép compose các tầng trên nhưng không sửa primitive để phục vụ riêng một màn. Variant mới phải có tên ngữ nghĩa và ít nhất một use case rõ.

### Naming convention

- file/folder: `kebab-case`;
- React component/type/interface: `PascalCase`;
- function/variable: `camelCase`;
- hook: `useXxx`;
- boolean: `is/has/can/should`;
- event prop: `onXxx`, handler nội bộ: `handleXxx`;
- API command: động từ rõ như `createSale`, `openShift`;
- query: `get/fetch/list` theo ngữ nghĩa;
- không dùng tên mơ hồ như `data`, `item`, `handleSubmit2`, `utils2` ngoài scope rất nhỏ.

## 2. Kết quả audit source

### 2.1. File đang gom nhiều trách nhiệm

| File                             | Hiện trạng                                                                                                       | Rủi ro                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `pages/pos/index.tsx`            | Khoảng 764 dòng; quản lý catalog, cart, shortcut, checkout, gọi API, offline sync, mở ca, receipt và toàn bộ JSX | Rất cao; thay một hành vi dễ ảnh hưởng toàn bộ POS        |
| `pages/stock-receipts/index.tsx` | Parse CSV/XLSX, tạo/tải file, mapping sản phẩm, state form và render bảng trong một page                         | Cao; khó test import và làm bundle `exceljs` lớn          |
| `pages/products/index.tsx`       | Product form, unit rows, barcode, create/update và table cùng file                                               | Cao; invariant đơn vị khó kiểm soát phía UI               |
| `pages/shifts/index.tsx`         | Mở ca, thu/chi, kiểm đếm, đóng ca và ba form cùng page                                                           | Cao; các state transition của ca bị trộn                  |
| `pages/sales/show.tsx`           | Receipt, print và toàn bộ return/exchange form cùng page                                                         | Cao; logic tính số có thể trả nằm trong JSX               |
| `pages/customers/index.tsx`      | Customer CRUD, tính balance và thu nợ cùng page                                                                  | Trung bình; form và logic công nợ bị gắn chặt             |
| `lib/offline-sales.ts`           | IndexedDB schema, CRUD queue, catalog cache và HTTP sync trong một module                                        | Cao; storage và network không thể thay/test độc lập       |
| `pages/welcome.tsx`              | Khoảng 782 dòng starter page                                                                                     | Thấp về nghiệp vụ nhưng gây nhiễu và tăng chi phí bảo trì |

### 2.2. Dấu hiệu coupling và lặp code

- Domain types như `Product`, `ProductUnit`, `Customer`, `Shift`, `SaleItem` được khai báo cục bộ trong nhiều page.
- `Intl.NumberFormat('vi-VN')` được tạo lại trong nhiều file.
- URL nghiệp vụ như `/sales`, `/shifts`, `/customers/.../payments` được viết trực tiếp trong component.
- Page gọi trực tiếp `fetch`, truy cập CSRF meta, `window`, `document`, `crypto`, ExcelJS và IndexedDB.
- Logic tính toán thường nằm ngay trong render hoặc event handler.
- Một số page có ít dòng nhưng mỗi dòng chứa lượng JSX rất lớn; số dòng không phản ánh đúng độ phức tạp.
- Chưa có frontend automated test được phát hiện trong repository; automated test không nằm trong phạm vi milestone hiện tại.
- ESLint đã có rule bảo vệ dependency giữa `pages`, `features`, `layouts`, `components` và `lib`; rule được áp dụng theo từng tầng trong `eslint.config.js`.

### 2.3. Điểm tốt cần giữ

- TypeScript đang bật `strict` và `noImplicitAny`.
- Alias `@/*` đã được cấu hình.
- `components/ui` có ranh giới tương đối rõ và không chứa nghiệp vụ POS.
- Layout và UI primitive đã có thể tái sử dụng.
- Inertia page mapping theo `resources/js/pages` phù hợp với Laravel hiện tại.
- Offline logic đã được tách ra khỏi page một phần, dù module vẫn còn quá nhiều trách nhiệm.

## 3. Kiến trúc thư mục đích

```text
resources/js/
├─ app.tsx
├─ pages/                         # Inertia entry points, giữ mỏng
│  ├─ pos/index.tsx
│  ├─ products/index.tsx
│  ├─ shifts/index.tsx
│  └─ ...
├─ features/
│  ├─ pos/
│  │  ├─ api/
│  │  │  └─ pos-api.ts
│  │  ├─ components/
│  │  │  ├─ pos-status-bar.tsx
│  │  │  ├─ catalog-panel.tsx
│  │  │  ├─ product-card.tsx
│  │  │  ├─ cart-table.tsx
│  │  │  ├─ cart-summary.tsx
│  │  │  ├─ inline-checkout.tsx
│  │  │  ├─ open-shift-dialog.tsx
│  │  │  ├─ sale-success-bar.tsx
│  │  │  └─ receipt-preview.tsx
│  │  ├─ hooks/
│  │  │  ├─ use-pos-cart.ts
│  │  │  ├─ use-pos-checkout.ts
│  │  │  ├─ use-pos-shortcuts.ts
│  │  │  └─ use-offline-sale-sync.ts
│  │  ├─ model/
│  │  │  ├─ types.ts
│  │  │  ├─ cart-reducer.ts
│  │  │  ├─ selectors.ts
│  │  │  └─ validation.ts
│  │  └─ index.ts
│  ├─ products/
│  ├─ inventory/
│  ├─ stock-receipts/
│  ├─ sales/
│  ├─ customers/
│  └─ shifts/
├─ components/
│  ├─ ui/                         # shadcn/Radix primitives
│  └─ shared/                     # PageHeader, EmptyState, MoneyText...
├─ layouts/
├─ hooks/                         # Chỉ hook thật sự dùng chung nhiều feature
├─ lib/
│  ├─ http/
│  │  ├─ client.ts
│  │  └─ csrf.ts
│  ├─ storage/
│  │  └─ indexed-db.ts
│  ├─ format/
│  │  ├─ money.ts
│  │  ├─ number.ts
│  │  └─ date-time.ts
│  └─ utils.ts
└─ types/                         # Inertia/shared application types
```

Không cần tạo đủ mọi folder ngay từ đầu. Chỉ tạo folder khi có code thật được tách vào đó.

## 4. Quy tắc dependency

```text
pages
  → features
      → components/shared
          → components/ui
      → lib
  → layouts

components/ui → chỉ phụ thuộc lib/utils hoặc primitive khác
lib           → không phụ thuộc pages/features
features      → không import file nội bộ của feature khác
```

Quy tắc cụ thể:

1. `pages` không chứa thuật toán nghiệp vụ, request trực tiếp hoặc IndexedDB access.
2. `components/ui` không biết `Sale`, `Product`, `Shift` hoặc route của ứng dụng.
3. Component feature nhận dữ liệu và callback qua props; request nằm trong hook/api của feature.
4. Pure calculation như cart total, remaining return quantity và debt balance nằm trong `model/selectors.ts`.
5. Side effect như fetch, Inertia form, print, storage và online event nằm trong api/hook/gateway riêng.
6. Type chỉ dùng trong một component đặt cạnh component; type dùng trong cả feature đặt tại `feature/model/types.ts`.
7. Type chia sẻ giữa server props hoặc nhiều feature đặt trong `types`.
8. Mỗi feature chỉ export public API qua `features/<name>/index.ts`; code ngoài feature không import sâu vào implementation.
9. Không tạo barrel export toàn bộ repository vì dễ gây circular dependency và làm tree-shaking khó đoán.
10. Dùng named route/Ziggy hoặc một route helper typed thay cho URL string lặp trong JSX.
11. Trong cùng feature, ưu tiên relative import ngắn; dùng alias cho shared/root boundary.
12. Không import ngược từ `lib`, `components/ui` hoặc `components/shared` vào feature/page.
13. Feature này chỉ dùng public export của feature khác; nếu hai feature chia sẻ domain contract, nâng phần contract tối thiểu lên shared model.

## 5. Mục tiêu kích thước và trách nhiệm file

Đây là ngưỡng cảnh báo, không phải luật tuyệt đối:

- Inertia page: mục tiêu dưới 150 dòng;
- feature component: mục tiêu dưới 250 dòng;
- hook/controller hook: mục tiêu dưới 200 dòng;
- pure model/service: mỗi file tập trung một nhóm hành vi;
- một component không nên sở hữu quá 5–7 state độc lập; nếu nhiều hơn, xem xét reducer hoặc hook domain;
- event handler phức tạp không viết trực tiếp trong JSX;
- không để page vừa gọi network vừa thao tác storage vừa render toàn bộ UI.

## 6. Pha 0 — Thiết lập baseline và guardrail

### Công việc

- Chạy và ghi lại baseline TypeScript, ESLint, Prettier và Vite build.
- Chụp/UAT các luồng POS hiện có trước khi di chuyển file.
- Bổ sung script không tự sửa source: `lint:check`, `typecheck` và `check`.
- Áp dụng `.prettierrc` cấp repository với LF, 4 spaces cho code, 2 spaces cho JSON/YAML và print width thống nhất.
- Không thêm frontend test runner trong milestone hiện tại; ưu tiên guardrail build và manual UAT.
- Chốt convention tên file `kebab-case`, component `PascalCase`, hook `useXxx`.
- Thiết lập import restriction bằng ESLint để bảo vệ dependency rules.

### Exit criteria

- Có một lệnh CI kiểm tra frontend mà không tự sửa file.
- Có baseline hành vi cash, QR, debt, offline, open shift và receipt.
- Refactor sau đó phải giữ build và baseline UAT pass ở từng bước.
- IDE và CI resolve cùng một Prettier config, không phụ thuộc global config của máy.

### Chiến lược áp dụng format

- Commit `.prettierrc` và convention trước.
- Chạy một commit `format-only` riêng cho các file cũ chưa đạt chuẩn; không trộn với refactor nghiệp vụ.
- Từ commit đó trở đi, bật `format:check` trong CI.
- Không format lại `components/ui` đang được `.prettierignore` bảo vệ trừ khi chủ động đồng bộ với upstream shadcn.
- Baseline audit hiện phát hiện 15 file trong `resources` chưa pass Prettier; xử lý cơ học trong ticket riêng.

### P0 production incident — Service Worker làm sai response Inertia của `/pos`

Hiện tượng đã được tái hiện trên production: khi bấm menu **Bán hàng**, Inertia mở một `iframe` chẩn đoán chứa nguyên trang `/pos` hoặc trang đăng nhập, trong khi các menu `/dashboard` và `/sales` vẫn chuyển trang bình thường. Bật **Bypass for network** trong DevTools làm lỗi biến mất, vì vậy nguyên nhân đã được xác nhận là Service Worker/cache, không phải component `Dialog` của POS.

Nguyên nhân trong source hiện tại:

1. `resources/js/app.tsx` chỉ đăng ký `/sw.js` khi chạy production.
2. `public/sw.js` pre-cache riêng `/pos` vào cache cố định `marthub-pos-shell-v1`.
3. Cache không phân biệt document navigation với Inertia request có header `X-Inertia`.
4. Inertia có thể nhận HTML đầy đủ đã cache thay vì JSON response có header `X-Inertia`; Inertia coi đây là invalid response và hiển thị response đó trong `iframe`.
5. Local development không gặp lỗi vì Service Worker không được đăng ký khi `import.meta.env.PROD` là `false`.

#### Xử lý khẩn cấp

Thực hiện thành ticket độc lập trước các ticket refactor khác:

1. Phát hành một bản **retirement/cleanup** tại đúng URL `/sw.js` để worker cũ có thể được cập nhật:
   - gọi `skipWaiting()`;
   - trong `activate`, xóa các cache `marthub-pos-shell-*`;
   - unregister chính Service Worker;
   - không cache `/pos` hoặc HTML mới.
2. Bổ sung cleanup tạm thời trong application bootstrap để unregister registration cũ và xóa cache `marthub-pos-shell-*` cho các client còn sót.
3. Sau khi phần lớn client đã nhận bản cleanup, bỏ đăng ký Service Worker khỏi `app.tsx` cho đến khi có thiết kế offline shell đúng.
4. Build và deploy lại toàn bộ `public/build`; bảo đảm production không có `public/hot`.
5. Purge cache Hostinger/LiteSpeed/CDN và chạy lại Laravel cache commands phù hợp.
6. Kiểm thử khi **Bypass for network đã tắt**; không coi bật bypass hoặc xóa cache thủ công trên một trình duyệt là cách sửa production.

Không xóa ngay đoạn đăng ký rồi kết thúc ticket: Service Worker đã cài vẫn có thể tiếp tục kiểm soát trình duyệt cũ nếu không có release retirement/unregister.

#### Quy tắc Service Worker mục tiêu

- Không cache HTML của route phụ thuộc session: `/pos`, `/login`, `/products`, `/inventory`, `/sales` và các Inertia page khác.
- Không intercept hoặc cache request có header `X-Inertia`.
- Không dùng cùng cache entry cho document navigation và Inertia response.
- Chỉ cân nhắc cache asset immutable có hash trong `/build/assets/*`; `/storage/*` phải có policy và giới hạn rõ trước khi cache.
- Offline sale tiếp tục dùng IndexedDB làm nguồn lưu pending transaction; không phụ thuộc HTML `/pos` đã cache.
- Mỗi phiên bản cache phải có tên mới và `activate` phải xóa cache cũ không còn được sử dụng.
- Chưa bật lại offline app shell cho đến khi có test riêng cho session hết hạn, deploy asset mới, Inertia navigation, offline/reconnect và cache migration.

#### Exit criteria

- [x] Bấm **Bán hàng** từ mọi Inertia page không còn mở invalid-response `iframe` trong môi trường local/build hiện tại khi Service Worker không intercept.
- [x] `npm run build` và TypeScript pass sau thay đổi.
- [x] Retirement worker không còn pre-cache `/pos`, không intercept request và xóa cache `marthub-pos-shell-*`.
- [x] Application bootstrap có cleanup registration/cache cũ trên production client.
- [ ] Xác nhận trên Hostinger sau deploy mới khi Bypass for network tắt.
- [ ] Kiểm tra request Inertia `GET /pos` có response header `X-Inertia: true` và không lấy HTML từ Cache Storage.
- [ ] Xác nhận Cache Storage không còn entry HTML `/pos` hoặc `/login`.
- [ ] Hard reload, đăng xuất/đăng nhập, session hết hạn và deploy bundle mới không làm xuất hiện lại iframe.
- [ ] Luồng lưu sale vào IndexedDB và đồng bộ khi online trở lại vẫn pass UAT production.

## 7. Pha 1 — Shared foundation

### Công việc

1. Tạo formatter dùng chung:
   - `formatMoney`;
   - `formatQuantity`;
   - `formatDateTime`.
2. Tạo shared component chỉ khi có ít nhất hai nơi sử dụng:
   - `PageHeader`;
   - `EmptyState`;
   - `FormErrorSummary`;
   - `MoneyText` nếu thực sự giảm lặp.
3. Tạo HTTP/CSRF helper cho JSON endpoint POS.
4. Chuẩn hóa error shape từ Inertia và JSON response.
5. Đưa shared server-provided types vào `types`.
6. Thay raw URL bằng named route/helper theo từng lượt, không rewrite hàng loạt một lần.

### Common API layer được chốt

Source hiện chưa có common API client. Common layer mới áp dụng cho JSON endpoint client-driven, không thay thế `useForm` của Inertia cho mọi form.

```text
lib/http/
├─ client.ts            # method, JSON headers, credentials, CSRF, parse response
├─ errors.ts            # HttpError + normalize validation/server error
└─ csrf.ts              # đọc CSRF token tại một nơi

features/pos/api/
├─ create-sale.ts       # createSale(payload)
└─ sync-sale.ts         # syncSale(payload)

features/<domain>/api/  # chỉ tạo khi domain thật sự có JSON API
```

Trách nhiệm của `http/client.ts`:

- set `Accept` và `Content-Type` phù hợp;
- gửi cookie same-origin và CSRF cho mutation;
- parse JSON/no-content nhất quán;
- throw typed error cho validation, auth, conflict, throttling và server error;
- hỗ trợ `AbortSignal`;
- không tự toast, redirect, retry mutation hoặc biết nghiệp vụ Sale/Shift.

Quy tắc sử dụng:

1. Inertia navigation, page props và CRUD form thông thường tiếp tục dùng `router`/`useForm`.
2. POS checkout, offline sync, catalog cursor sync và polling dùng feature API qua common HTTP client.
3. Component không gọi `fetch` trực tiếp và không tự đọc CSRF meta.
4. API function trả domain DTO typed; hook quyết định UI message và state transition.
5. Không tạo một file `api.ts` toàn cục chứa endpoint của mọi domain.
6. Không đưa Axios vào nếu native `fetch` wrapper đáp ứng đủ nhu cầu.

### Exit criteria

- Không còn formatter tiền được khai báo lại ở mỗi page.
- Component không tự đọc CSRF meta.
- Lỗi request có một cách normalize và hiển thị nhất quán.

## 8. Pha 2 — Refactor POS theo lát cắt an toàn

POS là ưu tiên đầu vì có độ phức tạp và rủi ro cao nhất. Không rewrite toàn bộ một lần.

### Bước 2.1 — Tách type và pure logic

- Chuyển `Product`, `ProductUnit`, `CartLine`, `Customer`, `Shift`, `SaleReceipt` vào `features/pos/model/types.ts`.
- Tách các selector:
  - lọc catalog;
  - subtotal/discount/total;
  - paid/debt/change;
  - override required;
  - barcode exact match.
- Tách validation checkout thành hàm pure trả error theo field.
- Giữ selector và validation là pure logic, kiểm tra hành vi qua TypeScript/build và manual POS UAT trong milestone hiện tại.

### Bước 2.2 — Tách presentational component

Di chuyển JSX theo thứ tự ít rủi ro:

1. `PosStatusBar`;
2. `ProductCard` và `CatalogPanel`;
3. `CartTable`;
4. `CartSummary`;
5. `ReceiptPreview` và `SaleSuccessBar`;
6. `OpenShiftDialog`;
7. `InlineCheckout`.

Các component này chưa tự gọi API; nhận props và callback từ page/controller hook.

### Bước 2.3 — Tách state và command

- Dùng `usePosCart` hoặc `useReducer` cho add/update/remove/clear cart.
- Dùng `usePosCheckout` cho payment draft, validation, submit state và receipt.
- Dùng `usePosShortcuts` cho F3/F8/F9/F12/Enter/Escape và focus contract.
- Dùng `useConnectivity` hoặc `useOfflineSaleSync` cho online/offline events.
- Page chỉ compose các hook và component.

### Bước 2.4 — Tách API và offline gateway

- `pos-api.ts`: gửi sale và normalize response/error.
- `offline-sale-repository.ts`: chỉ CRUD IndexedDB.
- `offline-sale-sync.ts`: chỉ orchestration sync/retry.
- `catalog-cache-repository.ts`: cache catalog độc lập queue sale.
- Không để storage module tự quyết định UI message.

### Exit criteria

- `pages/pos/index.tsx` dưới 150–200 dòng.
- Page không gọi `fetch`, IndexedDB hoặc đọc CSRF trực tiếp.
- Cart/checkout selector và validation là pure logic, không làm thay đổi hành vi nghiệp vụ.
- Cash, QR, debt, owner PIN, offline, shortcut và receipt giữ nguyên hành vi.
- Không xuất hiện circular import giữa POS và shared components.

## 9. Pha 3 — Refactor các feature còn lại

Thực hiện từng feature, không di chuyển tất cả cùng lúc.

### Stock receipts

- Tách `StockReceiptForm`, `StockReceiptItemsTable`, `StockReceiptHistory`.
- Tách parser CSV/XLSX và mapping row thành module pure.
- Tách download file ra service.
- Sau đó ưu tiên chuyển file lớn sang backend import để giảm bundle `exceljs`.

### Products

- Tách `ProductForm`, `ProductUnitsEditor`, `ProductTable`.
- Dùng reducer/hook cho unit rows.
- Pure validation kiểm tra base/default unit trước submit.
- Type catalog dùng chung với POS chỉ chia sẻ contract cần thiết, không dùng chung toàn bộ view model.

### Shifts

- Tách `OpenShiftDialog`, `CashMovementDialog`, `CloseShiftDialog`, `ShiftTable`.
- Mỗi dialog sở hữu một Inertia form riêng.
- Tách tính tổng mệnh giá thành selector thuần, không chứa JSX.

### Sales

- Tách `SaleReceipt`, `SaleTotals`, `ReturnDialog`, `ReturnItemsTable`.
- Tách remaining return quantity và payload transform thành pure model.
- Dùng cùng `SaleReceipt` cho POS preview và trang hóa đơn nếu contract tương thích.

### Customers

- Tách `CustomerForm`, `CustomerTable`, `DebtPaymentDialog`.
- Tách balance calculation và payment validation.

### Exit criteria

- Mỗi Inertia page chủ yếu nhận props và compose feature.
- Form lỗi được hiển thị nhất quán.
- Không còn thuật toán import, money/debt/return calculation trong JSX.

## 10. Pha 4 — Chuẩn hóa starter code và shared shell

### Công việc

- Xác định `welcome.tsx` còn route thực hay chỉ là starter artifact; đánh dấu phạm vi cleanup sau khi xác nhận không dùng.
- Kiểm tra `app-header.tsx`, navigation menu và component starter để phân loại: đang dùng, dự kiến dùng hoặc candidate cleanup.
- Đưa navigation configuration ra module riêng, chuẩn bị lọc theo capability.
- Giữ shadcn component gần upstream; không nhúng business style trực tiếp vào primitive.
- Chỉ đưa component vào `shared` khi có ít nhất hai consumer thật.
- Giữ các UI primitive chưa dùng trong giai đoạn phát triển; không xóa chỉ để giảm số file.
- Vite tree-shaking là tiêu chí bundle: component không import không đi vào production chunk.

### Exit criteria

- Có inventory rõ component đang dùng, dự kiến dùng và candidate cleanup; chưa bắt buộc xóa component chưa dùng.
- Navigation có một nguồn cấu hình.
- Shared component không phụ thuộc feature cụ thể.

## 11. Pha 5 — Quality gates và UAT

### Quyết định cập nhật ngày 22/08/2026

- Không yêu cầu phủ Unit Test toàn bộ frontend hoặc viết test chỉ để tăng coverage cho phần refactor đã hoàn thành.
- Ngoại lệ đã chốt: Phase 0B được phép thêm Vitest + React Testing Library với jsdom làm harness tối thiểu cho regression P0 như shortcut/overlay scope, undo theo cart, offline reprice, checkout validation và Sync Center state/action.
- Ticket setup harness là việc đầu tiên của Phase 0B: thêm đúng dependency/script/lockfile cần thiết và một smoke test chạy được. Tài liệu này không tự cài dependency; thay đổi package chỉ thực hiện trong ticket implementation có review.
- Không dùng snapshot-only test làm bằng chứng cho correctness nghiệp vụ hoặc accessibility. Test phải thao tác như người dùng và assert state/action quan sát được.
- Browser UAT lặp lại vẫn bắt buộc cho focus thực, scanner keyboard, IndexedDB/service worker, mất/kết nối lại mạng và print 58 mm; jsdom không thay thế được các gate này.

Quyết định này thay thế câu “không thêm test runner” của bản plan trước. [`2026-08-21-204944-DANH-GIA-SOURCE-UX-VA-ROADMAP-MINIMART.md`](2026-08-21-204944-DANH-GIA-SOURCE-UX-VA-ROADMAP-MINIMART.md) quyết định phạm vi regression P0; tài liệu hiện tại là source of truth về dependency và quality gate frontend.

### Guardrail sau khi harness Phase 0B được thêm

```text
format:check
  → lint:check
  → typecheck
  → test:frontend
  → vite build
  → browser UAT cho luồng POS/P0 và thiết bị thật
```

Trước ticket setup Phase 0B, `package.json` chưa có frontend test runner hoặc script `test:frontend`; guardrail hiện hành vẫn chạy các bước đã tồn tại và browser/manual UAT.

## 12. Thứ tự ticket đề xuất

### Trạng thái triển khai

| Ticket | Trạng thái | Ghi chú |
|---|---|---|
| 1 | Đã triển khai code, chờ UAT production | Retirement worker, cleanup bootstrap và quy tắc không cache HTML đã áp dụng; cần xác nhận trên Hostinger. |
| 2 | Đã hoàn tất | Đã có `format:check`, `lint:check`, `typecheck`, `check` và import-boundary rules trong `eslint.config.js`; guardrail hiện pass. |
| 3 | Đã triển khai | Formatter, HTTP/CSRF client và `HttpError` dùng chung đã tạo. |
| 4 | Đã triển khai | POS types/selectors và checkout validation đã chuyển vào `features/pos/model`; regression P0 liên quan sẽ được bổ sung sau khi harness Phase 0B được thiết lập. |
| 5–7 | Đã hoàn tất code, chờ UAT | POS đã có `PosStatusBar`, `CatalogPanel`, `CartTable`, `CartSummary`, `OpenShiftDialog`, `ReceiptPreview` và `SaleSuccessBar`; còn manual UAT interaction. |
| 8 | Đã hoàn tất code, chờ UAT | `usePosCart`, `usePosCheckout`, `usePosShortcuts` và `useConnectivity` đã tách; còn manual UAT keyboard/offline. |
| 9 | Đã hoàn tất code, chờ UAT | POS API, IndexedDB sale repository, catalog cache repository và sync orchestration đã tách trong `features/pos/api`; cần kiểm tra luồng online/offline thực tế. |
| 10 | Đã hoàn tất code, chờ UAT | `pages/pos/index.tsx` còn 150 dòng và chỉ compose props, hook, feature components; còn full POS UAT. |
| 11 | Đã hoàn tất code, chờ UAT | Đã tách `StockReceiptForm`, `StockReceiptItemsTable`, `StockReceiptHistory`, parser CSV/XLSX và template download; còn manual UAT import/nhập kho. |
| 12 | Đã hoàn tất code, chờ UAT | Đã tách `ProductFormDialog`, `ProductUnitsEditor`, `ProductTable` và validation base unit; còn manual UAT CRUD/unit editor. |
| 13 | Đã hoàn tất code, chờ UAT | Đã tách `OpenShiftDialog`, `CashMovementDialog`, `CloseShiftDialog`, `ShiftTable` và selector đếm tiền; còn manual UAT chuyển trạng thái ca. |
| 14 | Đã hoàn tất code, chờ UAT | Đã tách `SaleReceipt`, `ReturnDialog`, `ReturnItemsTable` và model return payload; còn manual UAT đổi/trả và in receipt. |
| 15 | Đã hoàn tất code, chờ UAT | Đã tách `CustomerFormDialog`, `CustomerTable`, `DebtPaymentDialog` và selector công nợ; còn manual UAT thu nợ. |
| 16 | Đã hoàn tất audit/config, chờ cleanup decision | Navigation đã đưa ra `config/navigation.ts`; inventory starter được ghi nhận tại `docs/2026-08-12-213515-STARTER-SHELL-INVENTORY.md`. Candidate cleanup chỉ thực hiện sau xác nhận deployment. |

### Báo cáo tiến độ hiện tại

- **Pha 0:** đã hoàn thành phần code chính; P0 Service Worker còn chờ UAT production trên Hostinger.
- **Pha 1:** formatter, HTTP/CSRF, error normalization, guardrail và import-boundary rules đã hoàn tất.
- **POS foundation:** đã hoàn thành ticket 4 và ticket 5–10 theo thứ tự mới: model, UI components, hooks, API/offline gateway và page mỏng.
- **Guardrail:** `format:check`, `lint:check`, `typecheck` và `vite build` đang pass.
- **Pha 3:** đã hoàn tất code ticket 11–15; mỗi ticket còn manual UAT theo nghiệp vụ tương ứng.
- **Pha 4:** đã hoàn tất navigation config và starter inventory; candidate cleanup được giữ lại để tránh xóa nhầm entry point ngoài route map.
- **Unit Test:** loại khỏi milestone hiện tại; không dùng làm điều kiện hoàn thành các ticket nghiệp vụ.

1. Xử lý P0 Service Worker `/pos`: phát hành worker retirement, tự unregister/xóa cache cũ, tạm tắt đăng ký mới và UAT production khi bypass tắt.
2. Thêm `typecheck`, `lint:check`, `check` scripts và import boundary rules.
3. Tạo shared formatters và error normalization.
4. Tách POS types và selectors.
5. Tách `PosStatusBar` và `CatalogPanel` (product card có thể tiếp tục colocation trong catalog cho đến khi có consumer thứ hai).
6. Tách `CartTable`, `CartSummary`.
7. Tách `InlineCheckout`, `OpenShiftDialog`, `ReceiptPreview`, `SaleSuccessBar`.
8. Tạo `usePosCart`, `usePosCheckout`, `usePosShortcuts`.
9. Tách POS API, IndexedDB repository và sync service.
10. Làm mỏng `pages/pos/index.tsx` và chạy full POS UAT.
11. Refactor stock receipt/import.
12. Refactor products/unit editor.
13. Refactor shifts.
14. Refactor sales/return/receipt.
15. Refactor customers/debt.
16. Phân loại `welcome.tsx` và starter components; chỉ cleanup sau khi backlog xác nhận không cần.

> Ghi chú phạm vi: Unit Test, component test và browser E2E được loại khỏi roadmap triển khai hiện tại. Nếu cần, chúng sẽ được lập thành milestone chất lượng riêng sau khi các feature nghiệp vụ ổn định.

## 13. Definition of Done cho mỗi ticket refactor

- Không thay đổi hành vi nghiệp vụ ngoài acceptance criteria của ticket.
- TypeScript, format, lint và build pass.
- Pure logic mới tách phải có type contract rõ và được kiểm tra qua guardrail/manual UAT phù hợp; chưa bắt buộc viết Unit Test.
- Không thêm URL raw, formatter lặp hoặc type domain trùng.
- Không import ngược từ `ui/shared/lib` vào `features/pages`.
- Loading, validation, error, offline và permission state được giữ nguyên hoặc tốt hơn.
- Nếu ticket liên quan Service Worker/cache, Inertia navigation phải được kiểm thử với Bypass for network tắt và trên trình duyệt đã từng cài worker phiên bản cũ.
- Keyboard/focus contract của POS không regression.
- Diff đủ nhỏ để review và rollback riêng.
- Cập nhật trạng thái plan sau khi UAT, không đánh dấu hoàn thành chỉ vì đã di chuyển file.

## 14. Những việc không nên làm trong refactor này

- Không rewrite toàn bộ frontend trong một branch lớn.
- Không đưa Redux/Zustand vào chỉ để thay `useState`; trước hết dùng reducer và feature hook.
- Không tạo `atoms/molecules/organisms` chỉ để đổi tên folder.
- Không gom mọi type vào một file `types.ts` toàn cục.
- Không tạo component dùng chung trước khi có consumer thứ hai.
- Không đồng thời đổi kiến trúc, giao diện và API contract trong cùng ticket.
- Không chuyển logic tiền/tồn sang client; server vẫn là nguồn authoritative.
- Không đưa Ant Design hoặc UI framework thứ hai vào song song với shadcn/Radix.
- Không xóa UI primitive chỉ vì chưa có consumer tại thời điểm audit.
