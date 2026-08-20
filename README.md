# MartHub POS New

Hệ thống POS cho cửa hàng tiện lợi một chi nhánh, được viết lại bằng Laravel 12, Inertia 2, React 19 và Tailwind CSS 4. Giao diện giữ cách vận hành quen thuộc của source cũ: sidebar tối gọn, catalog bên trái, giỏ hàng bên phải và ưu tiên bàn phím/máy quét.

## Chạy local

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
composer run dev
```

SQLite được dùng mặc định ở local. Production dùng MySQL bằng cách đổi các biến `DB_*` trong `.env`, sau đó chạy migration trên database đích.

Tài khoản demo sau khi seed:

- chủ cửa hàng: `owner@marthub.local` / `password`;
- thu ngân: `cashier@marthub.local` / `password`;
- PIN duyệt sửa giá/giảm giá: `1234`.

Hãy đổi toàn bộ mật khẩu và PIN trước khi dùng ngoài môi trường local.

## Chức năng đã có

- POS online/offline, barcode, phím tắt, nhiều đơn vị bán và giá theo đơn vị;
- tồn kho theo đơn vị cơ sở, cho phép âm kho, movement ledger và FEFO theo lô;
- nhập kho tay hoặc `.xlsx/.csv`, file mẫu Excel, giá vốn nhập cuối;
- lô/hạn sử dụng tùy chọn, cảnh báo 7 ngày và lịch chạy hằng ngày;
- tiền mặt, QR xác nhận thủ công, thanh toán một phần và ghi nợ;
- owner PIN cho sửa giá/giảm giá, bị khóa hoàn toàn khi offline;
- ca/két dùng chung, thu/chi ngoài bán hàng, kiểm đếm mệnh giá và đối chiếu chênh lệch;
- khách hàng không bắt buộc số điện thoại, sổ công nợ và thu nợ;
- hóa đơn snapshot, in 58 mm, trả từng dòng/đổi hàng và hoàn/cấn nợ;
- product image trong `storage/app/public/products`;
- idempotency cho đồng bộ hóa đơn offline.

## Kiểm tra nhanh

```powershell
php artisan migrate:status
php artisan schedule:list
php scripts/smoke-pos.php
.\node_modules\.bin\tsc.cmd --noEmit
npm run build
vendor\bin\pint --test --format agent
```

`scripts/smoke-pos.php` chạy transaction bán một phần/công nợ, thu nợ, khóa override offline, trả hàng và chốt ca, sau đó rollback toàn bộ dữ liệu smoke.

## Trước khi cutover

ETL dữ liệu MySQL legacy chưa thể chạy cho tới khi có bản backup production. Cần rehearsal trên MySQL staging, đối chiếu số sản phẩm/hóa đơn/doanh thu/tồn/công nợ, kiểm thử máy in 58 mm và diễn tập cửa sổ cutover 12 giờ. Xem [bộ tài liệu chuyển đổi](docs/README.md) và [trạng thái triển khai](docs/migration/2026-08-11-211454-06-trang-thai-trien-khai.md).
