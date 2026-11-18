import {makeRig,rigPreset,validateRig,rigPose,sampleRig,drawRig,RIG_LIMITS} from './rig.js';
import {drawSprite} from './render.js';
const rigEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rigEditorMarkup(){return `<div class="rig-editor">
  <p class="rig-lead">Нарисуй кости от сустава к концу. В режиме позы перетаскивай концы костей и сохраняй ключи на шкале времени.</p>
  <div class="rig-toolbar"><button id="rig-draw" class="secondary-button" aria-pressed="true">Рисовать кости</button><button id="rig-pose" class="secondary-button" aria-pressed="false">Менять позу</button><button id="rig-preset" class="secondary-button">Готовый персонаж</button><button id="rig-clear" class="secondary-button">Очистить скелет</button><label>Масштаб <input id="rig-zoom" type="range" min="1" max="10" step=".5" value="5" aria-label="Масштаб редактора костей"></label></div>
  <div class="rig-workspace"><div class="rig-stage"><canvas id="rig-canvas" aria-label="Редактор костей: проведи линию для новой кости или перетащи конец в режиме позы" tabindex="0"></canvas><p id="rig-status" role="status"></p></div>
  <aside class="rig-properties"><label>Кость<select id="rig-bone" aria-label="Выбрать кость"></select></label><label>Имя кости<input id="rig-bone-name" maxlength="60"></label><label>Угол, °<input id="rig-angle" type="number" min="-3600" max="3600" step="1"></label><label>Длина<input id="rig-length" type="number" min="1" max="2048" step="1"></label><label>Толщина<input id="rig-width" type="number" min="1" max="128" step="1"></label><label>Цвет<input id="rig-color" type="color"></label><button id="rig-delete-bone" class="secondary-button">Удалить ветку костей</button><label class="rig-checkbox"><input id="rig-hide-sprite" type="checkbox">Заменить спрайт скелетом</label><small>Кости рисуют персонажа из цветных сегментов. Картинка не деформируется, физический Collider не меняется.</small></aside></div>
  <div class="rig-timeline"><div class="rig-toolbar"><label>Клип<select id="rig-clip" aria-label="Клип анимации"></select></label><button id="rig-add-clip" class="secondary-button">Новый клип</button><button id="rig-delete-clip" class="secondary-button">Удалить клип</button><label>Имя<input id="rig-clip-name" maxlength="60"></label><label>Секунд<input id="rig-duration" type="number" min=".1" max="60" step=".1"></label><label class="rig-checkbox"><input id="rig-loop" type="checkbox">Зациклить</label></div>
  <div class="rig-toolbar"><button id="rig-preview" class="primary-button">Предпросмотр</button><label class="rig-time-label">Время <output id="rig-time-value">0.00 с</output><input id="rig-time" type="range" min="0" max="1" step=".01" value="0" aria-label="Время анимации"></label><button id="rig-record" class="secondary-button">Сохранить позу</button><button id="rig-delete-key" class="secondary-button">Удалить ключ</button></div><div id="rig-keys" class="rig-keys" aria-label="Ключевые позы"></div><label>При запуске<select id="rig-autoplay" aria-label="Анимация при запуске"></select></label>
  <p class="rig-note">До ${RIG_LIMITS.bones} костей, ${RIG_LIMITS.clips} клипов и ${RIG_LIMITS.keys} ключей в клипе. Последний ключ повторяет первый для плавного цикла. Изменения применяются кнопкой ниже; закрытие окна отменяет их.</p></div>
  <div class="modal-actions"><button id="rig-cancel" class="secondary-button">Отмена</button><button id="rig-save" class="primary-button">Применить анимацию</button></div></div>`;}
export function mountRigEditor(container,object,onSave,onClose,imageData=null){
  const q=s=>container.querySelector(s),canvas=q('#rig-canvas'),ctx=canvas.getContext('2d');
  let rig=structuredClone(object.rig||makeRig()),boneId=rig.bones[0]?.id||null,clipIndex=0,time=0,mode='draw',pose={},dirty=false,preview=false,lastTime=0,raf=0,disposed=false,drag=null;
  const images=new Map();if(imageData&&object.sprite?.assetId){const image=new Image();image.onload=()=>draw();image.src=imageData;images.set(object.sprite.assetId,image);}
  // The original image serves as a reference; loading is optional and entirely local.
  const clip=()=>rig.clips[clipIndex],bone=()=>rig.bones.find(b=>b.id===boneId),zoom=()=>Number(q('#rig-zoom').value);
  function status(text){q('#rig-status').textContent=text;}
  function resetPose(){pose=sampleRig(rig,clip()?.name,time);dirty=false;}
  function stopPreview(){preview=false;q('#rig-preview').textContent='Предпросмотр';}
  function readTime(){q('#rig-time').max=clip()?.duration||1;q('#rig-time').value=time;q('#rig-time-value').textContent=time.toFixed(2)+' с';}
  function properties(){
    const b=bone(),enabled=!!b;
    for(const id of ['name','angle','length','width','color'])q('#rig-'+(id==='name'?'bone-name':id)).disabled=!enabled;
    q('#rig-delete-bone').disabled=!enabled;
    q('#rig-bone-name').value=b?.name||'';q('#rig-angle').value=b?Math.round((mode==='pose'?pose[b.id]:b.angle)??b.angle):0;
    q('#rig-length').value=b?.length||1;q('#rig-width').value=b?.width||1;q('#rig-color').value=b?.color||'#c5ed8a';
    q('#rig-length').disabled=!enabled||mode==='pose';
  }
  function refresh(){
    const c=clip();
    q('#rig-bone').innerHTML=rig.bones.length?rig.bones.map(b=>`<option value="${rigEsc(b.id)}">${rigEsc(b.name)}</option>`).join(''):'<option>Нет костей</option>';q('#rig-bone').value=boneId||'';
    q('#rig-clip').innerHTML=rig.clips.map((c,i)=>`<option value="${i}">${rigEsc(c.name)}</option>`).join('');q('#rig-clip').value=clipIndex;
    q('#rig-clip-name').value=c?.name||'';q('#rig-duration').value=c?.duration||1;q('#rig-loop').checked=c?.loop??true;
    q('#rig-autoplay').innerHTML='<option value="">Без анимации</option>'+rig.clips.map(c=>`<option value="${rigEsc(c.name)}">${rigEsc(c.name)}</option>`).join('');q('#rig-autoplay').value=rig.autoplay||'';
    q('#rig-hide-sprite').checked=rig.hideSprite;
    q('#rig-draw').setAttribute('aria-pressed',String(mode==='draw'));q('#rig-pose').setAttribute('aria-pressed',String(mode==='pose'));
    q('#rig-keys').innerHTML=c?.keys.map(k=>`<button class="rig-key ${Math.abs(k.time-time)<.005?'active':''}" data-rig-key="${k.time}">${k.time.toFixed(2)} с</button>`).join('')||'<span>Пока нет ключей. Измени позу и нажми «Сохранить позу».</span>';
    readTime();properties();draw();
  }
  function draw(){
    if(disposed)return;const w=canvas.clientWidth,h=canvas.clientHeight,z=zoom(),dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#151f20';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,h/2);ctx.scale(z,z);
    ctx.strokeStyle='#bedb8c12';ctx.lineWidth=1/z;ctx.beginPath();for(let x=-w/z;x<w/z;x+=10){ctx.moveTo(x,-h/z);ctx.lineTo(x,h/z);}for(let y=-h/z;y<h/z;y+=10){ctx.moveTo(-w/z,y);ctx.lineTo(w/z,y);}ctx.stroke();
    if(object.sprite){ctx.globalAlpha=.15;drawSprite(ctx,object.sprite,0,images);ctx.globalAlpha=1;}
    drawRig(ctx,rig,{angles:mode==='draw'&&!preview?{}:pose},true,boneId);
    ctx.strokeStyle='#85c9d866';ctx.lineWidth=1/z;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.moveTo(0,-4);ctx.lineTo(0,4);ctx.stroke();
    if(drag?.drawing){ctx.strokeStyle='#fff';ctx.lineWidth=2/z;ctx.setLineDash([3/z,3/z]);ctx.beginPath();ctx.moveTo(drag.start.x,drag.start.y);ctx.lineTo(drag.end.x,drag.end.y);ctx.stroke();}
    ctx.restore();
  }
  function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-r.width/2)/zoom(),y:(e.clientY-r.top-r.height/2)/zoom()};}
  function nearest(p){let hit=null,distance=12/zoom();for(const [id,b]of rigPose(rig,mode==='draw'?{}:pose)){const d=Math.hypot(p.x-b.endX,p.y-b.endY);if(d<distance){distance=d;hit={id,...b};}}return hit;}
  canvas.onpointerdown=e=>{
    if(e.button!==0)return;stopPreview();canvas.setPointerCapture(e.pointerId);const p=point(e),hit=nearest(p);
    if(mode==='draw'){if(rig.bones.length>=RIG_LIMITS.bones){status('Достигнут предел костей.');return;}drag={drawing:true,parent:hit?.id||null,start:hit?{x:hit.endX,y:hit.endY}:p,end:p};}
    else if(hit){boneId=hit.id;drag={drawing:false,id:hit.id};properties();draw();}
    else status('Возьми за светлый конец кости.');
  };
  canvas.onpointermove=e=>{if(!drag)return;const p=point(e);if(drag.drawing)drag.end=p;else{const b=rig.bones.find(b=>b.id===drag.id),poses=rigPose(rig,pose),current=poses.get(b.id),parent=poses.get(b.parent);pose[b.id]=(Math.atan2(p.y-current.y,p.x-current.x)-(parent?.angle||0))*180/Math.PI;dirty=true;properties();status('Поза изменена. Сохрани её ключом на текущем времени.');}draw();};
  canvas.onpointerup=e=>{
    if(!drag)return;
    if(drag.drawing){const end=point(e),length=Math.hypot(end.x-drag.start.x,end.y-drag.start.y);if(length>=1){
      const parent=rigPose(rig).get(drag.parent);let id='bone-1',n=1;while(rig.bones.some(b=>b.id===id))id='bone-'+(++n);
      rig.bones.push({id,name:'Кость '+n,parent:drag.parent,x:drag.parent?0:Math.round(drag.start.x*100)/100,y:drag.parent?0:Math.round(drag.start.y*100)/100,length:Math.min(2048,length),angle:(Math.atan2(end.y-drag.start.y,end.x-drag.start.x)-(parent?.angle||0))*180/Math.PI,width:4,color:'#c5ed8a'});boneId=id;resetPose();status('Кость добавлена. Начни следующую от её конца или нарисуй отдельную ветку.');}}
    drag=null;refresh();
  };
  canvas.onpointercancel=()=>{drag=null;draw();};
  function record(){const c=clip();if(!c)return;const existing=c.keys.find(k=>Math.abs(k.time-time)<.005);if(!existing&&c.keys.length>=RIG_LIMITS.keys){status('Достигнут предел ключевых поз.');return false;}if(existing)existing.angles={...pose};else c.keys.push({time,angles:{...pose}});c.keys.sort((a,b)=>a.time-b.time);dirty=false;status('Поза сохранена в '+time.toFixed(2)+' с.');refresh();return true;}
  function changeTime(value){stopPreview();if(dirty)record();time=Number(value);resetPose();refresh();}
  q('#rig-draw').onclick=()=>{stopPreview();if(dirty)record();mode='draw';refresh();status('Проведи линию. Начни у конца существующей кости, чтобы создать дочернюю.');};
  q('#rig-pose').onclick=()=>{stopPreview();if(dirty&&!record())return;mode='pose';resetPose();refresh();status('Перетаскивай концы костей, затем сохрани позу на выбранном времени.');};
  q('#rig-preset').onclick=()=>{if(rig.bones.length){q('#rig-preset').textContent='Добавить персонажа после очистки';status('Чтобы заменить существующий скелет, сначала нажми «Очистить скелет».');return;}rig=rigPreset();boneId=rig.bones[0].id;clipIndex=0;time=0;mode='pose';stopPreview();resetPose();refresh();status('Готово: клипы idle и walk. Выбери walk и включи предпросмотр.');};
  q('#rig-clear').onclick=()=>{stopPreview();rig=makeRig();boneId=null;clipIndex=0;time=0;mode='draw';resetPose();refresh();q('#rig-preset').textContent='Готовый персонаж';status('Черновик очищен. «Отмена» вернёт исходный проект.');};
  q('#rig-bone').onchange=e=>{boneId=e.target.value;properties();draw();};
  q('#rig-zoom').oninput=draw;
  q('#rig-bone-name').onchange=e=>{if(bone()&&e.target.value.trim()){bone().name=e.target.value.trim();refresh();}};
  for(const [id,min,max] of [['angle',-3600,3600],['length',1,2048],['width',1,128]])q('#rig-'+id).onchange=e=>{
    const b=bone(),v=Number(e.target.value);if(!b||!Number.isFinite(v)||v<min||v>max){properties();return;}
    stopPreview();if(mode==='pose'&&id==='angle'){pose[b.id]=v;dirty=true;}else{b[id]=v;if(mode==='draw')resetPose();}draw();
  };
  q('#rig-color').oninput=e=>{if(bone()){bone().color=e.target.value;draw();}};
  q('#rig-delete-bone').onclick=()=>{if(!bone())return;const ids=new Set([boneId]);for(const b of rig.bones)if(ids.has(b.parent))ids.add(b.id);rig.bones=rig.bones.filter(b=>!ids.has(b.id));for(const c of rig.clips)for(const k of c.keys)for(const id of ids)delete k.angles[id];boneId=rig.bones[0]?.id||null;stopPreview();resetPose();refresh();};
  q('#rig-hide-sprite').onchange=e=>{rig.hideSprite=e.target.checked;};
  q('#rig-clip').onchange=e=>{const next=Number(e.target.value);stopPreview();if(dirty&&!record())return;clipIndex=next;time=0;resetPose();refresh();};
  q('#rig-add-clip').onclick=()=>{if(rig.clips.length>=RIG_LIMITS.clips){status('Достигнут предел клипов.');return;}if(dirty)record();let name='clip-1',n=1;while(rig.clips.some(c=>c.name===name))name='clip-'+(++n);rig.clips.push({name,duration:1,loop:true,keys:[]});clipIndex=rig.clips.length-1;time=0;stopPreview();resetPose();refresh();};
  q('#rig-delete-clip').onclick=()=>{if(!clip())return;if(rig.autoplay===clip().name)rig.autoplay=null;rig.clips.splice(clipIndex,1);clipIndex=Math.max(0,clipIndex-1);time=0;stopPreview();resetPose();refresh();};
  q('#rig-clip-name').onchange=e=>{const c=clip(),name=e.target.value.trim();if(!c||!name||rig.clips.some(v=>v!==c&&v.name===name)){status('Имя клипа должно быть непустым и уникальным.');refresh();return;}if(rig.autoplay===c.name)rig.autoplay=name;c.name=name;refresh();};
  q('#rig-duration').onchange=e=>{const c=clip(),v=Number(e.target.value);if(!c||v<.1||v>60||!Number.isFinite(v)){refresh();return;}if(c.keys.some(k=>k.time>v)){status('Сначала удали ключи за новой границей времени.');refresh();return;}c.duration=v;time=Math.min(time,v);stopPreview();resetPose();refresh();};
  q('#rig-loop').onchange=e=>{if(clip())clip().loop=e.target.checked;};
  q('#rig-time').oninput=e=>changeTime(e.target.value);
  q('#rig-keys').onclick=e=>{const button=e.target.closest('[data-rig-key]');if(button){mode='pose';changeTime(button.dataset.rigKey);}};
  q('#rig-record').onclick=()=>{stopPreview();if(mode==='draw'){mode='pose';resetPose();}record();};
  q('#rig-delete-key').onclick=()=>{if(clip())clip().keys=clip().keys.filter(k=>Math.abs(k.time-time)>=.005);stopPreview();resetPose();refresh();};
  q('#rig-autoplay').onchange=e=>{rig.autoplay=e.target.value||null;};
  q('#rig-preview').onclick=()=>{if(preview){stopPreview();return;}if(dirty&&!record())return;if(!clip()){status('Сначала создай клип.');return;}mode='pose';if(time>=clip().duration)time=0;preview=true;lastTime=performance.now();q('#rig-preview').textContent='Остановить просмотр';refresh();};
  q('#rig-cancel').onclick=onClose;
  q('#rig-save').onclick=()=>{stopPreview();if(dirty&&!record())return;try{if(!rig.bones.length)rig.hideSprite=false;validateRig(rig);onSave(structuredClone(rig));}catch(e){status(e.message);}};
  function tick(now){if(disposed)return;if(preview&&clip()){const dt=Math.min(.1,(now-lastTime)/1000);time+=dt;if(time>=clip().duration){if(clip().loop)time%=clip().duration;else{time=clip().duration;stopPreview();}}pose=sampleRig(rig,clip().name,time);readTime();draw();}lastTime=now;raf=requestAnimationFrame(tick);}
  const observer=new ResizeObserver(draw);observer.observe(canvas);resetPose();refresh();status('Начни с готового персонажа или нарисуй первую кость.');raf=requestAnimationFrame(tick);
  return ()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();};
}
