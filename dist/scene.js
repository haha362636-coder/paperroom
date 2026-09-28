import {createPaperGeometry} from './paper-surface.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './vendor/addons/lights/RectAreaLightUniformsLib.js';
import {createRenderPipeline} from './render-pipeline.js';
import {drawInkPortrait,portraitReady} from './portrait-asset.js';

const host = document.querySelector('#viewport');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36,1,.1,100);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch(e) { document.querySelector('#error').hidden=false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95;
host.appendChild(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer);const studio=new RoomEnvironment();const studioMap=pmrem.fromScene(studio,.035);scene.environment=studioMap.texture;scene.environmentIntensity=.65;studio.dispose();pmrem.dispose();
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=60;controls.maxPolarAngle=Math.PI*.57;controls.minPolarAngle=.4;controls.enablePan=true;controls.screenSpacePanning=true;controls.enableRotate=false;
const target=new THREE.Vector3(0,3.48,0); const destination=new THREE.Vector3(0,3.48,12.8); let transitioning=true;
camera.position.copy(destination); controls.target.copy(target);
scene.add(new THREE.HemisphereLight(0xffffff,0x171c28,.95));
const sun=new THREE.DirectionalLight(0xfff4e5,1.8);sun.position.set(-5,6,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:8,bottom:-6,near:.5,far:30});sun.shadow.normalBias=.015;sun.shadow.bias=-.0002;sun.shadow.radius=6;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d7ff,.9);fill.position.set(5,5,-4);scene.add(fill);
RectAreaLightUniformsLib.init();
const softbox=new THREE.RectAreaLight(0xffffff,3.2,4.5,2.8);softbox.position.set(-3.5,6.4,5.5);softbox.lookAt(0,3.4,0);scene.add(softbox);
const strip=new THREE.RectAreaLight(0xdbe5ff,2.5,.8,5);strip.position.set(4.5,3.8,3.5);strip.lookAt(0,3.4,0);scene.add(strip);
const model=new THREE.Group();model.name='Paperroom_Black_Leather_Model_v02';scene.add(model);
const material=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
// Fine pebble grain is a tileable surface bump, not a painted lighting effect.
const grainCanvas=document.createElement('canvas');grainCanvas.width=256;grainCanvas.height=256;
const grainCtx=grainCanvas.getContext('2d');let seed=73;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const pixels=grainCtx.createImageData(256,256);
const cells=Array.from({length:95},()=>[random()*256,random()*256]);
for(let y=0;y<256;y++)for(let x=0;x<256;x++){let a=1e9,b=1e9;for(const [cx,cy] of cells){const dx=Math.min(Math.abs(x-cx),256-Math.abs(x-cx)),dy=Math.min(Math.abs(y-cy),256-Math.abs(y-cy));const d=dx*dx+dy*dy;if(d<a){b=a;a=d;}else if(d<b)b=d;}const edge=Math.sqrt(b)-Math.sqrt(a);const v=Math.min(210,90+edge*17)+random()*14;const i=(y*256+x)*4;pixels.data.set([v,v,v,255],i);}grainCtx.putImageData(pixels,0,0);
const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(5,5);grain.anisotropy=renderer.capabilities.getMaxAnisotropy();
const leather=color=>new THREE.MeshPhysicalMaterial({color,roughness:.26,metalness:0,bumpMap:grain,bumpScale:.0007,clearcoat:.68,clearcoatRoughness:.23,ior:1.48});
const frameMat=leather('#050507'),metalMat=material('#9d9fa4',.18,.93),whiteMat=leather('#07080a'),darkMat=material('#101114',.7);
const pocketMat=leather('#040406'),threadMat=material('#73706b',.93);
function rounded(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
function slab(w,h,d,r,mat,x,y,z,parent=model){const geo=new THREE.ExtrudeGeometry(rounded(w,h,r),{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:16});geo.translate(0,0,-d/2);const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function rod(a,b,r,mat,parent=model){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,va.distanceTo(vb),24),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
slab(6.7,3.8,.25,.24,frameMat,0,3.48,0).name='Leather_bound_frame';
slab(6.43,3.53,.045,.13,whiteMat,0,3.48,.114).name='Smooth_black_leather_panel';
slab(6.41,3.5,.025,.12,leather('#08090c'),0,3.48,-.12);
for(const x of [-2.88,2.88]){rod([x,.18,0],[x,2.1,0],.075,metalMat);rod([x,.16,-.55],[x,.16,.66],.08,metalMat);for(const z of [-.53,.63])slab(.21,.13,.22,.06,darkMat,x,.08,z);slab(.17,.35,.17,.055,frameMat,x,1.69,0);}
slab(5.95,.075,.36,.03,frameMat,0,1.62,.2).name='Pen_tray';
rod([1.95,1.72,.27],[2.53,1.72,.27],.033,metalMat);rod([1.92,1.72,.27],[2.03,1.72,.27],.039,darkMat);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#000000',opacity:.4}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

function texture(draw,w=768,h=900,resolution=1){const c=document.createElement('canvas');c.width=w*resolution;c.height=h*resolution;const ctx=c.getContext('2d');ctx.scale(resolution,resolution);ctx.imageSmoothingQuality='high';draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;}
function text(ctx,str,x,y,size=40,color='#17181b',font='sans-serif'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.fillText(str,x,y);}
function line(ctx,pts,color='#17181b',width=5){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
const papers=[];
function paper(w,h,x,y,z,color,draw,angle=0,curl=.06,parent=model,stable=false){const tex=texture((ctx,cw,ch)=>{ctx.fillStyle=color;ctx.fillRect(0,0,cw,ch);draw?.(ctx,cw,ch);},768,900,2);const {geometry:geo,rest}=createPaperGeometry(w,h,curl,stable);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,roughness:.9,envMapIntensity:.08,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.z=angle;m.castShadow=true;m.receiveShadow=true;parent.add(m);if(!stable)papers.push({m,rest,h,curl,phase:papers.length*1.2});return m;}
function tape(x,y,z,angle=0){const t=slab(.51,.15,.007,.012,new THREE.MeshStandardMaterial({color:'#72747c',transparent:true,opacity:.78,roughness:1}),x,y,z);t.rotation.z=angle;}
function magnet(x,y,z,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.037,28),material(color,.3));m.rotation.x=Math.PI/2;m.position.set(x,y,z);model.add(m);m.castShadow=true;}

const folder=new THREE.Group();folder.position.set(-1.83,3.46,.22);folder.rotation.z=.055;folder.name='Stitched_leather_pocket';// Folder kept as a reusable model template.
slab(1.72,1.92,.027,.045,pocketMat,0,0,0,folder);slab(.7,.23,.027,.04,pocketMat,-.45,1,0,folder);
paper(1.5,1.74,0,.1,.042,'#f5f5f2',null,-.035,.025,folder);
paper(1.49,1.7,.06,.05,.083,'#ddddda',null,.035,.025,folder);
const cover=slab(1.75,1.47,.05,.095,pocketMat,0,-.21,.16,folder);cover.rotation.x=.055;cover.name='pocketCover';
const pipingPoints=rounded(1.68,1.4,.08).getPoints(60).map(p=>new THREE.Vector3(p.x,p.y-.21,.192));
const pipingCurve=new THREE.CatmullRomCurve3(pipingPoints,true);const piping=new THREE.Mesh(new THREE.TubeGeometry(pipingCurve,180,.012,6,true),leather('#101114'));piping.castShadow=true;folder.add(piping);
const label=texture(c=>{text(c,'COLLECTION 01',60,100,30,'#a0a1a7');text(c,'PRIVATE IDEAS',60,235,58,'#eeeeef');text(c,'我的灵感，随身收藏。',60,325,32,'#b5b6bd');line(c,[[60,395],[300,395]],'#63646c',3);text(c,'12 NOTES',60,465,25,'#a8abb2');});
const lm=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.12),new THREE.MeshStandardMaterial({map:label,transparent:true,roughness:1}));lm.position.set(0,-.17,.209);folder.add(lm);

function portrait(c,cx,cy,scale=1,variant=0){
 if(drawInkPortrait(c,cx-225*scale,cy-205*scale,450*scale,450*scale))return;
 c.save();c.translate(cx,cy);c.scale(scale,scale);c.strokeStyle='#101114';c.fillStyle='#101114';c.lineWidth=9;c.lineCap='round';c.lineJoin='round';
 c.beginPath();c.ellipse(0,0,100,128,-.07,0,Math.PI*2);c.stroke();
 line(c,[[-100,-15],[-116,-100],[-70,-158],[-9,-136],[40,-166],[106,-110],[104,-38]],'#101114',13);
 if(variant===0){for(const x of [-53,44]){c.beginPath();c.roundRect(x-39,-31,78,49,12);c.fill();}line(c,[[-13,-10],[5,-10]],'#101114',9);}else{for(const x of [-43,43]){c.beginPath();c.arc(x,-9,8,0,7);c.fill();}}
 line(c,[[5,15],[-5,49],[13,49]],'#101114',6);line(c,[[-29,77],[3,83],[37,70]],'#101114',7);
 line(c,[[-35,121],[-35,157],[-131,184],[-167,245]],'#101114',9);line(c,[[35,121],[35,157],[129,184],[165,245]],'#101114',9);
 line(c,[[-35,157],[0,190],[35,157]],'#101114',7);c.restore();
}
function badge(shape,color,x,y,z,scale=1){const geo=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.012,curveSegments:32});const mesh=new THREE.Mesh(geo,material(color,.52));mesh.position.set(x,y,z);mesh.scale.setScalar(scale);mesh.castShadow=true;model.add(mesh);return mesh;}
const star=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.16:.34;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?star.lineTo(x,y):star.moveTo(x,y);}star.closePath();
const flower=new THREE.Shape();for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,r=.225+.055*Math.cos(a*8);i?flower.lineTo(Math.cos(a)*r,Math.sin(a)*r):flower.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
const smileTex=texture((c,w,h)=>{c.fillStyle='#e9e9e8';c.beginPath();c.arc(w/2,h/2,367,0,7);c.fill();portrait(c,384,336,1.35,1);},768,768);
portraitReady.then(ready=>{if(!ready)return;const c=smileTex.image.getContext('2d');c.clearRect(0,0,768,768);c.save();c.beginPath();c.arc(384,384,367,0,Math.PI*2);c.clip();drawInkPortrait(c,0,0,768,768);c.restore();smileTex.needsUpdate=true;});
function seam(w,h,x,y,z,parent=model){
 const g=new THREE.Group();g.name='Saddle_stitch';g.position.set(x,y,z);parent.add(g);
 const geo=new THREE.BoxGeometry(.034,.007,.008);const count=2*Math.floor(w/.067)+2*Math.floor(h/.067);const stitches=new THREE.InstancedMesh(geo,threadMat,count);let n=0;const matrix=new THREE.Matrix4();
 for(const yy of [-h/2,h/2])for(let xx=-w/2+.035;xx<w/2;xx+=.067){matrix.makeTranslation(xx,yy,0);if(n<count)stitches.setMatrixAt(n++,matrix);}
 for(const xx of [-w/2,w/2])for(let yy=-h/2+.035;yy<h/2;yy+=.067){matrix.makeRotationZ(Math.PI/2);matrix.setPosition(xx,yy,0);if(n<count)stitches.setMatrixAt(n++,matrix);}stitches.count=n;g.add(stitches);
}
seam(6.18,3.28,0,3.48,.159);
seam(1.54,1.26,0,-.21,.23,folder);
// Folded gussets make the folder read as a bag compartment from the side.
for(const x of [-.83,.83])slab(.075,1.36,.17,.022,pocketMat,x,-.21,.09,folder);
slab(.22,.57,.035,.025,frameMat,.57,.35,.26,folder);
const clasp=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.035,32),metalMat);clasp.rotation.x=Math.PI/2;clasp.position.set(.57,.16,.296);folder.add(clasp);
// Raised top handle and its chrome anchor rings.
const handlePath=new THREE.CatmullRomCurve3([new THREE.Vector3(-.7,5.4,0),new THREE.Vector3(-.65,5.76,0),new THREE.Vector3(-.43,5.9,0),new THREE.Vector3(.43,5.9,0),new THREE.Vector3(.65,5.76,0),new THREE.Vector3(.7,5.4,0)]);
const handle=new THREE.Mesh(new THREE.TubeGeometry(handlePath,56,.072,12,false),frameMat);handle.name='Leather_carry_handle';handle.castShadow=true;model.add(handle);
for(const x of [-.7,.7]){slab(.19,.27,.035,.025,frameMat,x,5.23,.17);const ring=new THREE.Mesh(new THREE.TorusGeometry(.09,.018,10,32),metalMat);ring.position.set(x,5.41,.02);model.add(ring);magnet(x,5.2,.207,'#aeb4bf');}
for(const x of [-3.1,3.1])for(const y of [1.92,5.04])magnet(x,y,.18,'#9096a1');
// A luggage-tag avatar, attached by a small metal ring.
const tag=new THREE.Group();tag.name='Portrait_luggage_tag';tag.position.set(2.82,4.8,.22);tag.rotation.z=-.18;model.add(tag);
slab(.51,.7,.035,.07,pocketMat,0,0,0,tag);seam(.41,.58,0,0,.044,tag);
const tagFace=new THREE.Mesh(new THREE.PlaneGeometry(.36,.45),new THREE.MeshStandardMaterial({map:smileTex,roughness:.8}));tagFace.position.set(0,-.04,.053);tag.add(tagFace);
const tagRing=new THREE.Mesh(new THREE.TorusGeometry(.085,.015,8,24),metalMat);tagRing.position.set(0,.4,0);tag.add(tagRing);

// A continuous physical surface fills every viewport; content retains its world coordinates.
for(const child of model.children)child.visible=false;
floor.visible=false;
const boardGrain=grain.clone();boardGrain.repeat.set(160,160);boardGrain.needsUpdate=true;
const boardFinish=new THREE.MeshPhysicalMaterial({color:'#07090d',roughness:.64,metalness:0,bumpMap:boardGrain,bumpScale:.0012,clearcoat:.16,clearcoatRoughness:.65,envMapIntensity:.14});
const surface=new THREE.Mesh(new THREE.PlaneGeometry(200,200),boardFinish);surface.position.set(0,3.48,.114);surface.receiveShadow=true;surface.name='Full_screen_leather_board';model.add(surface);
function resetView(angled=false){const height=Math.max(7.5,7.5/camera.aspect),distance=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));go(angled?[distance*.16,4.5,distance]:[0,3.48,distance],[0,3.48,0]);}
function go(pos,look=[0,3.48,0]){destination.set(...pos);target.set(...look);transitioning=true;}

controls.addEventListener('start',()=>{transitioning=false;});
const pipeline=createRenderPipeline(renderer,scene,camera);
let sized=false;
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();pipeline.resize(w,h);if(!sized){sized=true;resetView();}};new ResizeObserver(resize).observe(host);resize();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let wind=true, tick=()=>{};
function setWind(value){wind=value;}
function setTick(fn){tick=fn;}
function disposePaper(mesh){const i=papers.findIndex(p=>p.m===mesh);if(i>=0)papers.splice(i,1);mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();mesh.removeFromParent();}
renderer.setAnimationLoop(time=>{const t=time*.001;
 if(transitioning){camera.position.lerp(destination,reduced?1:.075);controls.target.lerp(target,reduced?1:.075);if(camera.position.distanceTo(destination)<.005)transitioning=false;}
 for(const {m,rest,h,curl,phase} of papers){if(!m.parent||m.parent===folder)continue;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=rest[i*3],y=rest[i*3+1],v=(h/2-y)/h;const breeze=wind&&!reduced?Math.sin(t*1.8+x*2+phase)*.035*Math.pow(v,2):0;p.setZ(i,curl*Math.pow(v,4)+.012*Math.sin(x*3)+breeze);}p.needsUpdate=true;m.geometry.computeVertexNormals();}
 controls.update();tick(t);pipeline.render();
});
export { THREE, host, scene, camera, renderer, controls, model, folder, lm, paper, texture, text, line, portrait, seam, slab, material, pocketMat, frameMat, metalMat, star, flower, smileTex, go, resetView, setWind, setTick, disposePaper, reduced };
