import Phaser from 'phaser';
import rigUrl from '../assets/animation/bunny-rig-v1.png';
export function loadBunnyRig(scene:Phaser.Scene):void {scene.load.image('bunny-rig',rigUrl);}
export function rigFrames(scene:Phaser.Scene):void {
  const texture=scene.textures.get('bunny-rig');if(texture.has('head'))return;
  const regions:Record<string,number[]>={head:[20,10,455,490],body:[490,140,325,365],thigh:[925,160,215,325],shin:[1245,225,150,195],foot:[1245,450,245,70],arm:[885,570,200,355]};
  for(const [key,[x,y,w,h]] of Object.entries(regions))texture.add(key,0,x!,y!,w!,h!);
}
/** Painted joints. The gait is driven by distance so stance feet stay on the ground. */
export class WalkingBunny extends Phaser.GameObjects.Container {
  private head:Phaser.GameObjects.Image;
  private torso:Phaser.GameObjects.Image;
  private nearArm:Phaser.GameObjects.Image;
  private farArm:Phaser.GameObjects.Image;
  private legs:{upper:Phaser.GameObjects.Image;lower:Phaser.GameObjects.Image;foot:Phaser.GameObjects.Image}[]=[];
  constructor(scene:Phaser.Scene,x:number,y:number,height=365){
    super(scene,x,y);rigFrames(scene);scene.add.existing(this);this.setScale(height/420);
    const part=(frame:string,width:number,ox:number,oy:number):Phaser.GameObjects.Image=>{
      const image=scene.add.image(0,0,'bunny-rig',frame);image.setDisplaySize(width,width*image.height/image.width).setOrigin(ox,oy);this.add(image);return image;
    };
    this.farArm=part('arm',55,.62,.12).setTint(0xd9cbb9);
    for(let i=0;i<2;i++){
      const upper=part('thigh',57,.51,.16),lower=part('shin',43,.40,.10),foot=part('foot',73,.28,.50);
      if(i===0)[upper,lower,foot].forEach(p=>p.setTint(0xd8c4b3));
      this.legs.push({upper,lower,foot});
    }
    this.torso=part('body',145,.58,.86);
    this.nearArm=part('arm',57,.62,.12);
    this.head=part('head',225,.70,.94);
    this.pose(0,0);
  }
  pose(distance:number,weight=1):void {
    const cycle=104,stance=.62;
    const phase=((distance/cycle)%1+1)%1;
    // Longer ground contact, low foot clearance, and a straighter supporting leg.
    const hipY=-103+(1+2*Math.cos(phase*Math.PI*4))*weight;
    this.torso.setPosition(0,hipY-4).setRotation(.012*weight);
    this.head.setPosition(4,hipY-111).setRotation(-.008*Math.sin(phase*Math.PI*2+.6)*weight);
    this.nearArm.setPosition(-8,hipY-105).setRotation(.17*Math.cos(phase*Math.PI*2-.25)*weight);
    this.farArm.setPosition(20,hipY-105).setRotation(-.15*Math.cos(phase*Math.PI*2-.25)*weight);
    this.legs.forEach((leg,i)=>{
      const t=(phase+(i===0?.5:0))%1,hipX=i===0?-7:8;
      const swing=t>=stance,step=swing?(t-stance)/(1-stance):t/stance;
      const halfStride=cycle*stance/2;
      // Hermite swing matches the backward foot speed at lift-off and landing.
      // This removes the sharp change of direction at each contact.
      const u=step,u2=u*u,u3=u2*u;
      const tangent=-cycle*(1-stance);
      const offset=swing
        ? (2*u3-3*u2+1)*-halfStride+(u3-2*u2+u)*tangent+(-2*u3+3*u2)*halfStride+(u3-u2)*tangent
        : halfStride-cycle*t;
      const lift=swing?Math.sin(step*Math.PI)**2*12:0;
      const fx=hipX+offset*weight,fy=-10-lift*weight;
      const dx=fx-hipX,dy=fy-hipY,length=Math.min(97.9,Math.hypot(dx,dy));
      const reach=length/2,bend=Math.sqrt(Math.max(0,49*49-reach*reach));
      const kx=hipX+dx*.5+dy/length*bend,ky=hipY+dy*.5-dx/length*bend;
      leg.upper.setPosition(hipX,hipY).setRotation(Math.atan2(-(kx-hipX),ky-hipY));
      leg.lower.setPosition(kx,ky).setRotation(Math.atan2(-(fx-kx),fy-ky));
      leg.foot.setPosition(fx,fy).setRotation(swing?.12*Math.sin(step*Math.PI*2)*weight:0);
    });
  }
}
