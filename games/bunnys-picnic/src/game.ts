import Phaser from 'phaser';
import { Adventure } from './world';
// CSS touch-action:none owns gesture suppression; passive touch listeners also handle non-cancelable Android touchcancel events.
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1600,height:960,backgroundColor:'#c5d6a0',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},input:{activePointers:2,touch:{capture:false}},render:{antialias:true,roundPixels:false},audio:{disableWebAudio:false},scene:[Adventure]});
const button=document.querySelector<HTMLButtonElement>('#parents')!;
const menu=document.querySelector<HTMLDialogElement>('#menu')!;
let hold:number|undefined;
const scene=():Adventure=>game.scene.getScene('adventure') as Adventure;
button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);hold=window.setTimeout(()=>{scene().parentPause(true);menu.showModal();},1200);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>window.clearTimeout(hold));
button.addEventListener('contextmenu',e=>e.preventDefault());
function close():void{menu.close();document.querySelector<HTMLElement>('#confirm')!.style.display='none';scene().parentPause(false);}
document.querySelector('#close')!.addEventListener('click',close);
menu.addEventListener('cancel',e=>{e.preventDefault();close();});
document.querySelector('#fullscreen')!.addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});});
document.querySelector('#mute')!.addEventListener('click',()=>scene().toggleSound());
document.querySelector('#restart')!.addEventListener('click',()=>document.querySelector<HTMLElement>('#confirm')!.style.display='block');
document.querySelector('#cancel')!.addEventListener('click',()=>document.querySelector<HTMLElement>('#confirm')!.style.display='none');
document.querySelector('#reset')!.addEventListener('click',()=>{close();scene().resetGame();});
document.addEventListener('visibilitychange',()=>scene().visibility(document.hidden));
