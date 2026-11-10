export async function connectBrowser() {
 const pages=await(await fetch('http://127.0.0.1:9222/json/list')).json();
 const page=pages.find(p=>p.type==='page');if(!page)throw new Error('No browser tab. Start Edge/Chrome with --remote-debugging-port=9222.');
 const socket=new WebSocket(page.webSocketDebuggerUrl),pending=new Map();let id=0;const events=[];
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}}else events.push(m);});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;const timer=setTimeout(()=>{pending.delete(request);reject(new Error(`Timeout: ${method}`));},15000);pending.set(request,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:request,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const wait=async(expression,timeout=6000)=>{const until=Date.now()+timeout;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,80));}throw new Error(`Condition timeout: ${expression}`);};
 return {send,evaluate,wait,events,close:()=>socket.close()};
}
