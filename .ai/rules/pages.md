---
paths:
  - 'resources/js/pages/**/*.tsx'
---

# Pages

## Date range phải có label nhìn thấy
Bộ lọc from/to dùng DateRangeFilter với label Từ ngày và Đến ngày nhìn thấy; không gửi request khi from lớn hơn to; query ngày dùng YYYY-MM-DD và phải được giữ khi phân trang.
