/* Shared, DOM-only rendering for public content and editorial previews. */
(()=>{
 const element=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 function safeHref(value){if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value))return null;if(value.startsWith('/')&&!value.startsWith('//'))return value;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
 function render(blocks,parent){
  for(const block of blocks||[]){
   const section=element('section',undefined,'content-block block-'+block.type);
   if(block.type==='text'){if(block.title)section.append(element('h2',block.title));if(block.body)section.append(element('div',block.body,'prose'));}
   if(block.type==='image'){
    const figure=element('figure');if(block.mediaId){const image=element('img');image.src='/media/'+encodeURIComponent(block.mediaId);image.alt=block.alt||block.caption||'';image.loading='lazy';image.className='content-cover';figure.append(image);}else figure.append(element('p','Chưa chọn hình ảnh.','empty-state'));
    if(block.caption)figure.append(element('figcaption',block.caption));section.append(figure);
   }
   if(block.type==='video'){
    if(block.mediaId){const video=element('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src='/media/'+encodeURIComponent(block.mediaId);video.className='marketing-video';section.append(video);}else section.append(element('p','Chưa chọn video giới thiệu.','empty-state'));
    if(block.caption)section.append(element('p',block.caption,'muted'));
   }
   if(block.type==='cta'){
    if(block.title)section.append(element('h2',block.title));if(block.body)section.append(element('p',block.body));const href=safeHref(block.href);
    if(href&&block.label){const a=element('a',block.label+' →','button');a.href=href;if(!href.startsWith('/')){a.target='_blank';a.rel='noopener noreferrer';}section.append(a);}
   }
   if(section.childNodes.length)parent.append(section);
  }
 }
 window.HIBlocks=Object.freeze({render,safeHref});
})();
