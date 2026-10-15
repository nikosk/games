"""Bunny II: six authored locations, chunky puzzle props and three friends.
Blender is the source; export static meshes + movement bounds for the browser.
Run: blender -b --python games/bunny-3d/blender/build_adventure.py
"""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
rng = random.Random(73)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for item in list(bpy.data.materials): bpy.data.materials.remove(item)

def linear(v): return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4
def color(s): return tuple(linear(int(s[i:i+2],16)/255) for i in (0,2,4))+(1,)
atlas = bpy.data.images.load(str(ASSETS/'garden-materials.png')); atlas.pack()
# UV coordinates use Blender's bottom-left origin. Keep a gutter inside each swatch.
swatches = {'grass':(0,.5), 'sand':(.5,.5), 'wood':(0,0), 'leaves':(.5,0)}
materials = {}
def mat(name, code, textured=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=color(code)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color(code)
    p.inputs['Roughness'].default_value=.95;p.inputs['Specular IOR Level'].default_value=.13
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color'
    if textured:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas
        mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
        m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(vc.outputs['Color'],mix.inputs[2])
        m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
    else: m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color'])
    materials[name]=m
    return name
paint=mat('Gouache · generated grass, path, wood and leaves','ffffff',True)
plain=mat('Gouache · softly painted props','ffffff')
# Geometry is batched by use, reducing draw calls without flattening the shapes.
batches={}
def mesh(name, verts, faces, uv=None, tint='ffffff', swatch=None, smooth=True):
    if name not in batches: batches[name]={'v':[],'f':[],'uv':[],'c':[],'s':[], 'mat':paint if swatch else plain}
    b=batches[name];offset=len(b['v']);b['v'].extend((x,-z,y) for x,y,z in verts)
    b['f'].extend(tuple(offset+i for i in f) for f in faces);b['s'].extend([smooth]*len(faces))
    uvs=uv or [(0,0)]*len(verts)
    if swatch:
        a,c=swatches[swatch];uvs=[(a+.012+u*.476,c+.012+v*.476) for u,v in uvs]
    b['uv'].extend(uvs)
    base=color(tint)
    for x,y,z in verts:
        grain=1+.035*math.sin(x*8.1+z*6.2+y*3.8)*math.sin(y*12+x*2)
        b['c'].append(tuple(min(1,v*grain) for v in base[:3])+(1,))

def ellipsoid(name, center, scale, tint='ffffff', swatch=None, seg=16, rings=10, wobble=0):
    cx,cy,cz=center;sx,sy,sz=scale;v=[];uv=[];faces=[]
    for j in range(rings+1):
        theta=math.pi*j/rings
        for i in range(seg+1):
            phi=math.tau*i/seg
            f=1+wobble*math.sin(phi*3+theta*2)*math.sin(theta*4)
            v.append((cx+sx*math.sin(theta)*math.cos(phi)*f,cy+sy*math.cos(theta)*f,cz+sz*math.sin(theta)*math.sin(phi)*f))
            uv.append((i/seg,j/rings))
    for j in range(rings):
        for i in range(seg):
            a=j*(seg+1)+i;faces.append((a,a+seg+1,a+seg+2,a+1))
    mesh(name,v,faces,uv,tint,swatch)

def box(name, c, s, tint='ffffff', swatch=None):
    x,y,z=c;dx,dy,dz=[a/2 for a in s]
    corners=[(x+sx*dx,y+sy*dy,z+sz*dz) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    vv=[];ff=[];uv=[]
    for f in [(3,2,1,0),(4,5,6,7),(0,1,5,4),(7,6,2,3),(4,7,3,0),(1,2,6,5)]:
        ff.append(tuple(range(len(vv),len(vv)+4)));vv.extend(corners[i] for i in f);uv.extend([(0,0),(1,0),(1,1),(0,1)])
    mesh(name,vv,ff,uv,tint,swatch,False)

def tube(name, points, radius, tint='ffffff', swatch=None, sides=8, end_radius=None):
    vv=[];uv=[];ff=[];pts=[Vector(p) for p in points]
    for i,p in enumerate(pts):
        direction=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        axis=direction.cross(Vector((0,0,1)))
        if axis.length<.01:axis=direction.cross(Vector((1,0,0)))
        axis.normalize();other=direction.cross(axis).normalized()
        r=radius if end_radius is None else radius+(end_radius-radius)*i/(len(pts)-1)
        for j in range(sides+1):
            a=math.tau*j/sides;vv.append(tuple(p+r*(axis*math.cos(a)+other*math.sin(a))));uv.append((j/sides,i/(len(pts)-1)))
    for i in range(len(pts)-1):
        for j in range(sides):
            a=i*(sides+1)+j;ff.append((a,a+1,a+sides+2,a+sides+1))
    ff.extend([tuple(range(sides-1,-1,-1)),tuple((len(pts)-1)*(sides+1)+j for j in range(sides))])
    mesh(name,vv,ff,uv,tint,swatch)

# Coordinates below are the game's X/right, Y/up, Z/front. Each named group
# has an authored pivot; its geometry is batched by surface, not by primitive.
groups={};current='';origin=(0,0,0)
def group(name, at=(0,0,0), parent=None):
    global current,origin
    groups[name]={'at':at,'parent':parent};current=name;origin=at

def pt(p):return tuple(a+b for a,b in zip(p,origin))
def sphere(c,s,t='ffffff',tex=None,seg=20,rings=12):ellipsoid(current+'__'+(tex or 'solid'),pt(c),s,t,tex,seg,rings)
def block(c,s,t='ffffff',tex=None):box(current+'__'+(tex or 'solid'),pt(c),s,t,tex)
def line(points,r,t='ffffff',tex=None,end=None):tube(current+'__'+(tex or 'solid'),[pt(p) for p in points],r,t,tex,10,end)
def ring(c,rx,rz,r,t='ffffff',ywave=0):
    x,y,z=c;line([(x+rx*math.cos(i*math.tau/48),y+ywave*math.sin(i*math.tau/48),z+rz*math.sin(i*math.tau/48)) for i in range(49)],r,t)
def rounded(c,s,t='ffffff',tex=None):
    # Broad bevels, shared material and vertex paint; batch the evaluated bevel.
    bpy.ops.mesh.primitive_cube_add(size=1,location=pt(c));ob=bpy.context.object
    ob.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=ob.modifiers.new('Soft toy edges','BEVEL');bevel.width=min(s)*.18;bevel.segments=3
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=bevel.name)
    vv=[tuple(ob.matrix_world@v.co) for v in ob.data.vertices];ff=[tuple(p.vertices) for p in ob.data.polygons]
    uv=[((v[0]-origin[0])/max(s[0],.1)%1,(v[2]-origin[2])/max(s[2],.1)%1) for v in vv]
    mesh(current+'__'+(tex or 'solid'),vv,ff,uv,t,tex,True);bpy.data.objects.remove(ob,do_unlink=True)
def leaf(c,s,t='9aaf77'):
    sphere(c,s,t,seg=12,rings=8)
    line([(c[0],c[1]+s[1],c[2]-s[2]*.7),(c[0],c[1]+s[1]+.012,c[2]+s[2]*.7)],.017,'b6c38d')
def eye(x,y,z,size=.16):
    sphere((x,y,z),(size,size*1.15,size*.52),'302d36')
    sphere((x-size*.26,y+size*.35,z+size*.45),(size*.28,)*3,'fffaf2',seg=12,rings=8)
def smile(y,z,width=.3):line([(width*(i/8*2-1),y+.075*(i/8*2-1)**2,z+.025*(1-(i/8*2-1)**2)) for i in range(9)],.022,'755044')
def gem():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.30)
    obj=bpy.context.object;palette=['df8087','e9a160','e9cf75','91b88b','7cabbf','aa98c4']
    for poly in obj.data.polygons:
        points=[obj.data.vertices[i].co for i in poly.vertices]
        c=palette[int((math.atan2(poly.center.x,poly.center.y)+math.pi)/math.tau*6)%6]
        mesh(current+'__solid',[pt((q.x,q.z*1.2,q.y*.85)) for q in points],[(0,1,2)],tint=c,smooth=False)
    bpy.data.objects.remove(obj,do_unlink=True)

def blossom(at,size=1,col='df807d'):
    x,y,z=at
    for i in range(7):
        a=i*math.tau/7
        sphere((x+math.cos(a)*.25*size,y+math.sin(a)*.25*size,z),(.20*size,.20*size,.10*size),col,seg=12,rings=8)
    sphere((x,y,z+.09*size),(.17*size,.17*size,.09*size),'e8c471',seg=16,rings=10)

# Shared meadow surroundings: broad grass, cream paths, painted tree crowns.
group('landscape')
for x in range(-18,18,3):
    for z in range(-20,15,3):
        mesh(current+'__grass',[(x,-.04,z),(x+3,-.04,z),(x+3,-.04,z+3),(x,-.04,z+3)],[(0,3,2,1)],[(0,0),(1,0),(1,1),(0,1)],'ffffff','grass')
for x,z,s in [(-8,-4,1),(7,-5,1),(-9,4,.85),(9,4,.8),(-4,-10,.8),(2,-11,.8)]:
    line([(x,0,z),(x-.1,2*s,z),(x+.3,4*s,z)],.28*s,'dfc8a4','wood',.1)
    for side in [-1,1]:line([(x,1.8*s,z),(x+side*1.25*s,3.7*s,z)],.16*s,'e8d4ac','wood',.05)
    for i in range(11):
        a=i*2.4;r=1.3*s*math.sqrt(i/11)
        sphere((x+math.cos(a)*r,(4.1+.35*math.sin(i))*s,z+math.sin(a)*r),(1*s,.9*s,.9*s),rng.choice(['f5eaca','e4e9c4','e9e9b9']),'leaves',16,10)
for x,z,s in [(-7,-6,1.2),(6,-7,1),(-9,1,1),(8,0,.9)]:
    for i in range(6):sphere((x+math.sin(i*2.4)*.5*s,.5*s,z+math.cos(i*2.4)*.5*s),(.7*s,.65*s,.65*s),'e6e4bd','leaves',16,10)
for x,z,s in [(-13,-19,(13,3,7)),(9,-21,(15,4,9))]:sphere((x,-1,z),s,'becba3',seg=32,rings=16)
# A path to each clearing and an easy to recognize signpost.
for z in range(2,12):
    mesh(current+'__sand',[(-.7,.004,z),(.7,.004,z),(.9,.004,z+1),(-.65,.004,z+1)],[(0,3,2,1)],[(0,0),(1,0),(1,1),(0,1)],'fff7e7','sand')
group('sign',(4.8,0,2.6),'landscape')
line([(0,0,0),(0,1.7,0)],.09,'e9cba0','wood')
rounded((0,1.4,0),(1.0,.46,.15),'eddbb7','wood')
line([(-.26,1.4,.09),(.25,1.4,.09),(.08,1.55,.09)],.035,'806e56')
line([(.25,1.4,.09),(.08,1.25,.09)],.035,'806e56')

# Bedroom: an open-front miniature room. No roof or foreground wall.
group('bedroom')
rounded((0,.02,-.6),(10,.22,7),'d8c39c','wood')
rounded((0,1.5,-3.9),(10,3,.25),'efe3c9')
rounded((-4.9,1,-1.7),(.25,2,4.4),'e4d9c2')
for x in [-4,-2,0,2,4]:line([(x,.15,-3.7),(x,.15,2.7)],.018,'b9a383')
# Back window with generous rounded trim and moon-like curtain ties.
rounded((1.8,1.9,-3.72),(2.2,1.8,.15),'c6a985','wood')
rounded((1.8,1.9,-3.61),(1.85,1.45,.12),'b9d7dc')
for x in [.8,2.8]:rounded((x,1.9,-3.44),(.4,1.9,.17),'dbb8a6')
line([(1.8,1.18,-3.48),(1.8,2.62,-3.48)],.05,'fff1d6')
line([(.86,1.9,-3.48),(2.74,1.9,-3.48)],.05,'fff1d6')
# Bed with thick quilt, piping, pillow, buttons and turned posts.
rounded((-2.4,.45,-1.8),(2.5,.5,3),'dec7a0','wood')
rounded((-2.4,.80,-1.8),(2.4,.35,2.8),'faf0d9')
rounded((-2.4,1.02,-1.2),(2.45,.30,1.65),'c8a1b1')
for x in [-3.55,-1.25]:
    for z in [-3.1,-.5]:
        line([(x,.1,z),(x,1.4,z)],.10,'e0c5a1','wood');sphere((x,1.43,z),(.16,)*3,'e7cfaa')
rounded((-2.4,1.12,-2.7),(1.7,.36,.7),'fff5e2')
for x in [-3.2,-2.4,-1.6]:
    for z in [-1.65,-.9]:sphere((x,1.20,z),(.055,.025,.055),'f1d4cc',seg=8,rings=6)
# Circular rug and bedside table.
sphere((.5,.17,.5),(2.2,.045,1.35),'b6c7bd',seg=40,rings=8)
ring((.5,.19,.5),1.95,1.12,.035,'f1ddbb')
rounded((.25,.75,-1.8),(1.1,.2,1),'ddbd8f','wood')
for x in [-.15,.65]:
    for z in [-2.15,-1.45]:line([(x,.1,z),(x,.7,z)],.07,'c6a27a','wood')
group('door',(3.5,0,-3.7),'bedroom')
rounded((0,1.25,0),(1.5,2.5,.15),'c8b68e','wood')
rounded((0,1.22,.1),(1.16,2.2,.12),'a6af8d')
sphere((.38,1.15,.22),(.08,.08,.07),'ddc485')
group('rainbow-stone',(.25,1.03,-1.8),'bedroom')
gem()

# Pond: open dry basin on right, stream and blockage all on the near bank.
group('pond')
sphere((2.1,.0,-.8),(2.35,.12,1.65),'c6b99b',seg=48,rings=12)
ring((2.1,.09,-.8),2.45,1.72,.15,'e0d1b1')
for i in range(14):
    a=i*math.tau/14;sphere((2.1+math.cos(a)*2.4,.11,-.8+math.sin(a)*1.7),(.23,.17,.20),'ded3b9',seg=12,rings=8)
# Stream bed across the screen; dark trough remains visible while water is grey.
rounded((-2.35,.015,-1.15),(4.5,.12,.95),'b7a789')
for z in [-1.70,-.61]:line([(-5,.10,z),(-2,.10,z),(0,.10,z)],.13,'d9c8a7')
group('pond-water',(2.1,.085,-.8),'pond');sphere((0,0,0),(2.25,.035,1.53),'79b7c7',seg=48,rings=10)
group('stream-water',(-4.5,.105,-1.15),'pond');rounded((2.1,0,0),(4.2,.025,.62),'80bcca')
group('pond-branch',(-2.4,.25,-1.15),'pond')
line([(0,0,-.65),(0,.04,0),(.12,.02,.65)],.12,'c5a375','wood')
line([(0,.02,.2),(.43,.06,.48)],.075,'d1b387','wood')
group('leaves',(-1.45,.15,-1.15),'pond')
for x,z,a in [(-.2,-.25,0),(.15,0,1),(-.1,.28,2)]:leaf((x,.04+a*.04,z),(.35,.1,.40),'a8ab7c')
# Broad lily pad and sculpted water plants, never fine reeds.
group('pond-decor',(0,0,0),'pond')
sphere((3.1,.16,-1.3),(.6,.04,.48),'96ae76',seg=24,rings=8)
blossom((3.15,.27,-1.3),.75,'ead0d2')
for x,z in [(4,-2.3),(-.4,-2.0)]:
    for i in [-1,0,1]:leaf((x+i*.13,.5+abs(i)*.05,z),(.11,.55,.13),'9cae79')
group('can',(.15,0,1.65),'pond')
sphere((0,.38,0),(.44,.42,.36),'8ba9ae')
ring((0,.72,0),.30,.25,.065,'d6ded1')
line([(-.25,.45,0),(-.56,.65,0),(-.6,1,0),(-.28,1.07,0),(-.1,.73,0)],.065,'c6d2c5')
line([(.32,.24,0),(.75,.63,0),(.88,.76,0)],.095,'91afb3',end=.13)
sphere((.9,.77,0),(.16,.075,.16),'ccd8cf')

# Haystack: two substantial blocks, low nest, heights in the image plane.
group('haystack')
for x,y,z,s in [(2.7,.65,-1.2,(2.5,1.3,1.8)),(3.8,.52,-2.4,(2,.98,1.3)),(2,1.72,-2.05,(1.8,.95,1.2))]:
    rounded((x,y,z),s,'dfc576')
    for dx in [-.65,-.25,.2,.65]:line([(x+dx,y-s[1]*.35,z+s[2]/2+.012),(x+dx+.03,y+s[1]*.32,z+s[2]/2+.015)],.025,'c3a65c')
    for dx in [-.6,.6]:line([(x+dx,y-s[1]*.48,z+s[2]/2+.035),(x+dx,y+s[1]*.48,z+s[2]/2+.035)],.048,'b89b61')
group('nest',(2.9,1.35,-.8),'haystack')
sphere((0,.08,0),(.66,.13,.52),'a88b62')
for i in range(3):ring((0,.12+i*.055,0),.65-i*.03,.52-i*.03,.07,'d6ba83')
sphere((0,.13,0),(.42,.055,.32),'efdab0')
group('small-block',(-3.1,0,1.35),'haystack');rounded((0,.23,0),(1.0,.46,1.0),'c8a47a','wood');rounded((0,.48,0),(.92,.05,.92),'e5c49b','wood')
group('tall-block',(-1.4,0,1.55),'haystack');rounded((0,.46,0),(1.0,.92,1.0),'c8a47a','wood');rounded((0,.94,0),(.92,.05,.92),'e5c49b','wood')
# Pale patches indicate the two broad placements without encoding the answer.
for name,x in [('step-low',.3),('step-high',1.5)]:
    group(name,(x,.025,-.1),'haystack');rounded((0,0,0),(1.12,.045,1.1),'d5c7a3');ring((0,.035,0),.43,.40,.025,'eee1c3')

# Log: raised roots, front-facing ball and a low, completely visible lever.
group('log')
for x,z in [(-3,-2),(3.6,-2.4)]:
    for i in range(4):leaf((x+math.sin(i)*.3,.23,z+math.cos(i)*.3),(.22,.33,.32),'a5b485')
for x,z in [(-4,-2.6),(4.5,-1.5)]:
    line([(x,0,z),(x,.45,z)],.065,'ead5b4');sphere((x,.49,z),(.3,.15,.3),'c58b79')
group('fallen-log',(0,.0,-1.1),'log')
# Cylinder lies across the screen; the end rings establish its hollow log shape.
line([(-2.15,.64,0),(2.15,.64,0)],.55,'c4a47c','wood')
for x in [-2.17,2.17]:
    sphere((x,.64,0),(.035,.5,.5),'e5caa1')
    sphere((x*1.003,.64,0),(.04,.32,.32),'8c765b')
for z in [-.35,0,.35]:line([(-1.9,.99-abs(z)*.5,z),(0,1.18-abs(z)*.7,z),(1.9,.99-abs(z)*.5,z)],.035,'ad8a63')
line([(-1.3,.8,0),(-1.6,1.35,-.2),(-1.9,1.45,-.25)],.13,'c5a67c','wood',.06)
group('ball',(.4,.27,-.65),'log')
sphere((0,0,0),(.30,)*3,'b6aaa1',seg=28,rings=16)
for i,c in enumerate(['de9086','dfbc6d','87b0be','9eb98c']):
    a=i*math.tau/4;sphere((math.cos(a)*.18,.04,math.sin(a)*.18),(.13,.24,.13),c,seg=12,rings=8)
group('stone',(-3.6,0,.7),'log');sphere((0,.21,0),(.50,.24,.40),'b6b6a5',seg=16,rings=10)
group('lever',(3.4,.13,1.5),'log')
line([(-1.35,0,0),(0,.03,0),(1.35,0,0)],.105,'d2b182','wood');line([(.5,0,0),(.75,.02,-.22)],.07,'c8a171','wood')
group('fulcrum',(-.9,.015,.4),'log');sphere((0,0,0),(.58,.025,.48),'d2c4a3');ring((0,.025,0),.45,.35,.023,'ece0c1')

# Meadow: broad basin, pivoting wooden spout, thick stems and big petals.
group('meadow')
rounded((2.2,.05,-1),(3.5,.18,2.15),'b59b7c')
for z in [-2.05,.08]:line([(.4,.15,z),(4,.15,z)],.12,'dfc6a0','wood')
for x in [.4,4]:line([(x,.15,-2.05),(x,.15,.08)],.12,'dfc6a0','wood')
group('basin',(-2.9,0,-.75),'meadow')
sphere((0,.5,0),(.85,.55,.72),'c1baaa',seg=32,rings=16)
sphere((0,.85,0),(.70,.10,.57),'8b8e82',seg=32,rings=10)
ring((0,.89,0),.76,.64,.10,'d8d0bb')
group('spout',(-2.2,.65,-.75),'meadow')
rounded((1.3,0,0),(2.7,.12,.70),'d4b58a','wood')
for z in [-.33,.33]:rounded((1.3,.15,z),(2.7,.30,.12),'e1c299','wood')
# A substantial support and obvious knob make the rotation understandable.
line([(0,-.6,0),(0,.12,0)],.13,'aa9479');sphere((.35,.36,.40),(.15,.15,.15),'d3aa73')
group('trough-flow',(-2.2,.65,-.75),'spout');rounded((1.32,.09,0),(2.64,.025,.47),'8bbdc8')
group('outlet-flow',(.42,.65,-.75),'spout');rounded((0,-.22,0),(.15,.46,.42),'8bbdc8')
group('spout-water',(-2.9,.94,-.75),'meadow');sphere((0,0,0),(.63,.025,.50),'87bdcb',seg=28,rings=8)
for i,(x,z,col) in enumerate([(1.1,-.6,'da8587'),(2.2,-1.4,'aa91c0'),(3.25,-.5,'df8c8c'),(1.3,-1.65,'b29bc7'),(3.2,-1.7,'d47f91')]):
    group('flower-'+str(i),(x,0,z),'meadow')
    line([(0,.13,0),(-.07,.65,0),(0,1.10,0)],.055,'8ca071')
    leaf((-.21,.55,0),(.30,.09,.16),'99ac78');leaf((.2,.76,0),(.27,.09,.15),'a8b687')
    blossom((0,1.16,0),1,col)

# Hill summit: shallow round dais, low thick-petaled flower and a hand bell.
group('hill')
sphere((0,-.32,-.8),(5.5,.4,3.8),'c2cba3',seg=40,rings=16)
for i in range(3):rounded((0,.015,1.9-i*.5),(2.6-i*.2,.035,.65),'d8ccb0')
group('pedestal',(0,0,-1.2),'hill')
sphere((0,.27,0),(1.35,.3,1.05),'c3beaa',seg=32,rings=12)
for i,col in enumerate(['da8b92','dfad70','e4cd7e','97b38c','91b7c6','b19cc5']):
    a=i*math.tau/6;sphere((math.cos(a)*1.05,.55,math.sin(a)*.8),(.65,.22,.52),col,seg=20,rings=12)
ring((0,.59,0),.42,.36,.13,'ede0bf');sphere((0,.55,0),(.34,.05,.29),'8e8985')
group('hill-stone',(0,.89,-1.2),'hill')
gem()
group('bell',(3,0,.2),'hill')
for x in [-.48,.48]:line([(x,0,0),(x,1.9,0)],.09,'d9bc92','wood')
line([(-.55,1.9,0),(.55,1.9,0)],.1,'d9bc92','wood')
sphere((0,1.25,0),(.35,.42,.29),'d9b76e')
ring((0,.96,0),.35,.29,.06,'e7cb8b')
line([(0,1.95,0),(0,1.63,0)],.05,'ae9163');line([(0,1,0),(0,.5,0)],.04,'bba484');sphere((0,.48,0),(.10,.14,.10),'dbc39b')

# Three friends, authored as soft painted toys with independent eye/wing/tail pivots.
def frog(at,parent,name='frog'):
    group(name,at,parent)
    sphere((0,.45,0),(.65,.52,.45),'8eae78');sphere((0,.42,.35),(.46,.35,.15),'e4dba4')
    sphere((0,.90,.02),(.69,.40,.45),'9bb880')
    for x in [-.43,.43]:
        sphere((x,1.19,.10),(.28,.30,.25),'9ebc81')
        sphere((x,1.2,.29),(.20,.22,.10),'fff2d5');eye(x,1.21,.39,.12)
        sphere((x*1.3,.15,.18),(.34,.18,.33),'8aa873')
        line([(x*1.3,.57,.1),(x*1.5,.25,.35)],.09,'a1bc85')
        for j in [-1,0,1]:sphere((x*1.3+j*.10,.13,.46),(.08,.06,.17),'a2b880',seg=10,rings=8)
    smile(.79,.46,.30)
    for x in [-.43,.43]:sphere((x,.79,.40),(.11,.06,.045),'d8a08b',seg=12,rings=8)
    group(name+'-eyes',tuple(a+b for a,b in zip(at,(0,1.2,.39))),name)
    # Lids are normally tucked inside the head and used for occasional blinks.
    for x in [-.43,.43]:sphere((x,0,0),(.21,.22,.10),'9ebc81')
def chick(at,parent,name='chick'):
    group(name,at,parent)
    for x in [-.19,.19]:
        sphere((x,.08,.1),(.18,.07,.23),'d4a46b',seg=12,rings=8)
    sphere((0,.52,0),(.48,.52,.40),'ebcd72');sphere((0,.98,.04),(.48,.41,.40),'f0d785')
    sphere((0,.40,.32),(.32,.29,.10),'f8e4a6')
    eye(-.19,1.04,.39,.105);eye(.19,1.04,.39,.105)
    sphere((0,.87,.44),(.15,.085,.15),'d9a06b');sphere((0,.82,.42),(.12,.045,.12),'e4b480')
    for x in [-.28,.28]:sphere((x,.87,.35),(.09,.05,.04),'dfaa91',seg=12,rings=8)
    for x in [-.1,0,.1]:sphere((x,1.38+(.08 if x==0 else 0),.02),(.07,.18,.07),'f2d98c',seg=12,rings=8)
    for side in [-1,1]:
        pos=tuple(a+b for a,b in zip(at,(side*.44,.65,0)))
        group(name+('-left' if side<0 else '-right'),pos,name);sphere((side*.04,-.1,.06),(.15,.31,.25),'e4bf66')
def fox(at,parent,name='fox'):
    group(name,at,parent)
    sphere((0,.57,0),(.56,.65,.43),'c88a5c');sphere((0,.55,.34),(.36,.44,.13),'f2dfbe')
    for x in [-.29,.29]:sphere((x,.12,.20),(.25,.14,.34),'b87e58')
    sphere((0,1.27,.02),(.66,.51,.48),'d59866')
    for x in [-.44,.44]:
        # Thick tapered ears, with soft inner pink.
        line([(x,1.49,0),(x*1.12,2.05,-.03)],.24,'c58a60',end=.035)
        line([(x,1.55,.17),(x*1.10,1.92,.07)],.12,'ddb6a0',end=.025)
        sphere((x*.7,1.12,.37),(.34,.23,.24),'f3e2c5')
    eye(-.27,1.39,.43,.13);eye(.27,1.39,.43,.13)
    sphere((0,1.16,.58),(.13,.09,.09),'574c49');smile(1.0,.55,.20)
    for x in [-.49,.49]:sphere((x,1.17,.39),(.11,.06,.045),'d7a08a',seg=12,rings=8)
    for x in [-.47,.47]:line([(x,.87,.12),(x*.85,.41,.32)],.14,'cf9263')
    pos=tuple(a+b for a,b in zip(at,(.45,.35,-.20)))
    group(name+'-tail',pos,name)
    line([(0,0,0),(.35,.12,-.1),(.65,.43,-.12),(.72,.77,-.13)],.21,'cb8b5d',end=.26)
    sphere((.72,.85,-.13),(.25,.30,.25),'f0dfc1')
frog((3.6,0,.8),'pond')
chick((-.8,0,-.6),'haystack')
fox((-2.8,0,-.8),'log')
# Finale friends are separate instances of the same authored shapes.
frog((-2.7,0,-.1),'hill','hill-frog');chick((-1.6,0,1.2),'hill','hill-chick');fox((2.2,0,1.3),'hill','hill-fox')

# Export hierarchy and smooth, consistently outward normals.
objects={}
for name,g in groups.items():
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);objects[name]=ob
    at=Vector((g['at'][0],-g['at'][2],g['at'][1]));par=g['parent']
    if par:
        ob.parent=objects[par];p=groups[par]['at'];at-=Vector((p[0],-p[2],p[1]))
    ob.location=at
for name,b in batches.items():
    parent=name.split('__')[0];g=groups[parent];at=Vector((g['at'][0],-g['at'][2],g['at'][1]))
    d=bpy.data.meshes.new(name);d.from_pydata([Vector(v)-at for v in b['v']],[],b['f']);d.update()
    ob=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(ob);ob.parent=objects[parent];d.materials.append(materials[b['mat']])
    uv=d.uv_layers.new(name='Paint');col=d.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(b['c']):col.data[i].color=c
    for poly,smooth in zip(d.polygons,b['s']):
        poly.use_smooth=smooth
        for li in poly.loop_indices:uv.data[li].uv=b['uv'][d.loops[li].vertex_index]
    bpy.context.view_layer.objects.active=ob;ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');ob.select_set(False)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'bunny-ii-world.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_yup=True,export_materials='EXPORT',export_vertex_color='ACTIVE')
# Keep the editable source organized by location. Collection visibility hides
# every child, unlike hiding only the root empty. The export above includes all.
for name in ['landscape','bedroom','pond','haystack','log','meadow','hill']:
    collection=bpy.data.collections.new('Bunny II · '+name);bpy.context.scene.collection.children.link(collection)
    for ob in [objects[name],*objects[name].children_recursive]:
        for old in list(ob.users_collection):old.objects.unlink(ob)
        collection.objects.link(ob)
    collection.hide_viewport=name not in ['landscape','pond'];collection.hide_render=collection.hide_viewport
scene=bpy.context.scene;scene.world.color=(.65,.7,.64)
c=bpy.data.cameras.new('Adventure view');cam=bpy.data.objects.new('Adventure view',c);bpy.context.collection.objects.link(cam)
cam.location=(.8,-14,10);cam.rotation_euler=(Vector((0,1,.5))-cam.location).to_track_quat('-Z','Y').to_euler();c.type='ORTHO';c.ortho_scale=14;scene.camera=cam
light=bpy.data.lights.new('Soft sunlight','AREA');light.energy=1800;light.size=10
ob=bpy.data.objects.new('Soft sunlight',light);bpy.context.collection.objects.link(ob);ob.location=(-5,-5,12)
scene.render.engine='CYCLES';scene.cycles.samples=24
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'bunny-ii-world.blend'))
(ASSETS/'bunny-ii-world-info.json').write_text(json.dumps({'groups':{n:{'position':g['at'],'parent':g['parent']} for n,g in groups.items()},'vertices':sum(len(b['v']) for b in batches.values()),'meshes':len(batches)},indent=2)+'\n')
print('BUNNY_II_COMPLETE',len(batches),(ASSETS/'bunny-ii-world.glb').stat().st_size,flush=True)
