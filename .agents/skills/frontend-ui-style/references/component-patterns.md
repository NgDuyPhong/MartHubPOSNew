# Component Patterns

Đọc file này khi tạo hoặc sửa page layout, form, table, Card, Dialog, action hierarchy, shared component hoặc async states.

## Mục lục

- [Page layout](#page-layout)
- [Component selection](#component-selection)
- [Forms](#forms)
- [Data tables](#data-tables)
- [Cards](#cards)
- [Dialog và Sheet](#dialog-và-sheet)
- [Action hierarchy](#action-hierarchy)
- [Async và collection states](#async-và-collection-states)
- [Accessibility](#accessibility)
- [Interaction states](#interaction-states)

## Page layout

Dùng cấu trúc quản trị nhất quán:

```text
Page
├── PageHeader
│   ├── Title
│   ├── Description
│   └── Actions
└── PageContent
    ├── Filters / Toolbar
    └── Main Content
```

Giữ Inertia page làm adapter mỏng. Không đặt request trực tiếp, IndexedDB access hoặc thuật toán nghiệp vụ trong page JSX.

## Component selection

Kiểm tra theo thứ tự trước khi tạo component:

1. Primitive phù hợp đã có trong `components/ui` chưa?
2. Pattern dùng chung đã có trong `components/shared` chưa?
3. Feature khác có pattern tương tự và contract đủ ổn định để chia sẻ chưa?
4. Component mới có thật sự generic hay chỉ thuộc feature hiện tại?

Không sửa primitive để phục vụ riêng một màn. Đặt business component trong feature và compose primitive qua props/callback.

## Forms

Dùng Inertia `useForm` cho CRUD form và Laravel validation hiện tại. Mỗi dialog/form nên sở hữu form state của chính nó.

Cấu trúc field:

```text
Label
  ↓ 8 px
Control
Description hoặc Error
```

Nhóm field theo nghiệp vụ; không tạo danh sách field dài không có section. Đặt primary action rõ ràng, thường ở cuối/phía phải trên desktop. Tách destructive action khỏi primary action và yêu cầu confirmation khi hậu quả khó hoàn tác.

Không thêm React Hook Form hoặc Zod nếu dependency chưa được duyệt. Validation ảnh hưởng tiền, tồn kho hoặc quyền phải được server xác nhận; client validation chỉ cải thiện trải nghiệm.

## Data tables

Dùng table hiện tại cho bảng đơn giản. Cung cấp khi phù hợp:

- server-side pagination/filtering;
- loading, empty và error state;
- responsive overflow hoặc layout thay thế;
- action hierarchy rõ, không nhồi nhiều button vào từng row.

Chỉ dùng Dropdown cho secondary actions khi discoverability vẫn đủ. Chỉ xem xét TanStack Table khi client-side interaction phức tạp chứng minh nhu cầu và dependency đã được duyệt.

## Cards

Dùng Card để thể hiện grouping hoặc hierarchy, không dùng Card như wrapper mặc định cho mọi section. Tránh Card lồng Card nếu border, spacing hoặc heading đã đủ biểu đạt nhóm.

## Dialog và Sheet

Dùng Dialog cho:

- confirmation;
- task ngắn, ít field;
- nội dung không cần URL hoặc navigation riêng.

Dùng page, inline panel hoặc Sheet cho workflow dài/phức tạp. Không render Inertia page/navigation response trong Dialog hoặc iframe.

Kích thước tham khảo:

- Small: 400–480 px.
- Normal: 500–640 px.
- Large: 720–900 px.

Cho phép nội dung scroll khi cần, nhưng giữ title và action dễ tìm. Khi dùng mobile Sheet làm navigation, đóng Sheet sau khi Inertia navigation thành công.

## Action hierarchy

Phân loại action:

```text
Primary → Secondary → Ghost → Destructive
```

Một khu vực thường chỉ có một primary action. Không dùng màu primary cho mọi button. Icon-only button phải có accessible name/tooltip phù hợp.

## Async và collection states

Xem xét đầy đủ:

- initial loading;
- background refresh;
- empty collection;
- recoverable error và retry;
- disabled/processing state;
- permission restriction;
- stale/offline state nếu có.

Dùng Skeleton khi cần giữ layout ổn định. Empty state nên có title, mô tả và action phù hợp. Error message phải nói điều gì thất bại và người dùng có thể làm gì tiếp theo.

## Accessibility

- Dùng semantic HTML.
- Giữ visible focus state.
- Hỗ trợ keyboard navigation.
- Gắn Label với form control.
- Thêm ARIA khi semantic HTML chưa đủ.
- Không dùng màu làm tín hiệu duy nhất.
- Dùng `<button>` cho action và Inertia `Link`/anchor cho navigation.
- Kiểm tra contrast và accessible name cho icon-only control.
- Ưu tiên accessibility behavior của Radix thay vì tự xây interaction phức tạp.

## Interaction states

Kiểm tra các state có liên quan: default, hover, focus, active, selected, disabled, loading và error. Không loại bỏ focus outline nếu chưa có replacement rõ ràng.
