import fs from 'node:fs';
import path from 'node:path';
import {studentCourseHTML} from '../src/course-export.js';
const imageURL=file=>{
 const ext=path.extname(file).toLowerCase(),mime=ext==='.svg'?'image/svg+xml':'image/png';
 return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};
fs.mkdirSync('public/materials',{recursive:true});
fs.writeFileSync('public/materials/illustrated-course.html',studentCourseHTML(imageURL),'utf8');
console.log('Created standalone illustrated student course.');
