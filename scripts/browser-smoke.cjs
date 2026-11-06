const {chromium}=require(process.env.HI_BROWSER_MODULE||'playwright-core');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const artifactRoot=resolve(__dirname,'../artifacts');mkdirSync(artifactRoot,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.HI_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const origin=process.env.HI_BROWSER_BASE_URL;if(!origin||!process.env.HI_BROWSER_ADMIN_TOKEN)throw Error('Set HI_BROWSER_BASE_URL and HI_BROWSER_ADMIN_TOKEN for an isolated test server.');
await page.goto(origin);await page.locator('.course-card').first().waitFor();assert.equal(await page.locator('.course-card').count(),3);await page.screenshot({path:artifactRoot+'/home-desktop.png',fullPage:true});
await page.goto(origin+'/tai-khoan');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.getByLabel('Họ và tên').fill('Học viên kiểm thử');await page.getByLabel('Email',{exact:true}).fill('browser-'+Date.now()+'@example.com');await page.getByLabel('Mật khẩu (tối thiểu 10 ký tự)').fill('browser-student-123');await page.locator('[name=consent]').check();await page.getByRole('button',{name:'Tạo tài khoản →'}).click();await page.getByRole('heading',{name:/Xin chào/}).waitFor();
await page.goto(origin+'/admin');await page.getByLabel('Mã quản trị',{exact:true}).fill(process.env.HI_BROWSER_ADMIN_TOKEN);await page.getByRole('button',{name:'Kết nối',exact:true}).click();await page.getByText('Tạo giá trị, từ một nội dung nhỏ.').waitFor();
await page.getByRole('button',{name:/Bài viết/}).click();await page.getByRole('button',{name:'+ Tạo mới'}).click();await page.getByLabel('Tiêu đề',{exact:true}).fill('Bản tin công nghệ kiểm thử');await page.getByLabel('Mô tả ngắn').fill('Thông tin từ CMS được xuất bản.');await page.getByLabel('Nội dung (văn bản thuần, hỗ trợ xuống dòng)').fill('Đây là nội dung bài viết được tạo qua giao diện quản trị.');await page.getByLabel('Trạng thái').selectOption('published');
await page.getByRole('button',{name:'+ Văn bản',exact:true}).click();
await page.locator('.block-editor').nth(0).getByLabel('Tiêu đề khối',{exact:true}).fill('Thực hành cùng HI');
await page.locator('.block-editor').nth(0).getByLabel('Nội dung khối',{exact:true}).fill('Nội dung được dựng bằng khối an toàn.');
await page.getByRole('button',{name:'+ Kêu gọi hành động',exact:true}).click();
await page.locator('.block-editor').nth(1).getByLabel('Tiêu đề khối',{exact:true}).fill('Sẵn sàng khám phá?');
await page.locator('.block-editor').nth(1).getByLabel('Nhãn nút',{exact:true}).fill('Xem khóa học');
await page.locator('.block-editor').nth(1).getByLabel('Liên kết nút',{exact:true}).fill('/khoa-hoc');
await page.getByRole('button',{name:'Đưa xuống khối 1',exact:true}).click();
assert.equal(await page.locator('.block-editor').nth(0).getByLabel('Tiêu đề khối',{exact:true}).inputValue(),'Sẵn sàng khám phá?');
await page.setViewportSize({width:1440,height:1800});await page.locator('.block-editor-list').scrollIntoViewIfNeeded();
await page.locator('.block-editor').nth(1).locator('.block-drag-handle').dragTo(page.locator('.block-editor').nth(0).locator('.block-editor-header'),{targetPosition:{x:30,y:15}});
assert.equal(await page.locator('.block-editor').nth(0).getByLabel('Tiêu đề khối',{exact:true}).inputValue(),'Thực hành cùng HI');await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Lưu nội dung →'}).click();await page.getByText('Đã lưu và xuất bản.',{exact:true}).waitFor();

// Preview, unsaved-change cancellation, failed saves and two-tab conflicts.
const publishedPosts=await(await page.request.get(origin+'/api/admin/content?kind=posts')).json();
const originalPost=publishedPosts.find(p=>p.title==='Bản tin công nghệ kiểm thử');assert.ok(originalPost);assert.equal(await page.getByAltText('Xem trước ảnh đại diện',{exact:true}).isVisible(),false);
const unsavedTitle='Nội dung nháp <script>window.previewExecuted=true</script>';
await page.getByLabel('Tiêu đề',{exact:true}).fill(unsavedTitle);
await page.getByRole('button',{name:'Xem trước nội dung',exact:true}).click();
await page.locator('.editor-preview').getByRole('heading',{name:unsavedTitle,exact:true}).waitFor();
assert.equal(await page.evaluate(()=>window.previewExecuted),undefined);
const beforePreview=await(await page.request.get(origin+'/api/admin/content?kind=posts')).json();
assert.equal(beforePreview.find(p=>p.id===originalPost.id).revision,originalPost.revision);
page.once('dialog',dialog=>dialog.dismiss());
await page.locator('.studio-nav button').filter({hasText:'Dashboard'}).click();
assert.equal(await page.getByLabel('Tiêu đề',{exact:true}).inputValue(),unsavedTitle);
await page.route('**/api/admin/content/posts/'+originalPost.id,route=>route.abort());
await page.getByRole('button',{name:'Lưu nội dung →',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#global-status').classList.contains('studio-error'));
assert.equal(await page.getByLabel('Tiêu đề',{exact:true}).inputValue(),unsavedTitle);
await page.getByText('Có thay đổi chưa lưu.',{exact:true}).waitFor();
await page.unroute('**/api/admin/content/posts/'+originalPost.id);
const concurrent=await page.request.put(origin+'/api/admin/content/posts/'+originalPost.id,{data:{...originalPost,title:'Bản cập nhật từ tab khác'}});assert.equal(concurrent.status(),200);
await page.getByRole('button',{name:'Lưu nội dung →',exact:true}).click();
await page.getByText('Nội dung đã được thay đổi ở phiên khác. Tải lại bản đã lưu trước khi chỉnh sửa tiếp.',{exact:true}).waitFor();
assert.equal(await page.getByLabel('Tiêu đề',{exact:true}).inputValue(),unsavedTitle);
page.once('dialog',dialog=>dialog.accept());
await page.getByRole('button',{name:'Tải lại bản đã lưu',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('[name=title]')?.value==='Bản cập nhật từ tab khác');
await page.getByLabel('Tiêu đề',{exact:true}).fill(originalPost.title);
await page.getByRole('button',{name:'Lưu nội dung →',exact:true}).click();
await page.getByText('Đã lưu và xuất bản.',{exact:true}).waitFor();
await page.getByRole('button',{name:'Xem trước nội dung',exact:true}).click();
await page.screenshot({path:artifactRoot+'/editor-preview-desktop.png',fullPage:true});
// A slow older response must not append content into the newly selected screen.
await page.route('**/api/admin/content?kind=courses',async route=>{await new Promise(r=>setTimeout(r,300));await route.continue();});
const pendingCourses=page.waitForRequest(r=>r.url().endsWith('/api/admin/content?kind=courses'));
await page.locator('.studio-nav button').filter({hasText:'Khóa học'}).click();await pendingCourses;
await page.locator('.studio-nav button').filter({hasText:'Bài viết'}).click();
await page.getByRole('heading',{name:'Bản tin công nghệ kiểm thử',exact:true}).waitFor();
await page.waitForTimeout(400);assert.equal(await page.locator('#studio-view').getByRole('heading',{name:'Làm việc thông minh hơn cùng AI',exact:true}).count(),0);
await page.unroute('**/api/admin/content?kind=courses');

await page.getByRole('button',{name:/Bài viết/}).click();
await page.getByLabel('Tìm nội dung',{exact:true}).fill('ban tin cong nghe');
await page.getByRole('heading',{name:'Bản tin công nghệ kiểm thử',exact:true}).waitFor();
await page.getByLabel('Trạng thái',{exact:true}).selectOption('draft');
await page.getByText('Không tìm thấy nội dung phù hợp.',{exact:true}).waitFor();
await page.getByLabel('Trạng thái',{exact:true}).selectOption('published');
await page.getByRole('heading',{name:'Bản tin công nghệ kiểm thử',exact:true}).waitFor();
await page.getByRole('button',{name:/Khóa học/}).click();
await page.getByRole('button',{name:'+ Tạo mới'}).click();
await page.getByLabel('Tiêu đề',{exact:true}).fill('Khóa học tiến độ kiểm thử');
await page.getByLabel('Trạng thái',{exact:true}).selectOption('published');
await page.getByRole('button',{name:'+ Thêm bài học',exact:true}).click();
await page.getByLabel('Bài 1',{exact:true}).fill('Bài học đầu tiên');
await page.getByRole('button',{name:'+ Thêm bài học',exact:true}).click();
await page.getByLabel('Bài 2',{exact:true}).fill('Bài học tiếp theo');
await page.getByRole('button',{name:'Lưu nội dung →'}).click();
await page.getByRole('heading',{name:'Chỉnh sửa · Quản lý khóa học',exact:true}).waitFor();
const courseResponse=await page.request.get(origin+'/api/admin/content?kind=courses');
assert.equal(courseResponse.status(),200);
const createdCourse=(await courseResponse.json()).find(c=>c.title==='Khóa học tiến độ kiểm thử');assert.ok(createdCourse);
const learner=(await(await page.request.get(origin+'/api/auth/me')).json()).user;
const enrollment=await page.request.post(origin+'/api/admin/enrollments',{data:{userId:learner.id,courseId:createdCourse.id}});assert.equal(enrollment.status(),200);
await page.goto(origin+'/khoa-hoc/'+createdCourse.id);
await page.getByRole('button',{name:'Đánh dấu hoàn thành',exact:true}).first().click();
await page.getByText('Đã hoàn thành 1/2 bài học · 50%',{exact:true}).waitFor();
await page.reload();await page.getByRole('button',{name:'✓ Đã hoàn thành',exact:true}).waitFor();
await page.getByRole('button',{name:'Đánh dấu hoàn thành',exact:true}).click();
await page.getByText('Đã hoàn thành 2/2 bài học · 100%',{exact:true}).waitFor();
await page.getByRole('button',{name:'✓ Đã hoàn thành',exact:true}).first().click();
await page.getByText('Đã hoàn thành 1/2 bài học · 50%',{exact:true}).waitFor();
await page.screenshot({path:artifactRoot+'/learning-desktop.png',fullPage:true});
await page.goto(origin+'/tai-khoan');await page.getByText('Đã hoàn thành 1/2 bài học · 50%',{exact:true}).waitFor();
await page.goto(origin+'/admin');
await page.getByRole('button',{name:/Thư viện media/}).click();await page.getByLabel('Chọn ảnh / video / tài liệu').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1sAAAAASUVORK5CYII=','base64')});await page.getByLabel('Quyền hiển thị').selectOption('public');await page.getByRole('button',{name:'Tải lên →'}).click();await page.getByRole('heading',{name:'preview.png',exact:true}).first().waitFor();

const uploadedCard=page.locator('.media-item').filter({has:page.getByRole('heading',{name:'preview.png',exact:true})}).first();
await page.screenshot({path:artifactRoot+'/media-desktop.png',fullPage:true});
page.once('dialog',dialog=>dialog.accept());
await uploadedCard.getByRole('button',{name:'Xóa tệp',exact:true}).click();
await page.getByText('Thư viện chưa có tệp.',{exact:true}).waitFor();
for(const label of ['Dashboard','Khóa học','Chuyên mục','Trang nội dung','Học viên & quyền học','Đăng ký tư vấn','Bố cục trang chủ','AI Creative Studio','Cấu hình & cài đặt']){await page.locator('.studio-nav button').filter({hasText:label}).click();await page.waitForTimeout(120);assert.ok(!(await page.locator('#studio-view').innerText()).includes('Cần mã quản trị hợp lệ'),label);}
await page.screenshot({path:artifactRoot+'/admin-desktop.png',fullPage:true});
await page.goto(origin+'/tin-tuc');await page.getByRole('heading',{name:'Bản tin công nghệ kiểm thử',exact:true}).first().waitFor();await page.getByRole('link',{name:'Đọc bài viết →'}).first().click();await page.getByText('Đây là nội dung bài viết được tạo qua giao diện quản trị.',{exact:true}).waitFor();

await page.getByRole('heading',{name:'Thực hành cùng HI',exact:true}).waitFor();
await page.getByRole('link',{name:'Xem khóa học →',exact:true}).waitFor();
const publicUrl=page.url();const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.goto(publicUrl);await staticPage.getByRole('heading',{name:'Thực hành cùng HI',exact:true}).waitFor();await noJS.close();
for(const path of ['/gioi-thieu','/dich-vu','/khoa-hoc','/khoa-hoc/ai-work','/hoat-dong','/dieu-khoan','/quy-dinh','/bao-mat']){await page.goto(origin+path);await page.waitForFunction(()=>!document.querySelector('#portal').textContent.includes('Đang tải'));assert.ok(!(await page.locator('#portal').innerText()).includes('Chưa thể hiển thị'),path);}
await page.setViewportSize({width:390,height:844});for(const path of ['/','/gioi-thieu','/khoa-hoc','/tai-khoan','/admin']){await page.goto(origin+path);await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow '+path);if(path==='/')await page.screenshot({path:artifactRoot+'/home-mobile.png',fullPage:true});if(path==='/admin')await page.screenshot({path:artifactRoot+'/admin-mobile.png',fullPage:true});}
for(const width of [320,768]){await page.setViewportSize({width,height:900});for(const path of ['/','/khoa-hoc','/admin']){await page.goto(origin+path);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+path);}}

await page.goto(origin+'/tai-khoan');await page.getByLabel('Họ và tên',{exact:true}).fill('Học viên hoàn thiện hồ sơ');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByRole('heading',{name:'Xin chào, Học viên hoàn thiện hồ sơ',exact:true}).waitFor();
await page.getByLabel('Mật khẩu hiện tại',{exact:true}).fill('browser-student-123');await page.getByLabel('Mật khẩu mới',{exact:true}).fill('browser-new-password-123');await page.getByLabel('Nhập lại mật khẩu mới',{exact:true}).fill('browser-new-password-123');await page.getByRole('button',{name:'Đổi mật khẩu',exact:true}).click();await page.getByText('Đã đổi mật khẩu và đăng xuất các phiên học viên. Vui lòng đăng nhập lại.',{exact:true}).waitFor();
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/admin');await page.locator('.studio-nav button').filter({hasText:'Bài viết'}).click();await page.locator('.studio-list article').filter({has:page.getByRole('heading',{name:'Bản tin công nghệ kiểm thử',exact:true})}).getByRole('button',{name:'Chỉnh sửa',exact:true}).click();await page.getByRole('button',{name:'Xem trước nội dung',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile editor overflow');await page.screenshot({path:artifactRoot+'/editor-preview-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('Browser checks passed: drag/drop content blocks, public no-JS HTML, profile/password, editor protection, CMS, learning progress and desktop/mobile layouts.');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
