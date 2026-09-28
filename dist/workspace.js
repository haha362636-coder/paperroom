import {initialState,validateState} from './state.js';
import {loadBoard} from './persistence.js';
export const WORKSPACE_KEY='paperroom-workspace-v2';
export function validateWorkspace(value){
 if(value?.version!==2||!Array.isArray(value.boards)||!value.boards.length||value.boards.length>50)throw Error('白板数据无效');
 const ids=new Set();const boards=value.boards.map(b=>{if(typeof b.id!=='string'||ids.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>40)throw Error('白板数据无效');ids.add(b.id);return {...b,state:validateState(b.state)};});
 if(!ids.has(value.activeId))throw Error('当前白板不存在');return {version:2,activeId:value.activeId,boards};
}
export function loadWorkspace(storage){
 let error=false;
 for(const key of [WORKSPACE_KEY,WORKSPACE_KEY+'-previous']){try{const raw=storage.getItem(key);if(raw)return {workspace:validateWorkspace(JSON.parse(raw)),recovered:key.endsWith('-previous'),error:false};}catch{error=true;}}
 const legacy=loadBoard(storage);return {workspace:{version:2,activeId:'original',boards:[{id:'original',name:'我的白板',state:legacy.state}]},recovered:legacy.recovered,error:error||legacy.error};
}
export function persistWorkspace(storage,workspace){const payload=JSON.stringify(validateWorkspace(workspace));try{const old=storage.getItem(WORKSPACE_KEY);if(old){validateWorkspace(JSON.parse(old));storage.setItem(WORKSPACE_KEY+'-previous',old);}}catch{}storage.setItem(WORKSPACE_KEY,payload);}
export function addBoard(workspace,name,id){if(workspace.boards.length>=50)throw Error('最多创建 50 块白板');const state=initialState();state.notes=[];state.folders=[];state.stickers=[];const board={id,name:name.trim(),state};const next=validateWorkspace({...workspace,activeId:id,boards:[...workspace.boards,board]});return next;}
