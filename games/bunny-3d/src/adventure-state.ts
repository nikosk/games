export const places = ['bedroom','pond','haystack','log','meadow','hill'] as const;
export type Place = typeof places[number];
export type Slot = 'source'|'low'|'high';
export type Held = 'pond-branch'|'small-block'|'tall-block'|'stone'|'lever'|'can'|null;
export interface Save {
  version: 1; place: Place; stone: boolean; branch: boolean; pond: boolean;
  small: Slot; tall: Slot; hay: boolean; rock: boolean; lever: boolean; log: boolean;
  can: boolean; water: boolean; spout: boolean; flowers: boolean; placed: boolean; complete: boolean;
}
export const freshSave = (): Save => ({version:1,place:'bedroom',stone:false,branch:false,pond:false,
  small:'source',tall:'source',hay:false,rock:false,lever:false,log:false,can:false,water:false,
  spout:false,flowers:false,placed:false,complete:false});
export const colorCount = (s:Save):number => (s.pond?2:0)+(s.hay?1:0)+(s.log?1:0)+(s.flowers?2:0);
export const allColors = (s:Save):boolean => s.pond&&s.hay&&s.log&&s.flowers;
export const unlocked = (s:Save,p:Place):boolean => p==='bedroom'||(s.stone&&(p==='pond'||s.pond));
export const restored = (s:Save,p:Place):boolean => p==='pond'?s.pond:p==='haystack'?s.hay:p==='log'?s.log:p==='meadow'?s.flowers:p==='hill'?s.complete:s.complete;

/** Saves are untrusted input. Recover safe progress, never impossible locked states. */
export function readSave(raw:string|null):Save {
  const s=freshSave();if(!raw)return s;
  try {
    const v:unknown=JSON.parse(raw);if(!v||typeof v!=='object'||!('version' in v)||v.version!==1)return s;
    const o=v as Record<string,unknown>;
    for(const k of ['stone','branch','pond','hay','rock','lever','log','can','water','spout','flowers','placed','complete'] as const)s[k]=o[k]===true;
    for(const k of ['small','tall'] as const)if(['source','low','high'].includes(String(o[k])))s[k]=o[k] as Slot;
    if(s.small!=='source'&&s.small===s.tall){s.small='source';s.tall='source';}
    if(s.complete)s.placed=true;
    if(s.placed){s.pond=true;s.hay=true;s.log=true;s.flowers=true;}
    if(s.flowers){s.can=true;s.spout=true;s.pond=true;}
    if(s.hay){s.small='low';s.tall='high';s.pond=true;}
    if(s.log){s.rock=true;s.lever=true;s.pond=true;}
    if(s.lever)s.rock=true;
    if(s.pond){s.branch=true;s.stone=true;}
    if(s.water)s.can=true;
    if(places.includes(o.place as Place)&&unlocked(s,o.place as Place))s.place=o.place as Place;
  }catch{/* A damaged save starts a fresh adventure. */}
  return s;
}

export interface Result { state:Save; held:Held; effect:string; hint?:string }
/** All puzzle rules live here, separate from movement and the authored animations. */
export function interact(state:Save,id:string,held:Held):Result {
  const s={...state};let effect='look',hint:string|undefined;
  switch(id){
    case 'rainbow-stone':s.stone=true;effect='stone';break;
    case 'pond-branch':if(!s.pond){s.branch=true;held='pond-branch';effect='pickup';}break;
    case 'leaves':
      if(s.branch){s.pond=true;held=null;effect='pond';}else hint='pond-branch';break;
    case 'can':s.can=true;held='can';effect='pickup';break;
    case 'water':
      if(s.can&&s.pond){s.water=true;held='can';effect='fill';}else hint=s.pond?'can':'pond-branch';break;
    case 'small-block':case 'tall-block':if(!s.hay){held=id;effect='pickup';}else effect='chick';break;
    case 'step-low':case 'step-high':{
      if(s.hay){effect='chick';break;}
      if(held!=='small-block'&&held!=='tall-block'){hint='small-block';break;}
      const key=held==='small-block'?'small':'tall',other=key==='small'?'tall':'small';
      const slot=id==='step-low'?'low':'high';
      if(s[other]===slot)s[other]=s[key];
      s[key]=slot;held=null;effect='step';
      if(s.small==='low'&&s.tall==='high'){s.hay=true;effect='hay';}
      break;
    }
    case 'chick':effect='chick';if(!s.hay)hint=s.tall!=='high'?'tall-block':'small-block';break;
    case 'stone':if(!s.rock){held='stone';effect='pickup';}break;
    case 'lever':if(!s.lever){held='lever';effect='pickup';}break;
    case 'fulcrum':
      if(held==='stone'&&!s.rock){s.rock=true;held=null;effect='rock';}
      else if(held==='lever'&&s.rock){s.lever=true;held=null;effect='lever';}
      else hint=s.rock?'lever':'stone';break;
    case 'fox':
      if(s.log)effect='fox';else if(s.lever){s.log=true;held=null;effect='log';}else hint=s.rock?'lever':'stone';break;
    case 'hill-frog':effect='frog';break;
    case 'hill-chick':effect='chick';break;
    case 'hill-fox':effect='fox';break;
    case 'ball':if(s.log)effect='ball';else hint=s.lever?'fox':s.rock?'lever':'stone';break;
    case 'spout':s.spout=!s.spout;effect='spout';break;
    case 'basin':case 'flowers':
      if(s.flowers){effect='bloom';break;}
      if(!s.can)hint='can';else if(!s.water)hint='water';
      else if(!s.spout){effect='spill';hint='spout';}
      else{s.flowers=true;s.water=false;held=null;effect='flowers';}break;
    case 'pedestal':
      if(allColors(s)){s.placed=true;held=null;effect='place';}else hint='colors';break;
    case 'bell':if(s.placed){s.complete=true;effect='finale';}else hint=allColors(s)?'pedestal':'colors';break;
    case 'frog':effect=s.pond?'frog':'look';if(!s.pond)hint=s.branch?'leaves':'pond-branch';break;
  }
  return {state:s,held,effect,...(hint?{hint}:{})};
}

export function nextHint(s:Save):string {
  if(!s.stone)return 'rainbow-stone';
  switch(s.place){
    case 'bedroom':return 'travel';
    case 'pond':return !s.branch?'pond-branch':!s.pond?'leaves':!s.can?'can':!s.water&&!s.flowers?'water':'travel';
    case 'haystack':return s.hay?'travel':s.tall!=='high'?'tall-block':s.small!=='low'?'small-block':'chick';
    case 'log':return s.log?'travel':!s.rock?'stone':!s.lever?'lever':'fox';
    case 'meadow':return s.flowers?'travel':!s.can?'can':!s.water?'water':!s.spout?'spout':'basin';
    case 'hill':return !allColors(s)?'colors':!s.placed?'pedestal':'bell';
  }
}
