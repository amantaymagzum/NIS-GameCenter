import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {connectBrowser} from './cdp.mjs';
const b=await connectBrowser();
const check=async(expression,label)=>{assert.ok(await b.evaluate(expression),label);console.log('OK '+label);};
try{
 await b.send('Runtime.enable');await b.send('Page.enable');await b.send('Network.enable');
 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/'});await b.wait('!!window.nisGameCenter');
 await b.evaluate('localStorage.clear();location.reload()');await b.wait('!!window.nisGameCenter');
 const dir=path.resolve('test-results/release');fs.mkdirSync(dir,{recursive:true});await b.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
 await b.evaluate('document.querySelector("#export-game").click()');
 const until=Date.now()+5000;let file;while(Date.now()<until){file=fs.readdirSync(dir).find(f=>f.endsWith('.html'));if(file)break;await new Promise(r=>setTimeout(r,80));}assert.ok(file,'actual export downloaded');
 const html=fs.readFileSync(path.join(dir,file),'utf8');assert.equal((html.match(/<script>/g)||[]).length,1);

 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/test-results/release/'+encodeURIComponent(file)});await b.wait('!!document.querySelector("#start")');await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await b.evaluate('document.querySelector("#start").click()');
 await b.wait('document.querySelector("#score").textContent.includes("Очки: 0")');console.log('OK downloaded HTML runs offline as a self-contained document');
 await b.evaluate('document.querySelector("#pause").click()');await check('document.querySelector("#pause").textContent==="Продолжить"','export supports pause');
 await b.evaluate('document.querySelector("#mute").click()');await check('document.querySelector("#mute").textContent.includes("выкл")','export supports mute');
 await b.evaluate('document.querySelector("#start").click()');await b.wait('document.querySelector("#score").textContent.includes("Очки: 0")');
 // A custom scripted project exercises terminal UI, embedded image, safe text and restart.
 await b.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/'});await b.wait('!!window.nisGameCenter');
 const custom=await b.evaluate(`(async()=>{const {createDemo}=await import('./src/model.js');const {exportGame}=await import('./src/game-export.js');const p=createDemo();p.name='</script> test';p.assets[0].code='export default class Player extends Script { start(){this.t=0;Scene.lives=3;} update(dt){this.t+=dt;Scene.message="Проверка";if(this.t>0.3){Audio.tone(600,.1,.05);Scene.lives=0;Scene.lose("Конец теста");}} }';return await exportGame(p);})()`);
 const customPath=path.join(dir,'custom.html');fs.writeFileSync(customPath,custom);
 await b.send('Page.navigate',{url:'http://127.0.0.1:5173/test-results/release/custom.html'});
 await b.wait('!!document.querySelector("#start")');await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await check('document.title==="</script> test" && document.scripts.length===1','project text cannot break out of inline script');await b.evaluate('document.querySelector("#start").click()');await b.wait('document.querySelector("#status").textContent==="Конец теста"');
 await check('document.querySelector("#score").textContent.includes("Жизни: 0")','loss freezes and displays final lives');
 await b.evaluate('document.querySelector("#start").click()');await b.wait('document.querySelector("#score").textContent.includes("Жизни: 3")');console.log('OK restart creates fresh game state');
}finally{await b.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});b.close();}
