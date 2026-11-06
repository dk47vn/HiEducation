import http from 'node:http';
import {renderPublic,sitemap,publicOrigin} from './seo.js';
import {createCMS,HttpError,jsonBody} from './cms.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
mkdirSync(root+'.data',{recursive:true});
const db=new DatabaseSync(process.env.DB_PATH||root+'.data/site.sqlite');
db.exec(`CREATE TABLE IF NOT EXISTS leads(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, course TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
const courses=[
{id:'ai-work',category:'ai',label:'AI ỨNG DỤNG',title:'Làm việc thông minh hơn cùng AI',description:'Biến ChatGPT, Gemini và các công cụ AI thành trợ lý đắc lực mỗi ngày.',lessons:12,duration:'4 tuần',level:'Cho người mới',icon:'✦',color:'lime'},
{id:'office',category:'office',label:'TIN HỌC VĂN PHÒNG',title:'Excel thực chiến: Từ dữ liệu đến quyết định',description:'Tự tin xử lý dữ liệu, xây dựng báo cáo và tự động hóa công việc.',lessons:18,duration:'6 tuần',level:'Cơ bản → Nâng cao',icon:'▦',color:'blue'},
{id:'python',category:'code',label:'LẬP TRÌNH & DỮ LIỆU',title:'Python: Bước đầu xây dựng tương lai',description:'Học tư duy lập trình qua những dự án nhỏ, thực tế và đầy cảm hứng.',lessons:24,duration:'8 tuần',level:'Cho người mới',icon:'⌘',color:'purple'}];
const defaults={headline:'Làm chủ công nghệ.\nMở lối tương lai.',sections:['courses','journey','contact']};
function settings(){const row=db.prepare('SELECT value FROM settings WHERE key=?').get('page');return row?JSON.parse(row.value):defaults;}
const cms=createCMS(db,root,courses);
export const server=http.createServer(async(req,res)=>{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
try{
const url=new URL(req.url,'http://localhost');const path=url.pathname;
if(await cms.handle(req,res,url,send))return;
if(path==='/robots.txt'&&req.method==='GET'){const origin=publicOrigin();res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /tai-khoan\n'+(origin?'Sitemap: '+origin+'/sitemap.xml\n':''));return;}
if(path==='/sitemap.xml'&&req.method==='GET'){const xml=sitemap(cms);if(!xml)return send(503,{error:'Cần cấu hình PUBLIC_ORIGIN để tạo sitemap.'});res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});res.end(xml);return;}
if(path==='/api/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(200,{status:'ok',service:'hi-education'});}
if(path==='/api/page'&&req.method==='GET')return send(200,settings());
if(path.startsWith('/api/admin/')&&!cms.admin(req))return send(401,{error:'Cần mã quản trị hợp lệ. Cấu hình ADMIN_TOKEN trên máy chủ.'});
if(path==='/api/admin/leads'&&req.method==='GET')return send(200,db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 200').all());
if(req.method==='POST'||req.method==='PUT'){
if(path==='/api/leads')cms.throttle(req,'leads',10);
const data=await jsonBody(req,16384);
if(path==='/api/leads'&&req.method==='POST'){
if(typeof data.name!=='string'||data.name.trim().length<2||data.name.length>120||typeof data.email!=='string'||data.email.length>254||!/^\S+@\S+\.\S+$/.test(data.email)||!cms.list('courses').some(c=>c.id===data.course&&c.status==='published')||data.consent!==true)return send(400,{error:'Vui lòng nhập thông tin hợp lệ và đồng ý để được liên hệ.'});
db.prepare('INSERT INTO leads(name,email,course) VALUES(?,?,?)').run(data.name.trim(),data.email.trim(),data.course);return send(201,{message:'Đã nhận đăng ký! Đội ngũ HI sẽ liên hệ với bạn.'});}
if(path==='/api/admin/page'&&req.method==='PUT'){
if(typeof data.headline!=='string'||!data.headline.trim()||data.headline.length>140||!Array.isArray(data.sections)||[...data.sections].sort().join(',')!=='contact,courses,journey')return send(400,{error:'Cấu hình trang không hợp lệ.'});
db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run('page',JSON.stringify({headline:data.headline,sections:data.sections}));return send(200,{message:'Đã lưu trang.'});}
}
if(path.startsWith('/api/'))return send(404,{error:'Không tìm thấy.'});
if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Phương thức không được hỗ trợ.'});
const files={'/':'index.html','/admin':'admin.html','/app.js':'app.js','/admin.js':'admin.js','/style.css':'style.css'};
Object.assign(files,{'/content-blocks.js':'content-blocks.js','/portal.js':'portal.js','/studio.js':'studio.js','/cms.css':'cms.css','/gioi-thieu':'portal.html','/dich-vu':'portal.html','/khoa-hoc':'portal.html','/hoat-dong':'portal.html','/tin-tuc':'portal.html','/tai-khoan':'portal.html','/dieu-khoan':'portal.html','/quy-dinh':'portal.html','/bao-mat':'portal.html'});
const file=path.startsWith('/khoa-hoc/')||path.startsWith('/bai-viet/')?'portal.html':files[path];if(!file)return send(404,{error:'Không tìm thấy trang.'});
if(file==='portal.html'){const page=renderPublic(path,cms,readFileSync(root+'public/'+file,'utf8'));res.writeHead(page.status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:page.html);return;}
res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:readFileSync(root+'public/'+file));
}catch(e){if(e instanceof HttpError)return send(e.status,{error:e.message});console.error(e.message);if(res.headersSent){res.destroy();return;}send(500,{error:'Có lỗi máy chủ. Vui lòng thử lại.'});}
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.env.NODE_ENV==='production'&&(!process.env.ADMIN_TOKEN||process.env.ADMIN_TOKEN.length<32||process.env.COOKIE_SECURE!=='true'||!publicOrigin()?.startsWith('https://'))){console.error('Production requires ADMIN_TOKEN >=32 characters, COOKIE_SECURE=true and HTTPS PUBLIC_ORIGIN.');process.exit(1);}
 server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('HI Education listening on port '+server.address().port));
 let closing=false;const stop=()=>{if(closing)return;closing=true;server.close(()=>{db.close();process.exit(0);});setTimeout(()=>{server.closeAllConnections();db.close();process.exit(0);},10000).unref();};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
