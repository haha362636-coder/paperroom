// Recordings are binary and far larger than localStorage allows, so the board
// state only keeps cassette metadata and the audio lives in IndexedDB by id.
const DB='paperroom-audio',STORE='recordings';
const memory=new Map();let opening;
function open(){
 opening??=new Promise(resolve=>{
  try{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=req.onblocked=()=>resolve(null);}
  catch{resolve(null);}
 });
 return opening;
}
function run(mode,fn){return open().then(db=>{if(!db)return undefined;return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),req=fn(tx.objectStore(STORE));tx.oncomplete=()=>resolve(req?.result);tx.onerror=tx.onabort=()=>reject(tx.error??Error('录音存储失败'));});});}
/** Resolves true when the recording is durably stored, false when only kept for this session. */
export async function saveRecording(id,blob){memory.set(id,blob);try{const db=await open();if(!db)return false;await run('readwrite',s=>s.put(blob,id));return true;}catch{return false;}}
export async function loadRecording(id){if(memory.has(id))return memory.get(id);try{const blob=await run('readonly',s=>s.get(id));if(blob)memory.set(id,blob);return blob??null;}catch{return null;}}
export async function deleteRecording(id){memory.delete(id);try{await run('readwrite',s=>s.delete(id));}catch{}}
export function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
