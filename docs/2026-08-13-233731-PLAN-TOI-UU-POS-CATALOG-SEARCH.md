# Kế hoạch tối ưu tìm kiếm và danh sách sản phẩm POS

## 1. Mục tiêu

Tối ưu trải nghiệm tìm kiếm, quét mã vạch và duyệt danh sách sản phẩm tại màn hình POS khi catalog có từ 2.000 đến 10.000 sản phẩm, đồng thời giữ nguyên các hành vi nghiệp vụ hiện tại:

- ô tìm kiếm phản hồi ngay khi gõ;
- quét mã vạch và nhấn `Enter` phải thêm đúng sản phẩm;
- chọn danh mục, chọn đơn vị bán và thêm vào giỏ không thay đổi;
- sau thanh toán vẫn đưa focus về ô quét mã;
- catalog vẫn dùng được trong luồng offline;
- không phát sinh request API theo từng ký tự nếu chưa có quyết định thay đổi kiến trúc.

Tài liệu này được lập để review và theo dõi việc triển khai theo từng phase.

> **Cập nhật triển khai 13/08/2026:** Các hạng mục 1–3, phần incremental rendering của hạng mục 4, hạng mục 5–6 và phần chọn cột/tránh N+1 của hạng mục 7 đã được triển khai. Hạng mục 0 (benchmark thực tế), virtualization, cache/invalidation backend và các quyết định nghiệp vụ trong mục 9 vẫn cần review/UAT riêng.

## 2. Hiện trạng đã xác nhận

### 2.1. Luồng dữ liệu hiện tại

```text
PosPage
  ├─ giữ state query và categoryId
  ├─ gọi filterCatalog(...) để phục vụ xử lý Enter
  └─ truyền toàn bộ catalog, query, categoryId xuống CatalogPanel
       └─ gọi lại filterCatalog(...) để render danh sách
```

Các file liên quan chính:

- `resources/js/pages/pos/index.tsx`
- `resources/js/features/pos/components/catalog-panel.tsx`
- `resources/js/features/pos/model/selectors.ts`
- `resources/js/features/pos/model/types.ts`
- `app/Http/Controllers/PosController.php`

### 2.2. Các nút thắt hiện tại

| Hạng mục | Hiện trạng | Tác động |
| --- | --- | --- |
| `onChange` ô tìm kiếm | Cập nhật `query` ngay mỗi ký tự | Đúng với controlled input, nhưng kích hoạt render và lọc catalog |
| Lọc catalog | `filterCatalog()` chạy ở trang cha và chạy lại trong `CatalogPanel` | Tính toán trùng lặp |
| Chuẩn hóa chuỗi | `toLowerCase()` và duyệt nested variants/units/barcodes ở mỗi lần lọc | Chi phí tăng theo số sản phẩm và barcode |
| Quét barcode | `findBarcodeMatch()` duyệt tuần tự toàn catalog | O(n) cho mỗi lần nhấn `Enter` |
| Render sản phẩm | Có thể map toàn bộ khoảng 2.156 sản phẩm thành card | DOM lớn, scroll và cập nhật giỏ có thể giật |
| Render lại từ trang cha | Thay đổi giỏ hàng làm `PosPage` render lại | Catalog có thể tạo lại toàn bộ React element dù query không đổi |
| Ảnh sản phẩm | Chưa có chiến lược lazy loading rõ ràng | Có thể tải và decode nhiều ảnh không cần thiết |
| Payload ban đầu | Controller tải toàn bộ catalog cùng nhiều quan hệ | Tăng TTFB, dung lượng JSON, parse time và bộ nhớ |

### 2.3. Đánh giá debounce

Không debounce `onChange={(event) => onQueryChange(event.target.value)}` ở thời điểm hiện tại.

Lý do:

- `onChange` chỉ cập nhật state local, không gọi API;
- debounce state điều khiển input có thể làm ký tự hiển thị chậm và ảnh hưởng máy quét mã;
- nhân viên POS cần thấy kết quả tức thời;
- vấn đề chính nằm ở thuật toán lọc và số lượng node được render.

Chỉ cân nhắc debounce nếu sau này có một trong các tác vụ sau:

- tìm kiếm qua API;
- gửi analytics theo từ khóa;
- ghi lịch sử tìm kiếm vào storage/server.

Nếu cần làm chậm phần hiển thị kết quả, ưu tiên `useDeferredValue(query)` cho truy vấn dùng để render. Luồng barcode khi nhấn `Enter` vẫn phải dùng `query` hiện tại, không dùng giá trị deferred.

## 3. Kiến trúc đích đề xuất

```text
catalog từ server/offline cache
  ↓ build một lần khi catalog thay đổi
CatalogSearchIndex
  ├─ productsByCategory
  ├─ searchableTextByProduct
  └─ exactBarcodeMap
         ↓
useCatalogSearch(query, categoryId)
  ├─ exactBarcodeMatch(query hiện tại)
  ├─ filteredProducts(query deferred)
  ├─ totalMatches
  └─ visibleProducts
         ↓
CatalogPanel
  └─ chỉ render tập kết quả cần hiển thị
```

Nguyên tắc:

1. Chỉ có một nơi chịu trách nhiệm lọc catalog.
2. Barcode exact match dùng `Map` để tra cứu gần O(1).
3. Text dùng để tìm kiếm được chuẩn hóa một lần khi catalog thay đổi.
4. Không mount đồng thời hàng nghìn card sản phẩm.
5. Input, xử lý `Enter` và kết quả hiển thị có thể có nhịp cập nhật khác nhau nhưng không được làm sai sản phẩm.
6. Catalog đầy đủ vẫn có thể được cache cho offline; tối ưu payload không đồng nghĩa bắt buộc chuyển sang server-side search.

## 4. Phạm vi triển khai theo hạng mục

### Hạng mục 0 — Đo baseline trước khi sửa

Mục tiêu: có số liệu để chứng minh thay đổi thực sự cải thiện hiệu năng.

Công việc:

- tạo dữ liệu kiểm tra ở ba mức: catalog thực tế khoảng 2.156 sản phẩm, 5.000 sản phẩm và 10.000 sản phẩm;
- đo thời gian từ lúc nhập ký tự đến khi danh sách cập nhật;
- đo thời gian từ lúc nhấn `Enter` với barcode đến khi dòng hàng xuất hiện trong giỏ;
- đo số DOM node/card đang mount;
- đo React render của `PosPage`, `CatalogPanel` và product card khi:
  - gõ liên tục 10 ký tự;
  - đổi danh mục;
  - thêm sản phẩm vào giỏ;
  - tăng/giảm số lượng trong giỏ;
- đo payload trang POS: kích thước JSON trước/sau gzip, thời gian response, parse và hydrate;
- kiểm tra số request ảnh khi vừa mở trang và khi scroll.

Công cụ kiểm tra:

- Chrome Performance và Network;
- React DevTools Profiler;
- Laravel Debugbar/Telescope nếu môi trường local đã có; không thêm dependency production chỉ để đo.

Đầu ra review:

- bảng baseline lưu trong phần `Kết quả đo` ở cuối tài liệu này hoặc một file report riêng;
- ảnh chụp profiler cho catalog thực tế;
- xác nhận nút thắt chính nằm ở lọc, render, payload hay cả ba.

Tiêu chí hoàn thành:

- có thể lặp lại cùng một kịch bản đo;
- có số liệu trước tối ưu để so sánh sau từng phase.

### Hạng mục 1 — Hợp nhất luồng tìm kiếm

Mục tiêu: bỏ việc gọi `filterCatalog()` hai lần cho cùng một query.

Công việc:

- tạo hook `useCatalogSearch` hoặc một selector có memoization trong feature POS;
- để `PosPage` giữ `query` vì trang cha còn xử lý phím `Enter`, focus và thêm vào giỏ;
- chỉ tính `filteredProducts` tại một nơi;
- truyền kết quả đã lọc và `totalMatches` vào `CatalogPanel`;
- bỏ `useMemo(filterCatalog(...))` còn lại trong `CatalogPanel`;
- không đưa logic tìm kiếm sang component trình bày.

File dự kiến:

- sửa `resources/js/pages/pos/index.tsx`;
- sửa `resources/js/features/pos/components/catalog-panel.tsx`;
- thêm `resources/js/features/pos/hooks/use-catalog-search.ts` nếu chọn phương án hook;
- sửa `resources/js/features/pos/model/selectors.ts`.

Tiêu chí hoàn thành:

- mỗi lần query/category thay đổi chỉ có một lượt lọc;
- thêm/sửa giỏ không làm tính lại kết quả nếu catalog, query và category không đổi;
- hành vi Enter với một kết quả duy nhất giữ nguyên.

### Hạng mục 2 — Xây catalog search index

Mục tiêu: giảm việc lặp lại chuẩn hóa text và duyệt nested data.

Công việc:

- định nghĩa `CatalogSearchIndex` với kiểu dữ liệu rõ ràng;
- build index bằng `useMemo` khi reference của catalog thay đổi;
- tạo `exactBarcodeMap` trỏ tới đúng `product`, `variant`, `unit` và barcode;
- tạo `searchableText` đã chuẩn hóa cho từng product gồm:
  - tên sản phẩm;
  - SKU;
  - barcode thuộc variant/unit;
- tùy kết quả benchmark, tạo thêm `productsByCategory`;
- xử lý barcode trùng bằng quy tắc xác định, không âm thầm chọn bản ghi cuối;
- không làm mất số `0` đầu barcode và không tự loại các ký tự có ý nghĩa;
- tách riêng `normalizeSearchText()` và chuẩn hóa barcode exact match;
- cân nhắc tìm không dấu tiếng Việt cho tên sản phẩm, nhưng chỉ bật sau khi có test nghiệp vụ.

Quy tắc barcode trùng đề xuất:

- index lưu danh sách match thay vì ghi đè;
- nếu chỉ có một match: thêm sản phẩm;
- nếu có nhiều match: hiển thị cảnh báo/chọn đơn vị thay vì tự chọn sai;
- log hoặc đưa barcode trùng vào báo cáo dữ liệu để làm sạch.

Tiêu chí hoàn thành:

- exact barcode lookup không duyệt toàn catalog;
- không gọi `toLowerCase()` cho toàn bộ catalog ở mỗi ký tự;
- cùng một input trả về cùng kết quả như selector cũ trong các case hợp lệ;
- barcode trùng có hành vi được định nghĩa và kiểm thử.

### Hạng mục 3 — Tách nhịp input và nhịp render kết quả

Mục tiêu: người dùng gõ/quét mã không bị block bởi việc render danh sách.

Công việc:

- tiếp tục cập nhật `query` trực tiếp trong `onChange`;
- dùng `useDeferredValue(query)` cho text search hiển thị nếu benchmark chứng minh cần thiết;
- xử lý phím `Enter` bằng `query` mới nhất và `exactBarcodeMap`;
- hiển thị trạng thái kết quả đang cập nhật ở mức nhẹ nếu deferred query đang chậm;
- không dùng `setTimeout`/debounce cho scanner;
- trim query tại selector/lookup, không thay đổi giá trị đang hiển thị trong input.

Rủi ro cần kiểm tra:

- danh sách có thể chậm hơn input một nhịp; không được dùng danh sách cũ để thêm nhầm sản phẩm khi nhấn `Enter`;
- category thay đổi phải cho kết quả đúng ngay hoặc có trạng thái chuyển rõ ràng;
- scan liên tiếp không được bỏ mất lần scan.

Tiêu chí hoàn thành:

- input không lag khi gõ nhanh trên catalog 10.000 sản phẩm;
- Enter luôn xử lý giá trị mới nhất;
- không phát sinh timer debounce tồn đọng khi unmount.

### Hạng mục 4 — Giảm số product card được render

Mục tiêu: tránh mount toàn bộ catalog vào DOM.

Phương án ưu tiên để review:

1. Giai đoạn đầu: incremental rendering với giới hạn ban đầu và nút/trigger `Xem thêm` khi scroll.
2. Nếu benchmark vẫn không đạt: virtualize danh sách/grid.

Lý do ưu tiên incremental rendering trước:

- không cần thêm package;
- ít rủi ro với responsive grid và chiều cao card thay đổi do nhiều đơn vị;
- dễ giữ nguyên layout hiện tại;
- phù hợp khi người bán chủ yếu tìm kiếm hoặc quét mã.

Công việc:

- chỉ render một batch, ví dụ 60–120 sản phẩm; kích thước cuối cùng chốt bằng benchmark;
- reset batch khi query hoặc category thay đổi;
- hiển thị `Đang xem X/Y sản phẩm`;
- dùng `IntersectionObserver` hoặc nút `Xem thêm`, có fallback rõ ràng;
- giữ `overflow-y-auto` và `min-h-0` hiện có;
- nếu chọn virtualization:
  - đánh giá `@tanstack/react-virtual` hoặc giải pháp đang có trong dự án;
  - chỉ thêm dependency sau khi được duyệt;
  - kiểm thử card có chiều cao khác nhau, resize và breakpoint;
  - bảo đảm tab/keyboard navigation không bị mất focus.

Tiêu chí hoàn thành:

- số card mount ban đầu không vượt giới hạn đã chốt;
- người dùng vẫn có thể tiếp cận toàn bộ kết quả;
- scroll mượt và không nhảy vị trí ngoài dự kiến;
- query/category mới không hiển thị phần batch cũ.

### Hạng mục 5 — Giảm render lại product card

Mục tiêu: thay đổi giỏ hàng không khiến toàn bộ catalog render lại không cần thiết.

Công việc:

- tách product card thành component riêng, ví dụ `CatalogProductCard`;
- chỉ áp dụng `React.memo` sau khi props đã ổn định và profiler cho thấy có lợi;
- ổn định callback thêm sản phẩm/đơn vị bằng `useCallback` hoặc action ổn định từ cart hook;
- không tạo callback/formatter nặng cho từng card nếu có thể dùng handler chung;
- giữ `key` là ID ổn định, không dùng index;
- tránh memo hóa tràn lan khi không có số liệu chứng minh.

Tiêu chí hoàn thành:

- cập nhật số lượng trong giỏ không render lại toàn bộ card đang hiển thị;
- click thêm sản phẩm vẫn phản hồi đúng;
- React Profiler không cho thấy chi phí memo comparison lớn hơn phần render tiết kiệm được.

### Hạng mục 6 — Tối ưu ảnh sản phẩm

Mục tiêu: không tải/decode ảnh của card chưa nhìn thấy.

Công việc:

- thêm `loading="lazy"` và `decoding="async"` cho ảnh catalog;
- cung cấp kích thước/aspect ratio ổn định để tránh layout shift;
- dùng ảnh thumbnail nếu backend/storage hiện chỉ trả ảnh gốc quá lớn;
- giữ placeholder khi ảnh thiếu/lỗi;
- kiểm tra URL ảnh khi ứng dụng chạy trong subdirectory hoặc dùng CDN.

Tiêu chí hoàn thành:

- khi mở trang chỉ tải ảnh gần viewport;
- scroll không bị layout shift đáng kể;
- ảnh lỗi không phá kích thước card.

### Hạng mục 7 — Thu gọn payload catalog từ backend

Mục tiêu: giảm thời gian tải, parse JSON và bộ nhớ mà vẫn đủ dữ liệu bán hàng/offline.

Công việc:

- lập danh sách field thực sự được POS dùng cho product, category, variant, unit, barcode và balance;
- thay serialization toàn model bằng DTO/API Resource hoặc `select` rõ ràng;
- giữ đầy đủ các khóa cần cho relation và offline cache;
- chỉ lấy balance của branch hiện tại và đúng phạm vi tồn kho đang bán;
- kiểm tra quan hệ active/inactive và organization scope;
- đo riêng payload customers; nếu danh sách lớn, tách thành một hạng mục tìm kiếm khách hàng riêng;
- xem xét cache catalog theo organization/branch với cơ chế invalidation khi product, price, barcode hoặc stock thay đổi;
- không chuyển sang search API mặc định vì POS còn cần offline catalog;
- không đưa thông tin nội bộ/model field không dùng xuống frontend.

Tiêu chí hoàn thành:

- payload mới có contract/type rõ ràng;
- giảm dung lượng JSON có số liệu trước/sau;
- không thiếu price, unit, barcode hoặc stock cần cho checkout;
- organization/branch scoping được giữ nguyên;
- offline cache và checkout online/offline đều hoạt động.

### Hạng mục 8 — Kiểm thử và chống regression

#### Test selector/index

- tìm theo tên, SKU và barcode;
- khác biệt hoa/thường;
- khoảng trắng đầu/cuối;
- barcode có số `0` đầu;
- barcode chứa dấu gạch/ký tự hợp lệ;
- barcode không tồn tại;
- barcode trùng nhiều đơn vị/sản phẩm;
- lọc kết hợp query và category;
- catalog rỗng;
- một kết quả duy nhất;
- tìm tên tiếng Việt có dấu và, nếu được duyệt, không dấu.

#### Test component/interaction

- gõ nhanh liên tục không mất ký tự;
- nhấn `Enter` ngay sau ký tự cuối không dùng deferred query cũ;
- máy quét gửi chuỗi và Enter thêm đúng unit;
- đổi category reset batch hiển thị;
- scroll/Xem thêm tải đủ kết quả;
- thêm sản phẩm không mất focus ngoài hành vi đã thiết kế;
- hoàn tất thanh toán đưa focus về ô barcode;
- toast thành công không chặn việc scan đơn tiếp theo;
- responsive tại desktop POS và màn hình nhỏ được hỗ trợ.

#### Kiểm tra kỹ thuật bắt buộc

```bash
npm run typecheck
npm run lint
npm run build
```

Chạy thêm test PHP/JS liên quan nếu dự án đã có test tương ứng. Việc bổ sung test framework hoặc package mới phải được review riêng trước khi cài.

## 5. Chỉ số nghiệm thu đề xuất

Các ngưỡng dưới đây cần được xác nhận lại bằng thiết bị POS thật:

| Chỉ số | Mục tiêu |
| --- | --- |
| Phản hồi ký tự trong input | Không thấy trễ; mục tiêu input-to-paint dưới 50 ms ở catalog thực tế |
| Exact barcode lookup | Dưới 10 ms ở catalog 10.000 sản phẩm, không tính render giỏ |
| Scan đến lúc thấy dòng hàng | Mục tiêu dưới 100 ms trên thiết bị POS chuẩn |
| Card mount ban đầu | Không quá batch đã chốt, đề xuất tối đa 120 |
| Scroll catalog | Không có long task lặp lại trên 100 ms; cảm nhận gần 60 fps |
| Render do đổi số lượng giỏ | Catalog card không render lại hàng loạt |
| Payload catalog | Có mức giảm được đo; mục tiêu ban đầu tối thiểu 30% nếu model hiện gửi field thừa |
| Tính đúng | Không sai product/unit/price/barcode so với trước tối ưu |

Không dùng một con số trên máy phát triển để kết luận hoàn thành; cần đo thêm trên thiết bị/cấu hình gần production.

## 6. Thứ tự triển khai đề xuất

```text
Baseline
  → hợp nhất một luồng filter
  → build search/barcode index
  → giới hạn số card render
  → ổn định card và callback
  → lazy-load ảnh
  → thu gọn payload backend
  → benchmark lại + UAT máy POS
  → chỉ virtualize hoặc chuyển search API nếu vẫn chưa đạt
```

Ước lượng tương đối:

| Phase | Hạng mục | Độ phức tạp | Rủi ro |
| --- | --- | --- | --- |
| 0 | Baseline | Thấp | Thấp |
| 1 | Hợp nhất filter + search index | Trung bình | Trung bình, liên quan barcode/unit |
| 2 | Deferred result + incremental rendering | Trung bình | Trung bình, liên quan stale result/scroll |
| 3 | Memo product card + ảnh | Thấp–trung bình | Thấp |
| 4 | Backend payload contract | Trung bình–cao | Cao hơn, ảnh hưởng offline và checkout |
| 5 | Virtualization/search API tùy chọn | Cao | Cao, chỉ làm khi benchmark yêu cầu |

## 7. Phạm vi không nên làm ngay

- Không debounce state của input tìm kiếm.
- Không gọi API theo từng ký tự trong phase đầu.
- Không thêm thư viện virtualization trước khi đo incremental rendering.
- Không thêm fuzzy search nếu chưa có yêu cầu nghiệp vụ; fuzzy match không được áp dụng cho exact barcode.
- Không cache kết quả thiếu chiến lược invalidation khi giá, barcode hoặc tồn kho thay đổi.
- Không memo hóa mọi component theo cảm tính.
- Không thay đổi nghiệp vụ chọn unit, giá bán hoặc tồn kho trong đợt tối ưu UI này.

## 8. Kế hoạch rollback

- chia thay đổi thành commit/PR nhỏ theo từng phase;
- giữ selector cũ trong thời gian đối chiếu ở phase search index nếu cần;
- có feature flag cho virtualization hoặc chiến lược render mới nếu triển khai gần production;
- nếu phát hiện sai barcode/unit, rollback riêng search index mà không rollback thay đổi scroll/ảnh;
- payload backend chỉ rollout sau khi frontend tương thích và test offline vượt qua.

## 9. Các quyết định cần review trước khi code

1. Có chấp nhận incremental rendering với batch đề xuất 100 sản phẩm trước khi xét virtualization không?
2. Khi một barcode trùng nhiều unit/sản phẩm, UI cần mở hộp chọn hay chặn và yêu cầu sửa dữ liệu?
3. Tìm theo tên có cần hỗ trợ tiếng Việt không dấu ngay trong phase này không?
4. Thiết bị POS chuẩn để benchmark có cấu hình và trình duyệt nào?
5. Mục tiêu offline có bắt buộc lưu toàn bộ ảnh hay chỉ dữ liệu catalog/thumbnail?
6. Có cho phép thêm dependency virtualization nếu phase incremental rendering không đạt chỉ số?
7. Thu gọn payload backend triển khai cùng đợt hay tách riêng sau khi frontend ổn định?

## 10. Checklist phê duyệt

- [ ] Chốt phạm vi chỉ tối ưu catalog/search hay bao gồm cả payload customers.
- [ ] Chốt hành vi barcode trùng.
- [ ] Chốt tìm kiếm tiếng Việt không dấu.
- [ ] Chốt batch size và UX `Xem thêm`/auto-load.
- [ ] Chốt chỉ số hiệu năng trên thiết bị POS thật.
- [ ] Chốt có/không cho phép dependency virtualization.
- [ ] Chốt thứ tự rollout frontend và backend payload.
- [ ] Sau khi được duyệt mới bắt đầu sửa code theo từng phase.

## 11. Kết quả đo

Phần này được điền trong Hạng mục 0.

| Kịch bản | Trước tối ưu | Sau phase 1 | Sau phase 2 | Mục tiêu |
| --- | ---: | ---: | ---: | ---: |
| Gõ 10 ký tự, catalog 2.156 sản phẩm | Chưa đo | Chưa đo | Chưa đo | Không lag cảm nhận |
| Gõ 10 ký tự, catalog 10.000 sản phẩm | Chưa đo | Chưa đo | Chưa đo | Input-to-paint < 50 ms |
| Exact barcode lookup, 10.000 sản phẩm | Chưa đo | Chưa đo | Chưa đo | < 10 ms |
| Card mount khi vừa mở trang | Chưa đo | Chưa đo | Chưa đo | ≤ batch đã chốt |
| Payload catalog | Chưa đo | Không áp dụng | Không áp dụng | Giảm ≥ 30% nếu có field thừa |
