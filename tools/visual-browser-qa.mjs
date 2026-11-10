import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lessonVisuals} from '../src/lesson-visuals.js';
import {connectBrowser} from './cdp.mjs';
const b=await connectBrowser();let checks=0;
const check=async(expression,name)=>{assert.ok(await b.evaluate(expression),name);checks++;console.log(`OK ${name}`);};
const click=selector=>b.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
try{
 await b.send('Runtime.enable');await b.send('Page.enable');await b.send('Network.enable');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:process.env.QA_BASE_URL||'http://127.0.0.1:5173/'});await b.wait('!!window.nisGameCenter');await click('#lessons-open');
 for(let i=0;i<10;i++){
  await click(`[data-course-lesson="${i}"]`);
  await b.wait('document.querySelector(".lesson-illustration img").complete && document.querySelector(".lesson-illustration img").naturalWidth===960');
  await check('document.querySelectorAll(".theory-card").length===3 && ![...document.querySelectorAll(".theory-expanded")].some(d=>d.open)',`lesson ${i+1}: picture loaded and full theory initially folded`);
  const correct=lessonVisuals[i].correct;await click(`[data-visual-choice="${(correct+1)%3}"]`);await check('!document.querySelector(".prediction-feedback").hidden && !!document.querySelector(".prediction-choice.incorrect")',`lesson ${i+1}: wrong guess gives feedback`);
  await click(`[data-visual-choice="${correct}"]`);await check('document.querySelector(".prediction-feedback").textContent.startsWith("Верно!") && !!document.querySelector(".prediction-choice.correct")',`lesson ${i+1}: correct guess explained`);
 }
 await click('[data-course-lesson="0"]');await click('.theory-expanded summary');await check('document.querySelector(".theory-expanded").open','long explanation expands on demand');await click('.theory-expanded summary');
 await check('!document.querySelector(".teacher-guide-link") && !document.querySelector(".teacher-notes")','teacher handbook and teacher-only blocks removed from reader');
 await check('(async()=> (await fetch(new URL("teacher-guide.html", location.href))).status===404 && (await fetch(new URL("public/materials/NIS-GameCenter-teacher-guide.pdf", location.href))).status===404)()','old handbook HTML and PDF are not served');
 fs.mkdirSync('test-results',{recursive:true});let shot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/illustrated-lesson.png',Buffer.from(shot.data,'base64'));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await click('[data-course-lesson="1"]');await b.wait('document.querySelector(".lesson-illustration img").complete');
 await check('document.documentElement.scrollWidth<=innerWidth && document.querySelector(".lesson-illustration").getBoundingClientRect().width <= document.querySelector(".lesson-article").clientWidth','illustrations fit mobile reader');
 shot=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/illustrated-mobile.png',Buffer.from(shot.data,'base64'));
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 const fileURL=new URL('../public/materials/illustrated-course.html',import.meta.url).href;
 await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await b.send('Page.navigate',{url:fileURL});await b.wait('document.querySelectorAll(".student-lesson").length===10 && [...document.images].every(i=>i.complete&&i.naturalWidth>0)');
 await check('document.images.length===10 && [...document.images].every(i=>i.src.startsWith("data:"))','downloaded illustrated course works offline with all ten embedded pictures');
 await b.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 assert.deepEqual(b.events.filter(e=>e.method==='Runtime.exceptionThrown'),[],'no browser exceptions');checks++;console.log(`PASS ${checks} visual-learning browser checks`);
}finally{b.close();}
