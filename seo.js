import {safeContentHref} from './blocks.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicOrigin(){const input=process.env.PUBLIC_ORIGIN;if(!input)return null;try{const u=new URL(input);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null;}catch{return null;}}
function blocksHTML(blocks=[]){return blocks.map(b=>{
 if(b.type==='text')return `<section class="content-block"><h2>${esc(b.title)}</h2><div class="prose">${esc(b.body)}</div></section>`;
 if(b.type==='image')return b.mediaId?`<figure class="content-block"><img class="content-cover" src="/media/${esc(encodeURIComponent(b.mediaId))}" alt="${esc(b.alt||b.caption)}" loading="lazy"><figcaption>${esc(b.caption)}</figcaption></figure>`:'';
 if(b.type==='video')return b.mediaId?`<section class="content-block"><video class="marketing-video" src="/media/${esc(encodeURIComponent(b.mediaId))}" controls playsinline preload="metadata"></video><p>${esc(b.caption)}</p></section>`:'';
 if(b.type==='cta')return `<section class="content-block block-cta"><h2>${esc(b.title)}</h2><p>${esc(b.body)}</p>${safeContentHref(b.href)?`<a class="button" href="${esc(b.href)}">${esc(b.label)} →</a>`:''}</section>`;
 return '';
}).join('');}
function cover(item){return item.coverId?`<img class="content-cover" src="/media/${esc(encodeURIComponent(item.coverId))}" alt="${esc(item.title)}" loading="lazy">`:'';}
function card(item,course=false){return `<article class="content-card">${cover(item)}<div class="content-card-body"><h2>${esc(item.title)}</h2><p>${esc(item.description)}</p><a class="course-link" href="/${course?'khoa-hoc':'bai-viet'}/${encodeURIComponent(item.id)}">${course?'Khám phá khóa học':'Đọc bài viết'} →</a></div></article>`;}
export function renderPublic(path,cms,template){
 let title,description='',html='',status=200;const published=kind=>cms.list(kind).filter(x=>x.status==='published');
 if(path==='/khoa-hoc'){title='Kỹ năng mới. Cơ hội mới.';html=`<div class="content-grid">${published('courses').map(c=>card(c,true)).join('')||'<p>Chưa có khóa học được xuất bản.</p>'}</div>`;}
 else if(['/tin-tuc','/hoat-dong'].includes(path)){title=path==='/tin-tuc'?'Góc nhìn mới về công nghệ.':'Học tập. Kết nối. Trải nghiệm.';html=`<div class="content-grid">${published('posts').filter(p=>p.section===path.slice(1)).map(p=>card(p)).join('')||'<p>Nội dung đang được cập nhật.</p>'}</div>`;}
 else if(path==='/tai-khoan'){title='Không gian học tập của bạn';html='<p>Đăng nhập hoặc đăng ký để học các khóa đã được cấp quyền.</p><noscript>Vui lòng bật JavaScript để sử dụng tài khoản.</noscript>';}
 else{
  let item,course=false;
  if(path.startsWith('/khoa-hoc/')){item=cms.get('courses',decodeURIComponent(path.slice(10)));course=true;}
  else if(path.startsWith('/bai-viet/'))item=cms.get('posts',decodeURIComponent(path.slice(10)));
  else item=cms.get('pages',path.slice(1));
  if(!item||item.status!=='published'){title='Không tìm thấy nội dung';html='<p>Nội dung không tồn tại hoặc chưa được xuất bản.</p><a class="button" href="/">Về trang chủ</a>';status=404;}
  else{title=item.title;description=item.description||'';html=cover(item)+(item.videoId?`<video class="marketing-video" src="/media/${encodeURIComponent(item.videoId)}" controls playsinline preload="metadata"></video>`:'')+`<article class="prose">${esc(item.body)}</article>`+blocksHTML(item.blocks);
   if(course)html+=`<h2>Nội dung khóa học</h2><ol class="preview-outline">${item.lessonsData.map(l=>`<li>${esc(l.title)}</li>`).join('')}</ol><a class="button" href="/tai-khoan">Đăng nhập để học →</a>`;
   if(['/gioi-thieu','/dich-vu'].includes(path))html+=`<div class="content-grid">${published('posts').filter(p=>p.section===path.slice(1)).map(p=>card(p)).join('')}</div>`;
  }
 }
 const origin=publicOrigin();const canonical=origin&&status===200?`<link rel="canonical" href="${esc(origin+path)}"><meta property="og:url" content="${esc(origin+path)}">`:'';
 const head=`<title>${esc(title)} — HI Education</title><meta property="og:title" content="${esc(title)}"><meta property="og:type" content="website">${canonical}`;
 let result=template.replace(/<title>.*?<\/title>/,head).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(description||title)}">`);
 if(status===404||path==='/tai-khoan')result=result.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
 result=result.replace(/<main id="portal"[^>]*>[\s\S]*?<\/main>/,`<main id="portal" class="portal"><div class="eyebrow">HI / EDUCATION</div><h1>${esc(title)}</h1>${description?`<p class="intro">${esc(description)}</p>`:''}${html}</main>`);
 return {status,html:result};
}
export function sitemap(cms){const origin=publicOrigin();if(!origin)return null;const paths=['/','/khoa-hoc','/tin-tuc','/hoat-dong',...cms.list('pages').filter(x=>x.status==='published').map(x=>'/'+encodeURIComponent(x.id)),...cms.list('courses').filter(x=>x.status==='published').map(x=>'/khoa-hoc/'+encodeURIComponent(x.id)),...cms.list('posts').filter(x=>x.status==='published').map(x=>'/bai-viet/'+encodeURIComponent(x.id))];return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+esc(origin+path)+'</loc></url>').join('')+'</urlset>';}
