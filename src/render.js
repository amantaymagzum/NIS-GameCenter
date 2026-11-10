const TAU=Math.PI*2;
export const palette=[{kind:'player',name:'Игрок',note:'Движение и прыжок',color:'#f6a664'},{kind:'platform',name:'Платформа',note:'Поверхность',color:'#9ccf91'},{kind:'coin',name:'Монетка',note:'Триггер',color:'#c1a2ff'},{kind:'crate',name:'Ящик',note:'Физический объект',color:'#d1a278'},{kind:'circle',name:'Мяч',note:'Круглый коллайдер',color:'#85c9d8'},{kind:'flag',name:'Финиш',note:'Конец уровня',color:'#c5ed8a'},{kind:'sprite',name:'Спрайт',note:'Пустой объект',color:'#b8b0fa'},{kind:'camera',name:'Камера',note:'Область просмотра',color:'#afbdd1'}];
export function drawSprite(ctx,s,time=0,images=new Map()) {
  const w=s.width,h=s.height,x=-w/2,y=-h/2;
  if(s.assetId&&images.get(s.assetId)?.complete){ctx.drawImage(images.get(s.assetId),x,y,w,h);return;}
  ctx.fillStyle=s.color;
  if(s.kind==='player'){
    ctx.fillRect(x+3,y+10,w-6,h-16);ctx.fillRect(x+5,y,w-10,13);ctx.fillRect(x,y+12,w,14);
    ctx.fillStyle='#ffd0a0';ctx.fillRect(x+7,y+3,w-14,10);
    ctx.fillStyle='#2c282c';ctx.fillRect(x+11,y+5,3,4);ctx.fillRect(x+20,y+5,3,4);
    ctx.fillStyle='#9a614d';ctx.fillRect(x+5,y+h-7,7,7);ctx.fillRect(x+w-12,y+h-7,7,7);
    ctx.fillStyle='#f9c087';ctx.fillRect(x+6,y+16,4,10);
  }else if(s.kind==='platform'){
    ctx.fillStyle='#40504b';ctx.fillRect(x,y,w,h);ctx.fillStyle='#34413f';ctx.fillRect(x+4,y+h-5,w-8,5);
    ctx.fillStyle=s.color;ctx.fillRect(x,y,w,6);ctx.fillRect(x+4,y+6,w-8,3);
    ctx.fillStyle='#bde7a9';for(let k=10;k<w-4;k+=19)ctx.fillRect(x+k,y-3,3,4);
    ctx.fillStyle='#617263';for(let k=12;k<w-8;k+=29)ctx.fillRect(x+k,y+14,5,3);
  }else if(s.kind==='coin'){
    const bob=Math.sin(time*3)*2;ctx.translate(0,bob);
    ctx.fillStyle='#665477';ctx.beginPath();ctx.ellipse(0,3,w*.45,h*.48,0,0,TAU);ctx.fill();
    ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(0,0,w*.43,h*.48,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#e2d3ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,w*.26,h*.32,0,0,TAU);ctx.stroke();
    ctx.fillStyle='#f0e7ff';ctx.fillRect(-1,-h*.23,2,h*.45);
  }else if(s.kind==='flag'){
    ctx.fillStyle='#b0bcb4';ctx.fillRect(-w*.3,y,3,h);ctx.fillStyle=s.color;ctx.beginPath();ctx.moveTo(-w*.3+3,y+2);ctx.lineTo(w*.5,y+9);ctx.lineTo(-w*.3+3,y+25);ctx.closePath();ctx.fill();
    ctx.fillStyle='#697a6e';ctx.fillRect(-w*.45,y+h-5,w*.5,5);
  }else if(s.kind==='crate'){
    ctx.fillRect(x,y,w,h);ctx.strokeStyle='#765a43';ctx.lineWidth=4;ctx.strokeRect(x+3,y+3,w-6,h-6);ctx.beginPath();ctx.moveTo(x+6,y+6);ctx.lineTo(x+w-6,y+h-6);ctx.moveTo(x+w-6,y+6);ctx.lineTo(x+6,y+h-6);ctx.stroke();
    ctx.fillStyle='#e9bc90';ctx.fillRect(x+5,y+4,w-10,3);
  }else if(s.kind==='circle'){
    ctx.beginPath();ctx.ellipse(0,0,w/2,h/2,0,0,TAU);ctx.fill();ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.ellipse(-w*.15,-h*.17,w*.14,h*.12,-.4,0,TAU);ctx.fill();
  }else{
    ctx.fillRect(x,y,w,h);ctx.fillStyle='#ffffff33';ctx.fillRect(x+3,y+3,w-6,3);
  }
}
export function thumbnail(kind,color) {
  const canvas=document.createElement('canvas');canvas.width=100;canvas.height=70;
  const ctx=canvas.getContext('2d');ctx.translate(50,37);const spec={player:[25,35],platform:[65,16],coin:[25,25],crate:[34,34],circle:[33,33],flag:[25,42],sprite:[31,31]};
  if(kind==='camera'){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-18,-12,28,24);ctx.beginPath();ctx.moveTo(10,-6);ctx.lineTo(21,-12);ctx.lineTo(21,12);ctx.lineTo(10,6);ctx.stroke();}
  else {const [width,height]=spec[kind]||[32,32];drawSprite(ctx,{kind,color,width,height});}
  return canvas.toDataURL();
}

export class Viewport {
  constructor(canvas,callbacks){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.callbacks=callbacks;this.zoom=1;this.pan={x:0,y:0};this.grid=true;this.colliders=false;this.snap=true;this.images=new Map();this.pointer=null;this.runtime=null;this.time=0;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);
    canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',e=>this.up(e));
    canvas.addEventListener('wheel',e=>{if(this.runtime)return;e.preventDefault();this.zoom=Math.min(3,Math.max(.25,this.zoom*(e.deltaY>0?.9:1.1)));this.draw();callbacks.onZoom?.(this.zoom);},{passive:false});
    canvas.addEventListener('dblclick',()=>{if(!this.runtime)callbacks.onOpenScript?.();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('dragover',e=>{if(!this.runtime)e.preventDefault();});canvas.addEventListener('drop',e=>{if(this.runtime)return;e.preventDefault();const kind=e.dataTransfer.getData('application/kadr-object');if(kind){const p=this.toWorld(e.clientX,e.clientY);callbacks.onAdd(kind,p.x,p.y);}});
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.draw();}
  set(project,selected){this.project=project;this.selected=selected;for(const a of project.assets)if(a.type==='image'&&!this.images.has(a.id)){const image=new Image();image.onload=()=>this.draw();image.src=a.data;this.images.set(a.id,image);}this.draw();}
  fit(){this.zoom=1;this.pan={x:0,y:0};this.draw();this.callbacks.onZoom?.(1);}
  camera(){
    const p=this.project;if(!p)return {x:480,y:270,zoom:1};
    if(this.runtime){const camera=this.runtime.objects.find(o=>o.camera);if(camera){const target=this.runtime.objects.find(o=>o.id===camera.camera.followTarget);return {x:target?.transform.x??camera.transform.x,y:target?.transform.y??camera.transform.y,zoom:camera.camera.zoom};}}
    return {x:p.scene.width/2-this.pan.x,y:p.scene.height/2-this.pan.y,zoom:this.zoom};
  }
  metrics(){const scene=this.project?.scene||{width:960,height:540},cam=this.camera();const scale=Math.max(.03,Math.min((this.width-60)/scene.width,(this.height-54)/scene.height))*cam.zoom;return {scale,cam,ox:this.width/2-cam.x*scale,oy:this.height/2-cam.y*scale};}
  toWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect(),m=this.metrics();return {x:(clientX-r.left-m.ox)/m.scale,y:(clientY-r.top-m.oy)/m.scale};}
  hit(p){
    if(!this.project)return null;
    return [...this.project.objects].filter(o=>o.active).sort((a,b)=>(b.sprite?.layer||0)-(a.sprite?.layer||0)||this.project.objects.indexOf(b)-this.project.objects.indexOf(a)).find(o=>{
      const t=o.transform,angle=-t.rotation*Math.PI/180,dx=p.x-t.x,dy=p.y-t.y;
      const x=(dx*Math.cos(angle)-dy*Math.sin(angle))/t.scaleX,y=(dx*Math.sin(angle)+dy*Math.cos(angle))/t.scaleY;
      return Math.abs(x)<(o.sprite?.width||32)/2+5&&Math.abs(y)<(o.sprite?.height||28)/2+5;
    });
  }
  down(e){
    if(this.runtime)return;const p=this.toWorld(e.clientX,e.clientY);this.canvas.setPointerCapture(e.pointerId);
    if(e.button===1||e.button===2){this.pointer={pan:true,start:{x:e.clientX,y:e.clientY},original:{...this.pan}};return;}
    const hit=this.hit(p);this.callbacks.onSelect(hit?.id||null);
    if(hit)this.pointer={id:hit.id,start:p,original:{x:hit.transform.x,y:hit.transform.y},moved:false};
  }
  move(e){
    const p=this.toWorld(e.clientX,e.clientY);this.callbacks.onPointer?.(p);
    if(!this.pointer)return;
    if(this.pointer.pan){const s=this.metrics().scale;this.pan={x:this.pointer.original.x+(e.clientX-this.pointer.start.x)/s,y:this.pointer.original.y+(e.clientY-this.pointer.start.y)/s};this.draw();return;}
    const d=this.pointer,dx=p.x-d.start.x,dy=p.y-d.start.y;if(!d.moved&&Math.hypot(dx,dy)<2)return;
    if(!d.moved){this.callbacks.onMoveStart();d.moved=true;}
    const snap=(v)=>this.snap&&!e.altKey?Math.round(v/8)*8:Math.round(v);
    this.callbacks.onMove(d.id,snap(d.original.x+dx),snap(d.original.y+dy));
  }
  up(){if(this.pointer?.moved)this.callbacks.onMoveEnd();this.pointer=null;}
  draw(){
    const ctx=this.ctx,w=this.width,h=this.height;if(!w||!h)return;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#191d20';ctx.fillRect(0,0,w,h);if(!this.project)return;
    const {scale,ox,oy}=this.metrics(),p=this.project,scene=p.scene;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    const camera=this.runtime?.objects.find(o=>o.camera);
    ctx.fillStyle=(this.runtime?camera?.camera.background:null)||scene.background;ctx.fillRect(0,0,scene.width,scene.height);
    if(this.grid&&!this.runtime){ctx.strokeStyle='#ffffff06';ctx.lineWidth=1/scale;ctx.beginPath();for(let x=0;x<=scene.width;x+=32){ctx.moveTo(x,0);ctx.lineTo(x,scene.height);}for(let y=0;y<=scene.height;y+=32){ctx.moveTo(0,y);ctx.lineTo(scene.width,y);}ctx.stroke();}
    // Simple, code-drawn scenery keeps the starter independent of external assets.
    ctx.save();ctx.beginPath();ctx.rect(0,0,scene.width,scene.height);ctx.clip();
    ctx.fillStyle='#a3c8b01c';for(const [x,y]of [[95,84],[181,153],[340,70],[475,140],[620,91],[805,110],[898,62],[550,220]]){ctx.fillRect(x,y,3,3);}
    ctx.strokeStyle='#a0b8a21b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(792,108,34,0,TAU);ctx.stroke();ctx.fillStyle='#97b29b0b';ctx.beginPath();ctx.arc(792,108,29,0,TAU);ctx.fill();
    ctx.fillStyle='#293a38';ctx.beginPath();ctx.moveTo(0,430);ctx.lineTo(115,343);ctx.lineTo(255,453);ctx.lineTo(402,400);ctx.lineTo(575,480);ctx.lineTo(760,354);ctx.lineTo(960,455);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.fill();
    ctx.fillStyle='#2e413b';ctx.beginPath();ctx.moveTo(0,491);ctx.lineTo(182,429);ctx.lineTo(322,492);ctx.lineTo(625,425);ctx.lineTo(817,484);ctx.lineTo(960,433);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.fill();ctx.restore();
    ctx.strokeStyle='#ffffff18';ctx.lineWidth=1/scale;ctx.strokeRect(0,0,scene.width,scene.height);
    const objects=this.runtime?.objects||p.objects;
    for(const o of [...objects].filter(o=>o.active!==false).sort((a,b)=>(a.sprite?.layer||0)-(b.sprite?.layer||0))){
      const t=o.transform;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.rotation*Math.PI/180);ctx.scale(t.scaleX,t.scaleY);
      if(o.sprite?.visible!==false&&o.sprite)drawSprite(ctx,o.sprite,this.runtime?this.time:0,this.images);
      if(o.camera&&!this.runtime){ctx.strokeStyle=o.id===this.selected?'#c5ed8a':'#9aafb355';ctx.lineWidth=1.5/scale;ctx.strokeRect(-14,-10,22,20);ctx.beginPath();ctx.moveTo(8,-5);ctx.lineTo(17,-10);ctx.lineTo(17,10);ctx.lineTo(8,5);ctx.stroke();}
      if(this.colliders&&o.collider&&!this.runtime){const c=o.collider;ctx.save();ctx.translate(c.offsetX,c.offsetY);ctx.strokeStyle=c.isTrigger?'#d7a6ff':'#c5ed8a';ctx.lineWidth=1/scale;ctx.setLineDash([4/scale,3/scale]);if(c.type==='circle'){ctx.beginPath();ctx.arc(0,0,c.radius,0,TAU);ctx.stroke();}else ctx.strokeRect(-c.width/2,-c.height/2,c.width,c.height);ctx.restore();}
      if(o.id===this.selected&&!this.runtime){const sw=(o.sprite?.width||34)+8,sh=(o.sprite?.height||28)+8;ctx.strokeStyle='#c5ed8a';ctx.fillStyle='#c5ed8a12';ctx.lineWidth=1/scale;ctx.fillRect(-sw/2,-sh/2,sw,sh);ctx.strokeRect(-sw/2,-sh/2,sw,sh);ctx.fillStyle='#d5f1ac';for(const [x,y]of [[-sw/2,-sh/2],[sw/2,-sh/2],[-sw/2,sh/2],[sw/2,sh/2]])ctx.fillRect(x-2/scale,y-2/scale,4/scale,4/scale);}
      ctx.restore();
    }
    const selected=p.objects.find(o=>o.id===this.selected);
    if(selected&&!this.runtime){const t=selected.transform,top=t.y-(selected.sprite?.height||28)*Math.abs(t.scaleY)/2-18/scale;ctx.font=`${11/scale}px system-ui`;const tw=ctx.measureText(selected.name).width;ctx.fillStyle='#171c19';ctx.fillRect(t.x-tw/2-7/scale,top-11/scale,tw+14/scale,19/scale);ctx.fillStyle='#d5f1ac';ctx.textAlign='center';ctx.fillText(selected.name,t.x,top+2/scale);}
    ctx.restore();
    if(!this.runtime){ctx.font='10px ui-monospace, monospace';ctx.textAlign='left';ctx.fillStyle='#697477';ctx.fillText(`${scene.width} × ${scene.height}`,Math.max(12,ox),Math.min(h-12,oy+scene.height*scale+20));}
  }
}
