# Kế hoạch cải thiện UI/UX DateRangeFilter

## 1. Mục tiêu và kết luận

Mục tiêu của thay đổi là đưa `DateRangeFilter` về cùng nhịp chiều cao với các control trong `FilterBar`, đồng thời nâng cấp trải nghiệm chọn khoảng ngày theo hướng nhanh, rõ và dễ dùng hơn mà không thêm Ant Design hoặc package date picker mới.

Kết luận thiết kế:

1. Dùng `h-10` (40 px) của `SearchableSelect`, `NativeSelect`, `Input` và `SearchField` làm chuẩn chiều cao control trong toolbar.
2. Bỏ hàng tiêu đề `Khoảng ngày` nằm phía trên trigger. Hai nhãn `Từ ngày` và `Đến ngày` vẫn phải nhìn thấy, nhưng chuyển vào cùng một hàng bên trong trigger 40 px.
3. Đưa nút xóa vào cuối control dưới dạng action liền kề, không lồng button trong button và không làm chiều cao thay đổi khi có giá trị.
4. Giữ API ngoài hiện tại (`from`, `to`, `onFromChange`, `onToChange`, `min`, `max`, `disabled`, `error`) để Sales và Shifts không phải đổi contract.
5. Popup dùng draft nội bộ. Chọn thủ công chỉ cập nhật query sau khi bấm `Áp dụng`; đóng bằng Escape/click ngoài tương đương hủy draft. Preset hợp lệ áp dụng ngay và đóng popup.
6. Bổ sung điều hướng ngày/tháng/năm, chọn nhanh khoảng phổ biến, chọn hôm nay, clear từng mốc và keyboard interaction.
7. Không thay đổi `SearchableSelect`; component này hiện đã đúng chuẩn `h-10` và chỉ được dùng làm baseline so sánh.

## 2. Phạm vi source đã audit

- `resources/js/components/shared/date-range-filter.tsx`;
- `resources/js/components/shared/date-range-filter.test.tsx`;
- `resources/js/components/ui/searchable-select.tsx`;
- `resources/js/components/ui/native-select.tsx`;
- `resources/js/components/shared/search-field.tsx`;
- `resources/js/components/shared/filter-bar.tsx`;
- consumer tại `resources/js/pages/sales/index.tsx` và `resources/js/pages/shifts/index.tsx`;
- query behavior tại `resources/js/hooks/use-list-query.ts`;
- token và control scale tại `resources/css/app.css` cùng frontend UI rules của dự án.

Nguồn tham khảo hành vi: [Ant Design DatePicker/RangePicker](https://ant.design/components/date-picker/), tập trung vào `presets`, chuyển panel `date/month/year`, `minDate`, `maxDate`, `allowClear`, trạng thái lỗi và cơ chế xác nhận.

## 3. Phân tích UI hiện tại

### 3.1. Nguyên nhân lệch chiều cao

`SearchableSelect` dùng input `h-10`, nên chiều cao control cố định là 40 px.

`DateRangeFilter` hiện có hai tầng:

- Tầng trên là hàng `Khoảng ngày` và nút xóa;
- Tầng dưới là trigger có padding ngoài, mỗi nửa lại có hai dòng `Từ ngày/Đến ngày` và giá trị ngày.

Riêng trigger đã xấp xỉ 64 px do `p-1`, `py-2`, hai dòng text và `gap-1`. Toàn field còn cao hơn vì có header và `gap-2`. Khi đã có giá trị, nút xóa `size-8` làm header cao hơn trạng thái rỗng, vì vậy control còn có thể nhảy chiều cao theo state.

Trên mobile, trigger chưa có grid column trước breakpoint `sm`, nên hai segment ngày xếp dọc trong khi mũi tên bị ẩn. Đây là nguyên nhân làm control cao thêm và không đồng nhất với toolbar mobile.

### 3.2. Các điểm UX còn thiếu

- Chỉ có nút tháng trước/tháng sau; muốn đi tới tháng hoặc năm xa phải bấm nhiều lần.
- Không có panel chọn tháng, panel chọn năm hoặc điều hướng theo thập niên.
- Không có preset như hôm nay, 7 ngày qua, tháng này hoặc tháng trước.
- Nút xóa cả khoảng nằm xa trigger; không thể xóa riêng mốc bắt đầu/kết thúc.
- Chọn mốc đầu gọi callback ngoài ngay. Hai page consumer dùng `useListQuery`, nên thao tác chọn một khoảng hoàn chỉnh có thể tạo một request trung gian không cần thiết trước khi người dùng chọn mốc cuối.
- Popup tự đóng ngay khi chọn đủ hai mốc, không có bước xem lại hoặc hủy thay đổi.
- `visibleMonth` chỉ khởi tạo từ props một lần; sau reset filter hoặc đổi query từ bên ngoài, tháng đang hiển thị có thể không đồng bộ với giá trị hiện tại.
- Popup neo cố định bên trái. Nội dung hai tháng có nguy cơ tràn cạnh phải ở toolbar hẹp.
- Lưới ngày có semantic cơ bản nhưng chưa có roving focus và điều hướng bằng phím mũi tên như một calendar widget hoàn chỉnh.
- Chưa có preview khoảng khi người dùng đang chọn mốc kết thúc.

### 3.3. Điểm đang làm tốt cần giữ

- Giá trị query dùng local date `YYYY-MM-DD`, so sánh chuỗi đúng thứ tự thời gian.
- Có validation `from > to`, `aria-invalid`, `aria-describedby` và `FieldError`.
- Có giới hạn `min`/`max`, trạng thái disabled và đánh dấu hôm nay.
- Desktop hiển thị hai tháng liên tiếp; mobile chỉ hiển thị một tháng.
- Label `Từ ngày` và `Đến ngày` đang nhìn thấy, đúng rule đã chốt của dự án.
- Không phụ thuộc date library và không đưa request/Inertia vào shared component.

## 4. Thiết kế đề xuất

### 4.1. Trigger 40 px

Control mới là một group `h-10` gồm:

```text
[Lịch]  Từ ngày  20/08/2026  →  Đến ngày  24/08/2026  [X]
```

Quy tắc:

- `CalendarDays` ở đầu để nhận biết loại filter;
- `Từ ngày` và `Đến ngày` là text phụ nhìn thấy trong cùng hàng, không chuyển thành label chỉ dành cho screen reader;
- Giá trị dùng `dd/MM/yyyy`; khi trống hiển thị `Chọn ngày`;
- Ngày dùng `tabular-nums` để độ rộng ổn định;
- Segment được truncate có chủ đích khi toolbar hẹp, không làm tăng chiều cao;
- Nút clear là sibling của `PopoverButton`, không lồng interactive element;
- trạng thái empty, selected, error và disabled đều giữ đúng 40 px;
- lỗi vẫn nằm dưới field khi có, nhưng chiều cao control chính không đổi.

Responsive:

- Mobile vẫn là một hàng 40 px; ưu tiên hiển thị hai nhãn và hai giá trị ngắn;
- Khi rất hẹp, icon và mũi tên có thể giảm ưu tiên/ẩn theo breakpoint, nhưng không ẩn `Từ ngày` hoặc `Đến ngày`;
- Desktop cho component co giãn trong phần còn lại của `FilterBar`; `NativeSelect` bên cạnh vẫn giữ `h-10` và bottom alignment.

### 4.2. Cấu trúc popup

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│ Preset       │  ‹   [Tháng 8] [2026]   →   [Tháng 9]   ›   │
│ Hôm nay      │                                              │
│ Hôm qua      │       lịch tháng 8       lịch tháng 9       │
│ 7 ngày qua   │                                              │
│ 30 ngày qua  │                                              │
│ Tháng này    ├──────────────────────────────────────────────┤
│ Tháng trước  │  Từ ngày …  →  Đến ngày …   Xóa   Áp dụng   │
│ Năm nay      │                                              │
└──────────────────────────────────────────────────────────────┘
```

Mobile:

- Preset chuyển thành hàng chip cuộn ngang ở trên;
- Chỉ hiển thị một tháng;
- Footer action luôn dễ chạm, không tràn viewport;
- popup dùng chiều rộng tối đa theo viewport và tự chọn hướng neo phù hợp.

Không dùng Card lồng nhau, gradient, shadow mạnh hoặc màu riêng. Dùng semantic token `popover`, `muted`, `accent`, `primary`, `border`, `ring` và radius hiện có.

### 4.3. Chuyển nhanh ngày/tháng/năm

Calendar có ba mode nội bộ:

1. `date`: lưới ngày mặc định;
2. `month`: 12 tháng của năm đang xem;
3. `year`: lưới năm của thập niên đang xem.

Interaction:

- Bấm tên tháng mở mode `month`;
- Bấm năm mở mode `year`;
- Chọn năm quay về mode `month` của năm đó;
- Chọn tháng quay về mode `date` tại tháng đó;
- Nút trước/sau thay đổi theo mode: tháng, năm hoặc thập niên;
- `min`/`max` vô hiệu hóa tháng/năm không còn ngày hợp lệ;
- action `Về hôm nay` chỉ điều hướng calendar về tháng hiện tại mà không đổi draft;
- preset `Hôm nay` chọn và áp dụng khoảng `today → today` ngay lập tức.

Việc chọn tháng/năm ở đây chỉ để điều hướng nhanh tới ngày cụ thể. Không đổi ý nghĩa filter thành “lọc theo cả tháng” hoặc “lọc theo cả năm”, vì contract backend hiện vẫn nhận hai ngày chính xác.

### 4.4. Preset phù hợp nghiệp vụ

Danh sách mặc định:

- Hôm nay;
- Hôm qua;
- 7 ngày qua, tính cả hôm nay;
- 30 ngày qua, tính cả hôm nay;
- Tháng này;
- Tháng trước;
- Năm nay.

Quy tắc preset:

- Tính theo ngày local của trình duyệt và xuất `YYYY-MM-DD`, phù hợp contract hiện tại;
- Preset vượt toàn bộ `min`/`max` bị disabled;
- Preset giao một phần với giới hạn được clamp vào biên hợp lệ và label/accessibility phải thể hiện trạng thái đã giới hạn;
- Click preset hợp lệ gọi hai callback trong cùng event, đóng popup và chỉ tạo một vòng cập nhật query;
- Không thêm preset quý, tuần ISO, thời gian hoặc custom business range khi chưa có consumer thật.

### 4.5. Draft, áp dụng và hủy

- Khi mở popup, copy `from/to` hiện tại vào `draftFrom/draftTo` và đồng bộ `visibleMonth` theo mốc có giá trị gần nhất;
- Chọn ngày đầu đặt mốc bắt đầu và chuyển active boundary sang mốc kết thúc;
- Chọn ngày kết thúc trước mốc bắt đầu thì tạo lại range theo thứ tự thời gian, tránh để người dùng mắc kẹt trong lỗi đảo range do thao tác calendar;
- Cho phép bấm segment `Từ ngày` hoặc `Đến ngày` trong popup để sửa riêng từng mốc;
- Cho phép xóa riêng một mốc, nhờ đó vẫn hỗ trợ from-only và to-only;
- `Áp dụng` chỉ disabled khi draft bị đảo hoặc ngoài `min`/`max`;
- `Xóa` trong footer xóa draft; `Áp dụng` mới commit trạng thái rỗng;
- Escape, click ngoài hoặc đóng popup không commit draft;
- prop thay đổi từ reset/navigation trong lúc popup đóng phải đồng bộ ở lần mở tiếp theo.

### 4.6. Keyboard và accessibility

- Giữ `fieldset`/group name `Khoảng ngày` và accessible name `Chọn khoảng ngày`;
- Visible focus ring dùng token `ring`;
- Lưới ngày dùng một tab stop với roving focus;
- `ArrowLeft/Right/Up/Down` di chuyển 1 ngày/1 tuần;
- `Home/End` về đầu/cuối tuần;
- `PageUp/PageDown` đổi tháng, thêm `Shift` để đổi năm;
- Enter/Space chọn ngày;
- Escape đóng và trả focus về trigger;
- thông báo trạng thái đang chọn `Từ ngày` hay `Đến ngày` qua text nhìn thấy và vùng `aria-live` ngắn;
- ngày disabled không focus/chọn được; ngày hiện tại, selected boundary và in-range không chỉ phân biệt bằng màu.

## 5. Kế hoạch implementation

### Bước 1 — Chuẩn hóa date helpers và state

- Giữ helper date thuần trong file shared hoặc tách file cạnh component nếu kích thước component vượt mức dễ đọc;
- bổ sung helper start/end of day range, start/end of month/year, add days/years, clamp và preset;
- dùng một giá trị `today` được tính khi mở popup để toàn bộ preset/calendar nhất quán trong cùng phiên chọn;
- thêm draft state, active boundary và panel mode;
- đồng bộ state khi popup mở thay vì chỉ khởi tạo tại mount.

### Bước 2 — Refactor trigger

- Đưa trigger về `h-10`;
- chuyển label sang inline;
- đặt clear action cùng group mà không tạo nested button;
- giữ error/disabled/focus contract;
- xác nhận Sales có cùng baseline với `NativeSelect` ở hàng filter thứ hai.

### Bước 3 — Nâng cấp calendar panel

- Tách các presentational block `DateGrid`, `MonthGrid`, `YearGrid`, `PresetList` nếu cần để giảm độ phức tạp;
- thêm month/year switcher và navigation theo mode;
- thêm preview range, active boundary và clear từng mốc;
- thêm responsive một/tháng và hai/tháng;
- giới hạn vị trí/kích thước popup theo viewport.

### Bước 4 — Hoàn thiện commit behavior

- Manual selection commit khi bấm `Áp dụng`;
- preset commit ngay;
- đóng không áp dụng phải khôi phục props hiện tại;
- gọi `onFromChange` và `onToChange` đồng bộ trong cùng action để React batch update và `useListQuery` chỉ phát một request sau debounce;
- không import router hoặc business query vào component.

### Bước 5 — Accessibility và polish

- Hoàn thiện keyboard calendar;
- giữ focus return;
- thêm announced state ngắn;
- kiểm tra hover, active, selected, in-range, today, disabled, error và dark mode;
- bảo đảm touch target trong popup đạt tối thiểu 40 px.

## 6. File dự kiến thay đổi khi implement

| File | Thay đổi |
| --- | --- |
| `resources/js/components/shared/date-range-filter.tsx` | Refactor trigger, draft state, preset, panel ngày/tháng/năm, responsive và accessibility |
| `resources/js/components/shared/date-range-filter.test.tsx` | Mở rộng test behavior, keyboard, preset, min/max, apply/cancel và contract chiều cao |
| `resources/js/pages/sales/index.tsx` | Chỉ chỉnh class/consumer adapter nếu UAT phát hiện width chưa phù hợp; không đổi query contract |
| `resources/js/pages/shifts/index.tsx` | Chỉ chỉnh class/consumer adapter nếu UAT phát hiện width chưa phù hợp; không đổi query contract |

Không dự kiến sửa `searchable-select.tsx`, backend, route, Form Request hoặc cài dependency.

## 7. Test và verification

### Automated tests bắt buộc

- Trigger có class/contract `h-10`, label `Từ ngày/Đến ngày` nhìn thấy và chiều cao không đổi giữa empty/selected;
- render đúng giá trị `vi-VN` và trạng thái error;
- mở popup đồng bộ tháng với props hiện tại và reset bên ngoài;
- chọn range thủ công chưa gọi callback trước `Áp dụng`;
- `Áp dụng` gọi đúng hai callback; Escape/click ngoài không gọi callback;
- clear cả range và clear riêng từng mốc;
- preset Hôm nay, Hôm qua, 7 ngày, Tháng này, Tháng trước, Năm nay với clock cố định;
- preset và month/year option tôn trọng `min`/`max`;
- chuyển mode date → month → year và quay lại đúng tháng/năm;
- điều hướng qua biên tháng, năm nhuận và thập niên;
- keyboard arrows, Home/End, PageUp/PageDown, Enter/Space và focus return;
- desktop có hai tháng liên tiếp; mobile contract chỉ hiển thị một tháng;
- from-only, to-only, reversed external value và disabled state không regression.

Lệnh verification sau implementation:

```bash
npm run test -- resources/js/components/shared/date-range-filter.test.tsx
npm run typecheck
npm run lint:check
npm run format:check
npm run build
```

### Browser UAT

- Sales: DateRangeFilter và NativeSelect cùng baseline 40 px;
- Shifts: DateRangeFilter không tạo khoảng trống thừa trong FilterBar;
- desktop 1440 px, laptop 1024 px, tablet và mobile 375 px;
- popup không tràn hai cạnh viewport và không bị cắt bởi container;
- light/dark mode;
- chọn bằng chuột, touch và keyboard;
- query chỉ đổi sau Apply hoặc chọn preset, pagination vẫn giữ `from/to`;
- reset filter đưa trigger và tháng hiển thị về đúng state.

## 8. Acceptance criteria

- Control chính của DateRangeFilter cao đúng 40 px và thẳng hàng với SearchableSelect/NativeSelect/Input trong cùng toolbar;
- không còn hàng `Khoảng ngày` riêng phía trên;
- `Từ ngày` và `Đến ngày` vẫn nhìn thấy ở mọi breakpoint;
- không có layout shift khi range chuyển từ rỗng sang có giá trị;
- người dùng có thể tới tháng/năm xa mà không phải bấm tuần tự từng tháng;
- có preset Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua, Tháng này, Tháng trước và Năm nay;
- hỗ trợ sửa/xóa riêng từng mốc và cả from-only/to-only;
- manual range chỉ cập nhật consumer khi bấm `Áp dụng`; đóng popup không làm mất filter cũ;
- `min`, `max`, disabled và reversed external value hoạt động rõ ràng;
- popup responsive, không tràn viewport và dùng được bằng keyboard;
- giữ nguyên public props và không thêm dependency;
- test component, TypeScript, lint, format và production build pass.

## 9. Ngoài phạm vi

- Không cài hoặc import Ant Design; chỉ tham khảo interaction pattern;
- không thêm date/time, week picker, quarter picker hoặc multiple range;
- không cho nhập text ngày tự do trong phase này;
- không đổi timezone/backend query contract;
- không sửa SearchableSelect chỉ để bọc thêm label, vì toolbar filter hiện dùng accessible label và control 40 px đúng design system;
- không refactor toàn bộ FilterBar hoặc các management page khác.

## 10. Trạng thái quyết định

Plan không còn quyết định mở cần xác nhận trước implementation. Các lựa chọn đã chốt trong tài liệu:

- chuẩn control 40 px;
- nhãn ngày hiển thị inline;
- manual selection dùng Apply/Cancel draft;
- preset áp dụng ngay;
- month/year chỉ phục vụ điều hướng tới ngày;
- không thêm package;
- giữ API và backend contract hiện tại.
