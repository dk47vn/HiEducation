import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const mediaDir=mkdtempSync(join(tmpdir(),'hi-test-'));process.env.MEDIA_DIR=mediaDir;
after(()=>rmSync(mediaDir,{recursive:true,force:true}));
// Integration tests must never inherit live AI credentials or call paid services.
for(const key of ['HI_AI_API_KEY','OPENAI_API_KEY','HI_AI_VIDEO_MODEL'])delete process.env[key];
process.env.DB_PATH=':memory:';process.env.ADMIN_TOKEN='test-token-only';
const {server}=await import('../server.js');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(()=>new Promise(resolve=>server.close(resolve)));
const base=`http://127.0.0.1:${server.address().port}`;
const call=(path,method='GET',body,token)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('public page and course catalog are served',async()=>{const r=await call('/');assert.equal(r.status,200);assert.match(await r.text(),/HI Education/);const courses=await(await call('/api/courses')).json();assert.equal(courses.length,3);});
test('lead validation, persistence and admin authorization',async()=>{assert.equal((await call('/api/leads','POST',{name:'A',email:'invalid'})).status,400);assert.equal((await call('/api/admin/leads')).status,401);assert.equal((await call('/api/admin/leads','GET',null,'wrong-token')).status,401);const lead={name:'Người học',email:'learner@example.com',course:'ai-work',consent:true};assert.equal((await call('/api/leads','POST',lead)).status,201);const leads=await(await call('/api/admin/leads','GET',null,'test-token-only')).json();assert.equal(leads.length,1);assert.equal(leads[0].email,lead.email);});
test('page edits require auth, validate order and persist',async()=>{const page={headline:'Học công nghệ cùng HI',sections:['contact','courses','journey']};assert.equal((await call('/api/admin/page','PUT',page)).status,401);assert.equal((await call('/api/admin/page','PUT',{...page,sections:['courses','courses','contact']},'test-token-only')).status,400);assert.equal((await call('/api/admin/page','PUT',page,'test-token-only')).status,200);assert.deepEqual(await(await call('/api/page')).json(),page);});
test('static access is allowlisted and API errors are structured',async()=>{assert.equal((await call('/server.js')).status,404);assert.equal((await call('/api/unknown')).status,404);assert.match((await call('/style.css')).headers.get('content-type'),/text\/css/);});

const admin='test-token-only';
const draftCourse={title:'Khóa kiểm thử',description:'Học thử',body:'Nội dung',status:'draft',category:'ai',lessonsData:[],price:100000};
let courseId,userId,cookie,videoId,ticket;
test('CMS draft visibility, publish, validation, page updates and categories',async()=>{
 assert.equal((await call('/api/admin/content/courses','POST',draftCourse)).status,401);
 let r=await call('/api/admin/content/courses','POST',draftCourse,admin);assert.equal(r.status,201);courseId=(await r.json()).id;
 assert.ok(!(await(await call('/api/courses')).json()).some(c=>c.id===courseId));
 assert.equal((await call('/api/course/'+courseId)).status,404);
 assert.ok(!(await(await call('/api/content?kind=courses')).json()).some(c=>c.id===courseId));
 assert.equal((await call('/api/admin/content/courses/'+courseId,'PUT',{...draftCourse,price:-1},admin)).status,400);
 r=await call('/api/admin/content/courses/'+courseId,'PUT',{...draftCourse,status:'published'},admin);assert.equal(r.status,200);
 assert.ok((await(await call('/api/courses')).json()).some(c=>c.id===courseId));
 r=await call('/api/admin/content/posts','POST',{title:'Bài viết mẫu',status:'published',section:'tin-tuc',category:'ai',body:'Nội dung bài',description:'Tóm tắt'},admin);assert.equal(r.status,201);const post=await r.json();
 assert.ok((await(await call('/api/content?kind=posts&section=tin-tuc')).json()).some(p=>p.id===post.id));
 assert.equal((await call('/api/admin/content/categories/ai','DELETE',null,admin)).status,409);
 assert.equal((await call('/api/admin/content/posts/'+post.id,'DELETE',null,admin)).status,200);
 assert.equal((await call('/api/admin/content/pages/gioi-thieu','PUT',{title:'Giới thiệu mới',status:'published',body:'Nội dung mới'},admin)).status,200);
});
test('account registration, bad login and HttpOnly session',async()=>{
 assert.equal((await call('/api/auth/register','POST',{email:'student@example.com',password:'short'})).status,400);
 const r=await call('/api/auth/register','POST',{name:'Học viên',email:'student@example.com',password:'long-password-123',consent:true});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);cookie=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/auth/login','POST',{email:'student@example.com',password:'wrong-password'})).status,401);
 const me=await(await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json();userId=me.user.id;assert.equal(me.user.email,'student@example.com');assert.equal(me.user.password,undefined);
});
test('media validation, streaming upload, course rights and revocation',async()=>{
 const upload=(mime,data,query='')=>fetch(base+'/api/admin/media?name=lesson.mp4&course='+courseId+query,{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':mime},body:data});
 assert.equal((await upload('video/mp4',Buffer.from('not-a-video'))).status,415);
 const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(32)]);
 let r=await upload('video/mp4',bytes);assert.equal(r.status,201);videoId=(await r.json()).id;
 assert.equal((await fetch(base+'/api/admin/media?name=bad.svg',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'image/svg+xml'},body:'<svg></svg>'})).status,415);
 assert.equal((await upload('video/mp4',bytes,'&visibility=public')).status,400);
 assert.equal((await call('/api/admin/content/courses/'+courseId,'PUT',{...draftCourse,status:'published',lessonsData:[{title:'Bài 1',videoId}]},admin)).status,200);
 const publicCourse=await(await call('/api/course/'+courseId)).json();assert.equal(publicCourse.lessonsData[0].videoId,undefined);
 const publicList=await(await call('/api/content?kind=courses')).json();assert.equal(publicList.find(c=>c.id===courseId).lessonsData,undefined);
 assert.equal((await call('/media/'+videoId)).status,403);
 assert.equal((await call('/api/media/'+videoId+'/ticket','POST',{})).status,403);
 const studentCall=(path,method='GET')=>fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
 assert.equal((await studentCall('/api/media/'+videoId+'/ticket','POST')).status,403);
 assert.equal((await call('/api/admin/enrollments','POST',{userId,courseId},admin)).status,200);
 assert.equal((await(await studentCall('/api/course/'+courseId)).json()).enrolled,true);
 r=await studentCall('/api/media/'+videoId+'/ticket','POST');assert.equal(r.status,200);ticket=(await r.json()).url;
 assert.equal((await call(ticket)).status,403);
 r=await fetch(base+ticket,{headers:{Cookie:cookie,Range:'bytes=4-7'}});assert.equal(r.status,206);assert.equal(await r.text(),'ftyp');
 assert.equal((await fetch(base+ticket.replace(/sig=[^&]+/,'sig=wrong'),{headers:{Cookie:cookie}})).status,403);
 assert.equal((await call('/api/admin/media/'+videoId,'PUT',{course_id:'',visibility:'public'},admin)).status,409);
 await call('/api/admin/enrollments','DELETE',{userId,courseId},admin);
 assert.equal((await fetch(base+ticket,{headers:{Cookie:cookie}})).status,403);
});
test('admin cookie session, CSRF origin, AI unconfigured state and site settings',async()=>{
 const r=await call('/api/admin/session','POST',{},admin);assert.equal(r.status,200);const adminCookie=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(base+'/api/admin/dashboard',{headers:{Cookie:adminCookie}})).status,200);
 assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await call('/api/admin/ai/generate','POST',{kind:'text',prompt:'Viết giới thiệu khóa học AI'},admin)).status,503);
 const site={name:'HI Test',tagline:'Học tập',email:'hi@example.com',phone:'',address:''};assert.equal((await call('/api/admin/site','PUT',site,admin)).status,200);assert.deepEqual(await(await call('/api/site')).json(),site);
 assert.equal((await fetch(base+'/api/admin/session',{method:'DELETE',headers:{Cookie:adminCookie}})).status,200);
 assert.equal((await fetch(base+'/api/admin/dashboard',{headers:{Cookie:adminCookie}})).status,401);
 assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie},body:'{}'})).status,200);
 assert.equal((await(await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json()).user,null);
});
test('all requested frontend pages and admin assets are served',async()=>{
 for(const path of ['/gioi-thieu','/dich-vu','/khoa-hoc','/hoat-dong','/tin-tuc','/tai-khoan','/dieu-khoan','/quy-dinh','/bao-mat','/admin','/studio.js','/portal.js','/cms.css'])assert.equal((await call(path)).status,200,path);
});
test('AI text/image/video adapters with simulated provider responses (no live AI calls)',async()=>{
 const original=globalThis.fetch;process.env.HI_AI_API_KEY='mock-key-only';process.env.HI_AI_VIDEO_MODEL='mock-video-model';
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1sAAAAASUVORK5CYII=';
 const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(32)]);
 globalThis.fetch=async(url,options)=>{if(!String(url).startsWith('https://api.openai.com/v1'))return original(url,options);const path=String(url).slice('https://api.openai.com/v1'.length);if(path==='/responses')return Response.json({output:[{content:[{type:'output_text',text:'Bản nháp AI đã mô phỏng.'}]}]});if(path==='/images/generations')return Response.json({data:[{b64_json:png}]});if(path==='/videos'){assert.ok(options.body instanceof FormData);assert.equal(options.body.get('model'),'mock-video-model');assert.equal(options.headers['Content-Type'],undefined);return Response.json({id:'provider-job',status:'queued'});}if(path==='/videos/provider-job')return Response.json({status:'completed',progress:100});if(path==='/videos/provider-job/content')return new Response(bytes);throw Error('Unexpected provider path');};
 try{
  let r=await call('/api/admin/ai/generate','POST',{kind:'text',prompt:'Viết nội dung giới thiệu AI'},admin);assert.equal(r.status,200);assert.match((await r.json()).text,/mô phỏng/);
  r=await call('/api/admin/ai/generate','POST',{kind:'image',prompt:'Tạo ảnh minh họa học tập AI'},admin);assert.equal(r.status,201);const image=(await r.json()).media;assert.equal((await call('/media/'+image.id)).status,200);
  r=await call('/api/admin/ai/generate','POST',{kind:'video',prompt:'Tạo video minh họa học tập AI'},admin);assert.equal(r.status,202);const job=await r.json();assert.equal((await call('/api/admin/ai/jobs/'+job.id+'/import','POST',{},admin)).status,409);
  assert.equal((await(await call('/api/admin/ai/jobs/'+job.id,'GET',null,admin)).json()).status,'completed');
  r=await call('/api/admin/ai/jobs/'+job.id+'/import','POST',{},admin);assert.equal(r.status,201);const video=await r.json();assert.equal(video.visibility,'private');assert.equal((await call('/media/'+video.id)).status,403);
  assert.equal((await call('/api/admin/media/'+video.id,'PUT',{visibility:'public',course_id:''},admin)).status,200);assert.equal((await call('/media/'+video.id)).status,200);
  assert.equal((await call('/api/admin/content/pages/dich-vu','PUT',{title:'Dịch vụ',body:'Có video',status:'published',videoId:video.id,coverId:image.id},admin)).status,200);
  assert.equal((await call('/api/admin/media/'+video.id,'PUT',{visibility:'private',course_id:''},admin)).status,409);
 }finally{globalThis.fetch=original;delete process.env.HI_AI_API_KEY;delete process.env.HI_AI_VIDEO_MODEL;}
});
test('learning progress is account-bound, repeatable and follows stable lesson identities',async()=>{
 let response=await call('/api/auth/login','POST',{email:'student@example.com',password:'long-password-123'});assert.equal(response.status,200);const studentCookie=response.headers.get('set-cookie').split(';')[0];
 const student=(path,method='GET',data)=>fetch(base+path,{method,headers:{Cookie:studentCookie,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 const path='/api/learning/'+courseId+'/progress';
 assert.equal((await call(path)).status,401);assert.equal((await student(path)).status,403);
 await call('/api/admin/enrollments','POST',{userId,courseId},admin);
 let course=(await(await call('/api/admin/content?kind=courses','GET',null,admin)).json()).find(c=>c.id===courseId);
 response=await call('/api/admin/content/courses/'+courseId,'PUT',{...course,lessonsData:[...course.lessonsData,{title:'Bài 2',videoId:'',fileId:''}]},admin);assert.equal(response.status,200);course=await response.json();
 const lessonId=course.lessonsData[0].id;assert.ok(lessonId);assert.notEqual(lessonId,course.lessonsData[1].id);
 assert.equal((await student(path,'PUT',{lessonId:'unknown',completed:true})).status,400);
 assert.equal((await student(path,'PUT',{lessonId,completed:'true'})).status,400);
 response=await student(path,'PUT',{lessonId,completed:true});assert.equal(response.status,200);let p=await response.json();assert.equal(p.completed,1);assert.equal(p.total,2);assert.equal(p.percent,50);
 p=await(await student(path,'PUT',{lessonId,completed:true})).json();assert.equal(p.completed,1);
 let reordered={...course,lessonsData:[...course.lessonsData].reverse()};const reorderResponse=await call('/api/admin/content/courses/'+courseId,'PUT',reordered,admin);assert.equal(reorderResponse.status,200);reordered=await reorderResponse.json();
 p=await(await student(path)).json();assert.deepEqual(p.completedIds,[lessonId]);
 const me=await(await student('/api/auth/me')).json();assert.equal(me.courses.find(c=>c.id===courseId).progress.percent,50);
 const courseDetail=await(await student('/api/course/'+courseId)).json();assert.equal(courseDetail.progress.percent,50);
 const other=await call('/api/auth/register','POST',{name:'Học viên khác',email:'other@example.com',password:'other-password-123',consent:true});assert.equal(other.status,200);const otherCookie=other.headers.get('set-cookie').split(';')[0];const otherUser=(await(await fetch(base+'/api/auth/me',{headers:{Cookie:otherCookie}})).json()).user;
 await call('/api/admin/enrollments','POST',{userId:otherUser.id,courseId},admin);const otherProgress=await(await fetch(base+path,{headers:{Cookie:otherCookie}})).json();assert.equal(otherProgress.completed,0);
 p=await(await student(path,'PUT',{lessonId,completed:false})).json();assert.equal(p.completed,0);
 await student(path,'PUT',{lessonId,completed:true});
 assert.equal((await call('/api/admin/content/courses/'+courseId,'PUT',{...reordered,lessonsData:[reordered.lessonsData[0],reordered.lessonsData[0]]},admin)).status,400);
 assert.equal((await call('/api/admin/content/courses/'+courseId,'PUT',{...reordered,lessonsData:[null]},admin)).status,400);
 const draftResponse=await call('/api/admin/content/courses/'+courseId,'PUT',{...reordered,status:'draft'},admin);assert.equal(draftResponse.status,200);reordered.revision=(await draftResponse.json()).revision;
 assert.equal((await student(path)).status,404);assert.equal((await student('/api/media/'+videoId+'/ticket','POST',{})).status,403);
 assert.equal((await(await student('/api/auth/me')).json()).courses.some(c=>c.id===courseId),false);
 const restoredResponse=await call('/api/admin/content/courses/'+courseId,'PUT',reordered,admin);assert.equal(restoredResponse.status,200);reordered=await restoredResponse.json();
 await call('/api/admin/enrollments','DELETE',{userId,courseId},admin);assert.equal((await student(path,'PUT',{lessonId,completed:false})).status,403);
 await call('/api/admin/enrollments','POST',{userId,courseId},admin);assert.equal((await(await student(path)).json()).completed,1);
 // Removing a lesson never shifts completion to a different lesson.
 let remaining={...reordered,lessonsData:reordered.lessonsData.filter(l=>l.id!==lessonId)};
 const remainingResponse=await call('/api/admin/content/courses/'+courseId,'PUT',remaining,admin);assert.equal(remainingResponse.status,200);remaining=await remainingResponse.json();p=await(await student(path)).json();assert.equal(p.completed,0);assert.equal(p.total,1);
 // Restore a video lesson as a new lesson, leaving its original id retired.
 await call('/api/admin/content/courses/'+courseId,'PUT',{...remaining,lessonsData:[...remaining.lessonsData,{title:'Bài video mới',videoId}]},admin);
});
test('media deletion protects draft/published references and removes unused files',async()=>{
 assert.equal((await call('/api/admin/media/'+videoId,'DELETE')).status,401);
 assert.equal((await call('/api/admin/media/'+videoId,'DELETE',null,admin)).status,409);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1sAAAAASUVORK5CYII=','base64');
 let r=await fetch(base+'/api/admin/media?name=delete-preview.png&visibility=public',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'image/png'},body:png});assert.equal(r.status,201);const image=await r.json();
 const content=await(await call('/api/admin/content/posts','POST',{title:'Nháp có ảnh',status:'draft',section:'tin-tuc',coverId:image.id},admin)).json();
 assert.equal((await call('/api/admin/media/'+image.id,'DELETE',null,admin)).status,409);
 const listing=await(await call('/api/admin/media','GET',null,admin)).json();assert.equal(listing.find(m=>m.id===image.id).references[0].id,content.id);
 await call('/api/admin/content/posts/'+content.id,'DELETE',null,admin);
 assert.equal((await call('/api/admin/media/'+image.id,'DELETE',null,admin)).status,200);
 assert.equal((await call('/media/'+image.id)).status,404);assert.equal((await call('/api/admin/media/'+image.id,'DELETE',null,admin)).status,404);
 const {existsSync}=await import('node:fs');assert.equal(existsSync(join(mediaDir,image.id)),false);
 assert.equal((await call('/api/admin/content/courses/'+courseId,'DELETE',null,admin)).status,409);
});
test('legacy lessons receive stable ids without changing saved course content',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {createCMS}=await import('../cms.js');const database=new DatabaseSync(':memory:');database.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE content(kind TEXT,id TEXT,payload TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(kind,id));');
 const old={id:'legacy',title:'Khóa cũ',status:'published',body:'Nội dung cần giữ',lessonsData:[{title:'Bài cũ',videoId:'',fileId:''}]};database.prepare('INSERT INTO content(kind,id,payload) VALUES(?,?,?)').run('courses',old.id,JSON.stringify(old));database.prepare('INSERT INTO settings VALUES(?,?)').run('cms-seeded','1');
 const first=createCMS(database,mediaDir,[]).get('courses','legacy');const second=createCMS(database,mediaDir,[]).get('courses','legacy');assert.ok(first.lessonsData[0].id);assert.equal(first.lessonsData[0].id,second.lessonsData[0].id);assert.equal(second.body,old.body);assert.equal(second.lessonsData[0].title,'Bài cũ');database.close();
});
test('content revisions reject stale editor writes without losing published content',async()=>{
 const created=await call('/api/admin/content/posts','POST',{title:'Nội dung đồng thời',body:'Bản đầu',status:'draft',section:'tin-tuc'},admin);assert.equal(created.status,201);const original=await created.json();assert.equal(original.revision,1);
 const first=await call('/api/admin/content/posts/'+original.id,'PUT',{...original,title:'Thay đổi ở tab A'},admin);assert.equal(first.status,200);const saved=await first.json();assert.equal(saved.revision,2);
 const stale=await call('/api/admin/content/posts/'+original.id,'PUT',{...original,title:'Tab B ghi đè'},admin);assert.equal(stale.status,409);assert.match((await stale.json()).error,/phiên khác/);
 const latest=(await(await call('/api/admin/content?kind=posts','GET',null,admin)).json()).find(x=>x.id===original.id);assert.equal(latest.title,'Thay đổi ở tab A');assert.equal(latest.revision,2);
 assert.equal((await call('/api/admin/content/posts/'+original.id,'PUT',{...latest,revision:'2'},admin)).status,400);
 const retry=await call('/api/admin/content/posts/'+original.id,'PUT',{...latest,title:'Đã đối chiếu bản mới'},admin);assert.equal(retry.status,200);assert.equal((await retry.json()).revision,3);
});
test('content blocks validate links/media and protect referenced assets',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1sAAAAASUVORK5CYII=','base64');
 const upload=await fetch(base+'/api/admin/media?name=block-preview.png&visibility=public',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'image/png'},body:png});assert.equal(upload.status,201);const media=await upload.json();
 const content={title:'Trang dựng bằng khối',status:'published',section:'tin-tuc',blocks:[{type:'text',title:'Nội dung <script>',body:'Văn bản an toàn'},{type:'image',mediaId:media.id,alt:'Ảnh học tập'},{type:'cta',title:'Khám phá',label:'Học ngay',href:'/khoa-hoc'}]};
 const response=await call('/api/admin/content/posts','POST',content,admin);assert.equal(response.status,201);const saved=await response.json();assert.equal(saved.blocks.length,3);assert.equal(new Set(saved.blocks.map(b=>b.id)).size,3);
 assert.equal((await call('/api/admin/media/'+media.id,'DELETE',null,admin)).status,409);
 assert.equal((await call('/api/admin/media/'+media.id,'PUT',{visibility:'private',course_id:''},admin)).status,409);
 for(const href of ['javascript:alert(1)','//evil.example','/\\evil.example','https://user:pass@example.com','data:text/html,test'])assert.equal((await call('/api/admin/content/posts','POST',{...content,blocks:[{type:'cta',title:'Link',label:'Link',href}]},admin)).status,400,href);
 assert.equal((await call('/api/admin/content/posts','POST',{...content,blocks:[{type:'image',mediaId:videoId}]},admin)).status,400);
 assert.equal((await call('/api/admin/content/posts','POST',{...content,blocks:[{type:'image'}]},admin)).status,400);
 assert.equal((await call('/api/admin/content/posts','POST',{...content,status:'draft',blocks:[{type:'image'}]},admin)).status,201);
 const html=await(await call('/bai-viet/'+saved.id)).text();assert.match(html,/Nội dung &lt;script&gt;/);assert.match(html,/Văn bản an toàn/);assert.ok(!html.includes('Nội dung <script>'));
 const legacyEdit=await call('/api/admin/content/posts/'+saved.id,'PUT',{title:saved.title,section:'tin-tuc',status:'published',revision:saved.revision},admin);assert.equal(legacyEdit.status,200);assert.equal((await legacyEdit.json()).blocks.length,3);
});
test('profile updates and password changes revoke every learner session',async()=>{
 const email='profile@example.com',password='profile-password-123';let response=await call('/api/auth/register','POST',{name:'Tên ban đầu',email,password,consent:true});assert.equal(response.status,200);const firstCookie=response.headers.get('set-cookie').split(';')[0];
 response=await call('/api/auth/login','POST',{email,password});assert.equal(response.status,200);const secondCookie=response.headers.get('set-cookie').split(';')[0];
 const member=(path,data)=>fetch(base+path,{method:'PUT',headers:{Cookie:firstCookie,'Content-Type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await call('/api/auth/profile','PUT',{name:'Không có phiên'})).status,401);
 assert.equal((await member('/api/auth/profile',{name:'A'})).status,400);
 response=await member('/api/auth/profile',{name:'Tên đã cập nhật'});assert.equal(response.status,200);assert.equal((await response.json()).user.name,'Tên đã cập nhật');
 assert.equal((await member('/api/auth/password',{currentPassword:'incorrect-password',newPassword:'new-profile-password-123'})).status,401);
 assert.equal((await member('/api/auth/password',{currentPassword:password,newPassword:password})).status,400);
 response=await member('/api/auth/password',{currentPassword:password,newPassword:'new-profile-password-123'});assert.equal(response.status,200);
 for(const cookie of [firstCookie,secondCookie])assert.equal((await(await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json()).user,null);
 assert.equal((await call('/api/auth/login','POST',{email,password})).status,401);
 assert.equal((await call('/api/auth/login','POST',{email,password:'new-profile-password-123'})).status,200);
});
test('public HTML is pre-rendered, private content stays hidden and sitemap uses configured origin',async()=>{
 const health=await call('/api/health');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
 assert.equal((await call('/khoa-hoc/nonexistent')).status,404);
 const draft=await(await call('/api/admin/content/posts','POST',{title:'Nháp không index',status:'draft',section:'tin-tuc',body:'Không công khai'},admin)).json();assert.equal((await call('/bai-viet/'+draft.id)).status,404);
 process.env.PUBLIC_ORIGIN='https://hi.edu.vn';
 try{const html=await(await call('/gioi-thieu')).text();assert.match(html,/<link rel="canonical" href="https:\/\/hi.edu.vn\/gioi-thieu">/);assert.match(html,/Nội dung mới/);
 const sitemap=await(await call('/sitemap.xml')).text();assert.match(sitemap,/https:\/\/hi.edu.vn\/khoa-hoc/);assert.ok(!sitemap.includes(draft.id));assert.ok(!sitemap.includes('/tai-khoan'));
 assert.match(await(await call('/robots.txt')).text(),/Disallow: \/admin/);
 }finally{delete process.env.PUBLIC_ORIGIN;}
});
test('Vietnamese text remains intact when a UTF-8 character spans HTTP chunks',async()=>{
 const {request}=await import('node:http');const text='Kiến thức về trí tuệ nhân tạo';const encoded=Buffer.from(JSON.stringify({title:text,body:text,status:'draft',section:'tin-tuc'}));const marker=Buffer.from('ế');const split=encoded.indexOf(marker)+1;assert.ok(split>1);
 const result=await new Promise((resolve,reject)=>{const req=request(base+'/api/admin/content/posts',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}));});req.on('error',reject);req.write(encoded.subarray(0,split));setTimeout(()=>req.end(encoded.subarray(split)),10);});
 assert.equal(result.status,201);assert.equal(result.body.title,text);assert.equal(result.body.body,text);
});
