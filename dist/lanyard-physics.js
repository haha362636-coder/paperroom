// Position-based rope with a weighted badge, fixed time steps and a hard
// length limit. No renderer dependency, so release and stability are testable.
export function createLanyard(){const nodes=Array.from({length:12},(_,i)=>({x:0,y:2.1-i*.13,z:0,px:0,py:2.1-i*.13,pz:0}));return {nodes,length:.13,anchor:{x:0,y:2.1,z:0},impact:0};}
export function stepLanyard(system,dt,target=null,options={}){
 const {nodes,anchor}=system;dt=Math.min(dt,1/60);system.impact=0;
 const desiredLength=options.stretch&&target?Math.max(.13,Math.min(.5,Math.hypot(target.x-anchor.x,target.y-anchor.y,target.z-anchor.z)/(nodes.length-1))):.13;
 system.length+=(desiredLength-system.length)*(1-Math.exp(-dt*(target?12:3)));
 const length=system.length,wind=options.wind??0;
 for(let i=1;i<nodes.length;i++){const p=nodes[i],x=p.x,y=p.y,z=p.z;p.x+=(p.x-p.px)*.988+wind*dt*dt*(.4+i/nodes.length);p.y+=(p.y-p.py)*.988-14*dt*dt;p.z+=(p.z-p.pz)*.976-2.2*dt*dt;p.px=x;p.py=y;p.pz=z;}
 const last=nodes.at(-1);let aim;
 if(target){const dx=target.x-anchor.x,dy=target.y-anchor.y,dz=target.z-anchor.z,d=Math.hypot(dx,dy,dz),max=length*(nodes.length-1)*.995,k=Math.min(1,max/(d||1));aim={x:anchor.x+dx*k,y:anchor.y+dy*k,z:anchor.z+dz*k};}
 for(let pass=0;pass<18;pass++){
  Object.assign(nodes[0],anchor);if(aim)Object.assign(last,aim);
  for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1;const wa=i===1?0:1,wb=(aim&&i===nodes.length-1)?0:(i===nodes.length-1?.25:1),total=wa+wb;if(!total)continue;const correction=(d-length)/d;a.x+=dx*correction*wa/total;a.y+=dy*correction*wa/total;a.z+=dz*correction*wa/total;b.x-=dx*correction*wb/total;b.y-=dy*correction*wb/total;b.z-=dz*correction*wb/total;}
 }
 Object.assign(nodes[0],anchor);if(aim)Object.assign(last,aim);
 for(let i=1;i<nodes.length;i++){const p=nodes[i];if(p.z<-.08){const speed=(p.pz-p.z)/dt;if(i===nodes.length-1)system.impact=Math.max(0,speed);p.z=-.08;p.pz=p.z-(Math.abs(p.z-p.pz)*.15);}}
 return system;
}
