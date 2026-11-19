import * as THREE from '../../vendor/three/three.module.js';
import {parse} from '../../vendor/opentype/opentype.module.js';

// Static companions match the variable family's resting 400 / DRKM 0 state.
// OpenType.js does not interpolate this variable font's custom axes.
const files=['ABCAreal-Regular.ttf','ABCAreal-RegularItalic.ttf','ABCArealMono-Regular.ttf','ABCArealMono-RegularItalic.ttf'];
export const arealFonts=Promise.all(files.map(async name=>{
 const response=await fetch(new URL('../../assets/fonts/areal/'+name,import.meta.url));
 if(!response.ok)throw new Error(`Areal outline unavailable: ${name}`);
 return parse(await response.arrayBuffer());
}));

export function shapesFor(font,text,size){
 const out=new THREE.ShapePath();
 text.split('\n').forEach((line,index)=>{
  const path=font.getPath(line,0,index*size*1.3,size);
  for(const c of path.commands){
   if(c.type==='M')out.moveTo(c.x,-c.y);
   if(c.type==='L')out.lineTo(c.x,-c.y);
   if(c.type==='C')out.bezierCurveTo(c.x1,-c.y1,c.x2,-c.y2,c.x,-c.y);
   if(c.type==='Q')out.quadraticCurveTo(c.x1,-c.y1,c.x,-c.y);
   if(c.type==='Z')out.currentPath.closePath();
  }
 });
 return out.toShapes(false);
}
