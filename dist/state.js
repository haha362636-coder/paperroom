export const STORAGE_KEY='paperroom-board-v1';
export const TAPE_SHELLS=['ivory','smoke','mint','coral','cobalt'];export const MAX_TAPES=40,MAX_TAPE_SECONDS=15*60;
const optionalTime=v=>v===undefined||(Number.isFinite(v)&&v>0);
export function initialState(){return {version:1,notes:[
 {id:'welcome',title:'留一点时间',body:'给无用的美好。\n\n去散步，看看云\n画一个今天的自己\n记住今天的心情',color:'#eeeef0',kind:'note',x:0,y:4.35,rotation:-.06,folderId:null},
 {id:'portrait',title:'今天的我',body:'保持一点自己的态度。',color:'#f2f2f0',kind:'portrait',x:1.92,y:3.65,rotation:.065,folderId:null},
 {id:'thought',title:'一闪而过的念头',body:'也值得被好好保存。',color:'#c7c9d0',kind:'note',x:.05,y:2.55,rotation:.04,folderId:null},
 {id:'pocket-note',title:'收集生活的碎片',body:'喜欢的句子、突发奇想、还没开始的计划。\n\n把它们放进自己的文件夹。',color:'#eeeef0',kind:'note',x:0,y:3.5,rotation:0,folderId:'ideas'}
 ],folders:[{id:'ideas',name:'私人灵感',x:-1.83,y:3.46}],stickers:[{id:'star',type:'star',x:.97,y:3.55},{id:'face',type:'face',x:-.82,y:2.15}],tapes:[],settings:{sound:true,wind:true}};}
export function validateState(value){
 if(!value||value.version!==1||!Array.isArray(value.notes)||!Array.isArray(value.folders)||!Array.isArray(value.stickers))throw Error('备份格式不正确');
 const tapes=value.tapes??[];if(!Array.isArray(tapes))throw Error('磁带数据无效');
 if(value.notes.length>500||value.folders.length>30||value.stickers.length>100||tapes.length>MAX_TAPES)throw Error('内容数量超过支持范围');
 const ids=new Set();for(const item of [...value.notes,...value.folders,...value.stickers,...tapes]){if(typeof item.id!=='string'||ids.has(item.id)||!Number.isFinite(item.x)||!Number.isFinite(item.y))throw Error('内容数据损坏');ids.add(item.id);}
 for(const f of value.folders)if(typeof f.name!=='string'||!f.name.trim()||f.name.length>40)throw Error('文件夹名称无效');
 for(const n of value.notes){if(typeof n.title!=='string'||n.title.length>80||typeof n.body!=='string'||n.body.length>10000||!['note','portrait','drawing'].includes(n.kind)||!/^#[\da-f]{6}$/i.test(n.color)||!Number.isFinite(n.rotation)||!(n.folderId===null||value.folders.some(f=>f.id===n.folderId)))throw Error('笔记数据无效');if(!optionalTime(n.createdAt)||!optionalTime(n.updatedAt))throw Error('笔记时间无效');if(n.kind==='drawing'&&(typeof n.drawing!=='string'||!n.drawing.startsWith('data:image/png;base64,')||n.drawing.length>2000000))throw Error('简笔画数据无效');}
 for(const s of value.stickers){if(!['star','face','flower','custom'].includes(s.type))throw Error('贴纸类型无效');if(s.type==='custom'&&(typeof s.image!=='string'||!s.image.startsWith('data:image/png;base64,')||s.image.length>2000000))throw Error('贴纸图像无效');if(s.folderId!=null&&!value.folders.some(f=>f.id===s.folderId))throw Error('贴纸文件夹无效');}
 for(const t of tapes){if(typeof t.title!=='string'||t.title.length>40||!TAPE_SHELLS.includes(t.shell)||!Number.isFinite(t.rotation)||!Number.isFinite(t.duration)||t.duration<0||t.duration>MAX_TAPE_SECONDS+5||!optionalTime(t.createdAt))throw Error('磁带数据无效');}
 return structuredClone({...value,tapes,settings:{sound:value.settings?.sound!==false,wind:value.settings?.wind!==false}});
}
export function folderAt(folders,x,y){return folders.find(f=>Math.abs(x-f.x)<.98&&Math.abs(y-f.y)<1.08)??null;}
export function fileNote(state,noteId,folderId){const note=state.notes.find(n=>n.id===noteId);if(!note||!state.folders.some(f=>f.id===folderId))throw Error('笔记或文件夹不存在');note.folderId=folderId;return note;}
export function removeFolder(state,id){state.notes.forEach(n=>{if(n.folderId===id){n.folderId=null;n.x=.1;n.y=3.5;}});const folder=state.folders.find(f=>f.id===id);for(const s of state.stickers){if(s.folderId===id){s.folderId=null;s.x=(folder?.x??0)+s.x;s.y=(folder?.y??3.5)+s.y;}}state.folders=state.folders.filter(f=>f.id!==id);}

export function attachSticker(state,id,folderId,x=0,y=-.25){const s=state.stickers.find(s=>s.id===id);if(!s)throw Error('贴纸不存在');if(folderId!==null&&!state.folders.some(f=>f.id===folderId))throw Error('文件夹不存在');s.folderId=folderId;s.x=folderId?Math.max(-.48,Math.min(.48,x)):x;s.y=folderId?Math.max(-.65,Math.min(.3,y)):y;return s;}
export function removeTape(state,id){const before=state.tapes.length;state.tapes=state.tapes.filter(t=>t.id!==id);return state.tapes.length!==before;}
