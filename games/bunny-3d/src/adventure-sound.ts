/** A quiet pentatonic music box and small, deliberately gentle reactions. */
export function adventureSound(){
  let ctx:AudioContext|undefined,master:GainNode|undefined,muted=false,active=false,next=0,beat=0;
  try{muted=localStorage.getItem('bunny-ii-muted')==='true';}catch{}
  const melody=[523.25,0,659.25,783.99,659.25,0,587.33,0,440,0,523.25,659.25,587.33,0,392,0];
  function tone(freq:number,at:number,duration:number,volume=.045,type:OscillatorType='sine',end?:number){
    if(!ctx||!master||!freq)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,at);if(end)osc.frequency.exponentialRampToValueAtTime(end,at+duration*.7);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  return {
    get muted(){return muted;},
    unlock(){ctx??=new AudioContext();if(!master){master=ctx.createGain();master.gain.value=muted?0:.7;master.connect(ctx.destination);}void ctx.resume().catch(()=>{});},
    toggle(){muted=!muted;if(master&&ctx)master.gain.setTargetAtTime(muted?0:.7,ctx.currentTime,.08);try{localStorage.setItem('bunny-ii-muted',String(muted));}catch{}return muted;},
    active(value:boolean){active=value;if(!value){next=0;if(master&&ctx)master.gain.setTargetAtTime(0,ctx.currentTime,.1);}else if(master&&ctx)master.gain.setTargetAtTime(muted?0:.7,ctx.currentTime,.1);},
    update(){if(!ctx||!active||muted||ctx.state!=='running')return;const now=ctx.currentTime;if(next<now)next=now+.05;while(next<now+.12){tone(melody[beat%melody.length]!,next,1.2,.023);if(beat%4===0)tone([130.81,164.81,146.83,130.81][Math.floor(beat/4)%4]!,next,2.1,.018);next+=.55;beat++;}},
    play(kind:string){
      if(!ctx||muted)return;const t=ctx.currentTime;
      if(kind==='frog'){tone(180,t,.18,.07,'triangle',110);tone(210,t+.2,.18,.06,'triangle',140);return;}
      if(kind==='chick'){for(let i=0;i<3;i++)tone(1300,t+i*.12,.09,.035,'sine',1800);return;}
      if(['pond','hay','log','flowers','stone','place','finale'].includes(kind)){
        const notes=kind==='finale'?[392,523.25,659.25,783.99,1046.5,1318.5]:[523.25,659.25,783.99,1046.5];notes.forEach((n,i)=>tone(n,t+i*.16,1,.055));return;
      }
      if(['fill','spill'].includes(kind)){for(let i=0;i<6;i++)tone(500+i*90,t+i*.07,.15,.025,'sine',800+i*70);return;}
      if(kind==='step'||kind==='rock'){tone(220,t,.18,.05,'triangle',150);return;}
      tone(kind==='look'?392:659.25,t,.35,.045);tone(783.99,t+.12,.4,.025);
    },
    dispose(){void ctx?.close();},
  };
}
