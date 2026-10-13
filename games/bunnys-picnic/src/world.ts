import Phaser from 'phaser';
import { preload, frames } from './assets';
import { advance, complete, freshProgress, friendsReady, hedgehogReady, inventory, loadProgress, saveProgress, type Action, type Room, type Tool } from './state';
import { guidance, PICNIC_PLACES, type Friend } from './guidance';
type Picture=Phaser.GameObjects.Image;
type Choice=Tool|'box'|'plate'|'apple'|`leaf${number}`;
interface Target {x:number;y:number;w:number;h:number;id:string;run:()=>void}
const prop:Record<Choice,number>={plank:0,net:1,basket:2,box:3,plate:8,apple:9,leaf0:6,leaf1:6,leaf2:6};
const places=PICNIC_PLACES;
export class Adventure extends Phaser.Scene {
  private p=loadProgress();
  private selected:Choice|undefined;
  private busy=false;
  private started=false;
  private paused=false;
  private muted=false;
  private bunny!:Picture;
  private actors:Picture[]=[];
  private targets:Target[]=[];
  private ui!:Phaser.GameObjects.Container;
  private selector:Phaser.GameObjects.Ellipse|undefined;
  private characters:Partial<Record<Friend,Picture>>={};
  private cue:Phaser.GameObjects.Container|undefined;
  private cueTimer:Phaser.Time.TimerEvent|undefined;
  private gestureTimer:Phaser.Time.TimerEvent|undefined;
  private restoreGesture:(()=>void)|undefined;
  private reaction:Phaser.Sound.BaseSound|undefined;
  private music:Phaser.Sound.BaseSound|undefined;
  private hintLevel=0;
  private picnicFood:Picture[]=[];
  private foodSelected:Picture|undefined;
  private lastInput=0;
  private dragStart:{x:number;y:number;object:Picture;choice:Choice;pointerId:number}|undefined;
  private dragGhost:Picture|undefined;
  private dragging=false;
  private idleHint:Phaser.Time.TimerEvent|undefined;
  constructor(){super('adventure');}
  preload():void {
    this.load.on('progress',(value:number)=>{document.querySelector<HTMLProgressElement>('#progress')!.value=value;});
    preload(this);
  }
  create():void {
    frames(this); document.querySelector('#loading')?.remove();
    try{this.muted=localStorage.getItem('bunnys-picnic-muted')==='true';}catch{}
    this.sound.mute=this.muted;this.updateSoundButton();
    // Passive touch listeners avoid Android's non-cancelable touchcancel warning.
    // Ignore the compatibility mouse events Chrome emits after the same touch.
    const ignoreTouchMouse=(event:Event):void=>{
      const mouse=event as MouseEvent & {sourceCapabilities?:{firesTouchEvents:boolean}};
      if(mouse.sourceCapabilities?.firesTouchEvents)event.stopImmediatePropagation();
    };
    for(const name of ['mousedown','mouseup','mousemove'])this.game.canvas.addEventListener(name,ignoreTouchMouse,true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const name of ['mousedown','mouseup','mousemove'])this.game.canvas.removeEventListener(name,ignoreTouchMouse,true);});
    this.input.dragDistanceThreshold=18;
    this.input.on('drag',(_pointer:Phaser.Input.Pointer,object:Picture,x:number,y:number)=>{
      if(object.getData('picnic')&&this.allowed()){object.setPosition(Phaser.Math.Clamp(x,545,1050),Phaser.Math.Clamp(y,520,790));this.selector?.setPosition(object.x,object.y);}
    });
    this.input.on('dragend',(_pointer:Phaser.Input.Pointer,object:Picture)=>{
      if(!object.getData('picnic')||!this.allowed())return;
      const nearest=places.reduce((best,pos,i)=>Phaser.Math.Distance.Between(object.x,object.y,pos[0],pos[1])<Phaser.Math.Distance.Between(object.x,object.y,places[best]![0],places[best]![1])?i:best,0);
      this.foodSelected=object;this.rearrange(nearest);
    });
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>this.moveDrag(pointer));
    this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>this.endDrag(pointer));
    this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.draw();this.startScreen();
        this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.idleHint?.remove();this.sound.stopAll();this.input.removeAllListeners();});
  }
  private sync():void {
    const canvas=this.game.canvas;canvas.dataset.room=this.p.room;canvas.dataset.busy=String(this.busy);canvas.dataset.progress=JSON.stringify(this.p);canvas.dataset.selected=this.selected??'';
  }
  private save():void {
    if(!saveProgress(this.p))document.querySelector('#status')!.textContent='Η αποθήκευση δεν είναι διαθέσιμη. Κρατήστε αυτή την καρτέλα ανοιχτή.';
    this.sync();
  }
  private commit(action:Action):boolean {const next=advance(this.p,action);if(next===this.p)return false;this.clearCue();this.p=next;this.hintLevel=0;this.save();return true;}
  private setBusy(value:boolean):void {this.busy=value;this.sync();}
  private allowed():boolean {return this.started&&!this.busy&&!this.paused;}
  private startScreen():void {
    this.setBusy(true);
    const cover=this.add.rectangle(800,480,1600,960,0xf8efd9,.55).setDepth(1000).setInteractive();
    const card=this.add.rectangle(800,470,610,550,0xfff5df,.97).setStrokeStyle(5,0xc5aa7e).setDepth(1001);
    const bunny=this.add.image(800,390,'poses','bunny3').setDisplaySize(230,315).setDepth(1002);
    const play=this.add.circle(800,640,76,0xa3b775).setStrokeStyle(4,0x7d955b).setDepth(1002).setInteractive({useHandCursor:true});
    const triangle=this.add.triangle(810,640,0,0,0,65,55,32,0xfffbdf).setDepth(1003);
    play.on('pointerup',()=>{if(this.started)return;this.started=true;[cover,card,bunny,play,triangle].forEach(o=>o.destroy());this.time.delayedCall(150,()=>this.setBusy(false));this.music=this.sound.add('music',{loop:true,volume:.13});this.music.play();this.react('happy');this.time.delayedCall(1100,()=>this.request());});
  }
  private picture(key:string,frame:string|number,x:number,y:number,w:number,h?:number):Picture {
    const image=this.add.image(x,y,key,frame);const natural=image.height/image.width;image.setDisplaySize(w,h??w*natural);return image;
  }
  private object(frame:number,x:number,y:number,w:number,h?:number):Picture{return this.picture('props',frame,x,y,w,h);}
  private actor(key:string,frame:string|number,x:number,y:number,w:number,friend:Friend='bunny'):Picture {
    const shadow=this.add.ellipse(x,y-8,w*.5,26,0x495e39,.14);
    const actor=this.picture(key,frame,x,y,w).setOrigin(.5,1).setDepth(1+y/1000).setName('actor-'+friend).setData('shadow',shadow);this.actors.push(actor);this.characters[friend]=actor;
    this.tweens.add({targets:actor,scaleY:actor.scaleY*1.015,duration:1600+this.actors.length*173,yoyo:true,repeat:-1,ease:'Sine.InOut'});return actor;
  }
  update():void {
    // Feet determine which character is nearer, independently of creation order.
    for(const actor of this.actors)if(actor.active){
      actor.setDepth(1+actor.y/1000);
      const shadow=actor.getData('shadow') as Phaser.GameObjects.Ellipse;
      shadow.setX(actor.x).setVisible(actor.visible);
    }
  }
  private followWalkingShadow():void {
    const shadow=this.bunny.getData('shadow') as Phaser.GameObjects.Ellipse;
    shadow.setPosition(this.bunny.x,this.bunny.y-8);
  }
  private draw():void {
    this.clearCue();this.reaction?.destroy();this.reaction=undefined;this.cancelDrag();this.tweens.killAll();this.time.removeAllEvents();
    this.children.removeAll(true);this.targets=[];this.actors=[];this.characters={};this.picnicFood=[];this.foodSelected=undefined;this.selector=undefined;this.selected=undefined;
    this.add.image(800,480,this.p.room).setDisplaySize(1600,960);
    // Background taps walk only on the safe near bank / open floor.
    this.add.zone(800,730,1600,320).setInteractive().on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(this.allowed()&&!this.dragging)this.walk(this.p.room==='nook'?430:Phaser.Math.Clamp(pointer.x,270,1280),this.p.room==='nook'?825:this.p.room==='pond'?740:Phaser.Math.Clamp(pointer.y,680,815));});
    this[this.p.room]();this.interface();this.sync();
    this.idleHint=this.time.addEvent({delay:18000,loop:true,callback:()=>{if(this.allowed()&&this.time.now-this.lastInput>16000)this.request();}});
  }
  private zone(id:string,x:number,y:number,w:number,h:number,run:()=>void):void {
    this.targets.push({id,x,y,w,h,run});
    this.add.zone(x,y,w,h).setName(id).setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.allowed()&&!this.dragging){this.lastInput=this.time.now;run();}});
  }
  private choose(image:Picture,choice:Choice):void {
    image.setInteractive({useHandCursor:true});
    image.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      if(!this.allowed()||this.dragStart)return;this.clearCue();this.lastInput=this.time.now;this.selected=choice;this.selection(image.x,image.y);this.sync();
      this.dragStart={x:pointer.x,y:pointer.y,object:image,choice,pointerId:pointer.id};
    });
  }
  private selection(x:number,y:number):void {
    this.selector?.destroy();this.selector=this.add.ellipse(x,y,145,130).setStrokeStyle(6,0xf3c46d,.9).setDepth(80);
  }
  private moveDrag(pointer:Phaser.Input.Pointer):void {
    const d=this.dragStart;if(!d||pointer.id!==d.pointerId||!pointer.isDown||!this.allowed())return;
    if(!this.dragging&&Phaser.Math.Distance.Between(d.x,d.y,pointer.x,pointer.y)>20){this.dragging=true;this.dragGhost=this.picture(d.object.texture.key,d.object.frame.name,pointer.x,pointer.y,145).setDepth(110).setAlpha(.88);}
    if(this.dragGhost)this.dragGhost.setPosition(pointer.x,pointer.y-15);
  }
  private endDrag(pointer:Phaser.Input.Pointer):void {
    if(!this.dragStart||pointer.id!==this.dragStart.pointerId)return;
    if(this.dragging&&this.allowed()){
      const target=[...this.targets].reverse().find(t=>Math.abs(pointer.x-t.x)<t.w/2+35&&Math.abs(pointer.y-t.y)<t.h/2+35);
      if(target)target.run();else this.retry();
    }
    this.dragGhost?.destroy();this.dragGhost=undefined;this.dragStart=undefined;
    this.time.delayedCall(0,()=>{this.dragging=false;});
  }
  private cancelDrag():void {this.dragGhost?.destroy();this.dragGhost=undefined;this.dragStart=undefined;this.dragging=false;}
  private interface():void {
    this.ui=this.add.container(0,0).setDepth(90);
    inventory(this.p).forEach((tool,i)=>{const x=640+i*160;const bg=this.add.rectangle(x,868,143,133,0xfff4dc,.94).setStrokeStyle(3,0xc6aa76);this.ui.add(bg);const icon=this.object(prop[tool],x,868,113,103);this.choose(icon,tool);this.ui.add(icon);});
    const help=this.add.circle(1480,855,64,0xfff2d5,.94).setStrokeStyle(3,0xb5a06a).setInteractive({useHandCursor:true});
    const face=this.picture('poses','bunny0',1480,867,88,120);this.ui.add([help,face]);help.on('pointerup',()=>{if(this.allowed())this.hint();});
    if(this.p.room!=='garden')this.destination('garden',115,852);
  }
  private destination(room:Room,x:number,y:number):void {
    const border=this.add.rectangle(x,y,182,132,0xfff4d9,.97).setStrokeStyle(5,0xb69962).setDepth(85);
    const pic=this.add.image(x,y-8,room).setDisplaySize(160,96).setDepth(86);
    this.destinationPortrait(room,x+48,y-6).setDepth(87);
    this.add.text(x,y+42,this.p.room==='garden'?'➜':'↶',{fontSize:'38px',color:'#6d663a'}).setOrigin(.5).setDepth(87);
    border.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.allowed())this.travel(room);});pic.setName('exit-'+room);
  }
  private destinationPortrait(room:Room,x:number,y:number):Picture {
    if(room==='pond')return this.picture('friends',5,x,y,58,68);
    if(room==='nook')return this.picture('friends',2,x,y,64,70);
    if(room==='orchard')return this.picture('friends',0,x,y,62,73);
    return this.object(room==='shed'?1:5,x,y,65,60);
  }
  private travel(room:Room):void {
    if(!this.p.cloth){this.request();this.pulse(690,650);return;}
    if(!this.commit({type:'travel',room}))return;
    this.setBusy(true);this.cameras.main.fadeOut(230,245,235,210);
    this.time.delayedCall(240,()=>{this.draw();this.cameras.main.fadeIn(350,245,235,210);this.setBusy(false);this.time.delayedCall(650,()=>this.request());});
  }
  private walk(x:number,y:number,then?:()=>void):void {
    this.clearCue();if(!this.bunny||!this.bunny.active){then?.();return;}
    if(this.p.room==='nook'&&this.p.bridge&&this.bunny.y<550&&y>650){
      this.tweens.killTweensOf(this.bunny);this.bunny.setTexture('poses','bunny1');
      this.tweens.chain({targets:this.bunny,onUpdate:()=>this.followWalkingShadow(),tweens:[{x:960,y:465,duration:250},{x:555,y:785,duration:1200},{x,y,duration:300}],onComplete:()=>{this.bunny.setTexture('poses','bunny0');then?.();}});return;
    }
    this.tweens.killTweensOf(this.bunny);this.bunny.setTexture('poses','bunny1');this.bunny.setFlipX(x<this.bunny.x);
    this.sfx('step');this.tweens.add({targets:this.bunny,x,y,onUpdate:()=>this.followWalkingShadow(),duration:Phaser.Math.Clamp(Phaser.Math.Distance.Between(x,y,this.bunny.x,this.bunny.y)*1.2,300,1100),ease:'Sine.InOut',onComplete:()=>{this.bunny.setTexture('poses','bunny0').setFlipX(false);then?.();}});
  }
  private pulse(x:number,y:number):void {
    const ring=this.add.ellipse(x,y,140,110).setStrokeStyle(5,0xffedb6,.9).setDepth(95);
    this.tweens.add({targets:ring,scale:1.35,alpha:0,duration:1100,onComplete:()=>ring.destroy()});
  }
  private hop(actor:Picture):void {this.tweens.add({targets:actor,y:actor.y-28,duration:220,yoyo:true,repeat:1,ease:'Sine.Out'});}
  private sfx(key:string):void {if(this.cache.audio.exists(key))this.sound.play(key,{volume:key==='success'?.25:.4});}
  private finish():void {
    this.draw();this.setBusy(false);this.react('happy');
    this.time.delayedCall(1000,()=>{if(this.allowed())this.request();});
  }
  private retry():void {
    this.react('curious');this.showGuidance(1,false);
    if(this.selector)this.tweens.add({targets:this.selector,alpha:.2,yoyo:true,repeat:1,duration:180});
  }
  private use(tool:Tool,action:Action,animation:()=>void):void {
    if(this.selected!==tool){if(this.selected)this.retry();else this.request();return;}
    if(!this.commit(action))return;this.setBusy(true);this.selector?.destroy();animation();
  }
  private garden():void {
    const p=this.p;
    for(const [x,y] of [[580,465],[1050,470],[405,790],[1140,790]])this.object(11,x!,y!,180,115);
    this.object(p.cloth?5:4,795,655,p.cloth?700:230,p.cloth?380:150);
    this.bunny=this.actor(p.cloth?'friends':'poses',p.cloth?4:'bunny0',p.cloth?410:440,p.cloth?805:720,p.cloth?245:245);
    if(p.duck)this.actor('friends',5,1080,535,210,'duck');
    if(hedgehogReady(p))this.actor('friends',2,1145,805,225,'hedgehog');
    if(p.apples)this.actor('friends',0,600,505,240,'puppy');
    this.zone('bunny',420,p.cloth?650:560,200,260,()=>complete(p)?this.dance():this.request());
    if(!p.cloth)this.zone('cloth',795,650,320,220,()=>{
      if(!this.commit({type:'cloth'}))return;this.setBusy(true);this.walk(550,670,()=>{
        this.bunny.setTexture('actions',0);const cloth=this.object(5,770,590,200,110).setDepth(20);this.sfx('rustle');
        this.tweens.add({targets:cloth,displayWidth:700,displayHeight:380,y:655,duration:1250,ease:'Sine.Out',onComplete:()=>{this.hop(this.bunny);this.time.delayedCall(700,()=>this.finish());}});
      });
    });
    if(p.cloth){this.destination('shed',130,390);this.destination('pond',1460,390);this.destination('nook',350,235);this.destination('orchard',1100,235);}
    if(friendsReady(p)){
      for(let i=0;i<4;i++){
        const [x,y]=places[i]!;
        this.object(8,x,y,185,130).setAlpha(p.plates[i]?1:.17);
        if(p.served[i]){
          const apple=this.object(9,x,y-18,83,85).setDepth(35).setData('place',i);this.picnicFood.push(apple);
          if(complete(p)){apple.setData('picnic',true).setInteractive({useHandCursor:true});this.input.setDraggable(apple);apple.on('pointerdown',()=>{if(this.allowed()){this.foodSelected=apple;this.selection(apple.x,apple.y);}});}
        }
        this.zone('place-'+i,x,y,215,145,()=>this.servePlace(i));
      }
      if(!p.plates.every(Boolean)){
        this.picture('extras',4,1310,720,240,220);const plate=this.object(8,1305,635,170,120);this.choose(plate,'plate');
      }else if(!complete(p)){
        this.object(2,1305,680,250,200);const apple=this.object(9,1300,625,110,115);this.choose(apple,'apple');
        for(let i=1;i<4-p.served.filter(Boolean).length;i++)this.object(9,1270+i*30,635,62,65);
      }
    }
    if(complete(p)){
      const ball=this.object(10,1285,735,130).setDepth(4);this.zone('ball-play',1285,735,170,170,()=>this.passBall(ball));
      this.actors.forEach(actor=>this.zone('friend-dance',actor.x,actor.y-110,160,200,()=>this.dance()));
      this.object(2,1320,540,165,145);const snack=this.object(9,1320,515,80);this.zone('snack',1320,535,150,140,()=>{this.hop(snack);this.sfx('crunch');this.actors.forEach(a=>this.hop(a));});
    }
    this.scenery(190,145,1325,135);
  }
  private servePlace(index:number):void {
    if(complete(this.p)){this.rearrange(index);return;}
    const isPlate=!this.p.plates.every(Boolean),choice=isPlate?'plate':'apple';
    if(this.selected!==choice){this.showGuidance(1);this.pulse(1305,640);return;}
    if(!this.commit({type:isPlate?'plate':'serve',index})){this.retry();return;}
    this.setBusy(true);const [x,y]=places[index]!;const item=this.object(isPlate?8:9,1305,635,isPlate?170:90).setDepth(40);
    this.tweens.add({targets:item,x,y:y-(isPlate?0:18),duration:650,ease:'Sine.InOut',onComplete:()=>{
      this.sfx(isPlate?'plate':'pop');
      if(complete(this.p)){this.draw();this.setBusy(true);this.react('happy','bunny');this.time.delayedCall(1400,()=>this.feast());}
      else{this.draw();this.setBusy(false);this.selected=choice;this.selection(1305,635);if(isPlate&&this.p.plates.every(Boolean)){this.selected=undefined;this.selector?.destroy();this.request();}this.sync();}
    }});
  }
  private feast():void {
    const mouths=[[600,395],[1080,440],[410,665],[1145,690]];
    this.picnicFood.forEach((apple,i)=>this.tweens.add({targets:apple,x:mouths[i]![0],y:mouths[i]![1],displayWidth:70,displayHeight:70,duration:650,ease:'Sine.InOut'}));
    this.time.delayedCall(700,()=>{this.sfx('crunch');this.actors.forEach(a=>this.hop(a));
      this.time.delayedCall(1700,()=>{this.draw();this.setBusy(false);this.sfx('success');this.request();});
    });
  }
  private rearrange(index:number):void {
    const chosen=this.foodSelected;
    if(!chosen){this.pulse(places[index]![0],places[index]![1]);return;}
    const old=Number(chosen.getData('place')),other=this.picnicFood.find(a=>a!==chosen&&a.getData('place')===index);
    const move=(apple:Picture,place:number):void=>{apple.setData('place',place);this.tweens.add({targets:apple,x:places[place]![0],y:places[place]![1]-18,duration:400,ease:'Sine.InOut'});};
    move(chosen,index);if(other)move(other,old);this.sfx('plate');this.foodSelected=undefined;this.selector?.destroy();
  }
  private shed():void {
    this.bunny=this.actor('poses','bunny0',430,780,275);
    for(const [tool,x] of [['plank',750],['net',1080]] as const){
      if((tool==='plank'&&this.p.plankTaken)||(tool==='net'&&this.p.netTaken))continue;
      const image=this.object(prop[tool],x,430,tool==='plank'?340:295,360);
      this.zone('take-'+tool,x,440,330,450,()=>{
        if(!this.commit({type:'collect',tool}))return;this.setBusy(true);this.walk(x-120,785,()=>{
          this.sfx(tool==='plank'?'wood':'rustle');this.tweens.add({targets:image,x:720,y:868,displayWidth:110,displayHeight:100,duration:700,ease:'Sine.InOut',onComplete:()=>this.finish()});
        });
      });
    }
    const pin=this.picture('extras',1,1380,325,150);this.zone('pinwheel',1380,325,170,180,()=>{this.sfx('rustle');this.tweens.add({targets:pin,angle:360,duration:1400,ease:'Cubic.Out',onComplete:()=>pin.setAngle(0)});});
    const can=this.picture('extras',0,1260,730,180);const flower=this.picture('extras',5,1450,740,135);
    this.zone('water-can',1270,730,200,190,()=>{this.sfx('water');this.tweens.add({targets:can,angle:25,duration:450,yoyo:true});const drops=this.picture('extras',6,1380,690,115);this.tweens.add({targets:drops,y:760,alpha:0,duration:900,onComplete:()=>drops.destroy()});this.hop(flower);});
  }
  private pond():void {
    this.bunny=this.actor('poses','bunny0',450,650,290);
    if(!this.p.duck){
      const duck=this.actor('poses','duck0',790,620,265,'duck');
      this.zone('duck',790,510,270,275,()=>{this.hop(duck);this.request();});
      const ball=this.object(10,1260,565,150).setDepth(4);
      this.tweens.add({targets:ball,y:575,angle:5,duration:1600,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      this.zone('pond-ball',1260,565,350,310,()=>this.use('net',{type:'duck'},()=>{
        this.walk(860,640,()=>{
          this.bunny.setTexture('poses','bunny2');const net=this.picture('poses','net',1060,610,370,410).setOrigin(.15,.8).setAngle(-35).setDepth(30);
          this.tweens.killTweensOf(ball);this.tweens.add({targets:net,x:1190,y:600,angle:-8,duration:1100,onComplete:()=>{
            this.sfx('water');this.tweens.add({targets:ball,x:1060,y:430,duration:900});this.tweens.add({targets:net,x:990,y:465,angle:-35,duration:900,onComplete:()=>{
              this.tweens.add({targets:ball,x:790,y:540,duration:650,onComplete:()=>{duck.setTexture('poses','duck1');this.hop(duck);this.bunny.setTexture('poses','bunny3');this.react('happy','duck');this.time.delayedCall(1500,()=>{this.tweens.add({targets:[duck,ball],x:'-=1000',duration:1300,ease:'Sine.In',onComplete:()=>this.finish()});});}});
            }});
          }});
        });
      }));
    }else this.object(1,860,680,260,220).setAngle(-30);
    this.zone('water-ripple',1080,765,240,130,()=>{this.sfx('water');for(let i=0;i<3;i++){const ring=this.add.ellipse(1080,765,70,20).setStrokeStyle(3,0xe9f4df,.8);this.tweens.add({targets:ring,scaleX:3,scaleY:2,alpha:0,delay:i*180,duration:1200,onComplete:()=>ring.destroy()});}});
    this.scenery(260,240,1440,230);
  }
  private nook():void {
    this.bunny=this.actor('poses','bunny0',this.p.bridge?920:430,this.p.bridge?455:815,this.p.bridge?220:280);
    if(this.p.bridge)this.object(0,765,620,610,340).setAngle(-12);
    else this.zone('puddle',790,625,650,330,()=>this.use('plank',{type:'bridge'},()=>{
      const plank=this.object(0,620,510,420,230).setAngle(-25).setDepth(25);
      this.tweens.add({targets:plank,x:765,y:620,displayWidth:610,displayHeight:340,angle:-12,duration:1250,ease:'Sine.Out',onComplete:()=>{this.sfx('wood');this.walk(890,455,()=>this.finish());}});
    }));
    if(!hedgehogReady(this.p)){
      const hedge=this.actor('friends',2,1050,465,220,'hedgehog');this.zone('hedgehog',1050,350,200,210,()=>{this.hop(hedge);this.request();});
      this.object(2,900,380,120,110);
    }
    const count=this.p.leaves.filter(Boolean).length;
    if(count)this.object(7,1360,400,230,100).setAlpha(.5+count/6);
    for(let i=0;i<3;i++)if(!this.p.leaves[i]){
      const leaf=this.object(6,1150+i*145,525+(i%2)*30,145,115);this.choose(leaf,`leaf${i}`);
    }
    this.zone('leaf-bed',1360,365,350,240,()=>{
      if(!this.p.bridge){this.request();this.pulse(765,620);return;}
      if(!this.selected?.startsWith('leaf')){this.showGuidance(1);this.pulse(1300,540);return;}
      const i=Number(this.selected.slice(4));if(!this.commit({type:'leaf',index:i}))return;this.setBusy(true);
      const leaf=this.object(6,1150+i*145,525+(i%2)*30,145,115).setDepth(30);this.sfx('rustle');
      this.tweens.add({targets:leaf,x:1360,y:395,displayWidth:195,displayHeight:90,duration:700,onComplete:()=>{
        if(hedgehogReady(this.p)){
          this.clearCue();this.actors[1]?.setVisible(false);const hedge=this.picture('friends',3,1070,360,240);this.hop(hedge);this.react('happy','hedgehog');
          this.time.delayedCall(1800,()=>{this.react('happy','hedgehog');const basket=this.object(2,1040,450,170);this.tweens.add({targets:basket,x:720,y:868,displayWidth:113,displayHeight:103,duration:1000,onComplete:()=>this.time.delayedCall(500,()=>this.tweens.add({targets:hedge,x:200,duration:1400,onComplete:()=>this.finish()}))});});
        }else this.finish();
      }});
    });
    this.scenery(160,310,630,145);
  }
  private orchard():void {
    const p=this.p;
    this.bunny=this.actor('poses',p.box?'bunny2':'bunny0',p.box?940:400,p.box?625:770,270);
    if(!p.apples){const puppy=this.actor('friends',0,700,660,280,'puppy');this.zone('puppy',700,540,245,250,()=>{this.hop(puppy);this.request();});}
    if(!p.box)this.object(3,950,685,300,185).setAlpha(.12);
    if(!p.basketPlaced&&!p.apples&&hedgehogReady(p))this.object(2,1230,720,245,200).setAlpha(.17);
    const box=this.object(3,p.box?950:240,p.box?685:730,300,185);
    if(!p.box)this.choose(box,'box');
    if(!p.box)this.zone('box-place',945,685,360,230,()=>{
      if(this.selected!=='box'){this.showGuidance(1);this.pulse(240,730);return;}
      if(!this.commit({type:'box'}))return;this.setBusy(true);this.walk(480,760,()=>{this.bunny.setTexture('actions',1);this.sfx('wood');this.tweens.add({targets:box,x:950,y:685,duration:1300,ease:'Sine.InOut'});this.tweens.add({targets:this.bunny,x:810,duration:1300,onComplete:()=>{this.tweens.add({targets:this.bunny,x:940,y:625,duration:650,ease:'Sine.Out',onComplete:()=>{const leaf=this.object(6,700,480,85,70).setDepth(4);this.sfx('rustle');this.time.delayedCall(1100,()=>{leaf.destroy();this.finish();});}});}});});
    });
    if(p.basketPlaced&&!p.apples)this.object(2,1230,720,245,200).setName('orchard-basket');
    if(!p.basketPlaced)this.zone('basket-place',1230,720,350,270,()=>this.use('basket',{type:'basket'},()=>{
      const basket=this.object(2,730,850,113,103).setDepth(30);this.tweens.add({targets:basket,x:1230,y:720,displayWidth:245,displayHeight:200,duration:900,ease:'Sine.InOut',onComplete:()=>this.finish()});
    }));
    if(!p.apples){
      const apples=[this.object(9,840,210,105),this.object(9,1000,235,105),this.object(9,1160,270,105),this.object(9,1290,330,105)].map(apple=>apple.setDepth(4));
      this.zone('branch',1080,265,670,310,()=>{
        if(!p.box){this.showGuidance(1);return;}
        if(!p.basketPlaced){this.showGuidance(1);return;}
        if(!this.commit({type:'apples'}))return;this.setBusy(true);this.bunny.setTexture('poses','bunny2');this.sfx('rustle');
        apples.forEach((apple,i)=>{this.tweens.add({targets:apple,x:i===3?940:1220+(i-1)*32,y:i===3?305:665,delay:400+i*420,duration:750,ease:'Quad.In',onComplete:()=>{this.sfx('pop');if(i===3){this.bunny.setTexture('poses','bunny0');this.react('happy','puppy');this.time.delayedCall(1500,()=>{this.tweens.add({targets:apple,x:1240,y:665,duration:600,onComplete:()=>{this.react('happy','puppy');this.actors[1]?.setVisible(false);this.children.getByName('orchard-basket')?.destroy();apples.forEach(a=>a.destroy());const pup=this.picture('friends',1,1100,640,300).setDepth(40);this.time.delayedCall(1000,()=>this.tweens.add({targets:pup,x:180,y:780,duration:1600,onComplete:()=>this.finish()}));}});});}}});});
      });
    }
    this.scenery(195,285,1450,445);
  }
  private scenery(x:number,y:number,bx:number,by:number):void {
    const butterfly=this.picture('extras',2,x,y,95);this.tweens.add({targets:butterfly,y:y-15,duration:1800,yoyo:true,repeat:-1,ease:'Sine.InOut'});
    this.zone('butterfly',x,y,170,150,()=>{this.sfx('pop');this.tweens.add({targets:butterfly,x:x+180,y:y-90,angle:20,duration:1000,yoyo:true,ease:'Sine.InOut'});});
    const bird=this.picture('extras',3,bx,by,105);
    this.zone('bird',bx,by,150,150,()=>{this.sfx('bird');this.hop(bird);});
  }
  private dance():void {this.clearCue();this.react('happy','puppy');this.sfx('success');this.actors.forEach((actor,i)=>{this.tweens.add({targets:actor,angle:i%2?8:-8,y:actor.y-20,duration:300,yoyo:true,repeat:3,ease:'Sine.InOut'});});}
  private passBall(ball:Picture):void {
    this.clearCue();this.react('happy','duck');this.setBusy(true);let i=0;const pass=():void=>{const pos=[[1100,465],[690,365],[425,570],[1120,670],[1285,735]][i++];if(!pos){this.setBusy(false);return;}this.sfx('pop');this.tweens.add({targets:ball,x:pos[0],y:pos[1],angle:ball.angle+120,duration:550,ease:'Sine.InOut',onComplete:pass});};pass();
  }
  private clearCue():void {
    this.cueTimer?.remove();this.cueTimer=undefined;
    this.gestureTimer?.remove();this.gestureTimer=undefined;
    this.restoreGesture?.();this.restoreGesture=undefined;
    if(this.cue){for(const object of this.cue.list)this.tweens.killTweensOf(object);this.cue.destroy();this.cue=undefined;}
    delete this.game.canvas.dataset.cue;
  }
  private react(mood:'happy'|'curious',friend:Friend='bunny'):void {
    if(!this.started||this.paused)return;
    this.reaction?.destroy();this.reaction=this.sound.add(friend+'-'+mood,{volume:.65});this.reaction.play();
    if(mood==='happy'&&!this.busy)this.gesture(friend,true);
  }
  private gesture(friend:Friend,happy:boolean,targetX=1200):void {
    this.gestureTimer?.remove();this.restoreGesture?.();this.restoreGesture=undefined;
    const actor=this.characters[friend];if(!actor?.active||!actor.visible)return;
    const key=actor.texture.key,frame=actor.frame.name,w=actor.displayWidth,h=actor.displayHeight,flip=actor.flipX;
    const breathing=this.tweens.getTweensOf(actor);breathing.forEach(tween=>tween.pause());
    const base={bunny:0,duck:2,puppy:4,hedgehog:6}[friend];
    actor.setTexture('gestures',base+(happy?1:0)).setDisplaySize(h*actor.width/actor.height,h).setFlipX(!happy&&targetX<actor.x);
    this.restoreGesture=()=>{if(actor.active){actor.setTexture(key,frame).setDisplaySize(w,h).setFlipX(flip);breathing.forEach(tween=>tween.resume());}};
    this.gestureTimer=this.time.delayedCall(happy?1100:2600,()=>{this.restoreGesture?.();this.restoreGesture=undefined;});
  }
  private request():void {if(this.allowed())this.showGuidance(0);}
  private hint():void {this.lastInput=this.time.now;this.showGuidance(Math.min(2,++this.hintLevel));}
  private showGuidance(level:number,noise=true):void {
    if(!this.started||this.paused||this.busy)return;
    this.clearCue();const plan=guidance(this.p);
    this.game.canvas.dataset.cue=plan.id+':'+level;
    const cue=this.add.container(0,0).setDepth(96);this.cue=cue;
    const add=<T extends Phaser.GameObjects.GameObject>(object:T):T=>{cue.add(object);return object;};
    const actor=this.characters[plan.actor]??this.bunny;
    const goalX=plan.route.length&&this.p.room!=='garden'&&level===0
      ? this.p.room==='pond'?1260:this.p.room==='nook'?765:1080:plan.target[0];
    this.gesture(plan.actor,plan.action==='play',goalX);
    if(noise)this.react(plan.action==='play'?'happy':'curious',plan.actor);
    const bx=Phaser.Math.Clamp(actor.x+170,230,1340),by=Phaser.Math.Clamp(actor.y-actor.displayHeight-50,120,430);
    add(this.add.ellipse(bx,by,220,155,0xfff8e5,.97).setStrokeStyle(3,0xc1aa78));
    // The two small circles attach the thought picture to its character.
    add(this.add.circle(bx-50,by+85,12,0xfff8e5));add(this.add.circle(bx-75,by+108,7,0xfff8e5));
    add(this.object(level===0?plan.goal:plan.tool,bx,by,130,100));
    const mark=(x:number,y:number,delay=0):void=>{
      const ring=add(this.add.ellipse(x,y,140,110).setStrokeStyle(5,0xffedb6,.9));
      this.tweens.add({targets:ring,scale:1.3,alpha:0,delay,duration:1000,repeat:1});
    };
    if(plan.route.length&&(level>0||this.p.room==='garden'||plan.route[0]==='garden'&&plan.route.length===1)){
      const start=800-(plan.route.length-1)*115;
      plan.route.forEach((room,i)=>{
        const x=start+i*230;add(this.add.rectangle(x,130,190,138,0xfff4d9,.97).setStrokeStyle(3,0xb69962));
        add(this.add.image(x,130,room).setDisplaySize(175,112));add(this.destinationPortrait(room,x+48,130));
        if(i>0)add(this.add.triangle(x-115,130,0,0,0,30,22,15,0x8a9860));
      });
      mark(...plan.target);
      if(level===2){const ghost=add(this.add.image(800,130,plan.route[0]!).setDisplaySize(145,95).setAlpha(.8));this.tweens.add({targets:ghost,x:plan.target[0],y:plan.target[1],duration:1800,delay:400,alpha:.1});}
    }else if(level===0){
      const goalY=plan.route.length&&this.p.room!=='garden'?this.p.room==='pond'?565:this.p.room==='nook'?620:265:plan.action==='collect'?plan.source[1]:plan.target[1];
      mark(plan.action==='collect'?plan.source[0]:goalX,goalY);
    }else{
      mark(...plan.source);mark(...plan.target,650);
      if(level===2){
        const ghost=add(this.object(plan.tool,plan.source[0],plan.source[1],145,115).setAlpha(.75));
        if(plan.action==='spread')this.tweens.add({targets:ghost,displayWidth:450,displayHeight:240,duration:1500,delay:400,onStart:()=>ghost.setFrame(5)});
        else if(plan.action==='shake')this.tweens.add({targets:ghost,angle:12,duration:160,yoyo:true,repeat:3,onComplete:()=>{this.tweens.add({targets:ghost,x:plan.target[0],y:plan.target[1],duration:1000,ease:'Quad.In'});}});
        else this.tweens.add({targets:ghost,x:plan.target[0],y:plan.target[1],duration:1800,delay:400,ease:'Sine.InOut'});
      }
    }
    this.cueTimer=this.time.delayedCall(4200,()=>this.clearCue());
  }
  parentPause(value:boolean):void {this.paused=value;if(value){this.reaction?.stop();this.sound.pauseAll();this.scene.pause();}else{this.scene.resume();this.sound.resumeAll();}}
  visibility(hidden:boolean):void {if(!this.started)return;if(hidden){this.sound.pauseAll();this.reaction?.stop();}else if(!this.paused)this.sound.resumeAll();}
  toggleSound():void {this.muted=!this.muted;this.sound.mute=this.muted;try{localStorage.setItem('bunnys-picnic-muted',String(this.muted));}catch{}this.updateSoundButton();}
  private updateSoundButton():void {document.querySelector('#mute')!.textContent='Ήχος: '+(this.muted?'όχι':'ναι');}
  resetGame():void {this.p=freshProgress();this.save();this.draw();this.setBusy(false);this.request();}
}
