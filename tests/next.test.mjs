import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Runtime} from '../src/engine/runtime.js';
import {createDemo,makeObject,validateProject} from '../src/model.js';
import {nextLessons} from '../src/course-next.js';
import {exportGame} from '../src/game-export.js';
function lessonRuntime(index){
 const p=createDemo(),o=makeObject(index===0?'sprite':'player',120,440);o.id='test';o.script={enabled:true,assetId:'test-script'};
 p.objects=[o];p.assets=[{id:'test-script',name:'Test.js',type:'script',code:nextLessons[index].code.source}];
 const events=[];return {r:new Runtime(p,e=>events.push(e)),events};
}
test('ten-lesson projects round trip and can continue through lesson 16',()=>{
 const p=createDemo();p.lesson=9;p.completedLessons=Array.from({length:10},(_,i)=>i);
 assert.deepEqual(validateProject(structuredClone(p)),p);
 p.lesson=15;p.completedLessons.push(15);assert.deepEqual(validateProject(structuredClone(p)),p);
});
test('countdown expires after 30 simulated seconds and terminal state stays frozen',()=>{
 const {r,events}=lessonRuntime(0);for(let i=0;i<1801;i++)r.tick();
 assert.equal(r.lost,true);assert.equal(events.filter(e=>e.type==='lose').length,1);
 const frame=r.snapshot();r.scene.win('late');r.tick();assert.deepEqual(r.snapshot(),frame);
});
test('fall removes exactly one life, resets momentum and ends on third attempt',()=>{
 const {r}=lessonRuntime(1),b=r.world.bodies.get('test');
 for(let i=0;i<3;i++){b.y=800;b.vy=500;r.tick();assert.equal(r.lives,2-i);if(i<2){assert.equal(b.vx,0);assert.ok(b.y<450);}}
 assert.equal(r.lost,true);
});
test('damage cooldown blocks repeated events, allows later damage, ignores other tags',()=>{
 const {r}=lessonRuntime(2),script=r.instances[0].instance;
 script.onTriggerEnter({tag:'Coin'});assert.equal(r.lives,3);
 script.onTriggerEnter({tag:'Hazard'});script.onTriggerEnter({tag:'Hazard'});assert.equal(r.lives,2);
 for(let n=0;n<91;n++)r.tick();script.onTriggerEnter({tag:'Hazard'});assert.equal(r.lives,1);
});
test('sound lesson emits once per press and API clamps and limits signals',()=>{
 const {r,events}=lessonRuntime(3);r.keys.add('Digit1');r.tick();r.tick();assert.equal(events.filter(e=>e.type==='tone').length,1);
 for(let n=0;n<20;n++)r.audio.tone(9999,50,10);
 const tones=events.filter(e=>e.type==='tone');assert.ok(tones.length<=9);assert.equal(tones.at(-1).frequency,2000);assert.equal(tones.at(-1).volume,.2);
 assert.throws(()=>r.audio.tone(NaN),/числа/);assert.throws(()=>r.scene.lives=-1,/Жизни/);
});
test('export safely embeds project text and bundles a runnable engine with no imports',async()=>{
 const p=createDemo();p.name='</script><script>bad()</script>';p.assets[0].code+='\n// </script>';
 const html=await exportGame(p,path=>fs.readFile(new URL('../src/'+path,import.meta.url),'utf8'));
 assert.equal((html.match(/<\/script>/g)||[]).length,1);const source=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(source);
 assert.ok(!/^import /m.test(source));assert.ok(html.includes('Жизни:'));
});
