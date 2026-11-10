import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,LESSON_COUNT} from '../src/course.js';
import {createDemo,makeObject,validateProject} from '../src/model.js';
import {Runtime} from '../src/engine/runtime.js';
import {courseMarkdown} from '../src/learning.js';

function exampleRuntime(index,kind='player'){
  const p=createDemo(),o=makeObject(kind,120,440);o.id='example';o.script={assetId:'lesson-code',enabled:true};
  p.objects=[o,...p.objects.filter(o=>o.name==='Земля')];p.assets=[{id:'lesson-code',type:'script',name:lessons[index].code.name,code:lessons[index].code.source}];
  const events=[];return {runtime:new Runtime(p,e=>events.push(e)),events};
}

test('projects preserve lesson 10 and completed course across JSON export/import',()=>{
  const p=createDemo();p.lesson=9;p.completedLessons=Array.from({length:10},(_,i)=>i);
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(restored.lesson,9);assert.equal(restored.completedLessons.length,10);
  p.lesson=10;assert.throws(()=>validateProject(p),/урока/);p.lesson=0;p.completedLessons=[10];assert.throws(()=>validateProject(p),/уроков/);
});
test('old five-lesson progress and existing project content remain unchanged',()=>{
  const p=createDemo();p.lesson=4;p.completedLessons=[0,1,2,3,4];p.name='Старый проект';
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
test('every full lesson script executes against the real educational API',()=>{
  for(const [i,lesson] of lessons.entries()){
    if(!lesson.code)continue;
    const {runtime,events}=exampleRuntime(i,lesson.code.source.includes('Rigidbody2D')?'player':'sprite');
    for(let n=0;n<120;n++)runtime.tick();
    assert.deepEqual(events.filter(e=>e.level==='error'),[],lesson.code.name);
  }
});
test('lesson 6 respawn resets coordinates and momentum on R',()=>{
  const {runtime:r}=exampleRuntime(5);const b=r.world.bodies.get('example');b.x=400;b.y=800;b.vx=200;b.vy=500;r.keys.add('KeyR');r.tick();
  assert.equal(b.x,120);assert.ok(Math.abs(b.y-440)<1);assert.equal(b.vx,0);assert.ok(b.vy<30);
});
test('lesson 7 patrol reverses and stays inside both boundaries',()=>{
  const {runtime:r}=exampleRuntime(6,'sprite'),x=[];
  for(let n=0;n<240;n++){r.tick();x.push(r.objects.get('example').transform.x);}
  assert.ok(Math.max(...x)<=220);assert.ok(Math.min(...x)>=20);assert.ok(x[90]<x[60]);assert.ok(x[210]>x[180]);
});
test('lesson 9 missing component produces a useful warning instead of an exception',()=>{
  const {runtime:r,events}=exampleRuntime(8,'sprite');r.tick();assert.ok(events.some(e=>e.level==='warn'&&e.message.includes('нет Rigidbody2D')));assert.ok(!events.some(e=>e.level==='error'));
});
test('downloaded student course includes complete source code and final project criteria',()=>{
  const markdown=courseMarkdown();assert.equal(LESSON_COUNT,10);assert.ok(markdown.startsWith('# NIS-GameCenter'));
  for(const lesson of lessons){assert.ok(markdown.includes(lesson.task));if(lesson.code)assert.ok(markdown.includes(lesson.code.source));}
  assert.ok(markdown.includes(lessons.at(-1).checks.at(-1)));
  assert.ok(!markdown.includes('undefined'));
});
