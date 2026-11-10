import {createDemo,createEmpty,makeObject,componentDefaults,clone,uid,validateProject,History,STORAGE_KEY,emptyCode} from './model.js';
import {Viewport,palette,thumbnail} from './render.js';
import {icon} from './icons.js';
import {lessons,apiDoc} from './lessons.js';
import {lessonMarkup,courseMarkdown} from './learning.js';
import {lessonVisuals} from './lesson-visuals.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project=createDemo(),loadError='';
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)project=validateProject(JSON.parse(saved));}catch{loadError='Не удалось восстановить автосохранение. Открыт учебный пример.';}
let selected=project.objects.find(o=>o.tag==='Player')?.id||project.objects[0]?.id||null;
let activeTab='scene',bottomTab='assets',assetFilter='all',activeScript=project.assets.find(a=>a.type==='script')?.id;
let worker=null,playing=false,paused=false,lastHeartbeat=0,keys=new Set(),saveTimer,toastTimer,codeGroupTimer,codeEditing=false,search='',lessonIndex=project.lesson||0;
const history=new History(),logs=[];
const root=$('#root');

root.innerHTML=`
<div class="app-shell">
 <header class="topbar">
  <a class="brand nis-brand" href="./" aria-label="NIS-GameCenter — мастерская игр"><span class="brand-mark">N</span><span class="brand-name"><span class="brand-nis">NIS</span><span class="brand-game">-GameCenter</span></span></a>
  <span class="top-divider"></span><button id="project-menu" class="project-title" aria-haspopup="true"><span id="project-name"></span>${icon('down',13)}</button>
  <div class="save-state" id="save-state"><span class="status-dot"></span>Сохранено</div>
  <div class="top-actions"><button class="quiet-button" id="lessons-open">${icon('book')}<span>Учебник</span></button><button class="quiet-button" id="api-open" title="Справка по коду">${icon('code')}<span>Справка</span></button><span class="top-divider"></span><button class="download-button" id="download">${icon('download')}<span>Скачать проект</span></button></div>
 </header>
 <div class="workspace-bar">
  <div class="workspace-label"><span class="tiny-square"></span>МАСТЕРСКАЯ ИГР <span class="slash">/</span><span class="muted">2D</span></div>
  <div class="transport"><button id="play" class="play-button" title="Запустить / остановить (F5)">${icon('play',14)}<span>Играть</span><kbd>F5</kbd></button><button id="pause" class="icon-button" disabled title="Пауза">${icon('pause',14)}</button><button id="step" class="icon-button" disabled title="Один шаг">${icon('step',14)}</button></div>
  <div class="workspace-tools"><button id="undo" class="icon-button" title="Отменить (Ctrl+Z)">${icon('undo')}</button><button id="redo" class="icon-button" title="Повторить (Ctrl+Shift+Z)">${icon('redo')}</button><span class="tool-divider"></span><button id="scene-settings" class="icon-button" title="Настройки сцены">${icon('settings')}</button></div>
 </div>
 <main class="editor-layout">
  <aside class="hierarchy panel">
   <div class="panel-title"><span>Объекты сцены</span><button id="add-object" class="icon-button small" title="Добавить объект" aria-label="Добавить объект">${icon('plus',16)}</button></div>
   <label class="search-box">${icon('search',14)}<input id="search" placeholder="Найти объект…" aria-label="Поиск объектов"/><kbd>⌕</kbd></label>
   <div class="scene-root">${icon('down',12)}${icon('scene',15)}<span>Уровень 01</span><span id="object-count" class="count"></span></div>
   <div class="object-list" id="object-list" role="listbox" aria-label="Объекты сцены"></div>
   <div class="hierarchy-hint">${icon('info',13)}<span>Объект = компоненты + код</span></div>
   <button id="lesson-card" class="lesson-card"><span class="lesson-eyebrow">${icon('spark',14)} ${lessons.length} УРОКОВ · 7 КЛАСС</span><strong>От идеи до игры</strong><span>Сцена, JavaScript и собственный проект.</span><span class="lesson-link" id="course-card-link">Открыть учебник ${icon('arrow',15)}</span><div class="lesson-progress" id="course-card-progress"></div><span class="course-card-count" id="course-card-count"></span></button>
  </aside>
  <section class="center-column">
   <div class="main-tabs"><button class="main-tab active" id="tab-scene">${icon('scene',15)}Сцена<span class="tab-dot"></span></button><button class="main-tab" id="tab-code">${icon('code',15)}Код<span class="js-badge">JS</span></button><div class="tab-spacer"></div><span id="mode-label">РЕЖИМ РЕДАКТИРОВАНИЯ</span></div>
   <div class="stage-toolbar" id="stage-toolbar"><div class="tool-group"><button class="icon-button active" title="Перемещайте объекты мышью">${icon('move',16)}</button><span class="tool-divider"></span><button id="grid" class="icon-button active" title="Показать / скрыть сетку" aria-pressed="true">${icon('grid',15)}</button><button id="snap" class="icon-button active" title="Привязка к сетке 8 px" aria-pressed="true">${icon('magnet',15)}</button><button id="colliders" class="icon-button" title="Показать коллайдеры" aria-pressed="false">${icon('collider',15)}</button></div><span class="scene-breadcrumb">${icon('scene',12)}<span>Уровень 01</span></span><div class="tool-group"><button id="fit" class="icon-button" title="Уместить сцену (F)">${icon('target',15)}</button><button id="zoom" class="zoom-button" title="Сбросить масштаб">100% ${icon('down',10)}</button><span class="dimension-label">960 × 540</span></div></div>
   <div class="stage" id="stage"><canvas id="scene-canvas" tabindex="0" aria-label="Редактор сцены. Выберите объект и перетащите мышью."></canvas><span class="world-label"><i></i><span id="world-label">SCENE VIEW</span></span><div class="stage-empty" id="stage-empty" hidden><strong>Здесь начинается твоя игра</strong><span>Перетащи объект из библиотеки на сцену</span></div><div class="game-hud" id="game-hud" hidden><span class="coin-icon">◈</span><b id="score">0</b><span>/ 3</span></div><div id="game-message" class="game-message" hidden></div><div id="game-instructions" class="game-instructions" hidden>← → / A D <span>движение</span><kbd>Пробел</kbd><span>прыжок</span></div></div>
   <div class="code-workspace" id="code-workspace" hidden><div class="code-toolbar"><select id="script-select" aria-label="Текущий скрипт"></select><span>${icon('circle',8)} JavaScript</span><span class="code-apply">Изменения применятся при запуске</span></div><div class="code-editor"><div id="line-numbers" class="line-numbers">1</div><div class="code-scroll"><pre id="code-highlight" aria-hidden="true"></pre><textarea id="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Редактор JavaScript"></textarea></div></div><div class="code-status"><span id="code-location">Строка 1, столбец 1</span><span>JavaScript · UTF-8 · 2 пробела</span></div></div>
   <div class="bottom-panel"><div class="bottom-tabs"><button data-bottom="assets" class="bottom-tab active">${icon('folder',14)}Ресурсы</button><button data-bottom="console" class="bottom-tab">${icon('terminal',14)}Консоль<span id="log-count" class="count">0</span><i id="error-dot" hidden></i></button><button data-bottom="lessons" class="bottom-tab">${icon('book',14)}Уроки<span class="count">${lessons.length}</span></button><div class="tab-spacer"></div><span class="bottom-note" id="bottom-note">Всё, что нужно для первой игры</span></div><div id="bottom-content" class="bottom-content"></div></div>
  </section>
  <aside class="inspector panel"><div class="panel-title"><span>Инспектор</span>${icon('settings',14)}</div><div id="inspector-content" class="inspector-content"></div></aside>
 </main>
 <footer class="statusbar"><span><i class="status-dot"></i><span id="footer-status">Готов к твоим идеям</span></span><span id="footer-hint">Перетаскивай объекты · Колесо — масштаб · F — вся сцена</span><span><span id="pointer-position">X 0 · Y 0</span><span class="footer-version">NIS-GameCenter 0.2</span></span></footer>
</div><div id="popover" class="popover" hidden></div><div id="modal-root"></div><div id="toast" class="toast" role="status" hidden></div><input id="project-file" type="file" accept=".json,application/json" hidden/><input id="image-file" type="file" accept="image/png,image/jpeg,image/webp" hidden/>`;

const viewport=new Viewport($('#scene-canvas'),{
 onSelect:id=>{selected=id;renderHierarchy();renderInspector();viewport.set(project,selected);},
 onMoveStart:()=>history.push(project),onMove:(id,x,y)=>{const o=project.objects.find(o=>o.id===id);if(o){o.transform.x=x;o.transform.y=y;viewport.set(project,selected);}},onMoveEnd:()=>{renderInspector();changed();},
 onZoom:zoom=>$('#zoom').innerHTML=`${Math.round(zoom*100)}% ${icon('down',10)}`,
 onPointer:p=>$('#pointer-position').textContent=`X ${Math.round(p.x)} · Y ${Math.round(p.y)}`,
 onAdd:(kind,x,y)=>addObject(kind,x,y),onOpenScript:()=>{const o=currentObject();if(o?.script)openScript(o.script.assetId);}
});

function currentObject(){return project.objects.find(o=>o.id===selected);}
function completedLessons(){return [...new Set(project.completedLessons||[])];}
function renderCourseProgress(){
 const completed=completedLessons();
 $('#course-card-count').textContent=`Пройдено ${completed.length} из ${lessons.length}`;
 $('#course-card-progress').innerHTML=lessons.map((l,i)=>`<i class="${completed.includes(i)?'completed':i===lessonIndex?'current':''}" title="${esc(l.title)}"></i>`).join('');
 $('#course-card-link').innerHTML=`${completed.length?'Продолжить обучение':'Открыть учебник'} ${icon('arrow',15)}`;
}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function markHistory(){if(playing)return false;history.push(project);return true;}
function changed(){
 $('#project-name').textContent=project.name;$('#undo').disabled=playing||!history.past.length;$('#redo').disabled=playing||!history.future.length;
 $('#save-state').innerHTML='<span class="status-dot saving"></span>Сохраняю…';clearTimeout(saveTimer);saveTimer=setTimeout(saveLocal,500);viewport.set(project,selected);
}
function saveLocal(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));$('#save-state').innerHTML='<span class="status-dot"></span>Сохранено';}
 catch{$('#save-state').innerHTML='<span class="status-dot error"></span>Нет автосохранения';toast('Не хватает места в браузере. Скачайте проект файлом.');}
}
function renderAll(){
 $('#project-name').textContent=project.name;$('.scene-root span').textContent=project.scene.name||'Сцена';$('.scene-breadcrumb span').textContent=project.scene.name||'Сцена';$('.dimension-label').textContent=`${project.scene.width} × ${project.scene.height}`;
 renderHierarchy();renderInspector();renderBottom();renderCode();renderCourseProgress();viewport.set(project,selected);$('#undo').disabled=playing||!history.past.length;$('#redo').disabled=playing||!history.future.length;
 $('#stage-empty').hidden=playing||project.objects.some(o=>o.sprite&&o.active);
}
const objectIcon=o=>o.camera?'camera':o.script?'code':o.collider?.isTrigger?'bolt':o.rigidbody?'cube':'scene';
function renderHierarchy(){
 $('#object-count').textContent=project.objects.length;
 $('#object-list').innerHTML=project.objects.filter(o=>o.name.toLowerCase().includes(search.toLowerCase())).map(o=>`<div class="object-row ${selected===o.id?'selected':''} ${o.active?'':'inactive'}" data-id="${esc(o.id)}" role="option" aria-selected="${selected===o.id}" tabindex="0"><span class="tree-line"></span><span class="object-type ${o.script?'orange':o.collider?.isTrigger?'purple':''}">${icon(objectIcon(o),15)}</span><span class="object-name">${esc(o.name)}</span><button class="visibility-button" title="${o.active?'Отключить':'Включить'} объект" data-toggle="${esc(o.id)}" aria-label="${o.active?'Отключить':'Включить'} ${esc(o.name)}">${icon(o.active?'eye':'circle',13)}</button></div>`).join('')||'<div class="empty-list">Объекты не найдены</div>';
}
function field(label,path,value,options={}){
 const {type='number',min,max,step='1',choices}=options;
 const attrs=`data-path="${path}" aria-label="${esc(label)}"`;
 let input;
 if(choices)input=`<select ${attrs}>${choices.map(([v,l])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
 else if(type==='checkbox')input=`<label class="switch"><input type="checkbox" ${attrs} ${value?'checked':''}/><span></span></label>`;
 else if(type==='color')input=`<div class="color-input"><input type="color" ${attrs} value="${esc(value)}"/><span>${esc(value)}</span></div>`;
 else input=`<input type="${type}" ${attrs} value="${esc(value)}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${type==='number'?`step="${step}"`:''}/>`;
 return `<label class="field ${type==='checkbox'?'checkbox-field':''}"><span>${esc(label)}</span>${input}</label>`;
}
function pair(label,a,b){return `<div class="vector-field"><span>${label}</span><div>${a}${b||''}</div></div>`;}
function section(name,type,body,help){return `<details class="component" open><summary><span>${icon('down',11)}<i class="component-icon ${type}">${icon({transform:'move',sprite:'image',rigidbody:'physics',collider:'collider',script:'code',camera:'camera'}[type],15)}</i><strong>${name}</strong></span>${type!=='transform'?`<button type="button" class="remove-component" data-remove="${type}" title="Удалить компонент" aria-label="Удалить ${name}">${icon('close',12)}</button>`:''}</summary><div class="component-body">${body}${help?`<p class="component-help">${help}</p>`:''}</div></details>`;}
function renderInspector(){
 const o=currentObject(),target=$('#inspector-content');
 if(!o){target.innerHTML=`<div class="scene-info-header">${icon('scene',25)}<div><h2>Настройки сцены</h2><span>Общие параметры игры</span></div></div><fieldset ${playing?'disabled':''} class="scene-fields">${field('Название','scene.name',project.scene.name,{type:'text'})}${field('Ширина','scene.width',project.scene.width,{min:100,max:4096})}${field('Высота','scene.height',project.scene.height,{min:100,max:4096})}${field('Гравитация','scene.gravity',project.scene.gravity,{min:-10000,max:10000,step:10})}${field('Цвет фона','scene.background',project.scene.background,{type:'color'})}<p class="component-help">Пиксели и секунды. Ось Y направлена вниз. Нажмите на объект, чтобы увидеть его компоненты.</p></fieldset>`;return;}
 let body=section('Transform','transform',pair('Позиция',field('X','transform.x',o.transform.x),field('Y','transform.y',o.transform.y))+field('Поворот °','transform.rotation',o.transform.rotation)+pair('Масштаб',field('X','transform.scaleX',o.transform.scaleX,{step:.1}),field('Y','transform.scaleY',o.transform.scaleY,{step:.1})));
 if(o.sprite){const s=o.sprite;body+=section('Sprite Renderer','sprite',field('Спрайт','sprite.kind',s.kind,{choices:palette.filter(p=>p.kind!=='camera').map(p=>[p.kind,p.name])})+field('Изображение','sprite.assetId',s.assetId||'',{choices:[['','Встроенный спрайт'],...project.assets.filter(a=>a.type==='image').map(a=>[a.id,a.name])]})+field('Цвет','sprite.color',s.color,{type:'color'})+pair('Размер',field('W','sprite.width',s.width,{min:1,max:4096}),field('H','sprite.height',s.height,{min:1,max:4096}))+field('Слой','sprite.layer',s.layer,{min:-1000,max:1000})+field('Видимый','sprite.visible',s.visible,{type:'checkbox'}));}
 if(o.rigidbody){const r=o.rigidbody;body+=section('Rigidbody 2D','rigidbody',field('Тип тела','rigidbody.type',r.type,{choices:[['dynamic','Dynamic — подвижный'],['static','Static — неподвижный']]})+field('Масса','rigidbody.mass',r.mass,{min:.01,max:10000,step:.1})+field('Гравитация ×','rigidbody.gravityScale',r.gravityScale,{min:-100,max:100,step:.1})+field('Упругость','rigidbody.restitution',r.restitution,{min:0,max:1,step:.05})+field('Трение','rigidbody.friction',r.friction,{min:0,max:1,step:.05})+field('Без вращения','rigidbody.freezeRotation',r.freezeRotation,{type:'checkbox'}),!o.collider?'Добавьте Collider, чтобы тело участвовало в физике.':'Гравитация, скорость и взаимодействие с другими телами.');}
 if(o.collider){const c=o.collider;body+=section(c.type==='box'?'Box Collider 2D':'Circle Collider 2D','collider',field('Форма','collider.type',c.type,{choices:[['box','Прямоугольник'],['circle','Окружность']]})+(c.type==='box'?pair('Размер',field('W','collider.width',c.width,{min:1,max:4096}),field('H','collider.height',c.height,{min:1,max:4096})):field('Радиус','collider.radius',c.radius,{min:1,max:2048}))+pair('Смещение',field('X','collider.offsetX',c.offsetX),field('Y','collider.offsetY',c.offsetY))+field('Триггер','collider.isTrigger',c.isTrigger,{type:'checkbox'}),c.isTrigger?'Обнаруживает касание, но не останавливает объект.':'Форма столкновения не зависит от изображения.');}
 if(o.script){body+=section('Script','script',field('Файл','script.assetId',o.script.assetId,{choices:project.assets.filter(a=>a.type==='script').map(a=>[a.id,a.name])})+field('Включён','script.enabled',o.script.enabled,{type:'checkbox'})+`<button type="button" id="edit-script" class="script-edit-button">${icon('code',14)}Открыть код${icon('external',12)}</button>`);}
 if(o.camera){body+=section('Camera 2D','camera',field('Масштаб','camera.zoom',o.camera.zoom,{min:.1,max:5,step:.1})+field('Цвет фона','camera.background',o.camera.background,{type:'color'})+field('Следить за','camera.followTarget',o.camera.followTarget,{choices:[['','Не следить'],...project.objects.filter(x=>x.id!==o.id).map(x=>[x.id,x.name])]}),'Первая активная камера определяет вид в режиме игры.');}
 target.innerHTML=`<div class="object-inspector-header"><span class="large-object-icon">${icon(objectIcon(o),24)}</span><div><input id="object-name" aria-label="Имя объекта" value="${esc(o.name)}" ${playing?'disabled':''}/><span>Game Object <span class="id-tag">2D</span></span></div><button id="duplicate" class="icon-button" title="Дублировать объект (Ctrl+D)" ${playing?'disabled':''}>${icon('copy',14)}</button></div><div class="object-meta">${field('Тег','tag',o.tag,{type:'text'})}</div>${playing?'<div class="play-notice">Редактирование доступно после «Стоп»</div>':''}<fieldset ${playing?'disabled':''}>${body}<button id="add-component" type="button" class="add-component">${icon('plus',15)}Добавить компонент</button><button id="delete-object" type="button" class="delete-object">${icon('trash',13)}Удалить объект</button></fieldset>`;
 if(playing)target.querySelector('[data-path="tag"]').disabled=true;
}
function renderBottom(){
 document.querySelectorAll('[data-bottom]').forEach(b=>b.classList.toggle('active',b.dataset.bottom===bottomTab));
 const target=$('#bottom-content');target.className=`bottom-content ${bottomTab}`;
 $('#bottom-note').textContent=bottomTab==='assets'?'Перетащи на сцену или нажми +':bottomTab==='console'?'Сообщения твоих скриптов':'Маленькие шаги. Настоящие игры.';
 if(bottomTab==='console'){
  target.innerHTML=`<div class="console-toolbar"><span>${logs.length} сообщений <span class="muted">· хранятся последние 200</span></span><button id="clear-console" class="quiet-button">${icon('trash',12)}Очистить</button></div><div class="console-messages">${logs.length?logs.map(log=>`<div class="log-line ${log.level}"><time>${esc(log.time)}</time>${icon(log.level==='error'?'warning':log.level==='warn'?'info':'chevron',13)}<span>${esc(log.message)}</span></div>`).join(''):'<div class="console-empty">'+icon('terminal',24)+'<span>Здесь появятся сообщения Debug.log() и ошибки кода.</span></div>'}</div>`;
  const messages=target.querySelector('.console-messages');messages.scrollTop=messages.scrollHeight;return;
 }
 if(bottomTab==='lessons'){
  target.innerHTML=`<div class="course-bottom-summary"><span>7 класс · ${lessons.length} занятий по 45 минут</span><span>Пройдено ${completedLessons().length} / ${lessons.length}</span></div><div class="lesson-list">${lessons.map((l,i)=>`<button class="lesson-list-item ${i===lessonIndex?'current':''}" data-lesson="${i}"><span class="lesson-number">${project.completedLessons?.includes(i)?icon('check',15):String(i+1).padStart(2,'0')}</span><span><b>${l.title}</b><small>${l.module} · ${l.time}</small></span>${icon('chevron',13)}</button>`).join('')}</div>`;return;
 }
 const builtin=assetFilter==='scripts'?[]:palette;
 const assets=project.assets.filter(a=>assetFilter==='scripts'?a.type==='script':assetFilter==='sprites'?a.type==='image':true);
 target.innerHTML=`<div class="assets-toolbar"><div class="asset-filters">${[['all','Все'],['sprites','Спрайты'],['scripts','Скрипты']].map(([v,l])=>`<button data-filter="${v}" class="${assetFilter===v?'active':''}">${l}</button>`).join('')}</div><div><button id="upload-image" class="quiet-button" ${playing?'disabled':''}>${icon('upload',12)}Изображение</button><button id="new-script" class="quiet-button" ${playing?'disabled':''}>${icon('plus',13)}Скрипт</button></div></div><div class="asset-grid">${builtin.map(p=>`<div class="asset-card" draggable="${!playing}" data-kind="${p.kind}" tabindex="0" role="button" aria-label="Добавить: ${p.name}" title="${p.note}. Двойной щелчок или перетащите на сцену"><div class="asset-preview"><img src="${thumbnail(p.kind,p.color)}" alt=""/><button class="asset-add" data-add="${p.kind}" title="Добавить ${p.name}" aria-label="Добавить ${p.name}">${icon('plus',13)}</button></div><span>${p.name}</span><small>${p.kind==='camera'?'Camera 2D':'Встроенный'}</small></div>`).join('')}${assets.map(a=>`<button class="asset-card ${a.type==='script'?'script-card':''}" data-asset="${esc(a.id)}" title="${a.type==='script'?'Открыть код':'Создать спрайт с изображением'}"><div class="asset-preview">${a.type==='script'?'<span class="script-symbol">JS</span>':`<img class="custom-asset" src="${esc(a.data)}" alt=""/>`}</div><span>${esc(a.name)}</span><small>${a.type==='script'?'JavaScript':'Изображение'}</small></button>`).join('')}</div>`;
}
function addLog(level,message){logs.push({level,message,time:new Date().toLocaleTimeString('ru-RU')});if(logs.length>200)logs.shift();$('#log-count').textContent=logs.length;$('#error-dot').hidden=!logs.some(l=>l.level==='error');if(bottomTab==='console')renderBottom();}
function syntax(source){
 const regex=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(export|default|class|extends|const|let|var|if|else|return|new|this|true|false|null|function|for|while|throw)\b|\b(\d+(?:\.\d+)?)\b/g;
 let out='',last=0;for(const m of source.matchAll(regex)){out+=esc(source.slice(last,m.index));out+=`<span class="syntax-${m[1]?'comment':m[2]?'string':m[3]?'keyword':'number'}">${esc(m[0])}</span>`;last=m.index+m[0].length;}return out+esc(source.slice(last))+'\n';
}
function paintCode(){const input=$('#code-input');$('#code-highlight').innerHTML=syntax(input.value);$('#line-numbers').innerHTML=Array.from({length:input.value.split('\n').length},(_,i)=>`<div>${i+1}</div>`).join('');syncCodeScroll();codeLocation();}
function renderCode(){
 const scripts=project.assets.filter(a=>a.type==='script');if(!scripts.some(a=>a.id===activeScript))activeScript=scripts[0]?.id;
 $('#script-select').innerHTML=scripts.map(a=>`<option value="${esc(a.id)}" ${a.id===activeScript?'selected':''}>${esc(a.name)}</option>`).join('');
 $('#code-input').value=scripts.find(a=>a.id===activeScript)?.code||'';$('#code-input').readOnly=playing;paintCode();
}
function codeLocation(){const el=$('#code-input'),before=el.value.slice(0,el.selectionStart),lines=before.split('\n');$('#code-location').textContent=`Строка ${lines.length}, столбец ${lines.at(-1).length+1}`;}
function syncCodeScroll(){const input=$('#code-input');$('#code-highlight').scrollTop=input.scrollTop;$('#code-highlight').scrollLeft=input.scrollLeft;$('#line-numbers').scrollTop=input.scrollTop;}
function setTab(tab){activeTab=tab;$('#tab-scene').classList.toggle('active',tab==='scene');$('#tab-code').classList.toggle('active',tab==='code');$('#stage').hidden=tab!=='scene';$('#stage-toolbar').hidden=tab!=='scene';$('#code-workspace').hidden=tab!=='code';if(tab==='scene')viewport.resize();else renderCode();}
function openScript(id){activeScript=id;setTab('code');$('#code-input').focus();}
function addObject(kind,x=480,y=270){if(!markHistory())return;const o=makeObject(kind,Math.round(x),Math.round(y));if(project.objects.some(x=>x.name===o.name)){let n=2;while(project.objects.some(x=>x.name===`${o.name} ${n}`))n++;o.name+=` ${n}`;}if(kind==='player'&&!project.assets.some(a=>a.id==='script-player'))o.script=null;project.objects.push(o);selected=o.id;renderAll();changed();toast(`${o.name} добавлен на сцену`);}
function duplicate(){const o=currentObject();if(!o||!markHistory())return;const copy=clone(o);copy.id=uid();copy.name+=' (копия)';copy.transform.x+=32;copy.transform.y-=24;project.objects.push(copy);selected=copy.id;renderAll();changed();}
function deleteObject(){if(!currentObject()||!markHistory())return;project.objects=project.objects.filter(o=>o.id!==selected);for(const o of project.objects)if(o.camera?.followTarget===selected)o.camera.followTarget='';selected=null;renderAll();changed();}
function undo(redo=false){if(playing)return;codeEditing=false;clearTimeout(codeGroupTimer);project=redo?history.redo(project):history.undo(project);if(!currentObject())selected=project.objects[0]?.id||null;renderAll();changed();}
function download(){saveLocal();const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${project.name.replace(/[\\/:*?"<>|]/g,'_')}.nisgame.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Проект скачан. Его можно открыть на другом компьютере.');}
function replaceProject(next){stop();project=next;history.clear();selected=project.objects.find(o=>o.tag==='Player')?.id||project.objects[0]?.id||null;activeScript=project.assets.find(a=>a.type==='script')?.id;lessonIndex=project.lesson||0;viewport.fit();renderAll();changed();closeModal();}
function popup(anchor,html){const p=$('#popover');p.innerHTML=html;p.hidden=false;const r=anchor.getBoundingClientRect();p.style.top=`${Math.min(r.bottom+5,innerHeight-340)}px`;p.style.left=`${Math.max(8,Math.min(r.left,innerWidth-270))}px`;}
function closePopup(){$('#popover').hidden=true;}
function modal(title,html,wide=false){$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><div><span class="modal-eyebrow">NIS-GAMECENTER / МАСТЕРСКАЯ ИГР</span><h2>${esc(title)}</h2></div><button id="modal-close" class="icon-button" aria-label="Закрыть">${icon('close',20)}</button></header><div class="modal-content">${html}</div></section></div>`;$('#modal-close').onclick=closeModal;$('.modal-backdrop').onclick=e=>{if(e.target===e.currentTarget)closeModal();};$('#modal-close').focus();}
function closeModal(){$('#modal-root').innerHTML='';}
function confirmReplace(next){modal('Начать заново?',`<p>Текущий проект будет заменён. Скачайте его, если хотите сохранить отдельную копию.</p><div class="modal-actions"><button id="backup" class="secondary-button">Скачать текущий</button><button id="confirm-replace" class="primary-button">Открыть ${next==='demo'?'учебный пример':'пустой проект'}</button></div>`);$('#backup').onclick=download;$('#confirm-replace').onclick=()=>replaceProject(next==='demo'?createDemo():createEmpty());}
function showLesson(index=lessonIndex){
 index=Number.isFinite(index)?Math.max(0,Math.min(lessons.length-1,Math.trunc(index))):0;lessonIndex=index;project.lesson=index;saveLocal();renderCourseProgress();if(bottomTab==='lessons')renderBottom();const l=lessons[index];
 modal(`Урок ${String(index+1).padStart(2,'0')}. ${l.title}`,lessonMarkup(index,completedLessons(),syntax),true);
 $('.modal').classList.add('course-modal');
 $('.course-nav-item.current')?.scrollIntoView({block:'nearest',inline:'nearest'});
 document.querySelectorAll('[data-course-lesson]').forEach(button=>button.onclick=()=>showLesson(Number(button.dataset.courseLesson)));
 document.querySelectorAll('[data-visual-choice]').forEach(button=>button.onclick=()=>{
  const correct=Number(button.dataset.visualChoice)===lessonVisuals[index].correct;
  document.querySelectorAll('[data-visual-choice]').forEach(option=>{option.classList.remove('correct','incorrect');option.setAttribute('aria-pressed',String(option===button));});
  button.classList.add(correct?'correct':'incorrect');
  const feedback=$('.prediction-feedback');feedback.hidden=false;feedback.classList.toggle('correct',correct);feedback.textContent=correct?`Верно! ${lessonVisuals[index].answer}`:'Пока не совсем. Посмотри на схему и попробуй другой ответ.';
 });
 $('#lesson-back').onclick=()=>showLesson(index-1);
 $('#lesson-try').onclick=()=>{closeModal();setTab(l.practiceTab);};
 $('#lesson-print').onclick=()=>window.print();
 $('#course-download').onclick=()=>{const url=URL.createObjectURL(new Blob([courseMarkdown()],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='NIS-GameCenter-10-lessons.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Материалы всех 10 уроков скачаны.');};
 if(l.code)$('#lesson-copy-code').onclick=async()=>{
  try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(l.code.source);
   else{const range=document.createRange();range.selectNodeContents($('.lesson-example-text'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);if(!document.execCommand('copy'))throw new Error();selection.removeAllRanges();}
   toast('Пример скопирован. Инструкция по подключению указана над кодом.');
  }catch{toast('Не удалось скопировать автоматически. Выделите пример и нажмите Ctrl+C.');}
 };
 $('#lesson-done').onclick=()=>{
  project.completedLessons=[...new Set([...completedLessons(),index])];saveLocal();renderCourseProgress();renderBottom();
  if(index<lessons.length-1)showLesson(index+1);
  else{closeModal();toast(project.completedLessons.length===lessons.length?'Все 10 уроков пройдены. Время создавать свою игру!':`Урок отмечен. Пройдено ${project.completedLessons.length} из ${lessons.length}.`);}
 };
}

function play(){
 if(playing){stop();return;}saveLocal();setTab('scene');closePopup();playing=true;paused=false;lastHeartbeat=performance.now();keys.clear();$('#game-message').hidden=true;
 worker=new Worker(new URL('./engine/worker.js',import.meta.url),{type:'module'});
 worker.onmessage=e=>{lastHeartbeat=performance.now();const m=e.data;
  if(m.type==='frame'){viewport.runtime=m;viewport.time=m.frame/60;viewport.draw();$('#score').textContent=m.score;}
  if(m.type==='log'){addLog(m.level,m.message);if(m.level==='error'){bottomTab='console';renderBottom();}}
  if(m.type==='win'){$('#game-message').innerHTML=`<span class="victory-icon">${icon('flag',28)}</span><h2>${esc(m.message)}</h2><p>Твоя игра работает. А что изменишь дальше?</p><button id="play-again" class="primary-button">${icon('reset',15)}Ещё раз</button>`;$('#game-message').hidden=false;$('#play-again').onclick=()=>{stop();play();};}
  if(m.type==='fatal'){addLog('error',m.message);stop();bottomTab='console';renderBottom();}
 };
 worker.onerror=e=>{addLog('error',`Не удалось запустить игру: ${e.message}`);stop();bottomTab='console';renderBottom();};
 worker.postMessage({type:'start',project:clone(project)});updateTransport();$('#scene-canvas').focus();
}
function stop(){worker?.terminate();worker=null;playing=false;paused=false;keys.clear();viewport.runtime=null;$('#game-message').hidden=true;$('#score').textContent='0';updateTransport();viewport.draw();}
function updateTransport(){
 for(const id of ['add-object','upload-image','new-script']){const button=document.getElementById(id);if(button)button.disabled=playing;}
 document.querySelectorAll('[data-add]').forEach(button=>button.disabled=playing);
 document.querySelectorAll('.asset-card[data-kind]').forEach(card=>card.draggable=!playing);
 $('#play').innerHTML=`${icon(playing?'stop':'play',14)}<span>${playing?'Стоп':'Играть'}</span><kbd>F5</kbd>`;$('#play').classList.toggle('running',playing);$('#pause').disabled=!playing;$('#pause').classList.toggle('active',paused);$('#step').disabled=!playing||!paused;$('#mode-label').textContent=playing?(paused?'ИГРА НА ПАУЗЕ':'ИГРА ЗАПУЩЕНА'):'РЕЖИМ РЕДАКТИРОВАНИЯ';$('#mode-label').classList.toggle('live',playing);$('#game-hud').hidden=!playing;$('#game-instructions').hidden=!playing;$('#world-label').textContent=playing?'GAME VIEW':'SCENE VIEW';$('#footer-status').textContent=playing?(paused?'Пауза · можно выполнить один шаг':'Игра запущена · фокус на сцене'):'Готов к твоим идеям';$('#undo').disabled=playing||!history.past.length;$('#redo').disabled=playing||!history.future.length;$('#stage-empty').hidden=playing||project.objects.some(o=>o.sprite&&o.active);renderInspector();$('#code-input').readOnly=playing;
}
setInterval(()=>{if(playing&&!document.hidden&&performance.now()-lastHeartbeat>2500){stop();addLog('error','Скрипт не отвечает. Игра остановлена. Проверьте бесконечные циклы while / for. Сцена сохранена.');bottomTab='console';renderBottom();toast('Зависший скрипт остановлен. Редактор продолжает работать.');}},500);

$('#project-menu').onclick=e=>{e.stopPropagation();popup(e.currentTarget,`<span class="popover-label">ПРОЕКТ</span><button data-action="rename">${icon('file')}Переименовать</button><button data-action="empty">${icon('plus')}Новый пустой проект</button><button data-action="demo">${icon('spark')}Учебный пример</button><hr/><button data-action="import">${icon('upload')}Открыть JSON-проект</button><button data-action="download">${icon('download')}Скачать JSON-проект</button>`);};
$('#add-object').onclick=e=>{e.stopPropagation();if(playing)return;popup(e.currentTarget,`<span class="popover-label">ДОБАВИТЬ НА СЦЕНУ</span>${palette.map(p=>`<button data-kind="${p.kind}">${icon(p.kind==='camera'?'camera':p.kind==='coin'?'bolt':'cube')}<span>${p.name}</span></button>`).join('')}`);};
$('#popover').onclick=e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.kind)addObject(b.dataset.kind);
 if(b.dataset.component){if(markHistory()){const o=currentObject();o[b.dataset.component]=componentDefaults(b.dataset.component);if(b.dataset.component==='collider'&&o.sprite){o.collider.width=o.sprite.width;o.collider.height=o.sprite.height;o.collider.radius=Math.max(o.sprite.width,o.sprite.height)/2;}if(b.dataset.component==='script'){let asset=project.assets.find(a=>a.type==='script');if(!asset){asset={id:uid(),type:'script',name:'Behaviour.js',code:emptyCode};project.assets.push(asset);}o.script.assetId=asset.id;}renderAll();changed();}}
 const action=b.dataset.action;closePopup();
 if(action==='empty'||action==='demo')confirmReplace(action);
 if(action==='import')$('#project-file').click();if(action==='download')download();
 if(action==='rename'){modal('Название проекта',`<label class="modal-field">Название<input id="rename-input" value="${esc(project.name)}" maxlength="120"/></label><div class="modal-actions"><button id="rename-save" class="primary-button">Сохранить</button></div>`);$('#rename-save').onclick=()=>{const name=$('#rename-input').value.trim();if(name&&markHistory()){project.name=name;changed();closeModal();}};$('#rename-input').focus();$('#rename-input').select();}
};
document.addEventListener('click',e=>{if(!e.target.closest('#popover'))closePopup();});
$('#object-list').onclick=e=>{
 const toggle=e.target.closest('[data-toggle]');if(toggle){if(markHistory()){const o=project.objects.find(o=>o.id===toggle.dataset.toggle);o.active=!o.active;renderAll();changed();}return;}
 const row=e.target.closest('[data-id]');if(row){selected=row.dataset.id;renderHierarchy();renderInspector();viewport.set(project,selected);}
};
$('#object-list').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.target.closest('[data-id]')?.click();}};
$('#search').oninput=e=>{search=e.target.value;renderHierarchy();};
$('#inspector-content').onchange=e=>{
 if(playing)return;const input=e.target;if(input.id==='object-name'){if(markHistory()){currentObject().name=input.value.trim()||'Объект';renderHierarchy();changed();}return;}
 const path=input.dataset.path;if(!path)return;
 let value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
 if(input.type==='number'){
  if(!Number.isFinite(value)||input.value===''){renderInspector();return;}
  if(input.min!=='')value=Math.max(Number(input.min),value);if(input.max!=='')value=Math.min(Number(input.max),value);
  if(path==='transform.scaleX'||path==='transform.scaleY'){if(Math.abs(value)<.01)value=.01;}
 }
 if(!markHistory())return;
 let object=path.startsWith('scene.')?project:currentObject();const parts=path.split('.');for(const part of parts.slice(0,-1))object=object[part];object[parts.at(-1)]=path==='sprite.assetId'&&!value?null:value;
 renderAll();changed();
};
$('#inspector-content').onclick=e=>{
 const remove=e.target.closest('[data-remove]');if(remove){e.preventDefault();if(markHistory()){currentObject()[remove.dataset.remove]=null;renderAll();changed();}return;}
 if(e.target.closest('#duplicate'))duplicate();if(e.target.closest('#delete-object'))deleteObject();if(e.target.closest('#edit-script'))openScript(currentObject().script.assetId);
 const add=e.target.closest('#add-component');if(add){e.stopPropagation();const o=currentObject(),names={sprite:'Sprite Renderer',rigidbody:'Rigidbody 2D',collider:'Collider 2D',script:'Script',camera:'Camera 2D'};popup(add,`<span class="popover-label">КОМПОНЕНТЫ</span>${Object.entries(names).filter(([k])=>!o[k]).map(([k,v])=>`<button data-component="${k}">${icon(k==='script'?'code':'plus')}<span>${v}</span></button>`).join('')||'<p class="popover-empty">Все компоненты уже добавлены.</p>'}`);}
};
$('#bottom-content').onclick=e=>{
 const filter=e.target.closest('[data-filter]');if(filter){assetFilter=filter.dataset.filter;renderBottom();return;}
 const add=e.target.closest('[data-add]');if(add){addObject(add.dataset.add);return;}
 const asset=e.target.closest('[data-asset]');if(asset){const a=project.assets.find(a=>a.id===asset.dataset.asset);if(a.type==='script')openScript(a.id);else if(!playing){addObject('sprite');currentObject().sprite.assetId=a.id;currentObject().name=a.name.replace(/\.[^.]+$/,'');renderAll();changed();}return;}
 const lesson=e.target.closest('[data-lesson]');if(lesson)showLesson(Number(lesson.dataset.lesson));
 if(e.target.closest('#clear-console')){logs.length=0;$('#log-count').textContent=0;$('#error-dot').hidden=true;renderBottom();}
 if(e.target.closest('#upload-image'))$('#image-file').click();
 if(e.target.closest('#new-script')){
  modal('Новый скрипт',`<label class="modal-field">Имя файла<input id="new-script-name" value="Behaviour.js" maxlength="80"/></label><p class="muted">Затем добавьте компонент Script к нужному объекту.</p><div class="modal-actions"><button id="create-script" class="primary-button">Создать скрипт</button></div>`);
  $('#create-script').onclick=()=>{let name=$('#new-script-name').value.trim();if(!/^[A-Za-z_$][\w$.-]*(\.js)?$/.test(name)){toast('Используйте латинские буквы, цифры, _ и точку.');return;}if(!name.endsWith('.js'))name+='.js';if(project.assets.some(a=>a.name===name)){toast('Файл с таким именем уже есть.');return;}if(markHistory()){const a={id:uid(),type:'script',name,code:emptyCode};project.assets.push(a);closeModal();renderBottom();openScript(a.id);changed();}};
 }
};
$('#bottom-content').ondblclick=e=>{const card=e.target.closest('[data-kind]');if(card)addObject(card.dataset.kind);};
$('#bottom-content').onkeydown=e=>{if(e.key==='Enter'){const card=e.target.closest('[data-kind]');if(card)addObject(card.dataset.kind);}};
$('#bottom-content').ondragstart=e=>{const card=e.target.closest('[data-kind]');if(card&&!playing)e.dataTransfer.setData('application/kadr-object',card.dataset.kind);else e.preventDefault();};
document.querySelectorAll('[data-bottom]').forEach(b=>b.onclick=()=>{bottomTab=b.dataset.bottom;renderBottom();});
$('#tab-scene').onclick=()=>setTab('scene');$('#tab-code').onclick=()=>setTab('code');$('#script-select').onchange=e=>{activeScript=e.target.value;renderCode();};
$('#code-input').oninput=()=>{if(playing)return;const asset=project.assets.find(a=>a.id===activeScript);if(!asset)return;if(!codeEditing){history.push(project);codeEditing=true;}clearTimeout(codeGroupTimer);codeGroupTimer=setTimeout(()=>codeEditing=false,800);asset.code=$('#code-input').value;paintCode();changed();};
$('#code-input').onscroll=syncCodeScroll;$('#code-input').onclick=codeLocation;$('#code-input').onkeyup=codeLocation;
$('#code-input').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();if(playing)return;const t=e.target,start=t.selectionStart,end=t.selectionEnd;t.setRangeText('  ',start,end,'end');t.dispatchEvent(new Event('input'));}};
$('#project-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>18000000){toast('Проект слишком большой: максимум 18 МБ.');return;}try{const next=validateProject(JSON.parse(await file.text()));replaceProject(next);toast('Проект открыт.');}catch(error){toast(error.message);}};
$('#image-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||playing)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4*1024*1024){toast('Выберите PNG, JPEG или WebP до 4 МБ.');return;}
 const reader=new FileReader();reader.onload=()=>{if(!markHistory())return;project.assets.push({id:uid(),type:'image',name:file.name,data:reader.result});renderBottom();renderInspector();changed();toast('Изображение добавлено. Нажмите на него, чтобы создать спрайт.');};reader.readAsDataURL(file);
};
$('#play').onclick=play;$('#pause').onclick=()=>{paused=!paused;worker?.postMessage({type:'pause',paused});updateTransport();};$('#step').onclick=()=>worker?.postMessage({type:'step'});
$('#download').onclick=download;$('#undo').onclick=()=>undo();$('#redo').onclick=()=>undo(true);$('#scene-settings').onclick=()=>{selected=null;renderHierarchy();renderInspector();viewport.set(project,selected);};
$('#fit').onclick=()=>viewport.fit();$('#zoom').onclick=()=>viewport.fit();
for(const key of ['grid','snap','colliders'])$('#'+key).onclick=()=>{viewport[key]=!viewport[key];$('#'+key).classList.toggle('active',viewport[key]);$('#'+key).setAttribute('aria-pressed',viewport[key]);viewport.draw();};
$('#api-open').onclick=()=>modal('Справка по JavaScript',`<div class="api-document">${apiDoc}</div>`,true);$('#lessons-open').onclick=()=>showLesson();$('#lesson-card').onclick=()=>showLesson();
window.addEventListener('keydown',e=>{
 if(e.key==='F5'){e.preventDefault();play();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveLocal();toast('Сохранено в этом браузере. Для переноса скачайте проект.');return;}
 if(e.key==='Escape'){closePopup();closeModal();if(playing)stop();return;}
 const typing=e.target.closest('input,textarea,select,[contenteditable]');if(typing)return;
 if(playing){if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();keys.add(e.code);worker?.postMessage({type:'keys',keys:[...keys]});return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(true);}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();}
 if(e.key==='Delete')deleteObject();if(e.key.toLowerCase()==='f')viewport.fit();
});
window.addEventListener('keyup',e=>{keys.delete(e.code);worker?.postMessage({type:'keys',keys:[...keys]});});window.addEventListener('blur',()=>{keys.clear();worker?.postMessage({type:'keys',keys:[]});});document.addEventListener('visibilitychange',()=>{keys.clear();lastHeartbeat=performance.now();worker?.postMessage({type:'keys',keys:[]});});
window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);saveLocal();});
renderAll();viewport.resize();if(loadError)toast(loadError);

// Useful for classroom debugging and integration tests, never required by scripts.
window.nisGameCenter=window.kadr={get project(){return clone(project);},get playing(){return playing;},get frame(){return viewport.runtime;},get logs(){return clone(logs);}};
