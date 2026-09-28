// Logical layout is independent of camera position and texture pixel density.
export function noteSize(note){return {width:1.4,height:note.kind==='portrait'?1.8:1.5};}
export function wrapText(ctx,value,x,y,size,width,lineHeight,maxLines,weight=500){
 ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillStyle='#090b10';
 const chars=Array.from(String(value).replace(/\r\n?/g,'\n'));
 let row='',line=0;
 for(let i=0;i<chars.length;i++){
  const char=chars[i];
  if(char==='\n'||(row&&ctx.measureText(row+char).width>width)){
   if(line===maxLines-1){
    while(row&&ctx.measureText(row+'…').width>width)row=Array.from(row).slice(0,-1).join('');
    ctx.fillText(row+'…',x,y+line*lineHeight);return;
   }
   ctx.fillText(row,x,y+line*lineHeight);line++;row=char==='\n'?'':char;
  }else row+=char;
 }
 if(row)ctx.fillText(row,x,y+line*lineHeight);
}
