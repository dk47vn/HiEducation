# HI Education — hi.edu.vn

Website giáo dục tin học & AI tiếng Việt: frontend responsive, CMS, quản lý khóa học/học viên và backend Node.js + SQLite. Không phụ thuộc thư viện runtime ngoài. Yêu cầu Node.js >= 24.5; khuyến nghị Node 24 LTS, đã kiểm tra với Node 24.22.1 và image Node 24.

## Khởi động

```sh
cd /workspace/HiEducation
npm start
# Chế độ tự khởi động lại khi sửa server:
npm run dev
# Kiểm thử API bằng SQLite in-memory và thư mục media tạm:
npm test
```

Máy chủ mặc định cổng 3000, ghi đè bằng `PORT`. Các lệnh start/dev đọc `.env` nếu có. Sao chép `.env.example` sang `.env` nếu cần và tự đặt `ADMIN_TOKEN` dài, ngẫu nhiên. Không commit `.env` hay đưa khóa vào trình duyệt/chat. Trong cloud task, dùng checkout hiện tại; không cần tạo worktree.

Đường dẫn:

| Trang | URL |
| --- | --- |
| Trang chủ | `/` |
| Giới thiệu / dịch vụ | `/gioi-thieu`, `/dich-vu` |
| Khóa học / chi tiết | `/khoa-hoc`, `/khoa-hoc/:id` |
| Hoạt động / tin tức | `/hoat-dong`, `/tin-tuc` |
| Chi tiết bài viết | `/bai-viet/:id` |
| Tài khoản, đăng ký/đăng nhập, khóa học đã cấp | `/tai-khoan` |
| Điều khoản / quy định / quyền riêng tư | `/dieu-khoan`, `/quy-dinh`, `/bao-mat` |
| HI Content Studio | `/admin` |

Trang nội dung và khóa học mẫu được seed lần đầu. Các trang pháp lý là **bản dự thảo**, cần đơn vị vận hành phê duyệt trước khi phát hành.

## Vận hành CMS

1. Mở `/admin`, nhập `ADMIN_TOKEN` và bấm Kết nối. Máy chủ cấp cookie quản trị HttpOnly, SameSite=Strict, có hiệu lực một giờ. Mã nhập được xóa khỏi ô; không lưu vào localStorage. Phiên quản trị hết hiệu lực khi server khởi động lại. Bấm Thoát để hủy phiên.
2. Danh sách nội dung có tìm kiếm không dấu theo tiêu đề/mô tả/nội dung, lọc nháp/xuất bản; bài viết có thêm bộ lọc chuyên trang. Dashboard thống kê khóa học, bài viết, học viên, đăng ký và tệp. Bài viết / Chuyên mục / Trang nội dung hỗ trợ sửa và lưu nháp/xuất bản. Tin tức, hoạt động, giới thiệu và dịch vụ có bài viết theo chuyên trang. Nội dung dùng văn bản thuần để tránh HTML không an toàn. Trình dựng khối hỗ trợ văn bản, ảnh, video công khai và CTA; kéo thả qua tay nắm hoặc dùng nút lên/xuống. Các khối giữ thứ tự khi lưu, hiện trên website và preview. Liên kết CTA chỉ nhận đường dẫn nội bộ/HTTPS; khối media luôn kiểm tra quyền công khai.
3. Tạo khóa học nháp trước. Trong Thư viện media, chọn khóa học rồi tải video/PDF ở chế độ riêng tư. Quay lại khóa học, thêm bài học, chọn tài nguyên, sắp xếp bằng nút lên/xuống, lưu và xuất bản.
4. Ảnh preview công khai có thể gắn vào khóa học, bài viết và các trang. Video giới thiệu có thể công khai **khi không gắn vào khóa học**, sau đó chọn trên trang/bài viết. PDF và mọi tài nguyên gắn khóa học luôn riêng tư. Không đổi quyền tệp đang được nội dung tham chiếu theo cách làm hỏng chính sách truy cập.
5. Thư viện hiển thị nội dung đang tham chiếu từng tệp. Chỉ xóa được tệp không còn dùng (kể cả nội dung nháp); xóa đồng thời file trên đĩa và bản ghi. Khóa học còn media gắn vào sẽ bị chặn xóa để tránh tài nguyên mồ côi.
6. Học viên tự đăng ký tại `/tai-khoan`. Trong Học viên & quyền học, chọn người/khóa học rồi cấp hoặc thu hồi quyền. Chưa tích hợp thanh toán tự động. Học viên có thể đánh dấu/bỏ hoàn thành từng bài; tiến độ lưu theo tài khoản trong SQLite và hiển thị ở trang tài khoản/chi tiết khóa học. Đây là tự đánh dấu học tập, không phải bằng chứng xem hết video hay chứng chỉ. Mã bài học ổn định giúp giữ tiến độ khi đổi thứ tự hoặc sửa tiêu đề; xóa bài không chuyển tiến độ sang bài khác. Bài cũ chưa có mã được bổ sung mã khi khởi động, không thay nội dung đã lưu.
7. Bố cục trang chủ hỗ trợ kéo thả section trên desktop, nút lên/xuống trên bàn phím/điện thoại và sửa tiêu đề. Trang chủ dùng các section cố định; editor trang/bài viết/khóa học có trình dựng khối riêng, chưa cho chèn HTML/CSS tùy ý.
8. Cấu hình & cài đặt lưu tên, thông điệp và thông tin liên hệ hiển thị ở footer các trang nội dung. Các bí mật và mô hình AI chỉ cấu hình phía máy chủ.

### Biên tập và xem trước an toàn

Trong trình sửa khóa học, bài viết, chuyên mục và trang nội dung:

- **Xem trước nội dung** dựng bản xem ngay trong editor từ dữ liệu đang nhập. Xem trước không gọi API lưu/xuất bản và có thể dùng trước khi điền đủ các trường. Hiển thị văn bản thuần, ảnh/video công khai đã chọn và danh sách bài học; không phát tài nguyên bài học riêng tư trong preview.
- Trạng thái **Có thay đổi chưa lưu** theo dõi cả văn bản, lựa chọn ảnh/video, thêm/xóa/đổi thứ tự bài học và chèn bản nháp AI. Chuyển chức năng hoặc thoát admin sẽ hỏi trước khi bỏ nội dung. Đóng/tải lại tab yêu cầu cảnh báo chuẩn của trình duyệt khi trình duyệt cho phép. Không có tự động lưu hoặc khôi phục sau khi tab bị đóng/crash.
- Trong lúc lưu, khóa form tạm thời và chặn rời editor. Nếu API/lỗi mạng từ chối lưu, dữ liệu và trạng thái chưa lưu vẫn ở lại trong form để sửa hoặc gửi lại.
- Editor gửi `revision` của bản đã đọc; server trả HTTP 409 khi một phiên khác đã sửa nội dung đó. Bấm **Tải lại bản đã lưu** để đối chiếu, xác nhận bỏ bản đang soạn rồi mới nạp bản mới. Chưa có hợp nhất tự động hoặc lịch sử khôi phục; sao chép nội dung cần giữ trước khi tải lại.
- Cột revision được thêm bằng migration không xóa payload cũ. API client cũ chưa gửi revision vẫn được chấp nhận để tương thích, nên cơ chế chống ghi đè chỉ áp dụng khi client gửi revision; editor hiện tại luôn gửi khi sửa nội dung đã tồn tại. Bảo vệ này áp dụng cho lưu nội dung, chưa áp dụng cho xóa, quyền học, bố cục và thông tin cài đặt.

Tệp hỗ trợ: JPG, PNG, WebP, MP4, WebM, PDF; giới hạn 200 MB. Upload stream vào đĩa và kiểm tra chữ ký định dạng cơ bản, chưa có quét mã độc hoặc transcoding/kiểm tra codec toàn bộ. Video AI nhập về thư viện mặc định riêng tư; có thể gắn khóa học hoặc chuyển công khai để dùng làm video giới thiệu.

## Bảo vệ video và file

Video/PDF bài học cần phiên học viên và enrollment. Endpoint cấp liên kết có chữ ký, thời hạn 5 phút, gắn với tài khoản; mỗi request phát media kiểm tra lại phiên và quyền hiện tại. Thu hồi quyền hoặc chuyển khóa học về bản nháp chặn cả liên kết đã cấp; khóa nháp cũng được ẩn khỏi danh sách khóa học của học viên. Hỗ trợ HTTP Range cho video, no-store cho tệp riêng và không phục vụ trực tiếp thư mục lưu trữ. Phiên quản trị cũng có thể preview tệp.

Giao diện video ẩn nút download, tắt menu chuột phải và hiển thị email phiên học. Các biện pháp UI này chỉ hạn chế thao tác thông thường. **Không có cách chống tải/quay màn hình tuyệt đối**; hệ thống này chưa có DRM, watermark nhúng vào khung hình, HLS mã hóa hoặc tích hợp CDN DRM. Người được phép xem vẫn có thể trích xuất nội dung nhận được. Liên kết hết hạn cần bấm Xem video để lấy lại; chưa có tự động gia hạn trong player. Ảnh và video giới thiệu công khai có thể tải về.

## AI Creative Studio

Cấu hình phía máy chủ:

| Biến | Mục đích |
| --- | --- |
| `HI_AI_API_KEY` | Khóa API OpenAI; cũng tái sử dụng `OPENAI_API_KEY` nếu có sẵn |
| `HI_AI_TEXT_MODEL` | Mặc định `gpt-4.1-mini`, gọi Responses API |
| `HI_AI_IMAGE_MODEL` | Mặc định `gpt-image-1`, nhận PNG base64 vào thư viện |
| `HI_AI_VIDEO_MODEL` | Không mặc định; đặt tên mô hình video tài khoản có quyền sử dụng |

Cho phép outbound HTTPS tới `api.openai.com` nếu network policy đang hạn chế. Draft môi trường đã bổ sung yêu cầu đích api.openai.com cho khóa AI; cần lưu/publish qua giao diện để áp dụng. Không có khóa API hiện tại: AI thực tế **chưa được kiểm chứng**. Endpoint trả lỗi cấu hình rõ ràng, không tạo kết quả giả. Kiểm thử adapter dùng phản hồi mô phỏng, không chứng minh quyền/hạn mức của nhà cung cấp.

Chọn loại (văn bản/ảnh/video), chuyên trang và viết yêu cầu. Văn bản được giữ trong bộ nhớ tab để đưa vào editor; nội dung không tự xuất bản. Ảnh tạo thành tệp preview trong thư viện công khai. Video tạo thành tác vụ, cập nhật trạng thái và nhập kết quả sau khi hoàn thành; mã tác vụ có thể nhập lại. Nhà cung cấp có thể tính phí, cần quyền mô hình tương ứng. Biên tập viên phải kiểm chứng nội dung và quyền sử dụng; không gửi dữ liệu nhạy cảm vào prompt.

## Dữ liệu và triển khai

SQLite tại `.data/site.sqlite`, media tại `.data/media/`, đều gitignored. Ghi đè bằng `DB_PATH`/`MEDIA_DIR`; sao lưu cả hai, dừng server trước khi sao chép database hoặc dùng SQLite backup API. Không đưa file SQLite hay token vào public. Phiên học viên kéo dài 24 giờ, lưu DB; mật khẩu băm bằng scrypt và salt ngẫu nhiên. Học viên có thể sửa tên và đổi mật khẩu bằng mật khẩu hiện tại; đổi mật khẩu thu hồi mọi phiên học viên. Chưa có quên mật khẩu/email xác minh, MFA, phân vai biên tập viên, nhật ký audit hoặc reset tài khoản qua giao diện. Không dùng chung mã admin cho hệ thống nhiều nhân sự production; cần tích hợp auth/SSO phù hợp.

Trước khi public: reverse proxy HTTPS, `COOKIE_SECURE=true`, persistent volume/sao lưu, giới hạn upload và rate limiting ở proxy, quét tệp, quản lý tài khoản và duyệt nội dung pháp lý. Rate limit trong app là theo IP trực tiếp, in-memory; sau reverse proxy cần chính sách chính xác tại proxy. Không tin mù quáng header X-Forwarded-For. Chưa deploy/DNS lên hi.edu.vn; chưa có bằng chứng publish lại môi trường. Hướng dẫn và các bước xác nhận ở [DEPLOYMENT.md](DEPLOYMENT.md).

## Đóng gói và kiểm tra triển khai

`npm run release` tạo `dist/hi-education-release.tar.gz` và checksum SHA-256, chỉ chứa source/config mẫu/test/tài liệu; không mang theo `.env`, database, uploads hay `.git`. Dockerfile và Compose/Caddy dành cho VPS, app chạy non-root với dữ liệu persistent. `/api/health` kiểm tra DB; `npm run check-ready` kiểm tra API/trang nội dung. Trang/bài viết/khóa học có HTML public từ server khi chưa bật JavaScript, canonical/Open Graph theo `PUBLIC_ORIGIN`, robots và sitemap chỉ liệt kê nội dung đã xuất bản.

## Kiểm chứng

- `npm run test:browser`: máy chủ thử riêng, database/media tạm và mã admin ngẫu nhiên, tự dừng/dọn sau khi chạy. Cần Chromium và `playwright-core`; đặt `HI_BROWSER_MODULE` nếu cài công cụ ngoài repo. Không dùng tài khoản vận hành.
- `npm run test:docker`: kiểm tra image `hieducation:release` đã build, volume tạm, non-root/read-only, health và lưu dữ liệu qua restart; cần Docker local socket. Dùng cổng 3003 cho thử nghiệm; không chạy nếu cổng này có dịch vụ khác.


- `npm test`: 18 kiểm thử HTTP thật cho nội dung, tài khoản, enrollment, upload, streaming Range, thu hồi quyền, CSRF, phiên admin, tiến độ theo từng tài khoản, mã bài học sau đổi thứ tự, migration bài cũ, xóa media có/không tham chiếu, xung đột phiên bản nội dung, schema/liên kết/media của khối nội dung, sửa hồ sơ/đổi mật khẩu, HTML/SEO và AI adapter mô phỏng. Không kiểm chứng phát codec video thật hoặc gọi AI live.
- Chromium ở viewport 320, 390, 768 và 1440px: đăng ký học viên, kết nối admin, xuất bản/tìm kiếm/lọc bài viết, tạo bài học, lưu tiến độ qua tải lại trang, tải/xóa ảnh, xem trước editor, hủy rời trang, giữ nội dung khi lưu lỗi, xung đột hai tab, kéo thả khối, HTML khi tắt JavaScript, sửa hồ sơ/đổi mật khẩu, điều hướng các màn hình admin/public và kiểm tra overflow/JS exceptions. Ảnh chụp trong `artifacts/`.
- Browser smoke script tại `scripts/browser-smoke.cjs`; dùng `HI_BROWSER_MODULE` trỏ tới `playwright-core` cài ngoài repo, `HI_BROWSER_EXECUTABLE` trỏ Chromium, `HI_BROWSER_BASE_URL`/`HI_BROWSER_ADMIN_TOKEN` trỏ **máy chủ kiểm thử riêng**. Script tạo tài khoản, bài viết, khóa học/bài học, tiến độ và ảnh, không chạy trên dữ liệu production.

Thiết kế dùng token màu/spacing/component trong `public/style.css` và `public/cms.css`. Đã xác minh repo tham khảo [shadcn/ui](https://github.com/shadcn-ui/ui), [dnd-kit](https://github.com/clauderic/dnd-kit) qua GitHub; không sao chép mã/cài các thư viện đó hoặc coi việc kiểm tra Git là audit mã nguồn.
