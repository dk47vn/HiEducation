import {randomUUID} from 'node:crypto';
export function safeContentHref(value){
 if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value))return false;
 if(value.startsWith('/')&&!value.startsWith('//'))return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function validateBlocks(input,{published,media,fail}){
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>40)fail('Mỗi nội dung tối đa 40 khối.');
 const ids=new Set();
 return input.map(block=>{
  if(!block||typeof block!=='object'||Array.isArray(block)||!['text','image','video','cta'].includes(block.type))fail('Khối nội dung không hợp lệ.');
  const id=block.id||randomUUID();if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id)||ids.has(id))fail('Mã khối bị lặp hoặc không hợp lệ.');ids.add(id);
  const result={id,type:block.type};
  const fields=block.type==='text'?['title','body']:block.type==='image'?['mediaId','alt','caption']:block.type==='video'?['mediaId','caption']:['title','body','label','href'];
  for(const key of fields){if(block[key]!==undefined&&typeof block[key]!=='string')fail('Nội dung khối phải là văn bản.');const value=block[key]||'';if(value.length>(key==='body'?20000:key==='href'?2000:300))fail('Nội dung khối vượt giới hạn ký tự.');result[key]=value;}
  if(['image','video'].includes(block.type)){
   if(!result.mediaId&&published)fail('Chọn media cho từng khối trước khi xuất bản.');
   if(result.mediaId){const asset=media(result.mediaId);if(!asset||asset.visibility!=='public'||!asset.mime.startsWith(block.type==='image'?'image/':'video/'))fail('Khối ảnh/video chỉ dùng đúng loại media công khai.');}
  }
  if(block.type==='cta'){
   if(result.href&&!safeContentHref(result.href))fail('Liên kết phải là đường dẫn nội bộ hoặc HTTPS hợp lệ.');
   if(published&&(!result.title.trim()||!result.label.trim()||!result.href))fail('Khối kêu gọi hành động cần tiêu đề, nhãn nút và liên kết.');
  }
  return result;
 });
}
