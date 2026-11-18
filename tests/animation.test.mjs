import test from 'node:test';
import assert from 'node:assert/strict';
import {rigPreset,makeRig,validateRig,rigPose,sampleRig,createAnimator} from '../src/rig.js';
import {GameEffects} from '../src/effects.js';
import {createDemo,validateProject,History} from '../src/model.js';
import {Runtime} from '../src/engine/runtime.js';

test('rig JSON round-trip preserves clips while old projects remain byte-for-byte equivalent',()=>{
 const old=createDemo();assert.deepEqual(validateProject(old),old);
 const p=createDemo();p.objects[0].rig=rigPreset();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const h=new History();h.push(p);p.objects[0].rig.bones[0].angle=30;assert.equal(h.undo(p).objects[0].rig.bones[0].angle,-90);
});
test('rig validation rejects cycles, duplicate IDs, unknown pose targets and invalid or unbounded data',()=>{
 for(const mutate of [
   r=>r.bones[0].parent=r.bones[1].id,
   r=>r.bones[1].id=r.bones[0].id,
   r=>r.bones[0].id='__proto__',
   r=>r.clips[0].keys[0].angles.unknown=90,
   r=>r.clips[0].keys[1].time=0,
   r=>r.clips[0].keys[1].time=999,
   r=>r.clips[0].keys[0].angles.body=NaN,
   r=>r.clips[0].duration=0,
   r=>r.clips[0].keys.push(...Array(40).fill(r.clips[0].keys[0])),
   r=>r.bones.push(...Array(40).fill(r.bones[0])),
   r=>r.autoplay='missing'
 ]){const r=rigPreset();mutate(r);assert.throws(()=>validateRig(r),/анимация/);}
 assert.doesNotThrow(()=>validateRig(makeRig()));
});
test('child follows parent endpoint and rotation',()=>{
 const rig=rigPreset(),pose=rigPose(rig,{body:0});const root=pose.get('body'),head=pose.get('head');
 assert.equal(root.endX,18);assert.equal(root.endY,8);assert.equal(head.x,18);assert.equal(head.endX,23);assert.equal(head.endY,8);
});
test('key interpolation follows shortest rotation and holds first/last poses',()=>{
 const rig=makeRig();rig.bones=[{id:'a',angle:0}];rig.clips[0].keys=[{time:.2,angles:{a:170}},{time:.8,angles:{a:-170}}];
 assert.ok(Math.abs(sampleRig(rig,'idle',.5).a-180)<1e-8);
 assert.equal(sampleRig(rig,'idle',0).a,170);assert.equal(sampleRig(rig,'idle',1).a,-170);
});
test('Animator loops, preserves same-clip playback, supports explicit restart and stops one-shot on final pose',()=>{
 const rig=rigPreset(),a=createAnimator(rig);a.api.play('walk');a.step(.4);a.api.play('walk');assert.equal(a.state.time,.4);
 a.step(.3);assert.ok(Math.abs(a.state.time-.1)<1e-8);a.api.play('walk',true);assert.equal(a.state.time,0);
 rig.clips[1].loop=false;a.step(2);assert.equal(a.state.time,.6);assert.equal(a.api.playing,false);
 a.api.play('walk',true);assert.equal(a.api.playing,true);a.api.speed=2;a.step(.1);assert.equal(a.state.time,.2);
 a.api.stop();assert.equal(a.api.current,null);assert.throws(()=>a.api.play('missing'));assert.throws(()=>a.api.speed=NaN);
});
test('worker runtime animates without altering source, script can change clips and stopping freezes effects',()=>{
 const p=createDemo();p.objects[0].rig=rigPreset();const original=JSON.stringify(p),r=new Runtime(p);
 const api=r.api(r.objects.get('player')).getComponent('Animator');assert.equal(api.current,'idle');api.play('walk');r.tick();assert.ok(r.snapshot().objects[0].animation.time>0);
 r.effects.burst(10,20);r.effects.cameraShake(5,.2);r.tick();const snapshot=r.snapshot();assert.ok(snapshot.effects.particles.length>0);assert.ok(snapshot.effects.shake>0);
 r.scene.lose('stop');const stopped=JSON.stringify(r.snapshot());r.tick();assert.equal(JSON.stringify(r.snapshot()),stopped);assert.equal(JSON.stringify(p),original);
 r.api(r.objects.get('player')).destroy();assert.equal(r.animations.has('player'),false);
});
test('particles and camera shake expire, calls are bounded, invalid parameters rejected',()=>{
 const effects=new GameEffects();for(let n=0;n<30;n++)effects.burst(0,0,'#c5ed8a',10000);
 assert.equal(effects.particles.length,256);effects.cameraShake(999,999);assert.equal(effects.shake.strength,16);
 effects.step(2);assert.equal(effects.particles.length,0);assert.equal(effects.snapshot().shake,0);
 assert.throws(()=>effects.burst(Infinity,0));assert.throws(()=>effects.burst(0,0,'red'));assert.throws(()=>effects.cameraShake(NaN));
});

test('new course examples select real clips and trigger effects on a single key-down',async()=>{
 const {animationLessons}=await import('../src/course-animation.js');
 const p=createDemo();p.objects[0].rig=rigPreset();p.assets[0].code=animationLessons[1].code.source;
 const events=[],r=new Runtime(p,e=>events.push(e));r.keys.add('KeyD');r.tick();assert.equal(r.snapshot().objects[0].animation.clip,'walk');r.keys.clear();r.tick();assert.equal(r.snapshot().objects[0].animation.clip,'idle');assert.ok(!events.some(e=>e.level==='error'));
 p.assets[0].code=animationLessons[2].code.source;const lab=new Runtime(p);lab.keys.add('Digit1');lab.tick();assert.equal(lab.effects.particles.length,16);lab.tick();assert.equal(lab.effects.particles.length,16);lab.keys=new Set(['Digit2']);lab.tick();assert.ok(lab.effects.shake.remaining>0);
});
