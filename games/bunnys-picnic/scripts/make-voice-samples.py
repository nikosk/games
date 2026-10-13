"""Small audition: wording and natural tempo, without replacing game dialogue."""
import asyncio,json,pathlib
import edge_tts
root=pathlib.Path(__file__).resolve().parents[1]
dest=root/'assets'/'voice-review';dest.mkdir(exist_ok=True)
samples=[
 {'id':'welcome','original':0,'text':'Έλα, πάμε για πικνίκ!'},
 {'id':'duck','original':10,'text':'Ωχ, η μπάλα μου! Με βοηθάς;'},
 {'id':'hedgehog','original':8,'text':'Αχ, τι μαλακά! Ευχαριστώ!'},
]
async def main():
 for sample in samples:
  for name,voice in [('athina','el-GR-AthinaNeural'),('nestoras','el-GR-NestorasNeural')]:
   path=dest/f"{sample['id']}-{name}.mp3"
   if not path.exists():
    await edge_tts.Communicate(sample['text'],voice,rate='+0%',pitch='+0Hz').save(str(path))
   print(path.name,flush=True)
 (dest/'script.json').write_text(json.dumps({'samples':samples,'rate':'+0%','pitch':'+0Hz','voices':['el-GR-AthinaNeural','el-GR-NestorasNeural'],'tool':'edge-tts 7.2.8'},ensure_ascii=False,indent=2)+'\n')
asyncio.run(main())
