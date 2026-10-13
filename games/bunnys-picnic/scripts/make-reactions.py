"""Original short cartoon animal reactions: no text, TTS, or recorded speech."""
import math,random,struct,wave,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'assets'/'audio'
sr=24000
rng=random.Random(411)
# Breathy voiced chirrs, soft nasal quacks, puppy yips, and quiet rounded hums.
profiles={'bunny':(440,950,.07),'duck':(245,1550,.15),'puppy':(310,780,.17),'hedgehog':(190,540,.05)}
for name,(fundamental,formant,breath) in profiles.items():
 for mood in ['curious','happy']:
  length=.72 if mood=='happy' else .5
  samples=[0.0]*int(sr*length)
  calls=[(0,.22,1),(.27,.24,1.13)] if mood=='happy' else [(0,.38,1)]
  for start,duration,mult in calls:
   phase=0.0;noise=0.0
   for j in range(int(duration*sr)):
    u=j/(duration*sr);t=j/sr;i=int(start*sr)+j
    if i>=len(samples):break
    pitch=fundamental*mult*(1+.16*math.sin(math.pi*u)-.11*u)
    if mood=='curious':pitch*=.88+.25*u
    phase+=2*math.pi*pitch/sr
    envelope=math.sin(math.pi*u)**1.7
    tone=0.0
    for k in range(1,12):
     resonance=math.exp(-((k*pitch-formant)/520)**2)
     tone+=math.sin(k*phase)*(.12/k+.32*resonance/k)
    noise=.65*noise+.35*rng.uniform(-1,1)
    samples[i]+=(tone+noise*breath)*envelope*.65
  with wave.open(str(out/f'{name}-{mood}.wav'),'wb') as file:
   file.setnchannels(1);file.setsampwidth(2);file.setframerate(sr)
   file.writeframes(b''.join(struct.pack('<h',int(max(-.8,min(.8,v))*32767)) for v in samples))
