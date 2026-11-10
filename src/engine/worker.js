import {Runtime} from './runtime.js';
let runtime,timer,paused=false,logs=0;
function emit(message){if(message.type==='log'&&++logs>100)return;postMessage(message);}
self.onmessage=event=>{
  const message=event.data;
  if(message.type==='start'){
    clearInterval(timer);logs=0;
    try{
      runtime=new Runtime(message.project,emit);postMessage(runtime.snapshot());
      timer=setInterval(()=>{logs=0;try{postMessage(paused?{type:'heartbeat'}:runtime.tick());}catch(error){emit({type:'log',level:'error',message:error.message});paused=true;postMessage({type:'heartbeat'});}},1000/60);
    }catch(error){postMessage({type:'fatal',message:error.message});}
  }
  if(message.type==='keys'&&runtime)runtime.keys=new Set(message.keys);
  if(message.type==='pause')paused=message.paused;
  if(message.type==='step'&&runtime&&paused){logs=0;postMessage(runtime.tick());}
};
