// Shared by the editor, renderer and exported games. Angles are local degrees.
export const RIG_LIMITS={bones:32,clips:12,keys:32};
export function makeRig(){return {bones:[],clips:[{name:'idle',duration:1,loop:true,keys:[]}],autoplay:'idle',hideSprite:true};}
export function rigPreset(){
  const rig=makeRig();
  rig.bones=[
    {id:'body',name:'Тело',parent:null,x:0,y:8,length:18,angle:-90,width:7,color:'#f6a664'},
    {id:'head',name:'Голова',parent:'body',x:0,y:0,length:5,angle:0,width:12,color:'#ffd0a0'},
    {id:'left-arm',name:'Левая рука',parent:'body',x:0,y:0,length:13,angle:-115,width:4,color:'#f6a664'},
    {id:'right-arm',name:'Правая рука',parent:'body',x:0,y:0,length:13,angle:115,width:4,color:'#f6a664'},
    {id:'left-leg',name:'Левая нога',parent:null,x:-3,y:8,length:12,angle:105,width:5,color:'#85c9d8'},
    {id:'right-leg',name:'Правая нога',parent:null,x:3,y:8,length:12,angle:75,width:5,color:'#85c9d8'}
  ];
  const pose=extra=>Object.fromEntries(rig.bones.map(b=>[b.id,extra[b.id]??b.angle]));
  rig.clips=[
    {name:'idle',duration:1,loop:true,keys:[{time:0,angles:pose({})},{time:.5,angles:pose({'left-arm':-110,'right-arm':110})},{time:1,angles:pose({})}]},
    {name:'walk',duration:.6,loop:true,keys:[{time:0,angles:pose({'left-arm':-60,'right-arm':95,'left-leg':120,'right-leg':60})},{time:.3,angles:pose({'left-arm':-95,'right-arm':60,'left-leg':60,'right-leg':120})},{time:.6,angles:pose({'left-arm':-60,'right-arm':95,'left-leg':120,'right-leg':60})}]}
  ];return rig;
}
export function validateRig(rig){
  const fail=()=>{throw new Error('Некорректная анимация: проверьте кости, родителей и ключевые позы.');};
  const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const name=v=>typeof v==='string'&&v.trim().length>0&&v.length<=60;
  if(!rig||!Array.isArray(rig.bones)||rig.bones.length>RIG_LIMITS.bones||!Array.isArray(rig.clips)||rig.clips.length>RIG_LIMITS.clips||typeof rig.hideSprite!=='boolean')fail();
  const ids=new Set();
  for(const b of rig.bones){
    if(!b||!name(b.id)||!(/^[a-zA-Z0-9_-]+$/.test(b.id))||Object.hasOwn(Object.prototype,b.id)||ids.has(b.id)||!name(b.name)||(b.parent!==null&&!ids.has(b.parent))||!num(b.x,-2048,2048)||!num(b.y,-2048,2048)||!num(b.length,1,2048)||!num(b.angle,-3600,3600)||!num(b.width,1,128)||!/^#[\da-f]{6}$/i.test(b.color))fail();
    ids.add(b.id);
  }
  const names=new Set();
  for(const c of rig.clips){
    if(!c||!name(c.name)||names.has(c.name)||!num(c.duration,.1,60)||typeof c.loop!=='boolean'||!Array.isArray(c.keys)||c.keys.length>RIG_LIMITS.keys)fail();
    names.add(c.name);let previous=-1;
    for(const k of c.keys){if(!k||!num(k.time,0,c.duration)||k.time<=previous||!k.angles||typeof k.angles!=='object'||Array.isArray(k.angles)||Object.entries(k.angles).some(([id,a])=>!ids.has(id)||!num(a,-3600,3600)))fail();previous=k.time;}
  }
  if(rig.autoplay!==null&&!names.has(rig.autoplay))fail();
  return rig;
}
export function sampleRig(rig,clipName,time=0){
  const clip=rig.clips.find(c=>c.name===clipName),result=Object.fromEntries(rig.bones.map(b=>[b.id,b.angle]));
  if(!clip?.keys.length)return result;
  const t=Math.min(clip.duration,Math.max(0,time));
  const before=[...clip.keys].reverse().find(k=>k.time<=t)||clip.keys[0];
  const after=clip.keys.find(k=>k.time>=t)||clip.keys.at(-1);
  const mix=after.time===before.time?0:(t-before.time)/(after.time-before.time);
  for(const b of rig.bones){const a=Object.hasOwn(before.angles,b.id)?before.angles[b.id]:b.angle,z=Object.hasOwn(after.angles,b.id)?after.angles[b.id]:b.angle;const delta=((z-a)%360+540)%360-180;result[b.id]=a+delta*mix;}
  return result;
}
export function rigPose(rig,angles={}){
  const poses=new Map();
  for(const b of rig.bones){
    const p=poses.get(b.parent),pa=p?.angle||0,cos=Math.cos(pa),sin=Math.sin(pa);
    const x=(p?.endX||0)+b.x*cos-b.y*sin,y=(p?.endY||0)+b.x*sin+b.y*cos;
    const angle=pa+(Object.hasOwn(angles,b.id)?angles[b.id]:b.angle)*Math.PI/180;
    poses.set(b.id,{x,y,angle,endX:x+Math.cos(angle)*b.length,endY:y+Math.sin(angle)*b.length});
  }return poses;
}
export function drawRig(ctx,rig,animation,handles=false,selected=null){
  const angles=animation?.angles||sampleRig(rig,animation?.clip,animation?.time||0),poses=rigPose(rig,angles);
  for(const b of rig.bones){const p=poses.get(b.id);ctx.strokeStyle=b.color;ctx.lineWidth=b.width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.endX,p.endY);ctx.stroke();
    if(handles){ctx.fillStyle=selected===b.id?'#ffffff':'#c5ed8a';ctx.beginPath();ctx.arc(p.endX,p.endY,2,0,Math.PI*2);ctx.fill();}
  }return poses;
}
export function createAnimator(rig){
  const state={clip:rig.autoplay,time:0,playing:rig.autoplay!==null,speed:1};
  const api={play(name,restart=false){if(!rig.clips.some(c=>c.name===name))throw new Error('Не найдена анимация: '+name);if(state.clip!==name||restart){state.clip=name;state.time=0;state.playing=true;}},stop(){state.playing=false;state.clip=null;state.time=0;},get current(){return state.clip;},get playing(){return state.playing;},get speed(){return state.speed;},set speed(v){if(!Number.isFinite(v)||v<0||v>4)throw new Error('Скорость анимации: 0–4');state.speed=v;}};
  return {state,api,step(dt){const clip=rig.clips.find(c=>c.name===state.clip);if(!state.playing||!clip)return;state.time+=dt*state.speed;if(clip.loop)state.time%=clip.duration;else if(state.time>=clip.duration){state.time=clip.duration;state.playing=false;}}};
}
