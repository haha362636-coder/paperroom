export const portraitImage=new Image();
export const portraitReady=new Promise(resolve=>{portraitImage.onload=()=>resolve(true);portraitImage.onerror=()=>resolve(false);});
portraitImage.src=new URL('./assets/ink-portrait.png',import.meta.url).href;
export function drawInkPortrait(ctx,x,y,width,height){if(!portraitImage.complete||!portraitImage.naturalWidth)return false;ctx.drawImage(portraitImage,x,y,width,height);return true;}
