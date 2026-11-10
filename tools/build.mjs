import fs from 'node:fs';
import path from 'node:path';
import {courseMarkdown} from '../src/learning.js';
import './generate-illustrations.mjs';
import './generate-guides.mjs';
// No third-party packages or network calls are needed for this build.
const checkout=fs.realpathSync('.');
const output=path.resolve(checkout,'dist');
if(output!==path.join(checkout,'dist')||!output.startsWith(checkout+path.sep))throw new Error('Unsafe build directory');
if(fs.lstatSync(output,{throwIfNoEntry:false})?.isSymbolicLink())throw new Error('Build directory cannot be a symbolic link');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','src','public'])fs.cpSync(file,path.join(output,file),{recursive:true});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
fs.mkdirSync('dist/materials',{recursive:true});
fs.writeFileSync('dist/materials/10-lessons.md',courseMarkdown(),'utf8');
console.log('Сборка готова: dist/');
