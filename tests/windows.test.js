import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {resolveWebFile,ORIGIN}=require('../windows/web-path.js');
const root=path.resolve('/srv/paperroom/web');

test('Windows shell serves bundled web files and defaults to index.html',()=>{
 assert.equal(resolveWebFile(root,ORIGIN+'/'),path.join(root,'index.html'));
 assert.equal(resolveWebFile(root,ORIGIN),path.join(root,'index.html'));
 assert.equal(resolveWebFile(root,ORIGIN+'/app.js?v=11'),path.join(root,'app.js'));
 assert.equal(resolveWebFile(root,ORIGIN+'/vendor/three.module.js'),path.join(root,'vendor','three.module.js'));
 assert.equal(resolveWebFile(root,ORIGIN+'/assets/%E7%BA%B8.png'),path.join(root,'assets','纸.png'));
});
test('Windows shell never resolves outside the web folder or for other origins',()=>{
 for(const url of [ORIGIN+'/..%2f..%2fmain.js',ORIGIN+'/a%5c..%5c..%5cx',ORIGIN+'/x%00.js',ORIGIN+'/%E0%A4%A','paperroom://evil/index.html','https://app/index.html','not a url'])
  assert.equal(resolveWebFile(root,url),null,url);
 // The URL parser folds plain dot segments first; whatever remains must stay inside the folder.
 for(const url of [ORIGIN+'/../package.json',ORIGIN+'/%2e%2e/secret',ORIGIN+'/a/../../../../etc/hosts']){
  const file=resolveWebFile(root,url);assert.ok(file===null||file.startsWith(root+path.sep),url+' -> '+file);
 }
});
