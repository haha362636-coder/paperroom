export function createRenderPipeline(renderer,scene,camera){
 return {resize(){},render(){renderer.render(scene,camera);},dispose(){}};
}
