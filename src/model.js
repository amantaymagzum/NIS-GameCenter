import {LESSON_COUNT} from './course.js';
export const VERSION = 1;
export const STORAGE_KEY = 'kadr-project-v1';
export const clone = value => structuredClone(value);
export const uid = () => globalThis.crypto?.randomUUID?.() || `obj-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const playerCode = `// Управление персонажем. Скорость — в пикселях в секунду.
export default class Player extends Script {
  start() {
    this.body = this.getComponent("Rigidbody2D");
    Debug.log("Привет! Стрелки или A/D — движение, пробел — прыжок.");
  }

  update(dt) {
    const direction = Input.getAxis("Horizontal");
    this.body.velocity.x = direction * 230;

    if (Input.getKeyDown("Space") && this.body.isGrounded) {
      this.body.velocity.y = -480;
    }

    // Если упали за край — возвращаемся к началу.
    if (this.transform.y > 750) {
      this.transform.x = 120;
      this.transform.y = 440;
      this.body.velocity.y = 0;
    }
  }

  onTriggerEnter(other) {
    if (other.tag === "Coin") {
      other.destroy();
      Scene.score += 1;
      Debug.log("Монетка собрана! Счёт: " + Scene.score);
    }
    if (other.tag === "Finish") {
      if (Scene.score >= 3) Scene.win("Уровень пройден!");
      else Debug.log("Сначала собери все 3 монетки!");
    }
  }
}`;

export const emptyCode = `export default class Behaviour extends Script {
  start() {
    // Выполняется один раз при запуске игры.
  }

  update(dt) {
    // dt — время между кадрами в секундах.
  }
}`;

export function makeObject(kind = 'crate', x = 480, y = 270) {
  const sizes = {player:[30,42],platform:[180,24],coin:[22,22],flag:[36,64],crate:[48,48],circle:[48,48],sprite:[64,64]};
  const colors = {player:'#f6a664',platform:'#9ccf91',coin:'#c1a2ff',flag:'#c5ed8a',crate:'#d1a278',circle:'#85c9d8',sprite:'#b8b0fa'};
  const names = {player:'Игрок',platform:'Платформа',coin:'Монетка',flag:'Финиш',crate:'Ящик',circle:'Мяч',sprite:'Спрайт',camera:'Камера'};
  const [width,height] = sizes[kind] || [48,48];
  const object = { id:uid(),name:names[kind] || 'Объект',tag:kind==='player'?'Player':kind==='coin'?'Coin':kind==='flag'?'Finish':'Untagged',active:true,
    transform:{x,y,rotation:0,scaleX:1,scaleY:1},
    sprite:{kind,color:colors[kind]||'#c5ed8a',width,height,layer:kind==='platform'?0:2,visible:true,assetId:null},
    rigidbody:null,collider:null,script:null,camera:null };
  if (['player','crate','circle'].includes(kind)) object.rigidbody = componentDefaults('rigidbody');
  if (kind!=='sprite' && kind!=='camera') object.collider={...componentDefaults('collider'),type:kind==='coin'||kind==='circle'?'circle':'box',width:kind==='player'?26:width,height:kind==='player'?40:height,radius:width/2,isTrigger:kind==='coin'||kind==='flag'};
  if (kind==='player') object.script={assetId:'script-player',enabled:true};
  if (kind==='circle') {object.rigidbody.freezeRotation=false;object.rigidbody.restitution=0.65;}
  if (kind==='camera') {object.sprite=null; object.camera=componentDefaults('camera');}
  return object;
}

export function componentDefaults(type) {
  return clone({
    sprite:{kind:'sprite',color:'#b8b0fa',width:64,height:64,layer:1,visible:true,assetId:null},
    rigidbody:{type:'dynamic',mass:1,gravityScale:1,freezeRotation:true,restitution:0,friction:0.2},
    collider:{type:'box',width:48,height:48,radius:24,offsetX:0,offsetY:0,isTrigger:false},
    script:{assetId:'script-player',enabled:true},
    camera:{zoom:1,background:'#20292d',followTarget:''}
  }[type]);
}

export function createDemo() {
  const player=makeObject('player',120,440); player.id='player';
  const ground=makeObject('platform',480,510); ground.name='Земля';ground.sprite.width=1040;ground.sprite.height=56;ground.collider.width=1040;ground.collider.height=56;
  const platforms=[[290,425,160],[490,350,160],[730,275,200]].map(([x,y,w],i)=>{const o=makeObject('platform',x,y);o.name=`Платформа ${i+1}`;o.sprite.width=w;o.collider.width=w;return o;});
  const coins=[[290,380],[490,305],[710,230]].map(([x,y],i)=>{const o=makeObject('coin',x,y);o.name=`Монетка ${i+1}`;return o;});
  const flag=makeObject('flag',800,231);
  const camera=makeObject('camera',480,270);camera.id='camera';
  return {version:VERSION,name:'Остров первых шагов',scene:{name:'Уровень 01',width:960,height:540,gravity:1100,background:'#20292d'},objects:[player,ground,...platforms,...coins,flag,camera],assets:[{id:'script-player',type:'script',name:'Player.js',code:playerCode}],lesson:0};
}

export function createEmpty() {
  const p=createDemo();p.name='Новая игра';p.objects=[makeObject('camera',480,270)];p.assets=[{id:'script-player',type:'script',name:'Player.js',code:emptyCode}];return p;
}

const finite=(x,min=-100000,max=100000)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
export function validateProject(value) {
  const fail = message => {throw new Error(message);};
  if (!value||value.version!==VERSION||!value.scene||!Array.isArray(value.objects)||!Array.isArray(value.assets)) fail('Неизвестный формат. Откройте JSON-проект NIS-GameCenter версии 1.');
  if (typeof value.name!=='string'||value.name.length>200||value.objects.length>300||value.assets.length>100) fail('Слишком большой проект: максимум 300 объектов и 100 ресурсов.');
  if(value.lesson!==undefined&&(!Number.isInteger(value.lesson)||value.lesson<0||value.lesson>=LESSON_COUNT))fail('Некорректный номер урока.');
  if(value.completedLessons!==undefined&&(!Array.isArray(value.completedLessons)||!value.completedLessons.every(n=>Number.isInteger(n)&&n>=0&&n<LESSON_COUNT)))fail('Некорректный список пройденных уроков.');
  if (!finite(value.scene.width,100,4096)||!finite(value.scene.height,100,4096)||!finite(value.scene.gravity,-10000,10000)||!/^#[\da-f]{6}$/i.test(value.scene.background)) fail('Некорректные настройки сцены.');
  const ids=new Set();
  for (const o of value.objects) {
    if (!o||typeof o.id!=='string'||!o.id||o.id.length>128||o.id.includes('|')||ids.has(o.id)||typeof o.name!=='string'||typeof o.tag!=='string'||typeof o.active!=='boolean') fail('Некорректный объект или повторяющийся ID.');
    ids.add(o.id);
    if (!o.transform||!['x','y','rotation','scaleX','scaleY'].every(k=>finite(o.transform[k]))) fail(`Некорректный Transform: ${o.name}`);
    if (Math.abs(o.transform.scaleX)<0.01||Math.abs(o.transform.scaleY)<0.01) fail('Масштаб не может быть нулевым.');
    if(o.sprite && (!['player','platform','coin','flag','crate','circle','sprite'].includes(o.sprite.kind)||!finite(o.sprite.width,1,4096)||!finite(o.sprite.height,1,4096)||!finite(o.sprite.layer,-1000,1000)||!/^#[\da-f]{6}$/i.test(o.sprite.color))) fail('Некорректный SpriteRenderer.');
    if(o.rigidbody && (!['dynamic','static'].includes(o.rigidbody.type)||!finite(o.rigidbody.mass,0.01,10000)||!finite(o.rigidbody.gravityScale,-100,100)||!finite(o.rigidbody.restitution,0,1)||!finite(o.rigidbody.friction,0,1))) fail('Некорректный Rigidbody2D.');
    if(o.collider && (!['box','circle'].includes(o.collider.type)||!finite(o.collider.width,1,4096)||!finite(o.collider.height,1,4096)||!finite(o.collider.radius,1,2048)||!finite(o.collider.offsetX)||!finite(o.collider.offsetY))) fail('Некорректный Collider2D.');
    if(o.script && (typeof o.script.assetId!=='string'||typeof o.script.enabled!=='boolean')) fail('Некорректный Script.');
    if(o.camera && (!finite(o.camera.zoom,0.1,5)||typeof o.camera.followTarget!=='string'||!/^#[\da-f]{6}$/i.test(o.camera.background))) fail('Некорректная Camera2D.');
  }
  const assetIds=new Set();
  for(const a of value.assets) {
    if(!a||typeof a.id!=='string'||assetIds.has(a.id)||typeof a.name!=='string'||!['script','image'].includes(a.type)) fail('Некорректный ресурс.');
    assetIds.add(a.id);
    if(a.type==='script'&&(typeof a.code!=='string'||a.code.length>100000)) fail('Скрипт слишком большой или повреждён.');
    if(a.type==='image'&&(typeof a.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(a.data)||a.data.length>6000000)) fail('Допустимы изображения PNG, JPEG и WebP до 4 МБ.');
  }
  for(const o of value.objects) {
    if(o.script && !value.assets.some(a=>a.type==='script'&&a.id===o.script.assetId)) fail(`Не найден скрипт: ${o.name}`);
    if(o.sprite?.assetId && !value.assets.some(a=>a.type==='image'&&a.id===o.sprite.assetId)) fail(`Не найдено изображение: ${o.name}`);
  }
  return clone(value);
}

export class History {
  constructor(){this.past=[];this.future=[];}
  push(project){this.past.push(clone(project));if(this.past.length>60)this.past.shift();this.future=[];}
  undo(project){if(!this.past.length)return project;this.future.push(clone(project));return this.past.pop();}
  redo(project){if(!this.future.length)return project;this.past.push(clone(project));return this.future.pop();}
  clear(){this.past=[];this.future=[];}
}
