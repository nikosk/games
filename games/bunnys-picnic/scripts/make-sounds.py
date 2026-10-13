import math,random,wave,struct,pathlib
out=pathlib.Path(__file__).resolve().parents[1] / 'assets' / 'audio'; sr=22050; rng=random.Random(19)
def save(name,data):
 with wave.open(str(out/(name+'.wav')),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,x)) * 28000)) for x in data))
def tone(data,start,freq,duration,vol=.2):
 for j in range(int(duration*sr)):
  i=int(start*sr)+j
  if i>=len(data):break
  t=j/sr; env=min(1,t/.014)*math.exp(-t*4/duration)
  data[i]+=vol*env*(math.sin(2*math.pi*freq*t)+.23*math.sin(2*math.pi*freq*2*t))
melody=[(0,64),(.5,67),(1,69),(2,67),(3,64),(4,62),(5,64),(6,60),(8,64),(9,67),(10,72),(11,71),(12,69),(13,67),(14,64),(15,62),(16,60),(18,64),(19,67),(20,65),(21,64),(22,62),(23,60)]
data=[0.]*(24*sr)
for beat,note in melody:tone(data,beat,440*2**((note-69)/12),1.7,.12)
for beat,note in [(0,48),(4,43),(8,48),(12,45),(16,41),(20,43)]:tone(data,beat,440*2**((note-69)/12),3.8,.1)
save('music',data)
for name,length,freq in [('wood',.3,140),('plate',.45,1200),('step',.12,110),('pop',.3,520),('water',.55,650),('rustle',.5,300),('crunch',.45,180),('bird',.6,1800)]:
 data=[0.] * int(length*sr)
 for i in range(len(data)):
  t=i/sr;env=math.sin(math.pi*t/length)**.5*math.exp(-t*5/length)
  noise=rng.uniform(-1,1); pitch=freq*(1+.2*math.sin(t*35))
  data[i]=env*(noise*.2 if name in ('rustle','crunch','water','step') else .2*math.sin(2*math.pi*pitch*t))
 save(name,data)
data=[0.] * (2*sr)
for t,n in [(0,72),(.18,76),(.36,79),(.7,84)]:tone(data,t,440*2**((n-69)/12),1,.17)
save('success',data)
