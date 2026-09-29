import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateState,removeTape,MAX_TAPES} from '../dist/state.js';
import {reelRadii,reelSpeed,formatDuration,PACK_MAX} from '../dist/cassette.js';
import {pickMimeType} from '../dist/tape-recorder.js';
import {upsertDraft} from '../dist/persistence.js';
import {describeTime,countChars,stampDate} from '../dist/note-details.js';

const tape=(over={})=>({id:'t1',title:'夏夜',shell:'ivory',duration:12.5,x:0,y:2,rotation:.05,createdAt:1790000000000,...over});

test('boards saved before cassettes existed still load, with an empty tape shelf',()=>{
 const old=initialState();delete old.tapes;
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(old))).tapes,[]);
});
test('cassette metadata survives a reload and can be removed',()=>{
 const s=initialState();s.tapes.push(tape());
 const reloaded=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(reloaded.tapes[0].title,'夏夜');assert.equal(reloaded.tapes[0].duration,12.5);
 assert.equal(removeTape(reloaded,'t1'),true);assert.equal(reloaded.tapes.length,0);assert.equal(removeTape(reloaded,'t1'),false);
});
test('corrupted or oversized cassette data is rejected',()=>{
 for(const bad of [{shell:'gold'},{title:'x'.repeat(41)},{duration:-1},{duration:Infinity},{x:NaN},{id:'welcome'}]){
  const s=initialState();s.tapes.push(tape(bad));assert.throws(()=>validateState(s),JSON.stringify(bad));
 }
 const s=initialState();s.tapes=Array.from({length:MAX_TAPES+1},(_,i)=>tape({id:'t'+i}));assert.throws(()=>validateState(s));
});
test('tape packs conserve wound tape and the emptier reel spins faster',()=>{
 const area=p=>reelRadii(p).reduce((a,r)=>a+r*r,0);
 for(const p of [0,.25,.5,1])assert.ok(Math.abs(area(p)-area(0))<1e-9);
 const [l0,r0]=reelRadii(0),[l1,r1]=reelRadii(1);
 assert.equal(l0,PACK_MAX);assert.equal(r1,PACK_MAX);assert.equal(r0,l1);
 assert.ok(reelSpeed(r0)>reelSpeed(l0));
 const [lm,rm]=reelRadii(.5);assert.ok(lm+rm<42.5,'half-wound packs must not collide at 42.5 mm hub spacing');
 assert.deepEqual(reelRadii(-3),reelRadii(0));assert.deepEqual(reelRadii(9),reelRadii(1));
});
test('durations print as mm:ss on the label',()=>{
 assert.equal(formatDuration(0),'00:00');assert.equal(formatDuration(65.4),'01:05');assert.equal(formatDuration(900),'15:00');assert.equal(formatDuration(undefined),'00:00');
});
test('recorder picks the first container the browser supports',()=>{
 assert.equal(pickMimeType(t=>t==='audio/mp4'),'audio/mp4');
 assert.equal(pickMimeType(()=>{throw Error('old Safari');}),'');
});
test('notes keep their creation time and refresh their modification time',()=>{
 const s=initialState();const first=upsertDraft(s,{...s.notes[0],title:'a'});
 assert.ok(first.createdAt>0);assert.equal(first.updatedAt,first.createdAt);
 const second=upsertDraft(s,{...first,createdAt:1000,body:'b'});assert.equal(second.createdAt,1000);assert.ok(second.updatedAt>1000);
 assert.doesNotThrow(()=>validateState(JSON.parse(JSON.stringify(s))));
 s.notes[0].updatedAt='yesterday';assert.throws(()=>validateState(s));
});
test('note details describe time and length the way people read them',()=>{
 const now=new Date(2026,8,29,15,30).getTime();
 assert.equal(describeTime(now-20e3,now),'刚刚');assert.equal(describeTime(now-5*60e3,now),'5 分钟前');
 assert.equal(describeTime(new Date(2026,8,29,9,5).getTime(),now),'今天 09:05');assert.equal(describeTime(new Date(2026,8,28,22,0).getTime(),now),'昨天 22:00');
 assert.equal(describeTime(new Date(2026,2,1,8,0).getTime(),now),'3月1日 08:00');assert.equal(describeTime(new Date(2025,2,1,8,0).getTime(),now),'2025年3月1日 08:00');
 assert.equal(countChars('你好 world\n🙂'),8);assert.equal(stampDate(new Date(2026,0,5).getTime()),'2026.01.05');
});
