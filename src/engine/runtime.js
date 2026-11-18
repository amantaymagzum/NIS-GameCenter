import {createAnimator} from '../rig.js';
import {GameEffects} from '../effects.js';
import { PhysicsWorld, position } from './physics.js';

export function compileScript(source, globals, filename='Script.js') {
  const match=source.match(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)\s+extends\s+Script/);
  if(!match)throw new Error('Начните скрипт с export default class Имя extends Script.');
  const code=source.replace(/export\s+default\s+class/,'class');
  return new Function(...Object.keys(globals),`"use strict";\n${code}\nreturn ${match[1]};\n//# sourceURL=${filename.replace(/[^\w.\-]/g,'_')}`)(...Object.values(globals));
}

export class Runtime {
  constructor(project,emit=()=>{}) {
    this.project=structuredClone(project);this.emit=emit;this.world=new PhysicsWorld(project.scene.gravity);
    this.animations=new Map();this.effects=new GameEffects();
    this.objects=new Map();this.instances=[];this.keys=new Set();this.previousKeys=new Set();this.previousPairs=new Map();this.score=0;this.won=false;this.lost=false;this.lives=null;this.message='';this.frame=0;
    for(const object of this.project.objects)if(object.active){this.objects.set(object.id,object);this.world.add(object);if(object.rig)this.animations.set(object.id,createAnimator(object.rig));}
    const self=this;
    this.scene={get lives(){return self.lives;},set lives(v){if(!Number.isInteger(v)||v<0)throw new Error('Жизни: ожидается целое число от 0');self.lives=v;},get message(){return self.message;},set message(v){self.message=String(v).slice(0,200);},lose:message=>self.finish('lose',message||'Попробуй ещё раз'),get score(){return self.score;},set score(v){self.score=Number(v)||0;},find:name=>self.find(name),findByTag:tag=>[...self.objects.values()].filter(o=>o.tag===tag).map(o=>self.api(o)),win:message=>self.finish('win',message||'Победа!')};
    this.input={getAxis:name=>name==='Horizontal'?Number(this.isDown('ArrowRight','KeyD'))-Number(this.isDown('ArrowLeft','KeyA')):name==='Vertical'?Number(this.isDown('ArrowDown','KeyS'))-Number(this.isDown('ArrowUp','KeyW')):0,
      getKey:key=>this.keys.has(this.keyCode(key)),getKeyDown:key=>this.keys.has(this.keyCode(key))&&!this.previousKeys.has(this.keyCode(key))};
    this.debug={log:(...args)=>this.log('info',args),warn:(...args)=>this.log('warn',args),error:(...args)=>this.log('error',args)};
    this.audio={tone:(frequency=440,duration=.15,volume=.1)=>{if(![frequency,duration,volume].every(Number.isFinite))throw new Error('Audio.tone: ожидаются числа');if(this.audioCount>=8)return;this.audioCount=(this.audioCount||0)+1;this.emit({type:'tone',frequency:Math.min(2000,Math.max(80,frequency)),duration:Math.min(1,Math.max(.02,duration)),volume:Math.min(.2,Math.max(0,volume))});}};
    this.audioCount=0;
    const Script=class {
      get transform(){return this.gameObject.transform;}
      getComponent(name){return this.gameObject.getComponent(name);}
      destroy(){this.gameObject.destroy();}
    };
    for(const object of this.objects.values())if(object.script?.enabled){
      const asset=this.project.assets.find(a=>a.id===object.script.assetId&&a.type==='script');
      if(!asset){this.log('error',[`Не найден скрипт: ${object.name}`]);continue;}
      try{
        const Class=compileScript(asset.code,{Script,Input:this.input,Debug:this.debug,Scene:this.scene,Audio:this.audio,Effects:{burst:(...args)=>this.effects.burst(...args),shake:(...args)=>this.effects.cameraShake(...args)},Vector2:class {constructor(x=0,y=0){this.x=x;this.y=y;}}},asset.name);
        const instance=new Class();instance.gameObject=this.api(object);this.instances.push({instance,objectId:object.id,filename:asset.name,disabled:false});
      }catch(error){this.scriptError(error,asset.name);}
    }
    for(const entry of this.instances)this.call(entry,'start');
  }
  finish(type,message){if(this.won||this.lost)return;this.won=type==='win';this.lost=type==='lose';this.emit({type,message:String(message).slice(0,200)});}
  keyCode(key){if(key.length===1)return key===' '?'Space':`Key${key.toUpperCase()}`;return key;}
  isDown(...codes){return codes.some(c=>this.keys.has(c));}
  find(name){const o=[...this.objects.values()].find(o=>o.name===name||o.id===name);return o?this.api(o):null;}
  log(level,args){this.emit({type:'log',level,message:args.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')});}
  scriptError(error,filename){
    const stack=String(error.stack||'');
    const escaped=filename.replace(/[^\w.\-]/g,'_').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const line=stack.match(new RegExp(escaped+':(\\d+):(\\d+)'));
    this.emit({type:'log',level:'error',message:`${filename}${line?':'+Math.max(1,Number(line[1])-3):''} — ${error.message}`,filename,line:line?Math.max(1,Number(line[1])-3):null});
  }
  call(entry,method,...args){
    if(entry.disabled||!this.objects.has(entry.objectId)||typeof entry.instance[method]!=='function')return;
    try{entry.instance[method](...args);}catch(error){entry.disabled=true;this.scriptError(error,entry.filename);}
  }
  api(o) {
    if(o._api)return o._api;
    const runtime=this,b=this.world.bodies.get(o.id),t=o.transform;
    const transform={};
    for(const key of ['x','y'])Object.defineProperty(transform,key,{enumerable:true,get:()=>b?position(b)[key]:t[key],set:value=>{if(!Number.isFinite(value))throw new Error(`${key}: ожидается число`);if(b)b[key]+=value-position(b)[key];t[key]=value;}});
    Object.defineProperty(transform,'rotation',{enumerable:true,get:()=>b?b.angle*180/Math.PI:t.rotation,set:value=>{t.rotation=value;if(b)b.angle=value*Math.PI/180;}});
    const velocity=b?{get x(){return b.vx;},set x(v){if(!Number.isFinite(v))throw new Error('Скорость должна быть числом');b.vx=v;},get y(){return b.vy;},set y(v){if(!Number.isFinite(v))throw new Error('Скорость должна быть числом');b.vy=v;}}:null;
    const rigidbody=b&&o.rigidbody?{velocity,get isGrounded(){return b.grounded;},get mass(){return b.mass;},get angularVelocity(){return b.angularVelocity*180/Math.PI;},set angularVelocity(v){b.angularVelocity=v*Math.PI/180;},addForce(x,y){b.fx+=x;b.fy+=y;},addImpulse(x,y){if(!b.static){b.vx+=x/b.mass;b.vy+=y/b.mass;}}}:null;
    const api={id:o.id,name:o.name,tag:o.tag,transform,getComponent(name){return {Transform:transform,Rigidbody2D:rigidbody,SpriteRenderer:o.sprite,BoxCollider2D:o.collider?.type==='box'?o.collider:null,CircleCollider2D:o.collider?.type==='circle'?o.collider:null,Camera2D:o.camera,Animator:runtime.animations.get(o.id)?.api}[name]??null;},destroy(){runtime.objects.delete(o.id);runtime.world.remove(o.id);runtime.animations.delete(o.id);}};
    Object.defineProperty(o,'_api',{value:api});return api;
  }
  tick(dt=1/60){
    if(this.won||this.lost)return this.snapshot();
    this.audioCount=0;this.effects.step(dt);
    for(const animation of this.animations.values())animation.step(dt);
    for(const entry of this.instances){if(this.won||this.lost)break;this.call(entry,'update',dt);if(!this.won&&!this.lost)this.call(entry,'fixedUpdate',dt);}
    if(this.won||this.lost)return this.snapshot();
    const pairs=this.world.step(dt);
    for(const [key,pair]of pairs)if(!this.previousPairs.has(key))this.event(pair,pair.trigger?'onTriggerEnter':'onCollisionEnter');
    for(const [key,pair]of this.previousPairs)if(!pairs.has(key))this.event(pair,pair.trigger?'onTriggerExit':'onCollisionExit');
    this.previousPairs=pairs;this.previousKeys=new Set(this.keys);this.frame++;
    return this.snapshot();
  }
  event(pair,name){
    if(this.won||this.lost)return;
    for(const [id,otherId]of [[pair.a,pair.b],[pair.b,pair.a]]){
      const other=this.objects.get(otherId);if(!other)continue;
      for(const entry of this.instances)if(entry.objectId===id)this.call(entry,name,this.api(other));
    }
  }
  snapshot(){
    return {type:'frame',frame:this.frame,score:this.score,won:this.won,lost:this.lost,lives:this.lives,message:this.message,effects:this.effects.snapshot(),objects:[...this.objects.values()].map(o=>{
      const b=this.world.bodies.get(o.id),p=b?position(b):o.transform;
      return {id:o.id,name:o.name,tag:o.tag,transform:{...o.transform,x:p.x,y:p.y,rotation:b?b.angle*180/Math.PI:o.transform.rotation},sprite:o.sprite,camera:o.camera,rig:o.rig,animation:this.animations.get(o.id)?.state};
    })};
  }
}
