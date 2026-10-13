import Phaser from 'phaser';
import garden from '../assets/game/garden.png';
import { WalkingBunny,loadBunnyRig } from './bunny-walk';
class WalkPreview extends Phaser.Scene {
  private bunny!:WalkingBunny;
  private shadow!:Phaser.GameObjects.Ellipse;
  private target=1190;
  private distance=0;
  private walking=true;
  private weight=0;
  private speed=1;
  private pause=false;
  private wait=0;
  private velocity=0;
  preload():void {this.load.image('garden',garden);loadBunnyRig(this);}
  create():void {
    this.add.image(800,480,'garden').setDisplaySize(1600,960);
    this.shadow=this.add.ellipse(420,738,130,25,0x526340,.16);
    this.bunny=new WalkingBunny(this,420,740,400);
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{this.target=Phaser.Math.Clamp(p.x,170,1430);this.walking=true;this.wait=0;});
    document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>{this.pause=!this.pause;document.querySelector('#pause')!.textContent=this.pause?'Play':'Pause';};
    document.querySelector<HTMLSelectElement>('#speed')!.onchange=e=>this.speed=Number((e.target as HTMLSelectElement).value);
    document.querySelector<HTMLButtonElement>('#step')!.onclick=()=>{this.pause=true;document.querySelector('#pause')!.textContent='Play';this.tick(1000/24);};
  }
  update(_time:number,delta:number):void {if(!this.pause)this.tick(Math.min(delta,40)*this.speed);}
  private tick(delta:number):void {
    const dt=delta/1000,scale=Math.abs(this.bunny.scaleX);
    if(this.walking){
      const remaining=Math.abs(this.target-this.bunny.x);
      const desired=Math.min(110,Math.sqrt(2*260*remaining));
      this.velocity+=Phaser.Math.Clamp(desired-this.velocity,-260*dt,260*dt);
      const direction=Math.sign(this.target-this.bunny.x),move=Math.min(remaining,this.velocity*dt);
      if(direction!==0)this.bunny.scaleX=direction*scale;this.bunny.x+=direction*move;this.distance+=move/scale;
      this.weight=Math.min(1,this.weight+dt*5);
      if(Math.abs(this.target-this.bunny.x)<.1){this.walking=false;this.velocity=0;this.wait=1.2;}
    }else{
      this.weight=Math.max(0,this.weight-dt*5);this.wait-=dt;
      if(this.wait<=0){this.target=this.target>800?420:1190;this.walking=true;}
    }
    this.bunny.pose(this.distance,this.weight);this.shadow.x=this.bunny.x;
    this.game.canvas.dataset.distance=String(this.distance);
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1600,height:960,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:WalkPreview});
