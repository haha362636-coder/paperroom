import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createPaperGeometry,setBoardNoteLayer} from '../dist/paper-surface.js';
import {wrapText,noteSize} from '../dist/note-layout.js';
function context(){const lines=[];return {lines,measureText:s=>({width:Array.from(s).length*10}),fillText:(text,x,y)=>lines.push({text,x,y})};}
test('long note ends with an ellipsis inside the final allowed line',()=>{
 const c=context();wrapText(c,'ABCDEFGHIJKLM',0,100,12,40,20,2);
 assert.deepEqual(c.lines.map(r=>r.text),['ABCD','EFG…']);
 assert.equal(c.lines.at(-1).y,120);
});
test('explicit newlines and emoji never add a third title row or split a surrogate',()=>{
 const c=context();wrapText(c,'一二\r\n🙂🙂🙂🙂🙂',0,0,12,40,20,2);
 assert.deepEqual(c.lines.map(r=>r.text),['一二','🙂🙂🙂…']);
});
test('short text and exact final row fit without an ellipsis',()=>{
 const c=context();wrapText(c,'ABCD\nEFGH',0,0,12,40,20,2);
 assert.deepEqual(c.lines.map(r=>r.text),['ABCD','EFGH']);
});
test('reading surface stays planar, with identical note proportions in any container',()=>{
 for(const kind of ['note','drawing','portrait']){
  const {width,height}=noteSize({kind});
  const {geometry}=createPaperGeometry(width,height,.055,true);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.equal(p.getZ(i),0);
  assert.equal(width,1.4);assert.equal(height,kind==='portrait'?1.8:1.5);
  geometry.dispose();
 }
});
test('front-view panning does not change the projected width of printed text',()=>{
 const camera=new THREE.PerspectiveCamera(36,1.6,.1,100);
 const a=new THREE.Vector3(-.7,0,.25),b=new THREE.Vector3(.7,0,.25);
 function width(x,y){camera.position.set(x,y,12);camera.lookAt(x,y,0);camera.updateMatrixWorld();return b.clone().project(camera).x-a.clone().project(camera).x;}
 assert.ok(Math.abs(width(0,0)-width(4,3))<1e-12);
});
test('500 overlapping notes have unique stable painter order and respect solid objects',()=>{
 const orders=new Set();
 for(let i=0;i<500;i++){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial());
  setBoardNoteLayer(mesh,i);orders.add(mesh.renderOrder);
  assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.depthTest,true);
  mesh.geometry.dispose();mesh.material.dispose();
 }
 assert.equal(orders.size,500);
});

test('clicking overlapping notes selects the visible top note, while a foreground folder still wins',async()=>{
 const {pickVisibleSurface}=await import('../dist/paper-surface.js');
 const notes=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());m.userData.type='note';setBoardNoteLayer(m,i);m.updateMatrixWorld();return m;});
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,5),new THREE.Vector3(0,0,-1));
 assert.equal(pickVisibleSurface(ray.intersectObjects(notes)).object,notes[1]);
 const folder=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());folder.userData.type='folder';folder.position.z=.2;folder.updateMatrixWorld();
 assert.equal(pickVisibleSurface(ray.intersectObjects([...notes,folder])).object,folder);
 for(const m of [...notes,folder]){m.geometry.dispose();m.material.dispose();}
});
