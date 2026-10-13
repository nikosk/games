import Phaser from 'phaser';
const pictures = import.meta.glob('../assets/{game,animation,review}/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string,string>;
const sounds = import.meta.glob('../assets/audio/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string,string>;
export function preload(scene: Phaser.Scene): void {
  for (const room of ['garden','shed','nook','orchard']) scene.load.image(room,pictures[`../assets/game/${room}.png`]!);
  scene.load.image('pond',pictures['../assets/animation/pond-background.png']!);
  for(const [key,path] of [['poses','animation/poses'],['props','review/props'],['actions','review/actions-spaced'],['friends','game/friends'],['extras','game/extras'],['gestures','game/gestures-v1']]) scene.load.image(key!,pictures[`../assets/${path}.png`]!);
  for(const [path,url] of Object.entries(sounds)) scene.load.audio(path.split('/').pop()!.replace(/\.(mp3|wav)$/,''),url);
}
export function frames(scene: Phaser.Scene): void {
  const t=scene.textures.get('poses');
  for(let i=0;i<4;i++)t.add('bunny'+i,0,i*384,0,384,525);
  t.add('duck0',0,0,550,384,400);t.add('duck1',0,384,550,384,400);
  t.add('ball',0,800,615,320,305);t.add('net',0,1152,550,384,430);
  for(const key of ['actions']) {
    const texture=scene.textures.get(key), source=texture.getSourceImage();
    for(let i=0;i<8;i++){const x=Math.round(i%4*source.width/4),y=Math.round(Math.floor(i/4)*source.height/2);texture.add(i,0,x,y,Math.round((i%4+1)*source.width/4)-x,Math.round((Math.floor(i/4)+1)*source.height/2)-y);}
  }
  // Inspected bounds: the painter left unequal margins between these sprites.
  const sheets: Record<string, number[][]> = {
    gestures: [[20,5,365,515],[405,40,385,480],[800,130,380,390],[1190,130,345,390],[20,540,390,440],[420,550,315,425],[790,590,355,375],[1150,555,370,410]],
    friends: [[15,100,370,420],[395,20,385,495],[795,105,355,405],[1180,100,350,415],[5,530,390,465],[400,550,375,445],[790,540,380,455],[1180,560,355,435]],
    extras: [[0,140,442,335],[445,65,320,445],[780,145,400,335],[1200,110,335,375],[0,530,425,455],[435,540,290,420],[800,590,355,335],[1180,550,355,420]],
  };
  for(const [key,regions] of Object.entries(sheets))regions.forEach(([x,y,w,h],i)=>scene.textures.get(key).add(i,0,x!,y!,w!,h!));
  const bounds=[[10,40,432,339],[438,30,374,349],[840,70,350,285],[1205,137,405,231],[0,393,392,254],[393,405,450,235],[875,392,300,252],[1190,420,425,225],[10,660,385,278],[490,650,300,300],[855,654,319,291],[1200,665,419,284]];
  bounds.forEach(([x,y,w,h],i)=>scene.textures.get('props').add(i,0,x!,y!,w!,h!));
}
