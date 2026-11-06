# Triển khai HI Education

## Trạng thái bàn giao

Mã nguồn gồm website/CMS, học viên và quyền khóa học, media riêng tư, trình dựng khối, tích hợp AI có cấu hình. Gói release là mã nguồn đã kiểm thử, không phải website đã được công bố. Xuất bản snapshot Codex không tự triển khai tên miền.

Chưa có máy chủ hoặc quyền DNS được kết nối trong phiên này. Chưa có khóa AI hay mã quản trị vận hành được cung cấp. Không có lệnh Publish môi trường trong bộ công cụ của tác nhân; thao tác đó thuộc giao diện sản phẩm. Không coi việc lưu draft hoặc tạo image là bằng chứng publish/deploy thành công.

## Cách 1: Docker Compose + HTTPS

Yêu cầu VPS Linux có Docker Engine/Compose, domain bạn quản lý trỏ A/AAAA về VPS, cổng 80 và 443 mở. Không đặt AAAA nếu máy chủ không hỗ trợ IPv6. Caddy tự xin chứng chỉ sau khi DNS trỏ đúng; chỉ chạy sau khi xác nhận domain.

1. Giải nén release vào thư mục riêng trên VPS. Kiểm tra checksum đi kèm:

   ```sh
   sha256sum -c hi-education-release.tar.gz.sha256
   tar -xzf hi-education-release.tar.gz -C /srv/hi-education
   cd /srv/hi-education
   cp .env.example .env
   chmod 600 .env
   ```

   Tạo `/srv/hi-education` trước nếu chưa có. Khi cập nhật, sao lưu dữ liệu và giữ nguyên `.env` hiện có; không chép đè nó từ template.

2. Điền `ADMIN_TOKEN` dài ít nhất 32 ký tự ngẫu nhiên, `SITE_DOMAIN=hi.edu.vn`, `PUBLIC_ORIGIN=https://hi.edu.vn`, `COOKIE_SECURE=true`. Tạo secret trực tiếp trên máy chủ bằng công cụ quản lý bí mật hoặc trình sinh ngẫu nhiên; không commit hoặc gửi chat. Có thể bỏ trống biến AI để triển khai các tính năng còn lại; AI sẽ báo chưa cấu hình.
3. Chạy:

   ```sh
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   ```

   App chạy bằng user `node` không phải root, root filesystem read-only, chỉ volume dữ liệu được ghi. API app không publish cổng trực tiếp; Caddy nhận truy cập HTTPS. Production từ chối khởi động nếu thiếu mã quản trị đủ dài, secure cookie hoặc origin HTTPS.
4. Kiểm tra `https://hi.edu.vn/api/health` có `status: ok`, các trang công khai và `/sitemap.xml`. Mở `/admin`, đăng nhập, tạo bản nháp/preview trước khi xuất bản nội dung. Sau đó đăng ký học viên thử, cấp quyền, tải video/PDF riêng tư và kiểm tra từ tài khoản được/không được cấp quyền.
5. Xác nhận nội dung thật: thông tin đơn vị, học phí, lịch, giảng viên, điều khoản, quyền riêng tư, thời hạn lưu dữ liệu. Các nội dung pháp lý mặc định vẫn là **bản dự thảo**. Không có số liệu/thành tích được xác minh thay cho đơn vị vận hành.

Image app đã được build và chạy kiểm tra cục bộ, gồm lưu dữ liệu qua restart. Compose/Caddy cần xác nhận trên hosting thật; chưa kiểm chứng DNS, chứng chỉ ACME và truy cập Internet công khai. Nếu chạy trong cloud có proxy, giữ proxy/CA trust của nền tảng; runtime AI cần CA tương ứng được mount read-only và `NODE_EXTRA_CA_CERTS`. Không đưa CA theo phiên hoặc credential vào image.

## Cách 2: Node.js sau reverse proxy của hosting

Dùng Node >=24.5 (khuyến nghị Node 24 LTS), `npm start` hoặc process manager/systemd do hosting cung cấp. Không có dependency runtime bên ngoài hay frontend build bắt buộc. Gắn ổ dữ liệu bền vững qua `DB_PATH` và `MEDIA_DIR`, đặt `NODE_ENV=production` cùng các cấu hình bảo mật ở trên. Reverse proxy HTTPS đến cổng app; giữ `Host` chính xác để kiểm tra Origin hoạt động. Không tin header IP tùy ý từ client.

`npm run check-ready` kiểm tra máy chủ cục bộ; có thể đặt `CHECK_URL=https://hi.edu.vn` khi kiểm tra từ môi trường được phép truy cập domain. `npm start` dùng `--use-env-proxy` để AI theo proxy/CA đã cấu hình; TLS verification luôn được giữ bật.

## Dữ liệu, nâng cấp và sao lưu

Release source không mang theo SQLite/uploads/secrets. Nếu chuyển dữ liệu từ môi trường phát triển, phải sao lưu và chuyển riêng cả database lẫn thư mục media qua kênh được phép, không đưa vào Git hoặc gói public. Phiên quản trị và chữ ký media không tồn tại sau restart; học viên đăng nhập lại nếu cần.

Với Compose, volume `hi-data` giữ SQLite và uploads. Không dùng `docker compose down -v` trên production. Sao lưu khi app dừng, hoặc dùng SQLite backup API cùng cơ chế snapshot media nhất quán. Ví dụ lấy bản sao ra máy chủ sau khi đã dừng app:

```sh
docker compose stop app
mkdir -p backups
chmod 700 backups
docker compose cp app:/app/.data backups/data-copy
# Mã hóa và lưu bản sao này ở nơi được bảo vệ; nó chứa dữ liệu cá nhân.
docker compose start app
```

Dùng thư mục sao lưu mới cho mỗi lần, tránh ghi đè bản tốt trước đó. Khôi phục phải thử trên volume riêng trước. Migration hiện tại thêm bảng/cột và mã bài học, không reset dữ liệu. Trước nâng cấp vẫn phải sao lưu; rollback schema không tự động.

## AI và media

AI cần `HI_AI_API_KEY` và quyền mô hình/hạn mức của tài khoản; outbound HTTPS `api.openai.com`. Adapter đã kiểm thử bằng phản hồi mô phỏng; chưa có bằng chứng gọi AI live trong môi trường này. Video/PDF bài học dùng quyền học + liên kết có chữ ký, không phải DRM và không thể ngăn quay màn hình/tải trích xuất tuyệt đối. Media giới thiệu công khai có thể được tải về.

## Giới hạn vận hành còn lại

Chưa tích hợp thanh toán, quên mật khẩu qua email, MFA/phân vai nhiều quản trị, DRM, quét mã độc và transcoding tự động. Rate limit hiện tại theo IP trực tiếp/in-memory; hệ thống sau proxy cần chính sách chống spam thích hợp tại tầng hosting. Nút tự đánh dấu hoàn thành không xác minh đã xem hết video hay cấp chứng chỉ. Đây là các giới hạn đã biết, không được trình bày như tính năng đã triển khai.
