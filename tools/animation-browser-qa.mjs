import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {connectBrowser} from './cdp.mjs';
const b=await connectBrowser();let checks=0;
const check=async(expression,label)=>{assert.ok(await b.evaluate(expression),label);checks++;console.log('OK '+label);};
const click=s=>b.evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
const input=(s,value)=>b.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(s)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function uploadProject(project){fs.mkdirSync('test-results',{recursive:true});const file=path.resolve('test-results/animation-project.json');fs.writeFileSync(file,JSON.stringify(project));const {root}=await b.send('DOM.getDocument');const {nodeId}=await b.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#project-file'});await b.send('DOM.setFileInputFiles',{nodeId,files:[file]});}
async function drag(from,to){await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x:from.x,y:from.y,button:'left',clickCount:1});await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:to.x,y:to.y,button:'left',buttons:1});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:to.x,y:to.y,button:'left',clickCount:1});}
try{
 await b.send('Runtime.enable');await b.send('Page.enable');await b.send('Network.enable');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/'});await b.wait('!!window.nisGameCenter');
 await uploadProject(await b.evaluate('(async()=>{const {createDemo}=await import("./src/model.js");return createDemo();})()'));await b.wait('!nisGameCenter.project.objects[0].rig');
 await click('#edit-animation');await check('!!document.querySelector("#rig-canvas")','bone editor opens from selected player');
 const center=await b.evaluate('(()=>{const r=document.querySelector("#rig-canvas").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
 await drag(center,{x:center.x,y:center.y-70});
 await check('document.querySelector("#rig-bone").options.length===1 && !nisGameCenter.project.objects[0].rig','drawing a root bone keeps project unchanged until apply');
 await drag({x:center.x,y:center.y-70},{x:center.x+65,y:center.y-90});
 await click('#rig-save');
 await check('nisGameCenter.project.objects[0].rig.bones.length===2 && nisGameCenter.project.objects[0].rig.bones[1].parent===nisGameCenter.project.objects[0].rig.bones[0].id','drawing from endpoint creates a child bone');
 await click('#undo');await check('!nisGameCenter.project.objects[0].rig','one undo restores original object');await click('#redo');
 await click('#edit-animation');await click('#rig-pose');
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Delete',code:'Delete'});await check('nisGameCenter.project.objects.length===10','keyboard shortcuts do not delete scene objects while editing a rig');
 await input('#rig-angle',45);await click('#rig-record');await input('#rig-time',.5);await b.evaluate('document.querySelector("#rig-time").dispatchEvent(new Event("input"))');await input('#rig-angle',-45);await click('#rig-record');
 await click('#rig-preview');await wait(150);await check('Number(document.querySelector("#rig-time").value)>0','preview advances the animation clock');await click('#rig-preview');
 await click('#rig-save');await check('nisGameCenter.project.objects[0].rig.clips[0].keys.length===2','key poses survive applying editor changes');
 await click('#edit-animation');await click('#rig-clear');await click('#rig-cancel');await check('nisGameCenter.project.objects[0].rig.bones.length===2','cancel discards draft changes');
 await click('#edit-animation');await click('#rig-clear');await click('#rig-preset');await input('#rig-clip',1);await click('#rig-save');await check('nisGameCenter.project.objects[0].rig.clips.some(c=>c.name==="walk")','ready character contains editable idle and walk clips');
 await click('#play');await b.wait('nisGameCenter.frame?.objects[0].animation?.time>0');await check('nisGameCenter.frame.objects[0].rig.bones.length===6','Worker publishes skeletal animation state');
 await click('#pause');const frozen=await b.evaluate('nisGameCenter.frame.objects[0].animation.time');await wait(120);await check(`nisGameCenter.frame.objects[0].animation.time===${frozen}`,'game pause freezes rig animation');await click('#step');await b.wait(`nisGameCenter.frame.objects[0].animation.time!==${frozen}`);await click('#play');
 await wait(600);await b.evaluate('location.reload()');await b.wait('!!window.nisGameCenter');await check('nisGameCenter.project.objects[0].rig.bones.length===6','rig and clips survive autosave reload');
 await click('#edit-animation');
 fs.mkdirSync('test-results',{recursive:true});const shot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/rig-editor.png',Buffer.from(shot.data,'base64'));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await wait(100);
 await check('document.documentElement.scrollWidth<=innerWidth && document.querySelector("#rig-canvas").getBoundingClientRect().right<=innerWidth','bone editor fits mobile width');await click('#rig-cancel');
 // Verify actual downloaded game uses the same animator and particle engine offline.
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
 await uploadProject(await b.evaluate(`(()=>{const p=nisGameCenter.project;p.assets[0].code='export default class Player extends Script {start(){this.a=this.getComponent("Animator");this.a.play("walk");this.time=0;Effects.burst(this.transform.x,this.transform.y);Effects.shake(5,.3);}update(dt){this.time+=dt;Scene.message=this.a.current+" "+this.time.toFixed(2);}}';return p;})()`));await b.wait('nisGameCenter.project.assets[0].code.includes("Effects.burst")');
 await click('#play');await b.wait('nisGameCenter.frame?.effects.particles.length>0');await check('nisGameCenter.frame.objects[0].animation.clip==="walk" && nisGameCenter.frame.effects.shake>0','scripts can trigger animation, particles and camera shake');await click('#play');
 const dir=path.resolve('test-results/animation-export');fs.mkdirSync(dir,{recursive:true});for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));await b.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await click('#export-game');
 let file;for(let n=0;n<60;n++){file=fs.readdirSync(dir).find(f=>f.endsWith('.html'));if(file)break;await wait(80);}assert.ok(file,'HTML download completed');
 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/test-results/animation-export/'+encodeURIComponent(file)});await b.wait('!!document.querySelector("#start")');
 await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await click('#start');await b.wait('document.querySelector("#status").textContent.startsWith("walk ")');console.log('OK exported game runs Animator and Effects offline');checks++;
 await click('#effects-toggle');await check('document.querySelector("#effects-toggle").textContent.includes("выкл")','player can disable particles and camera shake');
 assert.equal(b.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);console.log(`PASS ${checks} animation browser checks`);
}finally{await b.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});b.close();}
