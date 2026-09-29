import {MAX_TAPE_SECONDS,TAPE_SHELLS} from './state.js';
import {SHELLS,formatDuration,reelRadii,PACK_MAX} from './cassette.js';
import {playSound} from './sound.js';

const TYPES=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'];
export function pickMimeType(isSupported){return TYPES.find(t=>{try{return isSupported(t);}catch{return false;}})??'';}
function micError(error){
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')return '当前环境不支持录音，请换用新版 Chrome、Safari 或桌面版';
 if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return '麦克风权限被拒绝，请在系统或浏览器设置中允许';
 if(error?.name==='NotFoundError')return '没有找到可用的麦克风';
 return '麦克风暂时不可用';
}

export function setupTapeRecorder({onApply,onDelete,loadAudio,toast}){
 const $=s=>document.querySelector(s),dialog=$('#tape-dialog'),deck=$('#tape-deck'),meter=$('#vu-meter'),mc=meter.getContext('2d');
 let stream=null,recorder=null,chunks=[],audioCtx=null,analyser=null,raf=0,startedAt=0,elapsed=0,blob=null,duration=0,editing=null,preview=null,previewUrl=null,needle=0,token=0;
 const swatches=$('#tape-shells');
 swatches.replaceChildren(...TAPE_SHELLS.map(id=>{const label=document.createElement('label');label.title=id;label.style.setProperty('--shell',SHELLS[id]);const input=document.createElement('input');input.type='radio';input.name='tape-shell';input.value=id;input.setAttribute('aria-label',`外壳颜色 ${id}`);label.append(input);return label;}));
 $('#tape-title').oninput=()=>{$('#tape-label-preview').textContent=$('#tape-title').value||'未命名录音';};
 swatches.onchange=()=>deck.style.setProperty('--shell',SHELLS[swatches.querySelector('input:checked')?.value??'ivory']);

 function drawMeter(level){
  // Analog VU: needle with ~300 ms ballistics over a printed dB scale.
  needle+=(level-needle)*.18;const w=meter.width,h=meter.height,cx=w/2,cy=h*1.18,r=h*.98;
  mc.clearRect(0,0,w,h);const face=mc.createLinearGradient(0,0,0,h);face.addColorStop(0,'#f6ecd2');face.addColorStop(1,'#e2d3ad');mc.fillStyle=face;mc.fillRect(0,0,w,h);
  const at=v=>-Math.PI/2+(v-.5)*1.5;
  mc.lineWidth=3;mc.strokeStyle='#2b2620';mc.beginPath();mc.arc(cx,cy,r*.82,at(0),at(.72));mc.stroke();mc.strokeStyle='#c43c2a';mc.lineWidth=6;mc.beginPath();mc.arc(cx,cy,r*.82,at(.72),at(1));mc.stroke();
  mc.font='600 15px ui-monospace,Menlo,monospace';mc.textAlign='center';
  [['20',0],['10',.25],['5',.42],['3',.52],['0',.72],['+3',1]].forEach(([t,v])=>{const a=at(v);mc.strokeStyle=v>.7?'#c43c2a':'#2b2620';mc.lineWidth=2;mc.beginPath();mc.moveTo(cx+Math.cos(a)*r*.82,cy+Math.sin(a)*r*.82);mc.lineTo(cx+Math.cos(a)*r*.93,cy+Math.sin(a)*r*.93);mc.stroke();mc.fillStyle=v>.7?'#c43c2a':'#2b2620';mc.fillText(t,cx+Math.cos(a)*r*1.03,cy+Math.sin(a)*r*1.03+5);});
  mc.font='700 20px Georgia,serif';mc.fillStyle='#2b2620';mc.fillText('VU',cx,h*.72);
  const a=at(Math.min(1.04,needle));mc.strokeStyle='#15130f';mc.lineWidth=2.4;mc.beginPath();mc.moveTo(cx,cy);mc.lineTo(cx+Math.cos(a)*r*.96,cy+Math.sin(a)*r*.96);mc.stroke();
  const glass=mc.createLinearGradient(0,0,w,h);glass.addColorStop(0,'rgba(255,255,255,.35)');glass.addColorStop(.45,'rgba(255,255,255,0)');mc.fillStyle=glass;mc.fillRect(0,0,w,h);
 }
 function setPacks(p){const [l,r]=reelRadii(p);deck.style.setProperty('--left',(l/PACK_MAX).toFixed(3));deck.style.setProperty('--right',(r/PACK_MAX).toFixed(3));}
 function status(text){$('#tape-time').textContent=text;}
 function stopMonitor(){cancelAnimationFrame(raf);raf=0;stream?.getTracks().forEach(t=>t.stop());stream=null;audioCtx?.close().catch(()=>{});audioCtx=null;analyser=null;}
 function stopPreview(){preview?.pause();preview=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;deck.classList.remove('playing');$('#tape-preview').textContent='▶';}
 function sync(){
  const recording=recorder?.state==='recording';deck.classList.toggle('recording',recording);dialog.classList.toggle('is-recording',recording);
  $('#tape-record').hidden=recording;$('#tape-stop').hidden=!recording;$('#tape-preview').disabled=recording||!(blob||editing);
  $('#tape-save').disabled=recording||!(blob||editing);$('#tape-record').textContent=blob||editing?'重录':'录音';
 }
 function frame(){
  if(!analyser)return;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);let sum=0;for(const v of data)sum+=v*v;
  const db=20*Math.log10(Math.sqrt(sum/data.length)+1e-6);drawMeter(Math.max(0,Math.min(1.05,(db+46)/40)));
  if(recorder?.state==='recording'){elapsed=(performance.now()-startedAt)/1000;status(`${formatDuration(elapsed)} / ${formatDuration(MAX_TAPE_SECONDS)}`);setPacks(elapsed/MAX_TAPE_SECONDS);if(elapsed>=MAX_TAPE_SECONDS){toast('磁带录满了');stop();}}
  raf=requestAnimationFrame(frame);
 }
 async function record(){
  stopPreview();const mine=++token;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   if(mine!==token||!dialog.open){stopMonitor();return;}
   audioCtx=new (window.AudioContext||window.webkitAudioContext)();analyser=audioCtx.createAnalyser();analyser.fftSize=1024;audioCtx.createMediaStreamSource(stream).connect(analyser);
   const mimeType=pickMimeType(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{if(mine!==token)return;const type=recorder.mimeType||mimeType||'audio/webm';blob=new Blob(chunks,{type});duration=elapsed;stopMonitor();needle=0;drawMeter(0);sync();status(`已录 ${formatDuration(duration)} · 可以试听`);};
   playSound('deck');recorder.start(250);startedAt=performance.now();elapsed=0;sync();frame();
  }catch(error){stopMonitor();sync();toast(micError(error));status(micError(error));}
 }
 function stop(){if(recorder?.state==='recording'){playSound('deck');recorder.stop();}}
 async function togglePreview(){
  if(preview){stopPreview();return;}
  const source=blob??(editing?await loadAudio(editing.id):null);if(!source){toast('这盘磁带的录音不在本机');return;}
  previewUrl=URL.createObjectURL(source);preview=new Audio(previewUrl);const total=blob?duration:editing.duration;
  preview.ontimeupdate=()=>{setPacks(total?preview.currentTime/total:0);status(`${formatDuration(preview.currentTime)} / ${formatDuration(total)}`);};
  preview.onended=stopPreview;deck.classList.add('playing');$('#tape-preview').textContent='❚❚';playSound('deck');preview.play().catch(()=>{stopPreview();toast('无法播放这段录音');});
 }
 $('#tape-record').onclick=record;$('#tape-stop').onclick=stop;$('#tape-preview').onclick=togglePreview;
 $('#tape-form').onsubmit=e=>{e.preventDefault();if(recorder?.state==='recording')return;const shell=swatches.querySelector('input:checked')?.value??'ivory';onApply({id:editing?.id,title:$('#tape-title').value.trim()||'未命名录音',shell,blob,duration:blob?duration:editing?.duration??0});dialog.close();};
 $('#delete-tape').onclick=()=>{if(editing){onDelete(editing.id);dialog.close();}};
 dialog.addEventListener('close',()=>{token++;if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}recorder=null;stopMonitor();stopPreview();blob=null;chunks=[];});
 return function openTape(tape=null){
  editing=tape;blob=null;duration=0;elapsed=0;needle=0;
  $('#tape-heading').textContent=tape?'磁带':'录一盘磁带';$('#tape-title').value=tape?.title??'';$('#delete-tape').hidden=!tape;
  const shell=tape?.shell??TAPE_SHELLS[Math.floor(Math.random()*TAPE_SHELLS.length)];swatches.querySelector(`input[value="${shell}"]`).checked=true;swatches.onchange();$('#tape-title').oninput();
  setPacks(tape?1:0);drawMeter(0);status(tape?`${formatDuration(tape.duration)} · 点 ▶ 试听，或重录覆盖`:'按下录音，对着麦克风说话');sync();dialog.showModal();
 };
}
