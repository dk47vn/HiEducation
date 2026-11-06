const $=s=>document.querySelector(s);const main=$('#portal');
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});const d=await r.json();if(!r.ok)throw Error(d.error||'Không thể tải dữ liệu.');return d;}
function link(text,href,cls){const a=el('a',text,cls);a.href=href;return a;}
function heading(kicker,title,description){document.title=title+' — HI Education';main.append(el('div',kicker,'eyebrow'),el('h1',title));if(description)main.append(el('p',description,'intro'));}
function cover(id,alt){const image=el('img');image.src='/media/'+encodeURIComponent(id);image.alt=alt;image.loading='lazy';image.className='content-cover';return image;}
function marketingVideo(id){const video=el('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src='/media/'+encodeURIComponent(id);video.className='marketing-video';return video;}
function card(item,course=false){const a=el('article',undefined,'content-card');if(item.coverId)a.append(cover(item.coverId,item.title));else a.append(el('div',course?'✦':'✳︎','content-card-art'));const content=el('div',undefined,'content-card-body');content.append(el('div',course?item.label||'KHÓA HỌC':item.section==='hoat-dong'?'HOẠT ĐỘNG':'BÀI VIẾT','eyebrow'),el('h2',item.title),el('p',item.description||''));if(course)content.append(el('p',[item.duration,item.level].filter(Boolean).join(' · '),'muted'));if(course&&item.progress)content.append(progressSummary(item.progress));content.append(link(course?'Khám phá khóa học →':'Đọc bài viết →',course?'/khoa-hoc/'+encodeURIComponent(item.id):'/bai-viet/'+encodeURIComponent(item.id),'course-link'));a.append(content);return a;}
function empty(parent,text){parent.append(el('p',text,'empty-state'));}
async function posts(section){const items=await api('/api/content?kind=posts&section='+section);const categories=await api('/api/content?kind=categories');const filters=el('div',undefined,'filters');const grid=el('div',undefined,'content-grid');const draw=category=>{grid.replaceChildren();const filtered=items.filter(x=>!category||x.category===category);filtered.forEach(x=>grid.append(card(x)));if(!filtered.length)empty(grid,'Nội dung đang được cập nhật. Mời bạn quay lại sau.');};for(const c of [{id:'',title:'Tất cả'},...categories.filter(c=>items.some(x=>x.category===c.id))]){const b=el('button',c.title,c.id?'':'active');b.setAttribute('aria-pressed',String(!c.id));b.onclick=()=>{filters.querySelectorAll('button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});draw(c.id);};filters.append(b);}main.append(filters,grid);draw('');}
function field(form,label,name,type='text'){const wrapper=el('label',label);const input=el('input');input.name=name;input.type=type;input.required=true;input.autocomplete=type==='password'?'current-password':name==='name'?'name':'email';wrapper.append(input);form.append(wrapper);return input;}
async function account(){const {user,courses}=await api('/api/auth/me');heading('MY HI / KHÔNG GIAN HỌC TẬP',user?'Xin chào, '+user.name:'Một tài khoản. Nhiều khả năng.');if(user){main.append(el('p',user.email,'muted'));const logout=el('button','Đăng xuất','button');logout.onclick=async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'});await load();}catch(e){status.textContent=e.message;}};const status=el('p','','form-message');status.setAttribute('role','status');main.append(logout,status,el('h2','Khóa học của bạn'));const grid=el('div',undefined,'content-grid');courses.forEach(c=>grid.append(card(c,true)));if(!courses.length)empty(grid,'Bạn chưa được cấp quyền khóa học. Liên hệ HI để đăng ký và được hỗ trợ.');main.append(grid,link('Khám phá khóa học →','/khoa-hoc','text-link'));accountSettings(user);return;}
const tabs=el('div',undefined,'filters');const wrap=el('div',undefined,'account-card');const draw=register=>{wrap.replaceChildren();const f=el('form');if(register){const name=field(f,'Họ và tên','name');name.minLength=2;name.maxLength=120;}field(f,'Email','email','email');const password=field(f,'Mật khẩu (tối thiểu 10 ký tự)','password','password');password.minLength=10;password.maxLength=128;password.autocomplete=register?'new-password':'current-password';if(register){const label=el('label',undefined,'consent');const consent=el('input');consent.type='checkbox';consent.required=true;consent.name='consent';label.append(consent,el('span','Tôi đồng ý với '),link('điều khoản','/dieu-khoan'),el('span',' và '),link('chính sách quyền riêng tư','/bao-mat'));f.append(label);}const submit=el('button',register?'Tạo tài khoản →':'Đăng nhập →','button');const status=el('p','','form-message');status.setAttribute('role','status');f.append(submit,status);f.onsubmit=async e=>{e.preventDefault();submit.disabled=true;status.textContent='Đang xử lý…';const data=Object.fromEntries(new FormData(f));data.consent=data.consent==='on';try{await api('/api/auth/'+(register?'register':'login'),{method:'POST',body:JSON.stringify(data)});await load();}catch(e){status.textContent=e.message;submit.disabled=false;}};wrap.append(f);};for(const [text,register]of[['Đăng nhập',false],['Đăng ký',true]]){const b=el('button',text,register?'':'active');b.onclick=()=>{tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));draw(register);};tabs.append(b);}main.append(tabs,wrap);draw(false);}
function accountSettings(user){
 const section=el('section',undefined,'account-settings');section.append(el('h2','Cài đặt tài khoản'));
 const grid=el('div',undefined,'account-settings-grid');
 const profile=el('form',undefined,'account-card');profile.append(el('h3','Thông tin cá nhân'));
 const name=field(profile,'Họ và tên','name');name.value=user.name;name.minLength=2;name.maxLength=120;
 const save=el('button','Lưu hồ sơ','button');const note=el('p','','form-message');note.setAttribute('role','status');profile.append(save,note);
 profile.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const data=await api('/api/auth/profile',{method:'PUT',body:JSON.stringify({name:name.value})});note.textContent=data.message;main.querySelector('h1').textContent='Xin chào, '+data.user.name;}catch(error){note.textContent=error.message;}finally{save.disabled=false;}};
 const password=el('form',undefined,'account-card');password.append(el('h3','Đổi mật khẩu'));
 const current=field(password,'Mật khẩu hiện tại','currentPassword','password');current.maxLength=128;
 const next=field(password,'Mật khẩu mới','newPassword','password');next.autocomplete='new-password';next.minLength=10;next.maxLength=128;
 const confirm=field(password,'Nhập lại mật khẩu mới','confirmPassword','password');confirm.autocomplete='new-password';confirm.minLength=10;confirm.maxLength=128;
 const submit=el('button','Đổi mật khẩu','button');const state=el('p','','form-message');state.setAttribute('role','status');password.append(submit,state,el('p','Đổi mật khẩu sẽ đăng xuất mọi phiên học viên.','studio-help'));
 password.onsubmit=async event=>{event.preventDefault();if(next.value!==confirm.value){state.textContent='Mật khẩu nhập lại không khớp.';return;}submit.disabled=true;try{const data=await api('/api/auth/password',{method:'PUT',body:JSON.stringify({currentPassword:current.value,newPassword:next.value})});await load();const message=el('p',data.message,'notice');message.setAttribute('role','status');main.prepend(message);}catch(error){state.textContent=error.message;submit.disabled=false;}};
 grid.append(profile,password);section.append(grid);main.append(section);
}
function progressSummary(value){
 const box=el('div',undefined,'learning-progress');
 const text=el('p',`Đã hoàn thành ${value.completed}/${value.total} bài học · ${value.percent}%`);
 const bar=el('progress');bar.max=value.total||1;bar.value=value.completed;bar.setAttribute('aria-label','Tiến độ học tập');
 box.append(text,bar);return box;
}
async function course(id){
 const c=await api('/api/course/'+encodeURIComponent(id));
 heading(c.label||'KHÓA HỌC',c.title,c.description);
 if(c.coverId)main.append(cover(c.coverId,c.title));
 main.append(el('div',c.body,'prose'));window.HIBlocks.render(c.blocks,main);
 const price=c.price?new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(c.price):'Liên hệ tư vấn';
 main.append(el('p',[c.duration,c.level,price].filter(Boolean).join(' · '),'course-info'));
 if(!c.enrolled)main.append(el('p','Đăng nhập và được HI cấp quyền để xem video, tài liệu khóa học.','notice'),link('Tài khoản học tập →','/tai-khoan','button'),link('Đăng ký tư vấn →','/#contact','button secondary'));
 const summary=el('div');if(c.progress){summary.append(progressSummary(c.progress));main.append(summary);}
 main.append(el('h2','Nội dung khóa học'));
 if(!c.lessonsData.length)empty(main,'Nội dung bài học đang được cập nhật.');
 const player=el('div',undefined,'lesson-player');
 const me=await api('/api/auth/me');
 player.append(el('p',me.user?'Phiên học của '+me.user.email:'Nội dung dành cho học viên được cấp quyền','watermark'));
 main.append(player);
 const message=el('p','','form-message');message.setAttribute('role','status');
 const completed=new Set(c.progress?.completedIds||[]);
 for(const [index,lesson]of c.lessonsData.entries()){
  const row=el('article',undefined,'lesson-row');
  row.append(el('span',String(index+1).padStart(2,'0'),'eyebrow'),el('h3',lesson.title));
  for(const [key,title]of[['videoId','Xem video'],['fileId','Mở tài liệu']])if(lesson[key]){
   const b=el('button',title,'button small');
   b.onclick=async()=>{
    b.disabled=true;
    try{
     const ticket=await api('/api/media/'+lesson[key]+'/ticket',{method:'POST',body:'{}'});
     player.querySelector('video')?.remove();player.querySelector('.document-link')?.remove();
     if(key==='videoId'){
      const video=el('video');video.controls=true;video.setAttribute('controlsList','nodownload noremoteplayback');video.disablePictureInPicture=true;video.playsInline=true;video.src=ticket.url;
      video.addEventListener('contextmenu',e=>e.preventDefault());
      video.addEventListener('error',()=>{message.textContent='Video không phát được hoặc liên kết hết hạn. Bấm Xem video để lấy phiên mới.';});
      player.append(video);player.scrollIntoView({behavior:'smooth',block:'center'});
     }else{const a=link('Mở tài liệu trong phiên này →',ticket.url,'document-link button');a.target='_blank';a.rel='noopener';player.append(a);}
     message.textContent='Liên kết có hiệu lực 5 phút. Không chia sẻ tài nguyên học tập.';
    }catch(e){message.textContent=e.message;}finally{b.disabled=false;}
   };
   row.append(b);
  }
  if(c.progress){
   const mark=el('button',undefined,'mini-button lesson-complete');
   const refresh=()=>{const done=completed.has(lesson.id);mark.textContent=done?'✓ Đã hoàn thành':'Đánh dấu hoàn thành';mark.setAttribute('aria-pressed',String(done));row.classList.toggle('completed',done);};
   refresh();
   mark.onclick=async()=>{
    mark.disabled=true;
    try{
     const result=await api('/api/learning/'+encodeURIComponent(id)+'/progress',{method:'PUT',body:JSON.stringify({lessonId:lesson.id,completed:!completed.has(lesson.id)})});
     completed.clear();result.completedIds.forEach(value=>completed.add(value));
     summary.replaceChildren(progressSummary(result));refresh();message.textContent='Đã lưu tiến độ học tập.';
    }catch(e){message.textContent=e.message;}finally{mark.disabled=false;}
   };
   row.append(mark);
  }
  main.append(row);
 }
 main.append(message);
}
async function load(){main.replaceChildren();try{const path=location.pathname;if(path==='/tai-khoan')await account();else if(path==='/khoa-hoc'){heading('HI / KHÓA HỌC','Kỹ năng mới. Cơ hội mới.','Khám phá lộ trình tin học và AI cho mục tiêu của bạn.');const courses=await api('/api/courses');const categories=await api('/api/content?kind=categories');const filters=el('div',undefined,'filters'),grid=el('div',undefined,'content-grid');const draw=id=>{grid.replaceChildren();const selected=courses.filter(c=>!id||c.category===id);selected.forEach(c=>grid.append(card(c,true)));if(!selected.length)empty(grid,'Chưa có khóa học thuộc chuyên mục này.');};for(const c of [{id:'',title:'Tất cả'},...categories]){const b=el('button',c.title,c.id?'':'active');b.onclick=()=>{filters.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));draw(c.id);};filters.append(b);}main.append(filters,grid);draw('');}else if(path.startsWith('/khoa-hoc/'))await course(decodeURIComponent(path.slice(10)));else if(path.startsWith('/bai-viet/')){const id=decodeURIComponent(path.slice(10));const p=(await api('/api/content?kind=posts')).find(x=>x.id===id);if(!p)throw Error('Bài viết không tồn tại hoặc chưa xuất bản.');heading('HI / GÓC TRI THỨC',p.title,p.description);if(p.coverId)main.append(cover(p.coverId,p.title));if(p.videoId)main.append(marketingVideo(p.videoId));main.append(el('article',p.body,'prose'));window.HIBlocks.render(p.blocks,main);}else if(['/tin-tuc','/hoat-dong'].includes(path)){heading('HI / CÙNG KHÁM PHÁ',path==='/tin-tuc'?'Góc nhìn mới về công nghệ.':'Học tập. Kết nối. Trải nghiệm.');await posts(path.slice(1));}else{const p=(await api('/api/content?kind=pages')).find(x=>x.id===path.slice(1));if(!p)throw Error('Trang chưa được xuất bản.');heading('HI / '+p.title.toUpperCase(),p.title);if(p.coverId)main.append(cover(p.coverId,p.title));if(p.videoId)main.append(marketingVideo(p.videoId));main.append(el('article',p.body,'prose'));window.HIBlocks.render(p.blocks,main);if(['/gioi-thieu','/dich-vu'].includes(path)){main.append(link('Trao đổi với HI →','/#contact','button'),el('h2','Khám phá thêm'));await posts(path.slice(1));}}}catch(e){main.append(el('h1','Chưa thể hiển thị nội dung'),el('p',e.message,'notice'),link('Về trang chủ','/','button'));}}
$('.menu-toggle').onclick=()=>{const open=$('.menu-toggle').getAttribute('aria-expanded')!=='true';$('.menu-toggle').setAttribute('aria-expanded',String(open));$('#nav').classList.toggle('open',open);};api('/api/site').then(site=>{$('#site-contact').textContent=[site.name,site.tagline,site.email,site.phone,site.address].filter(Boolean).join(' · ');}).catch(()=>{});load();
