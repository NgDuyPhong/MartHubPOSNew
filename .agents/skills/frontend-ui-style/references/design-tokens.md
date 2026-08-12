# Design Tokens and Visual Scale

Đọc file này khi task liên quan spacing, typography, color, radius, shadow, animation, control size hoặc responsive layout.

## Mục lục

- [Spacing](#spacing)
- [Page padding và content width](#page-padding-và-content-width)
- [Typography](#typography)
- [Control sizes](#control-sizes)
- [Radius và shadow](#radius-và-shadow)
- [Color](#color)
- [Visual hierarchy](#visual-hierarchy)
- [Animation](#animation)
- [Responsive](#responsive)

## Spacing

Dùng 4 px grid và Tailwind spacing scale:

| Quan hệ | Khoảng cách ưu tiên |
| --- | --- |
| Icon với text | 4–8 px |
| Label với control | 8 px |
| Các phần tử cùng nhóm | 8–12 px |
| Các field trong form | 16–24 px |
| Nội dung Card | 16–24 px |
| Card với Card | 16–24 px |
| Các section của page | 32–48 px |
| Major section | 48–64 px |

Ưu tiên `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`, `gap-10`, `gap-12`, `gap-16`. Chỉ dùng arbitrary value khi có specification rõ, không có token phù hợp và giá trị thật sự cần thiết.

Dùng parent để điều khiển spacing giữa children:

```tsx
<div className="flex flex-col gap-4">
```

Không tạo chuỗi `mb-*` lặp trên từng child nếu `gap` giải quyết được.

## Page padding và content width

Padding mặc định:

```tsx
className="p-4 md:p-5 lg:p-6"
```

Điều chỉnh theo pattern page đang tồn tại, không tạo padding khác nhau cho từng feature nếu không có lý do.

Giới hạn chiều rộng theo mục đích:

- Form: khoảng 640–800 px.
- Nội dung quản trị thông thường: khoảng 1200–1440 px.
- Dashboard và data table: có thể dùng toàn bộ chiều rộng khả dụng.
- POS: dùng chiều rộng khả dụng để giữ catalog và cart cùng lúc khi màn hình cho phép.

## Typography

| Vai trò | Kích thước/dòng | Weight |
| --- | --- | --- |
| Page title | 24/32 px | 600 |
| Section title | 18/28 px | 600 |
| Card title | 16/24 px | 500–600 |
| Body | 14/20 px | 400 |
| Small/supporting | 12/16 px | 400–500 |

Dùng `font-normal`, `font-medium`, `font-semibold` và chỉ dùng `font-bold` khi hierarchy thật sự cần. Không dùng arbitrary font size chỉ vì “nhìn đẹp hơn”.

## Control sizes

Giữ Button, Input, Select và control cùng toolbar có chiều cao tương đồng:

- Small: 32 px.
- Default: 36–40 px.
- Large/touch emphasis: 44–48 px.

Giữ icon size nhất quán:

- Small: 14 px.
- Default: 16 px.
- Medium: 18–20 px.
- Large: 24 px.

## Radius và shadow

Dùng radius token từ theme/shadcn:

- Small: 4 px.
- Medium: 6 px.
- Large: 8 px.
- Extra large: 12 px.

Ưu tiên hierarchy `border → subtle shadow → elevated shadow`. Card thường dùng border hoặc shadow nhẹ; Popover, Dropdown và Dialog có thể có elevation cao hơn.

## Color

Dùng semantic token có trong `resources/css/app.css`:

```text
background / foreground
card / card-foreground
popover / popover-foreground
primary / primary-foreground
secondary / secondary-foreground
muted / muted-foreground
accent / accent-foreground
destructive / destructive-foreground
border / input / ring
sidebar-* / chart-*
```

Ưu tiên:

```tsx
className="bg-primary text-primary-foreground"
```

Không hard-code hex hoặc tạo hệ màu riêng trong feature. Khi project/component hỗ trợ dark mode, dùng semantic token hoặc variant phù hợp thay vì `bg-white text-black` cố định.

## Visual hierarchy

Thể hiện rõ thứ tự:

```text
Primary
  → Secondary
    → Supporting
      → Muted
```

Không để mọi text đều `font-semibold text-foreground`. Mỗi khu vực thường chỉ có một primary action.

## Animation

Dùng animation 150–250 ms cho Dropdown, Dialog, Tooltip, Accordion, hover hoặc state transition khi giúp người dùng hiểu thay đổi. Tránh animation layout lớn, gradient trang trí, glassmorphism và shadow mạnh không phục vụ công việc.

## Responsive

Dùng breakpoint chuẩn của Tailwind. Không tạo breakpoint arbitrary nếu chưa có yêu cầu thiết bị cụ thể.

- Management page: ưu tiên mobile-first và xếp toolbar/filter thành nhiều dòng khi thiếu chỗ.
- POS: ưu tiên desktop/tablet; bảo toàn vùng cart, total và action chính trước khi giảm nội dung hỗ trợ.
- Không chỉ ẩn overflow để che lỗi; cho table cuộn ngang hoặc chuyển thành pattern mobile có chủ đích.
