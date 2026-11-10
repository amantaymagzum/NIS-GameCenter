// Small educational discrete rigid-body solver. Units: px, seconds, kilograms.
// Convex rotated boxes and circles; no joints, continuous collision detection or torque solver.
const EPS=1e-7;
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const norm=a=>{const l=Math.hypot(a.x,a.y);return l>EPS?{x:a.x/l,y:a.y/l}:{x:1,y:0};};
export function bodyFromObject(o) {
  const c=o.collider;if(!c)return null;
  const t=o.transform,r=o.rigidbody;
  const angle=t.rotation*Math.PI/180;
  const ox=c.offsetX*t.scaleX,oy=c.offsetY*t.scaleY;
  return {id:o.id,x:t.x+ox*Math.cos(angle)-oy*Math.sin(angle),y:t.y+ox*Math.sin(angle)+oy*Math.cos(angle),angle,
    vx:0,vy:0,angularVelocity:0,fx:0,fy:0,width:Math.abs(c.width*t.scaleX),height:Math.abs(c.height*t.scaleY),radius:c.radius*Math.max(Math.abs(t.scaleX),Math.abs(t.scaleY)),
    shape:c.type,trigger:!!c.isTrigger,static:!r||r.type==='static',mass:r?.mass||1,gravityScale:r?.gravityScale??1,restitution:r?.restitution??0,friction:r?.friction??0.2,freezeRotation:r?.freezeRotation??true,grounded:false,
    offsetX:ox,offsetY:oy};
}
export function position(b) {return {x:b.x-b.offsetX*Math.cos(b.angle)+b.offsetY*Math.sin(b.angle),y:b.y-b.offsetX*Math.sin(b.angle)-b.offsetY*Math.cos(b.angle)};}
function vertices(b) {
  const c=Math.cos(b.angle),s=Math.sin(b.angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:b.x+x*b.width/2*c-y*b.height/2*s,y:b.y+x*b.width/2*s+y*b.height/2*c}));
}
function project(b,axis,verts) {
  if(b.shape==='circle'){const center=b.x*axis.x+b.y*axis.y;return [center-b.radius,center+b.radius];}
  const values=verts.map(v=>dot(v,axis));return [Math.min(...values),Math.max(...values)];
}
export function collision(a,b) {
  if(a.shape==='circle'&&b.shape==='circle'){
    const delta=sub(b,a),distance=Math.hypot(delta.x,delta.y),depth=a.radius+b.radius-distance;
    return depth>=-EPS?{normal:norm(delta),depth:Math.max(0,depth)}:null;
  }
  // Broad phase; box radius bounds every rotation.
  const ra=a.shape==='circle'?a.radius:Math.hypot(a.width,a.height)/2;
  const rb=b.shape==='circle'?b.radius:Math.hypot(b.width,b.height)/2;
  if(Math.abs(a.x-b.x)>ra+rb||Math.abs(a.y-b.y)>ra+rb)return null;
  const av=a.shape==='box'?vertices(a):[],bv=b.shape==='box'?vertices(b):[];
  const axes=[];
  for(const body of [a,b])if(body.shape==='box')axes.push({x:Math.cos(body.angle),y:Math.sin(body.angle)},{x:-Math.sin(body.angle),y:Math.cos(body.angle)});
  if(a.shape==='circle'||b.shape==='circle'){
    const circle=a.shape==='circle'?a:b,verts=a.shape==='box'?av:bv;
    const closest=verts.reduce((best,v)=>Math.hypot(v.x-circle.x,v.y-circle.y)<Math.hypot(best.x-circle.x,best.y-circle.y)?v:best,verts[0]);
    axes.push(norm(sub(closest,circle)));
  }
  let depth=Infinity,normal=null;
  for(const axis of axes){
    const ap=project(a,axis,av),bp=project(b,axis,bv);
    if(ap[1]<bp[0]-EPS||bp[1]<ap[0]-EPS)return null;
    const overlap=Math.min(ap[1]-bp[0],bp[1]-ap[0]);
    if(overlap<depth){depth=overlap;normal=axis;}
  }
  if(dot(sub(b,a),normal)<0)normal={x:-normal.x,y:-normal.y};
  return {normal,depth:Math.max(0,depth)};
}
function resolve(a,b,hit) {
  const ia=a.static?0:1/a.mass,ib=b.static?0:1/b.mass,total=ia+ib;
  if(!total)return;
  const n=hit.normal;
  if(n.y>0.55&&!a.static)a.grounded=true;
  if(n.y<-.55&&!b.static)b.grounded=true;
  const correction=Math.max(hit.depth-.01,0)*.85/total;
  a.x-=n.x*correction*ia;a.y-=n.y*correction*ia;b.x+=n.x*correction*ib;b.y+=n.y*correction*ib;
  const rv={x:b.vx-a.vx,y:b.vy-a.vy},along=dot(rv,n);
  if(along>=0)return;
  const impulse=-(1+Math.max(a.restitution,b.restitution))*along/total;
  a.vx-=impulse*n.x*ia;a.vy-=impulse*n.y*ia;b.vx+=impulse*n.x*ib;b.vy+=impulse*n.y*ib;
  const tangent={x:-n.y,y:n.x};
  const friction=Math.sqrt(a.friction*b.friction),jt=Math.max(-impulse*friction,Math.min(impulse*friction,-dot(rv,tangent)/total));
  a.vx-=jt*tangent.x*ia;a.vy-=jt*tangent.y*ia;b.vx+=jt*tangent.x*ib;b.vy+=jt*tangent.y*ib;
}
export class PhysicsWorld {
  constructor(gravity=1100){this.gravity=gravity;this.bodies=new Map();}
  add(object){const b=bodyFromObject(object);if(b)this.bodies.set(object.id,b);return b;}
  remove(id){this.bodies.delete(id);}
  step(dt=1/60){
    const bodies=[...this.bodies.values()],pairs=new Map();
    for(const b of bodies)b.grounded=false;
    // Substeps reduce tunnelling at typical classroom-game speeds.
    const h=dt/3;
    for(let step=0;step<3;step++){
      for(const b of bodies)if(!b.static){
        b.vx+=b.fx/b.mass*h;b.vy+=(this.gravity*b.gravityScale+b.fy/b.mass)*h;
        b.x+=b.vx*h;b.y+=b.vy*h;
        if(!b.freezeRotation)b.angle+=b.angularVelocity*h;
      }
      for(let iteration=0;iteration<5;iteration++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
        const a=bodies[i],b=bodies[j];if(a.static&&b.static&&!a.trigger&&!b.trigger)continue;
        const hit=collision(a,b);if(!hit)continue;
        pairs.set([a.id,b.id].sort().join('|'),{a:a.id,b:b.id,trigger:a.trigger||b.trigger,normal:hit.normal});
        if(!a.trigger&&!b.trigger)resolve(a,b,hit);
      }
    }
    for(const b of bodies){b.fx=0;b.fy=0;}
    return pairs;
  }
}
