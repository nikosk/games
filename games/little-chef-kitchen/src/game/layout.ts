export interface Rect { readonly x:number; readonly y:number; readonly width:number; readonly height:number; }
export interface KitchenLayout {
  readonly mode: "landscape" | "tablet" | "portrait";
  readonly counter: Rect; readonly title: Rect; readonly tray: Rect;
  readonly pantry: Rect; readonly toaster: Rect; readonly plate: Rect; readonly customer: Rect;
  readonly sockets: readonly Rect[];
}
const inside=(r:Rect,w:number,h:number)=>r.x>=0&&r.y>=0&&r.x+r.width<=w+.5&&r.y+r.height<=h+.5;
export function createKitchenLayout(width:number,height:number):KitchenLayout {
  const portrait=height>width, tablet=!portrait&&width<1100, mode=portrait?"portrait":tablet?"tablet":"landscape";
  const m=Math.max(14,Math.min(30,Math.min(width,height)*.025));
  if(!portrait){
    const right=Math.min(310,Math.max(245,width*.23));
    const counter={x:m,y:height*.25,width:width-right-m*2,height:height*.58};
    const stationW=Math.min(145,counter.width*.16), stationH=Math.min(170,counter.height*.48);
    const y=counter.y+counter.height*.43;
    const pantry={x:counter.x+counter.width*.05,y:y-stationH/2,width:stationW,height:stationH};
    const toaster={x:counter.x+counter.width*.43,y:y-stationH/2,width:stationW,height:stationH};
    const plate={x:counter.x+counter.width*.75,y:y-stationH/2,width:stationW,height:stationH};
    const gapW=Math.max(72,Math.min(110,counter.width*.13));
    const straight=(x:number)=>({x,y:y-22,width:gapW,height:44});
    return {mode,counter,title:{x:m,y:m,width:width-m*2,height:60},tray:{x:width-right-m+15,y:height*.67,width:right-30,height:92},pantry,toaster,plate,customer:{x:width-right-m+15,y:height*.16,width:right-30,height:height*.42},sockets:[straight(pantry.x+stationW+counter.width*.08),straight(toaster.x+stationW+counter.width*.08)]};
  }
  const title={x:m,y:m,width:width-m*2,height:142};
  const counter={x:m,y:height*.27,width:width-m*2,height:height*.6};
  const stationW=Math.min(145,width*.21),stationH=Math.min(175,counter.height*.52),y=counter.y+counter.height*.48;
  const pantry={x:counter.x+counter.width*.04,y:y-stationH/2,width:stationW,height:stationH};
  const toaster={x:counter.x+counter.width*.4,y:y-stationH/2,width:stationW,height:stationH};
  const plate={x:counter.x+counter.width*.76,y:y-stationH/2,width:stationW,height:stationH};
  const gapW=Math.max(72,Math.min(92,counter.width*.14)),straight=(x:number)=>({x,y:y-20,width:gapW,height:40});
  return {mode,counter,title,tray:{x:width*.06,y:title.y+88,width:width*.52,height:66},pantry,toaster,plate,customer:{x:width*.62,y:title.y+45,width:width*.32,height:90},sockets:[straight(pantry.x+stationW+counter.width*.04),straight(toaster.x+stationW+counter.width*.04)]};
}
export function layoutSafe(l:KitchenLayout,w:number,h:number){return [l.counter,l.title,l.tray,l.pantry,l.toaster,l.plate,l.customer,...l.sockets].every(r=>inside(r,w,h));}
