import { complete, friendsReady, hedgehogReady, inventory, type Progress, type Room, type Tool } from './state';
export type Friend='bunny'|'duck'|'puppy'|'hedgehog';
type Point=readonly[number,number];
export interface Guidance {id:string;actor:Friend;goal:number;tool:number;source:Point;target:Point;route:Room[];action:'spread'|'carry'|'collect'|'shake'|'travel'|'play'}
export const PICNIC_PLACES=[[640,595],[950,595],[640,750],[950,750]] as const;
const exits:Record<Room,Point>={garden:[115,852],shed:[130,390],pond:[1460,390],nook:[350,235],orchard:[1100,235]};
function route(p:Progress,destination:Room,goal:number,tool=goal):Guidance {
  const rooms:Room[]=p.room==='garden'?[destination]:destination==='garden'?['garden']:['garden',destination];
  return {id:'visit-'+destination,actor:'bunny',goal,tool,source:exits[rooms[0]!],target:exits[rooms[0]!],route:rooms,action:'travel'};
}
export function guidance(p:Progress):Guidance {
  const make=(id:string,actor:Friend,goal:number,tool:number,source:Point,target:Point,action:Guidance['action']='carry'):Guidance=>({id,actor,goal,tool,source,target,route:[],action});
  const tray=(tool:Tool):Point=>[640+inventory(p).indexOf(tool)*160,868];
  switch(p.room){
    case 'garden':
      if(!p.cloth)return make('cloth','bunny',5,4,[795,650],[795,655],'spread');
      if(complete(p))return make('play','bunny',10,10,[1285,735],[1285,735],'play');
      if(friendsReady(p)){
        const plates=!p.plates.every(Boolean),list=plates?p.plates:p.served;
        return make(plates?'plates':'sharing','bunny',plates?8:9,plates?8:9,[1305,635],PICNIC_PLACES[list.findIndex(v=>!v)]!);
      }
      if((!p.duck&&!p.netTaken)||(!hedgehogReady(p)&&!p.plankTaken))return route(p,'shed',!p.plankTaken?0:1);
      if(!p.duck)return route(p,'pond',10);
      if(!hedgehogReady(p))return route(p,'nook',7);
      return route(p,'orchard',9);
    case 'shed':
      if(!p.plankTaken)return make('collect-plank','bunny',0,0,[750,430],[640+inventory(p).length*160,868],'collect');
      if(!p.netTaken)return make('collect-net','bunny',1,1,[1080,430],[640+inventory(p).length*160,868],'collect');
      return route(p,'garden',5);
    case 'pond':
      if(p.duck)return route(p,'garden',5);
      if(!p.netTaken)return {...route(p,'shed',10,1),actor:'duck'};
      return make('ball','duck',10,1,tray('net'),[1260,565]);
    case 'nook':
      if(hedgehogReady(p))return route(p,'garden',5);
      if(!p.bridge){
        if(!p.plankTaken)return route(p,'shed',0);
        return make('bridge','bunny',0,0,tray('plank'),[765,620]);
      }
      {const i=p.leaves.findIndex(v=>!v);return make('leaves','hedgehog',7,6,[1150+i*145,525+(i%2)*30],[1360,395]);}
    case 'orchard':
      if(p.apples)return route(p,'garden',5);
      if(!p.box)return make('box','puppy',9,3,[240,730],[945,685]);
      if(!p.basketPlaced){
        if(!hedgehogReady(p))return {...route(p,'nook',2,7),actor:'puppy'};
        return make('basket','puppy',2,2,tray('basket'),[1230,720]);
      }
      return make('apples','puppy',9,9,[1080,265],[1230,665],'shake');
  }
}
