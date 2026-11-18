// Transient visual effects never modify saved objects or physics.
export class GameEffects {
  constructor(){this.particles=[];this.shake={strength:0,remaining:0,duration:1};this.calls=0;}
  burst(x,y,color='#c5ed8a',count=12){
    if(![x,y,count].every(Number.isFinite)||!/^#[\da-f]{6}$/i.test(color))throw new Error('Effects.burst: координаты, цвет #RRGGBB и число частиц');
    if(this.calls++>=8)return;
    const total=Math.max(0,Math.min(32,Math.trunc(count),256-this.particles.length));
    for(let n=0;n<total;n++){const angle=n*2.39996+this.calls,speed=30+(n%5)*15;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,life:.6,maxLife:.6,color});}
  }
  cameraShake(strength=4,duration=.2){
    if(![strength,duration].every(Number.isFinite))throw new Error('Effects.shake: ожидаются числа');
    const time=Math.min(1,Math.max(0,duration));this.shake={strength:Math.min(16,Math.max(0,strength)),duration:time||1,remaining:time};
  }
  step(dt){this.calls=0;this.shake.remaining=Math.max(0,this.shake.remaining-dt);for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;}this.particles=this.particles.filter(p=>p.life>0);}
  snapshot(){return {particles:this.particles.map(p=>({x:p.x,y:p.y,alpha:p.life/p.maxLife,color:p.color})),shake:this.shake.strength*this.shake.remaining/this.shake.duration};}
}
