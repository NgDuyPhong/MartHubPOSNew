---
name: frontend-ui-style
description: "Review, design, and implement consistent frontend UI for MartHub POS using Laravel Inertia React, TypeScript, Tailwind CSS v4, shadcn/ui, Radix UI, and Lucide React. Use when creating or modifying pages, layouts, forms, tables, dialogs, sheets, responsive behavior, visual hierarchy, spacing, typography, colors, accessibility, keyboard interaction, POS workflows, or shared UI patterns."
---

# Frontend UI Style

Áp dụng các quy tắc trong skill này khi tạo, sửa hoặc review giao diện MartHub POS.

## Stack và nguồn quyết định

Làm việc theo stack hiện tại:

- Laravel 12 và Inertia.js 2;
- React 19 và TypeScript strict;
- Tailwind CSS 4 theo CSS-first configuration;
- shadcn/ui và Radix UI làm UI primitives;
- Lucide React làm icon system;
- Inertia `Link`, `router` và `useForm` cho page navigation và form thông thường.

Ưu tiên nguồn quyết định theo thứ tự:

1. Hành vi nghiệp vụ và acceptance criteria của task.
2. Component, token và pattern đang vận hành trong source.
3. Tài liệu kiến trúc tại `docs/PLAN-REFACTOR-FRONTEND.md`.
4. Quy tắc trong skill này và các reference đi kèm.

Không áp dụng pattern generic nếu nó xung đột với hành vi POS hiện có.

## Quy trình bắt buộc

Trước khi sửa UI:

1. Đọc page, component và layout đang liên quan.
2. Kiểm tra `resources/css/app.css`, `resources/js/components/ui` và pattern gần nhất đang được sử dụng.
3. Xác định task thuộc management page, shared pattern hay operational POS.
4. Xác định đầy đủ loading, empty, error, disabled, permission, online/offline và responsive states có liên quan.
5. Giữ nguyên keyboard/focus contract, Inertia navigation và print behavior nếu task không yêu cầu thay đổi.

Khi implement:

1. Dùng semantic tokens và primitive hiện có trước.
2. Compose feature component từ primitive; không nhúng business logic vào `components/ui`.
3. Giữ state ở owner gần nhất; không thêm global store để giải quyết state cục bộ.
4. Giữ request và side effect ngoài presentational component.
5. Chỉ tạo shared component khi có ít nhất hai consumer thật hoặc contract đã được chốt rõ.
6. Sửa trong phạm vi task; không đổi visual language hoặc refactor ngoài scope.

Sau khi implement:

1. Kiểm tra desktop, tablet và mobile phù hợp với loại màn hình.
2. Kiểm tra keyboard, focus, accessible label và contrast.
3. Kiểm tra Inertia navigation không tạo full-page HTML trong dialog/iframe.
4. Chạy format, TypeScript và build theo mức độ thay đổi.

## Dependency và component direction

Tuân thủ hướng phụ thuộc:

```text
pages
  → features
      → components/shared
          → components/ui
      → lib
  → layouts
```

Áp dụng các giới hạn:

- Giữ Inertia page mỏng: nhận props, khai báo layout và compose feature.
- Đặt business component trong `features/<feature>/components`.
- Đặt hook, API, type, selector và validation chỉ thuộc một feature gần feature đó.
- Không đưa `Sale`, `Product`, `Shift` hoặc URL nghiệp vụ vào `components/ui`.
- Không import ngược từ `lib`, `components/ui` hoặc `components/shared` vào feature/page.
- Không tạo toàn cục `components`, `hooks`, `schemas`, `types`, `api` cho mọi domain.

Cấu trúc feature ưu tiên:

```text
features/<feature>/
├── api/
├── components/
├── hooks/
├── model/
│   ├── types.ts
│   ├── selectors.ts
│   └── validation.ts
└── index.ts
```

Chỉ tạo thư mục khi có code thật cần đặt vào đó.

## Quy tắc UI cốt lõi

- Ưu tiên consistency, clarity, efficiency và predictable interaction.
- Dùng token thay cho màu, radius, spacing hoặc shadow hard-code.
- Dùng `gap` và padding do parent quản lý thay cho chuỗi margin ngẫu nhiên.
- Tránh arbitrary values khi scale Tailwind hoặc token đã đáp ứng được.
- Giữ một primary action rõ ràng trong mỗi khu vực.
- Không bọc mọi section bằng Card và không lồng Card nếu hierarchy không yêu cầu.
- Chỉ dùng Dialog cho confirmation hoặc task ngắn; dùng page, inline panel hoặc Sheet cho workflow dài.
- Dùng semantic HTML, visible focus, keyboard navigation và accessible label.
- Không dùng màu sắc làm tín hiệu duy nhất.
- Không thêm Ant Design, MUI, Bootstrap hoặc icon library thứ hai.

## Quy trình quyết định Select

Trước khi tạo hoặc sửa bất kỳ select nào, phải xác định rõ dùng select thường hay searchable select. Không mặc định thêm ô tìm kiếm cho mọi danh sách.

Đánh giá theo các tiêu chí sau:

1. **Loại dữ liệu và số lượng lựa chọn**:
   - Dùng select thường (native select hoặc Radix Select hiện có) cho boolean, trạng thái, thứ tự sắp xếp, enum hoặc danh sách ngắn, ổn định; người dùng có thể nhìn và chọn nhanh.
   - Dùng searchable select khi danh sách dài, có nhiều bản ghi tương tự, hoặc việc gõ tên/mã giúp nhanh hơn việc cuộn.
2. **Tần suất và ngữ cảnh thao tác**:
   - Filter nhanh với vài trạng thái cố định nên dùng select thường.
   - Danh mục, đơn vị, khách hàng, sản phẩm hoặc mã có thể tăng theo dữ liệu nghiệp vụ thường cần searchable select.
   - Trong POS, ưu tiên tốc độ, keyboard và barcode flow; không thêm searchable select nếu thao tác chính đã là quét barcode hoặc danh sách đủ ngắn để chọn trực tiếp.
3. **Nguồn dữ liệu**:
   - Danh sách nhỏ đã có sẵn ở client: dùng select thường hoặc searchable select tùy lợi ích thực tế.
   - Danh sách lớn từ server: dùng searchable select/combobox với query server, debounce, loading, empty và error state; không tải toàn bộ dataset chỉ để phục vụ một select.
   - Searchable select chỉ lọc client khi dataset đủ nhỏ và ổn định; debounce chỉ dùng khi giúp giảm re-render hoặc request, không làm chậm phản hồi nhập liệu.
4. **Khả năng nhận biết lựa chọn**:
   - Nếu người dùng cần tìm theo tên, mã, SKU, barcode hoặc nhiều trường, cấu hình `searchText`/query tương ứng và hiển thị placeholder, empty state, clear state và selected state rõ ràng.
   - Nếu lựa chọn chỉ có vài giá trị dễ nhận biết, ô search tạo thêm bước và làm giảm discoverability; không sử dụng.

Trước khi implement, ghi lại ngắn gọn quyết định và lý do trong plan hoặc phần mô tả task. Nếu số lượng dữ liệu, nguồn dữ liệu hoặc workflow chưa đủ rõ để chọn loại select, phải hỏi lại người đưa ra yêu cầu trước khi code. Khi code review, reviewer phải kiểm tra cả quyết định “có search hay không”, không chỉ kiểm tra visual của component.

## Quy tắc dependency bổ sung

- Dùng Inertia `useForm` và Laravel validation cho CRUD form hiện tại.
- Chỉ thêm React Hook Form hoặc Zod khi đã được duyệt dependency và complexity của form chứng minh nhu cầu.
- Dùng table hiện có cho bảng đơn giản.
- Chỉ xem xét TanStack Table khi có sorting, filtering, selection hoặc column visibility phức tạp phía client.
- Không cài package chỉ để chuẩn bị cho khả năng có thể dùng sau này.

## Quy tắc riêng cho POS

- Ưu tiên tốc độ thao tác, mật độ thông tin hợp lý và khả năng quét barcode.
- Giữ catalog và cart ổn định; không làm layout nhảy khi loading hoặc cập nhật số lượng.
- Giữ keyboard shortcut và focus contract khi tách hoặc sửa component.
- Không đưa checkout nhiều bước vào Dialog; ưu tiên inline checkout.
- Hiển thị rõ online, offline, pending sync và sync error.
- Không làm hỏng IndexedDB queue, reconnect sync hoặc owner override restrictions.
- Bảo toàn receipt và print CSS khổ 58 mm.
- Giữ touch target đủ dùng cho tablet/màn hình cảm ứng.
- Với màn POS, ưu tiên desktop/tablet operational layout và cung cấp fallback an toàn trên màn hình nhỏ.
- Với management page, áp dụng responsive/mobile-first theo pattern chung.

## Reference routing

Đọc reference phù hợp trước khi thực hiện task:

- Đọc [references/design-tokens.md](references/design-tokens.md) khi sửa spacing, typography, color, radius, control size, shadow, animation hoặc responsive scale.
- Đọc [references/component-patterns.md](references/component-patterns.md) khi tạo/sửa page layout, form, table, Card, Dialog, action hierarchy hoặc async states.
- Đọc [references/pos-interaction.md](references/pos-interaction.md) khi task chạm POS, barcode, cart, checkout, shift, offline sync, keyboard/focus hoặc receipt.

Nếu task chạm nhiều nhóm, đọc tất cả reference liên quan. Không tải reference không liên quan chỉ để làm một thay đổi nhỏ.

## Definition of Done

Chỉ kết thúc UI task khi các mục liên quan đã đạt:

- Dùng đúng Design System và dependency direction.
- Không tạo token, arbitrary value hoặc component trùng không cần thiết.
- Typography, spacing, control và action hierarchy nhất quán.
- Loading, empty, error, disabled và permission states được xử lý khi có.
- Responsive behavior phù hợp với management page hoặc POS.
- Hover, focus, active, selected và keyboard behavior không regression.
- Light/dark theme không bị phá ở component đang hỗ trợ theme.
- Inertia navigation, offline behavior và print behavior liên quan không regression.
- TypeScript và production build pass khi thay đổi có ảnh hưởng đến code.
