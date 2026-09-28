import * as THREE from './vendor/three.module.js';

export function createPaperGeometry(width,height,curl,stable=false){
 const geometry=new THREE.PlaneGeometry(width,height,18,22);
 const positions=geometry.attributes.position;
 const rest=Float32Array.from(positions.array);
 if(!stable)for(let i=0;i<positions.count;i++){
  const bottom=(height/2-positions.getY(i))/height;
  positions.setZ(i,curl*Math.pow(bottom,4)+.012*Math.sin(positions.getX(i)*3));
 }
 geometry.computeVertexNormals();
 return {geometry,rest};
}
// Board notes are opaque, but share one physical plane. Painter order prevents
// coplanar depth fighting, while depth testing still respects folders/stickers.
// Floating notes keep normal depth writes so the backdrop cannot cover them.
export function setBoardNoteLayer(mesh,index){
 mesh.material.depthWrite=false;
 mesh.renderOrder=10+index;
}

export function pickVisibleSurface(hits){
 return hits.slice().sort((a,b)=>{
  if(a.object.userData.type==='note'&&b.object.userData.type==='note'&&Math.abs(a.distance-b.distance)<1e-5){
   return b.object.renderOrder-a.object.renderOrder;
  }
  return a.distance-b.distance;
 })[0];
}
