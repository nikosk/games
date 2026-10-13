import asyncio,json,pathlib,re
import edge_tts
root=pathlib.Path(__file__).resolve().parents[1]
texts=re.findall(r"\['[^']+', '[^']+', '([^']+)'\]",(root/'src/review-data.ts').read_text())
extra=['Η σανίδα και η απόχη είναι στο σπιτάκι.','Διάλεξε ένα μονοπάτι!','Πάτησε ένα πιάτο και μετά μια άδεια θέση.','Πάτησε ένα μήλο και μετά ένα πιάτο.']
async def main():
 for i,text in enumerate(texts+extra):
  dest=root/f'assets/audio/voice-{i}.mp3'
  if dest.exists() and dest.stat().st_size>1000: continue
  for attempt in range(3):
   try:
    await edge_tts.Communicate(text,'el-GR-AthinaNeural',rate='-8%').save(str(dest)); print(i,flush=True);break
   except Exception:
    if attempt==2: raise
    await asyncio.sleep(2)
 (root/'assets/audio/voices.json').write_text(json.dumps([{'file':f'voice-{i}.mp3','text':t,'voice':'el-GR-AthinaNeural'} for i,t in enumerate(texts+extra)],ensure_ascii=False,indent=2))
asyncio.run(main())
