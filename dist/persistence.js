import {STORAGE_KEY,validateState,initialState} from './state.js';
export const BACKUP_KEY=STORAGE_KEY+'-previous';
export function loadBoard(storage){
 let error=false;
 for(const key of [STORAGE_KEY,BACKUP_KEY]){
  try{const raw=storage.getItem(key);if(raw)return {state:validateState(JSON.parse(raw)),recovered:key===BACKUP_KEY,error:false};}catch{error=true;}
 }
 return {state:initialState(),recovered:false,error};
}
export function persistBoard(storage,state){
 const payload=JSON.stringify(validateState(state));
 // Keep the previous valid snapshot. Failure of a redundant backup must not
 // prevent the primary atomic localStorage write.
 try{const previous=storage.getItem(STORAGE_KEY);if(previous){validateState(JSON.parse(previous));storage.setItem(BACKUP_KEY,previous);}}catch{}
 storage.setItem(STORAGE_KEY,payload);
 return true;
}
export function upsertDraft(state,draft){
 const now=Date.now();
 const note={...draft,title:draft.title.trim()||draft.body.trim().split('\n')[0].slice(0,32)||'无标题笔记',createdAt:draft.createdAt??now,updatedAt:now};
 const index=state.notes.findIndex(n=>n.id===note.id);
 if(index<0)state.notes.push(note);else state.notes[index]=note;
 return note;
}
