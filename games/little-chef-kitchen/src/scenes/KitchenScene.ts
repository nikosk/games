import Phaser from "phaser";
import { createKitchenLayout, type KitchenLayout, type Rect } from "../game/layout";
import { cancelPrep, freshKitchen, serve, useCard } from "../game/rules";
import { orderTitle, type CustomerOrder, type Item, type ItemKind, type Station } from "../game/level";
import bg from "../../assets/images/kitchen-background.webp";
import waiting from "../../assets/images/tilly-waiting.webp";
import delighted from "../../assets/images/tilly-delighted.webp";
import heart from "../../assets/images/heart.webp";
import sparkle from "../../assets/images/sparkle.webp";

const art = { bg, waiting, delighted, heart, sparkle };
const stationNames: Record<Station, string> = { prep: "PREP", oven: "OVEN", pan: "PAN", freezer: "FREEZER" };
const stationColors: Record<Station, number> = { prep: 0xd79a57, oven: 0xffe7bd, pan: 0xffe7bd, freezer: 0xffe7bd };
const familyName = (order: CustomerOrder) => order.family === "ice-cream" ? "ICE CREAM" : order.family.toUpperCase();

export class KitchenScene extends Phaser.Scene {
  private readonly seed = this.getSessionSeed();
  private round = 0;
  private state = freshKitchen(this.seed, this.round);
  private layout!: KitchenLayout;
  private selected: number | null = null;
  private pending: { index: number; x: number; y: number } | null = null;
  private dragging: Phaser.GameObjects.Container | null = null;
  private busy = false;
  private token = 0;
  private audio: AudioContext | undefined;

  constructor() { super("KitchenScene"); }

  private getSessionSeed() {
    const key = "little-chef-session-seed";
    const stored = sessionStorage.getItem(key);
    if (stored) return Number(stored);
    const seed = Math.floor(Math.random() * 0x7fffffff);
    sessionStorage.setItem(key, String(seed));
    return seed;
  }

  preload() { Object.entries(art).forEach(([key, url]) => this.load.image(key, url)); }

  create() {
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.redraw();
  }

  shutdown() {
    this.audio?.close(); this.audio = undefined;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.input.off("pointermove", this.onPointerMove, this);
    this.input.off("pointerup", this.onPointerUp, this);
    this.tweens.killAll(); this.time.removeAllEvents();
  }

  private resize() { if (!this.busy) this.redraw(); }

  private tx(x: number, y: number, text: string, size: number, color = "#59362a", bold = false) {
    return this.add.text(x, y, text, { fontFamily: "Georgia", fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", align: "center" }).setOrigin(.5);
  }

  private panel(r: Rect, color: number, alpha = .9) {
    const g = this.add.graphics();
    g.fillStyle(color, alpha).fillRoundedRect(r.x, r.y, r.width, r.height, 18);
    g.lineStyle(3, 0x8d5938, .8).strokeRoundedRect(r.x, r.y, r.width, r.height, 18);
  }

  private redraw() {
    this.children.removeAll(true);
    this.layout = createKitchenLayout(this.scale.width, this.scale.height);
    const w = this.scale.width, h = this.scale.height;
    const background = this.add.image(w / 2, h / 2, "bg");
    const source = background.texture.getSourceImage() as HTMLImageElement;
    background.setScale(Math.max(w / source.width, h / source.height));
    this.add.rectangle(w / 2, h / 2, w, h, 0xffe6b0, .1);
    const banner = { x: Math.max(8, w * .02), y: 8, width: Math.min(w * .68, 560), height: 46 };
    this.panel(banner, 0x4a2d29);
    this.tx(banner.x + banner.width / 2, 31, `${familyName(this.state.order)} ORDER`, Math.min(21, w * .045), "#fff3d4", true);
    this.drawFullscreen(); this.drawCustomer(); this.drawStations(); this.drawTray();
    this.updateStatus();
  }

  private updateStatus() {
    const el = document.getElementById("kitchen-status");
    if (el) el.textContent = `${familyName(this.state.order)} order · ${this.state.phase}`;
  }

  private drawFullscreen() {
    const size = 38, x = this.scale.width - size / 2 - 10, y = size / 2 + 8;
    const g = this.add.graphics(); g.fillStyle(0x4a2d29, .9).fillRoundedRect(x - size / 2, y - size / 2, size, size, 10).lineStyle(2, 0xffe2a5, .9).strokeRoundedRect(x - size / 2, y - size / 2, size, size, 10);
    this.tx(x, y + 1, "⛶", 25, "#fff3d4", true);
    this.add.zone(x - size / 2, y - size / 2, size, size).setOrigin(0).setInteractive().on("pointerdown", () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
  }

  private drawCustomer() {
    const r = this.layout.customer, portrait = this.layout.mode === "portrait";
    this.panel(r, 0xffe8bd89);
    const goalX = r.x + r.width * (portrait ? .25 : .5), tillyX = r.x + r.width * (portrait ? .76 : .79), y = r.y + r.height * .43;
    this.add.ellipse(goalX, y, portrait ? 110 : 180, portrait ? 86 : 132, 0xfff2d2);
    this.drawItem(this.goalItem(), goalX, y, portrait ? 95 : 156, portrait ? 75 : 112);
    this.tx(goalX, r.y + r.height - 10, "ORDER", portrait ? 11 : 14, "#573126", true);
    const key = this.state.phase === "served" ? "delighted" : "waiting";
    const tillyHeight = r.height * .52;
    const tillyWidth = Math.min(r.width * (portrait ? .24 : .32), tillyHeight * (237 / 240));
    const backing = this.add.ellipse(tillyX, y, tillyWidth * 1.12, tillyHeight * 1.08, 0xfff2d2).setDepth(5);
    const tilly = this.add.image(tillyX, y, key).setDisplaySize(tillyWidth, tillyHeight).setDepth(6);
    const mask = this.make.graphics({ x: 0, y: 0 }); mask.fillEllipse(tillyX, y, tillyWidth * .98, tillyHeight * .98); tilly.setMask(mask.createGeometryMask());
    this.tx(tillyX, r.y + r.height - 10, this.state.phase === "served" ? "YUM!" : "TILLY", portrait ? 11 : 14, "#573126", true);
    const zone = this.add.zone(goalX - r.width * .22, r.y, r.width * .44, r.height).setOrigin(0).setInteractive(); zone.on("pointerdown", () => this.serveSelected());
    if (this.state.phase === "served") { this.add.image(tillyX - 25, y - 25, "heart").setDisplaySize(28, 28); this.add.image(tillyX + 25, y - 25, "sparkle").setDisplaySize(28, 28); }
  }

  private goalItem(): Item {
    if (this.state.order.family === "pizza") return { kind: "pizza", label: "PIZZA", extras: this.state.order.toppings };
    if (this.state.order.family === "pancakes") return { kind: "pancakes", label: "PANCAKES", extras: [this.state.order.fruit, this.state.order.syrup] };
    return { kind: "ice-cream", label: "ICE CREAM", extras: [this.state.order.flavour, this.state.order.vessel, this.state.order.topping] };
  }

  private drawStations() {
    const r = this.layout.board; this.panel(r, 0xfff4ddb0); this.tx(r.x + r.width / 2, r.y + 24, "KITCHEN", 17, "#75442e", true);
    (Object.entries(this.layout.stations) as [Station, Rect][]).forEach(([station, s]) => {
      this.panel(s, stationColors[station]); this.drawStationFace(station, s.x + s.width / 2, s.y + s.height * .32, Math.min(s.width, s.height) * .36);
      this.tx(s.x + s.width / 2, s.y + s.height * .86, stationNames[station], Math.min(13, s.width * .14), "#75442e", true);
      const zone = this.add.zone(s.x - 12, s.y - 12, s.width + 24, s.height + 24).setOrigin(0).setInteractive(); zone.on("pointerdown", () => this.process(station));
    });
    if (this.state.prep) {
      const prep = this.layout.stations.prep;
      this.drawItem(this.state.prep, prep.x + prep.width / 2, prep.y + prep.height * .65, Math.min(68, prep.width * .62), Math.min(42, prep.height * .18)).setDepth(8);
    }
  }

  private drawStationFace(station: Station, x: number, y: number, size: number) {
    const g = this.add.graphics(); g.lineStyle(3, 0x75442e, 1); g.fillStyle(0xfff7db, 1);
    if (station === "prep") { g.fillCircle(x, y, size * .42); g.strokeCircle(x, y, size * .42); g.fillStyle(0xf4c880, 1).fillEllipse(x, y + size * .1, size * .55, size * .24); g.lineStyle(6, 0x8d5938, 1).lineBetween(x - size * .28, y - size * .22, x + size * .28, y - size * .22); }
    if (station === "oven") { g.fillRoundedRect(x - size * .38, y - size * .35, size * .76, size * .7, 8); g.strokeRoundedRect(x - size * .38, y - size * .35, size * .76, size * .7, 8); g.fillStyle(0x7f4637, 1).fillRoundedRect(x - size * .27, y - size * .12, size * .54, size * .34, 5); g.fillStyle(0xffb85d, 1).fillCircle(x, y + size * .05, size * .1); }
    if (station === "pan") { g.fillStyle(0x5b4b43, 1).fillEllipse(x, y + size * .05, size * .65, size * .3); g.lineStyle(8, 0x75442e, 1).lineBetween(x + size * .28, y, x + size * .53, y - size * .2); g.lineStyle(2, 0x332a26, 1).strokeEllipse(x, y + size * .05, size * .65, size * .3); }
    if (station === "freezer") { g.fillStyle(0x8bbec1, 1).fillRoundedRect(x - size * .32, y - size * .4, size * .64, size * .8, 8); g.strokeRoundedRect(x - size * .32, y - size * .4, size * .64, size * .8, 8); g.lineStyle(3, 0xe5ffff, 1).lineBetween(x - size * .17, y - size * .15, x + size * .17, y + size * .15); g.lineBetween(x + size * .17, y - size * .15, x - size * .17, y + size * .15); }
  }

  private drawTray() {
    const r = this.layout.inventory; this.panel(r, 0x784b36); const gap = r.width / (this.state.tray.length + 1); const cardW = Math.min(112, Math.max(70, gap * .84));
    this.state.tray.forEach((item, index) => { const x = r.x + gap * (index + 1), y = r.y + r.height * .5; const g = this.add.graphics(); g.fillStyle(this.selected === index ? 0xffe17c : 0x9d603e).fillRoundedRect(x - cardW / 2, y - 50, cardW, 100, 15).lineStyle(3, 0xffdfa0).strokeRoundedRect(x - cardW / 2, y - 50, cardW, 100, 15); this.drawItem(item, x, y - 8, cardW - 14, 62); const z = this.add.zone(x - cardW / 2 - 5, y - 55, cardW + 10, 110).setOrigin(0).setInteractive(); z.on("pointerdown", (p: Phaser.Input.Pointer) => this.select(index, p.x, p.y)); });
  }

  private drawItem(item: Item, x: number, y: number, width: number, height: number) {
    const c = this.add.container(x, y); const g = this.add.graphics(); const w = width, h = height; g.lineStyle(Math.max(2, w * .025), 0x75442e, 1);
    const kind = item.kind as string;
    if (kind === "dough" || kind === "bread") { g.fillStyle(0xf0be69, 1).fillRoundedRect(-w*.36, -h*.28, w*.72, h*.48, 10); g.strokeRoundedRect(-w*.36, -h*.28, w*.72, h*.48, 10); }
    else if (kind === "tomato") { g.fillStyle(0xe5573e, 1).fillCircle(0, 0, Math.min(w, h) * .3); g.strokeCircle(0, 0, Math.min(w, h) * .3); g.fillStyle(0x638c4b, 1).fillTriangle(-8,-h*.25,0,-h*.4,8,-h*.25); }
    else if (kind === "cheese") { g.fillStyle(0xffe79a, 1).fillRoundedRect(-w*.32, -h*.22, w*.64, h*.42, 5); g.strokeRoundedRect(-w*.32, -h*.22, w*.64, h*.42, 5); }
    else if (kind === "mushroom") { g.fillStyle(0xd89a6a, 1).fillEllipse(0, -h*.12, w*.45, h*.28); g.fillStyle(0xf2d0a0, 1).fillRoundedRect(-w*.08, 0, w*.16, h*.25, 4); }
    else if (kind === "pepper") { g.fillStyle(0x70a95d, 1).fillEllipse(0, 0, w*.58, h*.25); g.strokeEllipse(0, 0, w*.58, h*.25); }
    else if (kind === "sauced-base" || kind === "pizza") { g.fillStyle(0xf0bd6c, 1).fillCircle(0, 0, Math.min(w,h)*.4); g.strokeCircle(0,0,Math.min(w,h)*.4); g.fillStyle(0xd9553d,1).fillCircle(0,0,Math.min(w,h)*.31); (item.extras ?? []).forEach((extra, i) => this.drawTopping(g, extra, -w*.2 + i*w*.2, h*.04, Math.min(w,h)*.1)); }
    else if (kind === "flour") { g.fillStyle(0xfff5de, 1).fillRoundedRect(-w*.26,-h*.32,w*.52,h*.5,7); g.strokeRoundedRect(-w*.26,-h*.32,w*.52,h*.5,7); g.fillStyle(0xd98e62,1).fillEllipse(0,h*.05,w*.34,h*.08); }
    else if (kind === "milk") { g.fillStyle(0xf5f1dc,1).fillRoundedRect(-w*.2,-h*.34,w*.4,h*.58,5); g.strokeRoundedRect(-w*.2,-h*.34,w*.4,h*.58,5); g.fillStyle(0x8eb9c9,1).fillRect(-w*.2,-h*.2,w*.4,h*.12); }
    else if (kind === "strawberry" || kind === "berries" || kind === "blueberry") { g.fillStyle(kind === "blueberry" ? 0x566da9 : 0xe85a51,1).fillCircle(0,0,Math.min(w,h)*.24); g.fillStyle(0x638c4b,1).fillTriangle(-6,-h*.2,0,-h*.34,6,-h*.2); }
    else if (kind === "banana") { g.lineStyle(Math.max(3,w*.05),0xf5cc53,1).beginPath(); g.arc(0,0,w*.3,0,Math.PI); g.strokePath(); }
    else if (kind === "maple" || kind === "chocolate" || kind === "berry") { g.fillStyle(kind === "chocolate" ? 0x754632 : kind === "maple" ? 0xc87834 : 0xbd4f66,1).fillRoundedRect(-w*.15,-h*.35,w*.3,h*.56,5); g.strokeRoundedRect(-w*.15,-h*.35,w*.3,h*.56,5); }
    else if (kind === "batter") { g.fillStyle(0xffe4a6,1).fillEllipse(0,0,w*.5,h*.3); g.strokeEllipse(0,0,w*.5,h*.3); }
    else if (kind === "stack" || kind === "pancakes") { for(let i=0;i<3;i++){g.fillStyle(0xe6ad61,1).fillEllipse(0,h*.16-i*h*.14,w*.6,h*.2);g.strokeEllipse(0,h*.16-i*h*.14,w*.6,h*.2);} (item.extras??[]).forEach((e,i)=>this.drawTopping(g,e,-w*.16+i*w*.16,-h*.2,Math.min(w,h)*.09)); }
    else if (kind === "cream" || kind === "mix") { g.fillStyle(0xfff0d2,1).fillEllipse(0,0,w*.48,h*.3); g.strokeEllipse(0,0,w*.48,h*.3); }
    else if (kind === "mint" || kind === "scoop") { const flavour = item.extras?.[0]; g.fillStyle(flavour === "chocolate" ? 0x8a5a43 : flavour === "strawberry" ? 0xf07c72 : 0xa8d29e,1).fillCircle(0,0,Math.min(w,h)*.3); g.strokeCircle(0,0,Math.min(w,h)*.3); }
    else if (kind === "cone" || kind === "bowl") { g.fillStyle(kind === "cone" ? 0xd8944d : 0xd8a47a,1); if(kind === "cone") g.fillTriangle(-w*.2,-h*.1,w*.2,-h*.1,0,h*.35); else g.fillEllipse(0,h*.08,w*.58,h*.28); g.strokePath(); }
    else if (kind === "sprinkles" || kind === "wafer") { g.fillStyle(0xf1cf61,1).fillRoundedRect(-w*.25,-h*.1,w*.5,h*.18,3); g.strokeRoundedRect(-w*.25,-h*.1,w*.5,h*.18,3); }
    else if (kind === "ice-cream") { const vessel = item.extras?.find(e => e === "cone" || e === "bowl"); if(vessel === "cone"){ g.fillStyle(0xd8944d,1).fillTriangle(-w*.22,h*.12,w*.22,h*.12,0,h*.42); g.strokeTriangle(-w*.22,h*.12,w*.22,h*.12,0,h*.42); } else if(vessel === "bowl"){ g.fillStyle(0xd8a47a,1).fillEllipse(0,h*.2,w*.58,h*.24); g.strokeEllipse(0,h*.2,w*.58,h*.24); } const flavour=item.extras?.find(e=>e === "chocolate" || e === "strawberry" || e === "mint"); const scoopColor=flavour === "chocolate" ? 0x8a5a43 : flavour === "strawberry" ? 0xf07c72 : 0xa8d29e; g.fillStyle(scoopColor,1).fillCircle(0,-h*.08,Math.min(w,h)*.28); g.strokeCircle(0,-h*.08,Math.min(w,h)*.28); const topping=item.extras?.find(e=>e === "sprinkles" || e === "berries" || e === "wafer"); if(topping) this.drawTopping(g,topping,0,-h*.2,Math.min(w,h)*.08); }
    c.add(g); this.txIn(c, 0, h*.45, item.label, Math.max(9, Math.min(12, w*.095)), "#fff3d4", true); return c;
  }

  private drawTopping(g: Phaser.GameObjects.Graphics, kind: string, x: number, y: number, size: number) {
    if (kind === "cheese") g.fillStyle(0xffe79a, 1).fillCircle(x, y, size);
    else if (kind === "sprinkles") {
      const colors = [0xe85a51, 0x5f86c8, 0xf0c54d, 0x68a85d];
      for (let i = 0; i < 6; i++) { g.lineStyle(Math.max(2, size * .3), colors[i % colors.length]!, 1); g.lineBetween(x - size * .8 + (i % 3) * size * .7, y - size * .5 + Math.floor(i / 3) * size, x - size * .45 + (i % 3) * size * .7, y - size * .8 + Math.floor(i / 3) * size); }
    } else if (kind === "mushroom") { g.fillStyle(0xf1d3a0, 1).fillRoundedRect(x - size * .22, y - size * .05, size * .44, size * 1.05, 3); g.fillStyle(0x9b6046, 1).fillEllipse(x, y - size * .35, size * 1.5, size * .85); }
    else if (kind === "pepper") { g.fillStyle(0x70a95d, 1).fillEllipse(x, y, size * 2, size); }
    else if (kind === "banana") { g.lineStyle(Math.max(2, size * .35), 0xf5cc53, 1).beginPath(); g.arc(x, y, size * 1.5, 0.15, Math.PI - 0.15); g.strokePath(); }
    else if (kind === "strawberry") { g.fillStyle(0xe85a51, 1).fillTriangle(x - size, y - size * .6, x + size, y - size * .6, x, y + size * 1.25); g.fillStyle(0x638c4b, 1).fillTriangle(x - size * .65, y - size * .55, x, y - size * 1.2, x + size * .65, y - size * .55); }
    else if (kind === "blueberry") { [0x566da9, 0x6e83bb, 0x4b609b].forEach((color, i) => { g.fillStyle(color, 1).fillCircle(x + (i - 1) * size * .9, y - (i === 1 ? size * .4 : 0), size * .78); }); }
    else if (kind === "maple" || kind === "chocolate" || kind === "berry") { const color = kind === "maple" ? 0xd27b35 : kind === "chocolate" ? 0x754632 : 0xbd4f66; g.lineStyle(Math.max(2, size * .28), color, 1).beginPath(); g.moveTo(x - size * 1.3, y - size * .7); g.lineTo(x - size * .45, y + size * .4); g.lineTo(x + size * .2, y - size * .5); g.lineTo(x + size * 1.1, y + size * .4); g.strokePath(); }
    else if (kind === "berries") { [0xe85a51, 0x566da9, 0xe85a51].forEach((color, i) => { g.fillStyle(color, 1).fillCircle(x + (i - 1) * size * .8, y - (i === 1 ? size * .35 : 0), size * .72); }); }
    else if (kind === "wafer") { g.fillStyle(0xd8944d, 1).fillRect(x - size * .7, y - size * 2.6, size * 1.4, size * 5.2); g.lineStyle(Math.max(1, size * .16), 0xffe08a, 1); for (let i = -1; i <= 1; i++) g.lineBetween(x - size * .55, y + i * size * 1.4, x + size * .55, y + i * size * 1.4); }
    else g.fillStyle(kind === "chocolate" ? 0x8a5a43 : 0xe85a51, 1).fillCircle(x, y, size);
  }
  private txIn(c: Phaser.GameObjects.Container, x:number,y:number,text:string,size:number,color:string,bold=false){ const t=this.add.text(x,y,text,{fontFamily:"Georgia",fontSize:`${size}px`,color,fontStyle:bold?"bold":"normal",align:"center",wordWrap:{width:140}}).setOrigin(.5); c.add(t); }

  private select(index: number, x: number, y: number) { if(this.busy)return; this.selected=index; this.pending={index,x,y}; this.redraw(); }
  private onPointerMove(pointer: Phaser.Input.Pointer) { if(this.pending && Phaser.Math.Distance.Between(pointer.x,pointer.y,this.pending.x,this.pending.y)>8){ const item=this.state.tray[this.pending.index]; if(item){this.dragging=this.drawItem(item,pointer.x,pointer.y,74,58).setDepth(30); this.pending=null;} } if(this.dragging)this.dragging.setPosition(pointer.x,pointer.y); }
  private onPointerUp(pointer: Phaser.Input.Pointer) {
    this.pending = null;
    if (!this.dragging) return;
    this.dragging.destroy(); this.dragging = null;
    const customer = this.layout.customer;
    if (pointer.x >= customer.x && pointer.x <= customer.x + customer.width && pointer.y >= customer.y && pointer.y <= customer.y + customer.height) { this.serveSelected(); return; }
    const station = (Object.entries(this.layout.stations) as [Station, Rect][]).find(([, rect]) => pointer.x >= rect.x - 28 && pointer.x <= rect.x + rect.width + 28 && pointer.y >= rect.y - 28 && pointer.y <= rect.y + rect.height + 28);
    if (station) { this.process(station[0]); return; }
    this.selected = null; this.redraw();
  }

  private process(station: Station) {
    if (this.busy) return;
    if (this.selected === null) {
      if (station === "prep" && this.state.prep) { this.state = cancelPrep(this.state); this.cue(360); this.redraw(); }
      return;
    }
    const result = useCard(this.state, this.selected, station);
    if (result.result === "rejected") {
      this.cue(150); this.selected = null; this.redraw(); this.feedback(station, false); return;
    }
    this.state = result.state; this.selected = null; this.cue(result.result === "transformed" ? 720 : 420); this.animateTransform(result.result, station);
  }

  private feedback(station: Station, accepted: boolean) {
    const rect = this.layout.stations[station];
    const ring = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width + 12, rect.height + 12).setStrokeStyle(6, accepted ? 0xffe079 : 0xd9534f).setDepth(25);
    this.tweens.add({ targets: ring, x: "+=" + (accepted ? 0 : 8), alpha: 0, duration: 110, yoyo: true, repeat: accepted ? 1 : 2, onComplete: () => ring.destroy() });
  }

  private animateTransform(result: string, station: Station) {
    this.redraw();
    if (result !== "transformed") return;
    this.feedback(station, true);
  }
  private serveSelected() { if(this.selected===null)return; const result=serve(this.state,this.selected); if(result.result!=="served"){this.cue(150);this.selected=null;this.redraw();return;} this.cue(920); this.busy=true; const item=this.state.tray[this.selected]!; const from=this.layout.inventory; const to=this.layout.customer; const mover=this.drawItem(item,from.x+from.width/2,from.y+from.height/2,80,60).setDepth(30); this.tweens.add({targets:mover,x:to.x+to.width*.5,y:to.y+to.height*.45,scale:.45,duration:650,ease:"Back.inOut",onComplete:()=>{mover.destroy();this.state=result.state;this.busy=false;this.redraw();this.celebrate();}}); }
  private celebrate(){const r=this.layout.customer;["heart","sparkle","heart"].forEach((k,i)=>{const a=this.add.image(r.x+r.width*(.25+i*.25),r.y+r.height*.2,k).setDisplaySize(32,32);this.tweens.add({targets:a,y:"-=30",alpha:0,delay:i*80,duration:600,onComplete:()=>a.destroy()});});const w=Math.min(260,this.scale.width*.34),x=this.scale.width/2,y=this.scale.height*.9;const g=this.add.graphics();g.fillStyle(0xc95c43).fillRoundedRect(x-w/2,y-27,w,54,16);this.tx(x,y,"NEXT ORDER",20,"#fff3d4",true);this.add.zone(x-w/2,y-27,w,54).setOrigin(0).setInteractive().on("pointerdown",()=>{this.round++; this.selected = null; this.pending = null; this.dragging?.destroy(); this.dragging = null; this.state = freshKitchen(this.seed, this.round); this.redraw();});}
  private cue(frequency:number){try{const A=window.AudioContext||((window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext);if(!A)return;this.audio??=new A();const o=this.audio.createOscillator(),g=this.audio.createGain();o.frequency.value=frequency;g.gain.value=.03;o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.1);}catch{}}
}
