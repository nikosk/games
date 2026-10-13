import script from '../assets/voice-review/script.json';
import { lines } from './review-data';
const originals=import.meta.glob<string>('../assets/audio/voice-*.mp3',{eager:true,query:'?url',import:'default'});
const auditions=import.meta.glob<string>('../assets/voice-review/*.mp3',{eager:true,query:'?url',import:'default'});
const titles:Record<string,string>={welcome:'Bunny invites you',duck:'Duck asks for help',hedgehog:'Hedgehog is pleased'};
const root=document.querySelector('#clips')!;
for(const sample of script.samples){
  const article=document.createElement('article');const heading=document.createElement('h2');heading.textContent=titles[sample.id]!;article.append(heading);
  const clips=document.createElement('div');clips.className='clips';
  const options=[{title:'Current game',text:lines[sample.original]![2],detail:'Athina · slowed by 8%',url:originals[`../assets/audio/voice-${sample.original}.mp3`]!},{title:'New take · Athina',text:sample.text,detail:'Normal pace · conversational wording',url:auditions[`../assets/voice-review/${sample.id}-athina.mp3`]!},{title:'New take · Nestoras',text:sample.text,detail:'Alternate voice · same new wording',url:auditions[`../assets/voice-review/${sample.id}-nestoras.mp3`]!}];
  for(const option of options){
    const section=document.createElement('section');section.className='clip';
    const label=document.createElement('strong');label.textContent=option.title;
    const detail=document.createElement('small');detail.textContent=option.detail;
    const text=document.createElement('blockquote');text.lang='el';text.textContent=option.text;
    const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=option.url;audio.setAttribute('aria-label',`${heading.textContent}: ${option.title}`);
    audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==audio){other.pause();other.currentTime=0;}}));
    section.append(label,detail,text,audio);clips.append(section);
  }
  article.append(clips);root.append(article);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio').forEach(audio=>audio.pause());});
