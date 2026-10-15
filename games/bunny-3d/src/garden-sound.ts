/** Quiet toy-like feedback. Audio is unlocked by a real tap, never on page load. */
export function gardenSound() {
  let context: AudioContext | undefined, muted=false;
  return {
    get muted(){return muted;},
    toggle(){muted=!muted;return muted;},
    unlock(){
      if(muted)return;
      context??=new AudioContext();void context.resume().catch(()=>{});
    },
    play(kind:string,index=0){
      if(muted||!context||context.state!=='running')return;
      const now=context.currentTime;
      const notes=kind==='cushion'?[[392,440,523.25,659.25][index%4]!]:kind==='basket'?[392,523.25,659.25]:[523.25,392];
      notes.forEach((frequency,i)=>{
        const oscillator=context!.createOscillator(),gain=context!.createGain();
        oscillator.type='sine';oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(0,now+i*.1);gain.gain.linearRampToValueAtTime(.085,now+i*.1+.012);
        gain.gain.exponentialRampToValueAtTime(.001,now+i*.1+.48);
        oscillator.connect(gain);gain.connect(context!.destination);
        oscillator.start(now+i*.1);oscillator.stop(now+i*.1+.5);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
    },
    dispose(){void context?.close();},
  };
}
