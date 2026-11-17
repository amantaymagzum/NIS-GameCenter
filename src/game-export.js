// Bundle the existing engine and renderer so exported games use the same code.
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=s=>s.replace(/<\/script/gi,'<\\/script');
const plain=s=>s.replace(/^import .*?;\s*$/gm,'').replace(/\bexport (?=(?:class|function|const)\b)/g,'');
export async function exportGame(project,load=async path=>{
  const response=await fetch(new URL(path,import.meta.url));
  if(!response.ok)throw new Error('Не удалось загрузить '+path);
  return response.text();
}){
  const [physics,runtime,worker,render,audio]=await Promise.all(['./engine/physics.js','./engine/runtime.js','./engine/worker.js','./render.js','./audio.js'].map(load));
  const workerSource=[physics,runtime,worker].map(plain).join('\n');
  const script=plain(render)+'\n'+plain(audio)+'\n('+standalone.toString()+')('+JSON.stringify(project)+','+JSON.stringify(workerSource)+');';
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(project.name)}</title><style>body{margin:0;background:#191d20;color:#e0ecd6;font:16px system-ui;text-align:center}header{padding:12px;display:flex;gap:16px;justify-content:center;align-items:center;flex-wrap:wrap}button{font:inherit;padding:8px 16px;cursor:pointer}main{height:75vh;position:relative}canvas{width:100%;height:100%;outline:none}#status{white-space:pre-wrap;min-height:2em}h1{font-size:18px}p{margin:8px}</style><header><h1>${escapeHTML(project.name)}</h1><button id="start">Играть / заново</button><button id="pause" disabled>Пауза</button><button id="mute">Звук: вкл.</button><span id="score"></span></header><main><canvas tabindex="0" aria-label="Игра"></canvas></main><p id="status" role="status">Нажми «Играть». Управление зависит от игры; обычно A/D, стрелки и пробел.</p><script>${inline(script)}</script></html>`;
}
function standalone(project,source){
  const canvas=document.querySelector('canvas'),status=document.querySelector('#status'),pause=document.querySelector('#pause');
  const viewport=new Viewport(canvas,{}),audio=new GameAudio();viewport.set(project,null);
  let worker=null,paused=false,heartbeat=0;const keys=new Set();
  function clearKeys(){keys.clear();worker?.postMessage({type:'keys',keys:[]});}
  function stop(){worker?.terminate();worker=null;audio.stop();clearKeys();pause.disabled=true;}
  document.querySelector('#start').onclick=()=>{
    stop();audio.unlock();paused=false;pause.textContent='Пауза';pause.disabled=false;status.textContent='';heartbeat=performance.now();
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    worker=new Worker(url);URL.revokeObjectURL(url);
    worker.onmessage=({data:m})=>{
      heartbeat=performance.now();
      if(m.type==='frame'){viewport.runtime=m;viewport.time=m.frame/60;viewport.draw();document.querySelector('#score').textContent=`Очки: ${m.score}`+(m.lives===null?'':` · Жизни: ${m.lives}`);if(!m.won&&!m.lost)status.textContent=m.message;}
      if(m.type==='tone')audio.play(m);
      if(m.type==='win'||m.type==='lose'){status.textContent=m.message;pause.disabled=true;}
      if(m.type==='fatal'||(m.type==='log'&&m.level==='error')){status.textContent=m.message;if(m.type==='fatal')stop();}
    };
    worker.onerror=()=>{status.textContent='Ошибка запуска игры. Проверь скрипты в редакторе.';stop();};
    worker.postMessage({type:'start',project});canvas.focus();
  };
  pause.onclick=()=>{paused=!paused;worker?.postMessage({type:'pause',paused});pause.textContent=paused?'Продолжить':'Пауза';if(paused)audio.stop();else canvas.focus();};
  document.querySelector('#mute').onclick=e=>{audio.muted=!audio.muted;if(audio.muted)audio.stop();e.target.textContent=audio.muted?'Звук: выкл.':'Звук: вкл.';};
  window.addEventListener('keydown',e=>{if(!worker||e.target!==canvas)return;e.preventDefault();keys.add(e.code);worker.postMessage({type:'keys',keys:[...keys]});});
  window.addEventListener('keyup',e=>{keys.delete(e.code);worker?.postMessage({type:'keys',keys:[...keys]});});
  window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{clearKeys();heartbeat=performance.now();});
  setInterval(()=>{if(worker&&!document.hidden&&performance.now()-heartbeat>2500){status.textContent='Скрипт завис. Исправь цикл в редакторе и экспортируй игру снова.';stop();}},500);
}
