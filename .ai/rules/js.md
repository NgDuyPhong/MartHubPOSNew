---
paths:
  - 'resources/js/**/*.tsx'
---

# Js

## Chọn surface cho form
Dùng Dialog cho confirmation hoặc form ngắn; Sheet cho quick edit theo ngữ cảnh; Inertia page cho workflow dài có nhiều section, dynamic row, file hoặc cần deep-link. Không duy trì song song page và dialog cho cùng một full form.

## Dùng MoneyInput cho tiền VND
Mọi field tiền VND editable dùng components/shared MoneyInput với MoneyValue (number | '') và format vi-VN. Không dùng MoneyInput cho quantity, hệ số quy đổi hoặc số tờ mệnh giá.
