// Small physical cues printed onto a note's paper texture (768 × 900 canvas).
const pad=n=>String(n).padStart(2,'0');
export function stampDate(ms){const d=new Date(ms);return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;}
export function describeTime(ms,now=Date.now()){
 if(!ms)return '';const d=new Date(ms),diff=now-ms,time=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
 if(diff<60e3)return '刚刚';if(diff<3600e3)return `${Math.floor(diff/60e3)} 分钟前`;
 const today=new Date(now);today.setHours(0,0,0,0);if(ms>=today.getTime())return `今天 ${time}`;if(ms>=today.getTime()-864e5)return `昨天 ${time}`;
 return `${d.getFullYear()===new Date(now).getFullYear()?'':d.getFullYear()+'年'}${d.getMonth()+1}月${d.getDate()}日 ${time}`;
}
export const countChars=text=>Array.from(String(text).replace(/\s/g,'')).length;
function hash(id){let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}

/** Paper grain and ruled lines, painted before the text. */
export function paintPaper(c,note){
 const w=768,h=900;let seed=hash(note.id);const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
 for(let i=0;i<1400;i++){c.fillStyle=`rgba(60,55,45,${rnd()*.045})`;c.fillRect(rnd()*w,rnd()*h,1+rnd()*4,1);}
 const edge=c.createLinearGradient(0,0,0,h);edge.addColorStop(0,'rgba(0,0,0,.035)');edge.addColorStop(.08,'rgba(0,0,0,0)');edge.addColorStop(.9,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,0,0,.05)');c.fillStyle=edge;c.fillRect(0,0,w,h);
 if(note.kind==='note'){c.strokeStyle='rgba(30,40,60,.075)';c.lineWidth=2;for(let i=0;i<5;i++){const y=345+i*90+26;c.beginPath();c.moveTo(55,y);c.lineTo(713,y);c.stroke();}}
}
/** Masking tape, date and length, painted after the text. */
export function paintDetails(c,note){
 const h=hash(note.id),angle=((h%100)/100-.5)*.12,x=384+((h>>8)%80-40);
 c.save();c.translate(x,14);c.rotate(angle);c.fillStyle='rgba(222,214,192,.82)';c.beginPath();c.moveTo(-96,-26);
 for(let i=0;i<=8;i++)c.lineTo(-96+(i%2?-4:3),-26+i*6.5);for(let i=0;i<=8;i++)c.lineTo(96+(i%2?4:-3),26-i*6.5);c.closePath();c.fill();
 c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-90,-22,180,9);c.restore();
 const stamp=note.updatedAt??note.createdAt;c.font='500 24px ui-monospace,Menlo,monospace';c.fillStyle='rgba(20,22,28,.42)';
 if(stamp){c.textAlign='left';c.fillText(stampDate(stamp),55,866);}
 if(note.kind!=='drawing'){const n=countChars(note.body);if(n){c.textAlign='right';c.fillText(`${n} 字`,713,866);}}
 c.textAlign='left';
}
