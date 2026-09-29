import * as THREE from './vendor/three.module.js';

// Compact Cassette, modelled in millimetres (IEC 60094: 100.4 × 63.8 × 12 mm)
// and scaled into board units so a tape sits a little narrower than a note.
export const CASSETTE_WIDTH=1.3;
const S=CASSETTE_WIDTH/100.4,W=100.4,H=63.8,D=12;
export const PACK_MAX=24.2;const HUB_X=21.25,HUB_Y=5.5,HUB_R=10.8,TAPE_SPEED=47.6; // mm/s, standard 4.76 cm/s
const WIN={x0:-31,x1:31,y0:-3.5,y1:14.5,r:3.2},LABEL={x0:-42.5,x1:42.5,y0:-9,y1:28.6},PX=12;
export const SHELLS={ivory:'#e7e0cf',smoke:'#2b2c31',mint:'#a9cdbb',coral:'#e08a74',cobalt:'#3b5aa8'};
const BANDS={ivory:'#c2553f',smoke:'#d9a441',mint:'#2f6f5e',coral:'#2d3c63',cobalt:'#e9c46a'};
export const HAND_FONT='"Kaiti SC","STKaiti","KaiTi","Bradley Hand","Marker Felt",cursive';

/** Tape pack radii (mm) for playback progress 0–1; wound area is conserved. */
export function reelRadii(progress){
 const p=Math.min(1,Math.max(0,progress||0)),a=PACK_MAX**2-HUB_R**2;
 return [Math.sqrt(HUB_R**2+(1-p)*a),Math.sqrt(HUB_R**2+p*a)];
}
/** Reel angular velocity (rad/s) at constant linear tape speed. */
export const reelSpeed=radius=>TAPE_SPEED/radius;
export function formatDuration(seconds){const s=Math.max(0,Math.round(seconds||0));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

function roundedRect(path,x0,y0,x1,y1,r){path.moveTo(x0+r,y0);path.lineTo(x1-r,y0);path.quadraticCurveTo(x1,y0,x1,y0+r);path.lineTo(x1,y1-r);path.quadraticCurveTo(x1,y1,x1-r,y1);path.lineTo(x0+r,y1);path.quadraticCurveTo(x0,y1,x0,y1-r);path.lineTo(x0,y0+r);path.quadraticCurveTo(x0,y0,x0+r,y0);return path;}
function canvasTexture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}

let shared;
function parts(){
 if(shared)return shared;
 // Each shell half is bevelled, so the two halves meet in a real parting groove.
 const outline=roundedRect(new THREE.Shape(),-W/2,-H/2,W/2,H/2,3.4);
 outline.holes.push(roundedRect(new THREE.Path(),WIN.x0,WIN.y0,WIN.x1,WIN.y1,WIN.r));
 const half=new THREE.ExtrudeGeometry(outline,{depth:D/2-1.1,bevelEnabled:true,bevelThickness:.55,bevelSize:.55,bevelSegments:3,curveSegments:10});half.translate(0,0,.55);
 // Raised head-access trapezoid along the lower edge.
 const trap=new THREE.Shape();trap.moveTo(-36.5,-H/2+.4);trap.lineTo(36.5,-H/2+.4);trap.lineTo(29.5,-19.2);trap.lineTo(-29.5,-19.2);trap.closePath();
 for(const x of [-17,17])trap.holes.push(new THREE.Path().absarc(x,-25.6,2.25,0,Math.PI*2,true));
 trap.holes.push(roundedRect(new THREE.Path(),-5.5,-29.8,5.5,-23.6,1.2));
 const trapGeo=new THREE.ExtrudeGeometry(trap,{depth:.7,bevelEnabled:true,bevelThickness:.35,bevelSize:.35,bevelSegments:2});trapGeo.translate(0,0,D/2);
 // Reel hub: white ring with six drive teeth, sized to take the tape pack.
 const hub=new THREE.Shape().absarc(0,0,HUB_R-.15,0,Math.PI*2,false),bore=new THREE.Path();
 for(let i=0;i<=240;i++){const a=i/240*Math.PI*2,r=((a+Math.PI/12)%(Math.PI/3))<Math.PI/7.5?3.35:5.1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?bore.lineTo(x,y):bore.moveTo(x,y);}
 hub.holes.push(bore);
 const hubGeo=new THREE.ExtrudeGeometry(hub,{depth:4.1,bevelEnabled:true,bevelThickness:.25,bevelSize:.2,bevelSegments:2,curveSegments:40});hubGeo.translate(0,0,-2.05);
 const pack=new THREE.CylinderGeometry(1,1,3.81,72,1);pack.rotateX(Math.PI/2);
 // Concentric winding lines on the pack face.
 const rings=document.createElement('canvas');rings.width=rings.height=512;const rc=rings.getContext('2d');rc.fillStyle='#3a271c';rc.fillRect(0,0,512,512);
 for(let r=4;r<256;r+=1.6){rc.strokeStyle=`rgba(${Math.random()<.5?'20,10,6':'120,82,58'},${.12+Math.random()*.18})`;rc.lineWidth=.9;rc.beginPath();rc.arc(256,256,r,0,Math.PI*2);rc.stroke();}
 const packMats=[new THREE.MeshStandardMaterial({color:'#2c1d15',roughness:.5,metalness:.1}),new THREE.MeshPhysicalMaterial({map:canvasTexture(rings),roughness:.3,metalness:.18,clearcoat:.4,clearcoatRoughness:.3})];
 const glass=document.createElement('canvas');glass.width=744;glass.height=216;const gc=glass.getContext('2d');gc.fillStyle='rgba(255,255,255,.05)';gc.fillRect(0,0,744,216);
 gc.strokeStyle='rgba(255,255,255,.62)';gc.fillStyle='rgba(255,255,255,.62)';gc.lineWidth=2;gc.font='600 15px ui-monospace,Menlo,monospace';gc.textAlign='center';
 for(let i=0;i<=12;i++){const x=252+i*20;gc.beginPath();gc.moveTo(x,i%3?196:188);gc.lineTo(x,206);gc.stroke();if(i%3===0)gc.fillText(String(i*5),x,182);}
 shared={
  half,trapGeo,hubGeo,pack,packMats,
  hubMat:new THREE.MeshPhysicalMaterial({color:'#f1eee6',roughness:.42,clearcoat:.3}),
  toothMark:new THREE.BoxGeometry(2.1,1.1,.3),markMat:new THREE.MeshStandardMaterial({color:'#9a958b',roughness:.6}),
  pane:new THREE.PlaneGeometry(WIN.x1-WIN.x0-.8,WIN.y1-WIN.y0-.8),
  frontGlass:new THREE.MeshPhysicalMaterial({map:canvasTexture(glass),transparent:true,depthWrite:false,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.4,side:THREE.DoubleSide}),
  backGlass:new THREE.MeshPhysicalMaterial({color:'#ffffff',transparent:true,opacity:.08,depthWrite:false,roughness:.06,clearcoat:1}),
  sheet:new THREE.MeshStandardMaterial({color:'#d6d2c8',roughness:.55}),
  label:new THREE.PlaneGeometry(LABEL.x1-LABEL.x0,LABEL.y1-LABEL.y0),
  screw:new THREE.CylinderGeometry(2.05,2.15,.7,28).rotateX(Math.PI/2),screwMat:new THREE.MeshStandardMaterial({color:'#b9bbc0',roughness:.28,metalness:.95}),
  slot:new THREE.BoxGeometry(2.8,.42,.35),slotMat:new THREE.MeshStandardMaterial({color:'#1b1c20',roughness:.8}),
  hole:new THREE.CylinderGeometry(2.25,2.25,.4,24).rotateX(Math.PI/2),holeMat:new THREE.MeshStandardMaterial({color:'#050506',roughness:1}),
  tab:new THREE.BoxGeometry(6.4,1.4,3.2),strip:new THREE.BoxGeometry(52,.35,3.81),
 };
 return shared;
}

function drawLabel(canvas,tape){
 const w=canvas.width,h=canvas.height,c=canvas.getContext('2d'),band=BANDS[tape.shell]??BANDS.ivory,X=x=>(x-LABEL.x0)*PX,Y=y=>(LABEL.y1-y)*PX;
 c.clearRect(0,0,w,h);c.fillStyle='#f4efe2';c.beginPath();c.roundRect(0,0,w,h,26);c.fill();
 // Paper tooth: faint fibres so the label does not read as flat plastic.
 let seed=[...tape.id].reduce((a,ch)=>a*31+ch.charCodeAt(0)>>>0,7);const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 for(let i=0;i<900;i++){c.fillStyle=`rgba(90,70,40,${rnd()*.05})`;c.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1);}
 c.fillStyle=band;c.fillRect(0,Y(-3.5)+10,w,h-Y(-3.5)-10);c.fillRect(0,Y(26.2),w,10);
 c.strokeStyle='rgba(40,40,48,.28)';c.lineWidth=2;for(const y of [21.5,17.2]){c.beginPath();c.moveTo(X(-33),Y(y));c.lineTo(X(40.5),Y(y));c.stroke();}
 c.fillStyle='#1f2025';c.strokeStyle='#1f2025';c.lineWidth=4;c.beginPath();c.arc(X(-38.2),Y(19.5),28,0,Math.PI*2);c.stroke();
 c.font='700 42px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText('A',X(-38.2),Y(19.5)+2);
 const title=tape.title||'未命名录音';let size=74;c.font=`${size}px ${HAND_FONT}`;while(size>34&&c.measureText(title).width>X(40)-X(-32)){size-=4;c.font=`${size}px ${HAND_FONT}`;}
 c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#1d3f86';c.save();c.translate(X(-32),Y(18.3));c.rotate(-.012);c.fillText(title,0,0);c.restore();
 c.font='600 25px ui-monospace,Menlo,monospace';c.fillStyle='#55565e';c.textAlign='right';c.fillText(formatDuration(tape.duration),X(41),Y(13.5)-8);
 const date=new Date(tape.createdAt||Date.now());c.textAlign='left';c.fillText(`${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`,X(-41),Y(13.5)-8);
 c.font='800 50px Georgia,serif';c.fillStyle='#2a2b31';c.textAlign='center';c.fillText('C'+Math.max(10,Math.ceil(tape.duration/300)*10),X(-36.75),Y(3));
 c.font='600 21px ui-monospace,Menlo,monospace';c.fillText('NORMAL',X(36.75),Y(6.6));c.fillText('TYPE I',X(36.75),Y(2.6));c.fillText('120μs EQ',X(36.75),Y(-1.4));
 c.fillStyle='#fff8ea';c.font='700 23px ui-monospace,Menlo,monospace';c.textAlign='center';c.fillText('PAPERROOM · AUDIO CASSETTE · SIDE A',w/2,Y(-6.6));
 // The clear window is cut out of the label.
 c.globalCompositeOperation='destination-out';c.beginPath();c.roundRect(X(WIN.x0),Y(WIN.y1),(WIN.x1-WIN.x0)*PX,(WIN.y1-WIN.y0)*PX,WIN.r*PX);c.fill();c.globalCompositeOperation='source-over';
}

export function createCassette(tape){
 const p=parts(),root=new THREE.Group(),body=new THREE.Group();body.scale.setScalar(S);root.add(body);root.name='Compact_cassette';
 const shellMat=new THREE.MeshPhysicalMaterial({color:SHELLS[tape.shell]??SHELLS.ivory,roughness:.38,clearcoat:.55,clearcoatRoughness:.28});
 const add=(geo,mat,x=0,y=0,z=0,shadow=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;body.add(m);return m;};
 add(p.half,shellMat);add(p.half,shellMat).rotation.y=Math.PI;add(p.trapGeo,shellMat);
 for(const x of [-17,17])add(p.hole,p.holeMat,x,-25.6,D/2+.25,false);
 add(p.strip,p.packMats[0],0,-H/2+.1,0,false);
 for(const x of [-38,38])add(p.tab,p.holeMat,x,H/2-.55,D/2-2.4,false);
 add(p.pane,p.sheet,0,(WIN.y0+WIN.y1)/2,-3.1,false);
 const packs=[],hubs=[];
 for(const side of [-1,1]){
  const pack=add(p.pack,[p.packMats[0],p.packMats[1],p.packMats[1]],side*HUB_X,HUB_Y,0);packs.push(pack);
  const hub=new THREE.Group();hub.position.set(side*HUB_X,HUB_Y,0);body.add(hub);
  const ring=new THREE.Mesh(p.hubGeo,p.hubMat);ring.castShadow=true;hub.add(ring);
  const mark=new THREE.Mesh(p.toothMark,p.markMat);mark.position.set(0,HUB_R-2.4,2.25);hub.add(mark);hubs.push(hub);
 }
 add(p.pane,p.backGlass,0,(WIN.y0+WIN.y1)/2,-D/2+.9,false);
 const front=add(p.pane,p.frontGlass,0,(WIN.y0+WIN.y1)/2,D/2+.05,false);front.renderOrder=2;
 const canvas=document.createElement('canvas');canvas.width=(LABEL.x1-LABEL.x0)*PX;canvas.height=(LABEL.y1-LABEL.y0)*PX;drawLabel(canvas,tape);
 const labelMat=new THREE.MeshStandardMaterial({map:canvasTexture(canvas),alphaTest:.5,roughness:.82});
 add(p.label,labelMat,0,(LABEL.y0+LABEL.y1)/2,D/2+.62,false);
 for(const [x,y] of [[-45.6,-27.4],[45.6,-27.4],[-45.6,27.6],[45.6,27.6],[0,-15.2]]){const z=x===0?D/2+.6:D/2+.4;add(p.screw,p.screwMat,x,y,z,false);const slot=add(p.slot,p.slotMat,x,y,z+.25,false);slot.rotation.z=(x*7+y*3)%3;const cross=add(p.slot,p.slotMat,x,y,z+.25,false);cross.rotation.z=slot.rotation.z+Math.PI/2;}
 root.userData.cassette={packs,hubs,canvas,labelMat,shellMat,progress:0};
 setCassetteProgress(root,tape.progress??0);
 return root;
}
export function setCassetteProgress(root,progress){const k=root.userData.cassette;if(!k)return;k.progress=progress;const radii=reelRadii(progress);k.packs.forEach((m,i)=>m.scale.set(radii[i],radii[i],1));}
/** Advance both reels by `seconds` of play time; negative values rewind. */
export function spinCassette(root,seconds){const k=root.userData.cassette;if(!k)return;const radii=reelRadii(k.progress);k.hubs.forEach((hub,i)=>{const a=reelSpeed(radii[i])*seconds;hub.rotation.z+=a;k.packs[i].rotation.z+=a;});}
export function relabelCassette(root,tape){const k=root.userData.cassette;if(!k)return;drawLabel(k.canvas,tape);k.labelMat.map.needsUpdate=true;k.shellMat.color.set(SHELLS[tape.shell]??SHELLS.ivory);}
export function disposeCassette(root){const k=root.userData.cassette;if(k){k.labelMat.map.dispose();k.labelMat.dispose();k.shellMat.dispose();}root.removeFromParent();}
