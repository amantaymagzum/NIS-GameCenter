import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,createEmpty,makeObject,validateProject,History} from '../src/model.js';
import {Runtime} from '../src/engine/runtime.js';
import {PhysicsWorld,collision,position} from '../src/engine/physics.js';

test('demo and empty projects round-trip through validation',()=>{
 for(const p of [createDemo(),createEmpty()])assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
test('import rejects duplicate ids, invalid transforms and remote image URLs',()=>{
 const p=createDemo();p.objects[1].id=p.objects[0].id;assert.throws(()=>validateProject(p),/ID/);
 const q=createDemo();q.objects[0].transform.x=NaN;assert.throws(()=>validateProject(q),/Transform/);
 const r=createDemo();r.assets.push({id:'remote',name:'remote',type:'image',data:'https://evil.example/a.png'});assert.throws(()=>validateProject(r),/изображения/);
 const s=createDemo();s.completedLessons={};assert.throws(()=>validateProject(s),/уроков/);
});
test('undo and redo restore script and component values without aliasing',()=>{
 const h=new History(),p=createDemo();h.push(p);p.objects[0].transform.x=900;p.assets[0].code='changed';
 const old=h.undo(p);assert.equal(old.objects[0].transform.x,120);assert.notEqual(old.assets[0].code,'changed');
 assert.equal(h.redo(old).objects[0].transform.x,900);
});
test('gravity lands player on static ground and reports grounded',()=>{
 const p=createDemo();p.objects=p.objects.filter(o=>o.tag==='Player'||o.name==='Земля');p.objects[0].script=null;
 const r=new Runtime(p);for(let i=0;i<120;i++)r.tick();
 const body=r.world.bodies.get('player');assert.equal(body.grounded,true);assert.ok(Math.abs(position(body).y-462)<.2);assert.ok(Math.abs(body.vy)<1);
});
test('student script moves player and jump uses a single key-down',()=>{
 const r=new Runtime(createDemo());for(let i=0;i<30;i++)r.tick();
 r.keys=new Set(['ArrowRight']);const before=r.world.bodies.get('player').x;r.tick();assert.ok(r.world.bodies.get('player').x>before);
 r.keys=new Set(['Space']);r.tick();const b=r.world.bodies.get('player');assert.ok(b.vy<-400);r.tick();assert.ok(b.vy>-480);
});
test('coin trigger is removed and increments score exactly once',()=>{
 const p=createDemo(),coin=p.objects.find(o=>o.tag==='Coin');p.objects.find(o=>o.id==='player').transform={...coin.transform};
 const r=new Runtime(p);r.tick();assert.equal(r.score,1);assert.equal(r.objects.has(coin.id),false);r.tick();assert.equal(r.score,1);
});
test('finish emits victory only with required score',()=>{
 const p=createDemo(),flag=p.objects.find(o=>o.tag==='Finish');p.objects.find(o=>o.id==='player').transform={...flag.transform};
 const events=[],r=new Runtime(p,m=>events.push(m));r.score=3;r.tick();assert.equal(r.won,true);assert.ok(events.some(m=>m.type==='win'));
});
test('runtime cannot mutate the editor project',()=>{
 const p=createDemo(),before=JSON.stringify(p),r=new Runtime(p);r.keys.add('KeyD');for(let i=0;i<60;i++)r.tick();assert.equal(JSON.stringify(p),before);
});
test('syntax and runtime errors are reported and do not crash other scripts',()=>{
 const p=createDemo(),events=[];p.assets[0].code='export default class Player extends Script { start() { throw new Error("test error"); } }';
 const r=new Runtime(p,e=>events.push(e));r.tick();assert.ok(events.some(e=>e.level==='error'&&e.message.includes('test error')));
 p.assets[0].code='export default class Player extends Script { update( }';const syntax=[];new Runtime(p,e=>syntax.push(e));assert.ok(syntax.some(e=>e.level==='error'));
});
test('circle contacts, rotated boxes and separated shapes',()=>{
 const circle={shape:'circle',x:0,y:0,radius:10},other={shape:'circle',x:15,y:0,radius:10};assert.equal(collision(circle,other).depth,5);other.x=21;assert.equal(collision(circle,other),null);
 const box={shape:'box',x:0,y:0,width:30,height:10,angle:Math.PI/4};assert.ok(collision(box,{...circle,x:10,y:10}));assert.equal(collision(box,{...circle,x:70,y:70}),null);
});
test('dynamic circles bounce on ground; triggers do not block',()=>{
 const w=new PhysicsWorld(1000),ball=makeObject('circle',0,0),ground=makeObject('platform',0,100);ground.collider.width=300;
 const b=w.add(ball);w.add(ground);let bounced=false;for(let i=0;i<90;i++){w.step();if(b.vy<-100)bounced=true;}assert.equal(bounced,true);
 const trigger=makeObject('coin',0,0),w2=new PhysicsWorld(0);const a=w2.add(makeObject('crate',0,0));w2.add(trigger);const pairs=w2.step();assert.ok([...pairs.values()].some(p=>p.trigger));assert.equal(a.x,0);
});
test('starter level can be completed with normal movement and jumps',()=>{
 const r=new Runtime(createDemo());for(let i=0;i<30;i++)r.tick();
 for(const target of [290,490,710]){
  let jumped=false,landed=false;
  for(let frame=0;frame<160;frame++){
   const b=r.world.bodies.get('player');const keys=[];
   if(b.x<target-3)keys.push('ArrowRight');else if(b.x>target+3)keys.push('ArrowLeft');
   if(!jumped&&b.grounded){keys.push('Space');jumped=true;}
   r.keys=new Set(keys);r.tick();
   if(jumped&&frame>10&&b.grounded&&Math.abs(b.x-target)<6){landed=true;break;}
  }
  assert.equal(landed,true,`must land at ${target}`);
 }
 assert.equal(r.score,3,'all coins collected');
 r.keys=new Set(['ArrowRight']);for(let i=0;i<60&&!r.won;i++)r.tick();assert.equal(r.won,true);
});
