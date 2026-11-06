const {execFileSync}=require('node:child_process');const {randomBytes}=require('node:crypto');const assert=require('node:assert/strict');
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const run=args=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
(async()=>{const suffix=randomBytes(5).toString('hex'),name='hi-check-'+suffix,volume='hi-check-data-'+suffix,token=randomBytes(32).toString('hex');const origin='http://127.0.0.1:3003';
try{
 run(['run','-d','--name',name,'--read-only','--tmpfs','/tmp:size=64m','--cap-drop','ALL','--security-opt','no-new-privileges:true','-p','127.0.0.1:3003:3000','-v',volume+':/app/.data','-e','ADMIN_TOKEN='+token,'-e','PUBLIC_ORIGIN=https://hi.edu.vn',process.env.HI_DOCKER_IMAGE||'hieducation:release']);
 const ready=async()=>{for(let i=0;i<30;i++){try{const r=await fetch(origin+'/api/health');if(r.ok&&(await r.json()).status==='ok')return;}catch{}await new Promise(r=>setTimeout(r,300));}throw Error('Container did not become ready');};await ready();
 assert.equal(run(['exec',name,'id','-u']),'1000');run(['exec',name,'sh','-c','test ! -e /app/.env && test ! -e /app/.git']);
 const response=await fetch(origin+'/api/admin/content/posts',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({title:'Container persistence check',status:'draft',section:'tin-tuc',body:'Temporary test data'})});assert.equal(response.status,201);const post=await response.json();
 run(['restart',name]);await ready();const list=await(await fetch(origin+'/api/admin/content?kind=posts',{headers:{Authorization:'Bearer '+token}})).json();assert.ok(list.some(p=>p.id===post.id));
 assert.equal((await fetch(origin+'/bai-viet/'+post.id)).status,404);assert.match(await(await fetch(origin+'/sitemap.xml')).text(),/https:\/\/hi.edu.vn/);
 console.log('Docker passed: production startup, non-root/read-only runtime, health/API, no env/Git in image, persistence after restart, draft isolation, sitemap.');
 }finally{try{run(['rm','-f',name]);}catch{}try{run(['volume','rm',volume]);}catch{}}
})().catch(error=>{console.error(error.message);process.exit(1)});
