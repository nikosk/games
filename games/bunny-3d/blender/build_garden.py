"""One explorable garden, modeled from Bunny's Picnic's painted garden reference.
Blender is the source; export static meshes + movement bounds for the browser.
Run: blender -b --python games/bunny-3d/blender/build_garden.py
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

# Broad continuous lawn, mostly level where Bunny can move.
N=80;extent=24
v=[];uv=[];f=[]
for j in range(N+1):
    z=-extent+j*2*extent/N
    for i in range(N+1):
        x=-extent+i*2*extent/N
        rise=max(0,abs(x)-8)*.08+max(0,-z-7)*.05
        v.append((x,-.025+rise*(.6+.4*math.sin(x*.6+z*.3)**2),z));uv.append((i/N,j/N))
# Each 3m patch samples the same swatch without cross-atlas wrapping.
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i
        verts=[v[k] for k in (a,a+1,a+N+2,a+N+1)]
        u0=(i%5)/5;v0=(j%5)/5
        mesh('Lawn',verts,[(0,3,2,1)],[(u0,v0),(u0+.2,v0),(u0+.2,v0+.2),(u0,v0+.2)],'ffffff','grass')

# Three gently curved cream paths with irregular painted borders.
path_index=0
def path(points,width):
    global path_index
    path_index+=1
    pp=[Vector(p) for p in points]
    centers=[]
    for i in range(80):
        t=i/79
        centers.append((1-t)**3*pp[0]+3*(1-t)**2*t*pp[1]+3*(1-t)*t*t*pp[2]+t**3*pp[3])
    edges=[]
    for i,p in enumerate(centers):
        d=(centers[min(i+1,len(centers)-1)]-centers[max(0,i-1)]).normalized();side=Vector((-d.y,d.x))
        w=width*(1+.025*math.sin(i*1.7));edges.append((p-side*w,p+side*w))
    for i in range(len(centers)-1):
        corners=[*edges[i],edges[i+1][1],edges[i+1][0]]
        t=(i%8)/8
        mesh('Cream paths',[(p.x,.008+path_index*.002,p.y) for p in corners],[(0,3,2,1)],[(0,t),(1,t),(1,t+.125),(0,t+.125)],'fff8ed','sand')
path([(-12,1),(-5,1),(-4,-3),(3.5,-6.6)],.69)
path([(12,.7),(7,1.1),(5,-.3),(3.5,-6.6)],.62)
path([(-1,12),(-1,7),(5,5),(9,1.1)],.6)

# Soft distant hills continue the reference's painted background in real depth.
for x,z,s,c in [(-13,-20,(12,3.5,7),'aaba99'),(8,-24,(15,4.2,9),'b3c4a6'),(-6,-16,(9,2.3,5),'b5c69c'),(15,-17,(10,2.8,6),'c0cda5')]:
    ellipsoid('Distant hills',(x,-.8,z),s,c,seg=32,rings=16,wobble=.035)

obstacles=[]
interactions=[]
def obstacle(x,z,r):obstacles.append({'x':x,'z':z,'radius':r})

def bush(x,z,s=1,flowers=False):
    for i in range(8):
        a=i*2.4;r=.48*math.sqrt(i/8)
        ellipsoid('Rounded hedges',(x+math.cos(a)*r*s,.35*s+(i%3)*.12*s,z+math.sin(a)*r*s),(.55*s,.44*s,.5*s),rng.choice(['e8e9ce','d4dfc2','f5edb7']),'leaves',wobble=.065)
    if flowers:
        for i in range(8):
            a=i*2.4;rr=.45*s;fx=x+math.cos(a)*rr;fz=z+math.sin(a)*rr;y=(.68+(i%3)*.09)*s
            for j in range(5):
                b=j*math.tau/5
                ellipsoid('Rose petals',(fx+math.cos(b)*.065*s,y+math.sin(b)*.065*s,fz),(.067*s,.065*s,.037*s),rng.choice(['e7ada6','efc2b2','d99595']),seg=8,rings=6)
            ellipsoid('Flower hearts',(fx,y,fz+.03),(.037*s,.036*s,.025*s),'e8bf66',seg=8,rings=6)

# Framing trees with real branching trunks, lobed crowns and soft painted surfaces.
for x,z,s in [(-7.2,-3.4,1),(7.7,-2.8,.9),(-9,4,.9),(10,4.8,.85),(-3,-9.5,.7),(0,-10.8,.8)]:
    obstacle(x,z,.55*s)
    tube('Tree trunks',[(x,0,z),(x-.1*s,1.7*s,z),(x+.2*s,3.6*s,z-.2*s),(x+.05*s,5*s,z)],.32*s,'e0c9a3','wood',10,.10*s)
    for side in [-1,1]:
        tube('Tree trunks',[(x,2*s,z),(x+side*.7*s,3.1*s,z),(x+side*1.4*s,4.1*s,z+.12)],.20*s,'ead0a4','wood',8,.05*s)
    for i in range(17):
        a=i*2.4;r=1.6*s*math.sqrt(i/17)
        ellipsoid('Tree crowns',(x+math.cos(a)*r,(4.8+.5*math.sin(i*1.1))*s,z+math.sin(a)*r),(.95*s,.95*s,.92*s),rng.choice(['f2edbf','e7e9bb','d3dfbb','fbefbc']),'leaves',seg=16,rings=12,wobble=.09)
    for a in [0,2.1,4.2]:
        tube('Tree roots',[(x+math.sin(a)*.65*s,.02,z+math.cos(a)*.65*s),(x+math.sin(a)*.25,.25,z+math.cos(a)*.25)],.09*s,'dfc49e','wood',8,.19*s)

# Fence and a closed cottage gate frame the back of the clearing.
for x in [-10,-8.3,-6.6,-4.9,-3.2,-1.5,.2,1.6,5.3,7,8.7,10.4]:
    tube('Fence',[(x,0,-6.5),(x,.98,-6.5)],.095,'eee0bf','wood',8,.075)
    ellipsoid('Fence caps',(x,1,-6.5),(.095,.08,.095),'e6cca2',seg=8,rings=6)
for a,b in [(-10,1.7),(5.1,10.4)]:
    for y in [.37,.76]:box('Fence',((a+b)/2,y,-6.5),(b-a,.12,.09),'f0ddb8','wood')
for x in [2.1,4.9]:
    box('Gate stone',(x,.57,-6.5),(.45,1.14,.46),'d4bf97')
    box('Gate stone',(x,1.18,-6.5),(.57,.16,.57),'ead7b0')
    for yy in [.24,.56,.88]:box('Stone seams',(x,yy,-6.263),(.43,.015,.008),'bfad8d')
for yy in [.28,.76]:box('Gate',(3.5,yy,-6.5),(2.3,.13,.10),'ead2a7','wood')
for x in [2.4,4.6]:box('Gate',(x,.53,-6.5),(.13,1,.12),'ead2a7','wood')
tube('Gate',[(2.4,.28,-6.48),(4.6,.76,-6.48)],.063,'e7cba0','wood',4)
for x in [1,5.9]:bush(x,-6.15,1.25,True)
for x,z,s in [(-9,-5,1.1),(8,-5.8,1),(-8,2.4,.8),(8.6,3,.7),(-5,-7.8,1.3),(-1,-8.3,1.1)]:bush(x,z,s)

# Tiny cottage from the reference: cream gable, curved terracotta tiles, blue windows.
cx=5.3;cz=-9.2
box('Cottage walls',(cx,1.22,cz),(3.3,2.44,2.7),'efdfb7')
mesh('Cottage walls',[(cx-1.65,2.44,cz-1.35),(cx+1.65,2.44,cz-1.35),(cx,3.9,cz-1.35),(cx-1.65,2.44,cz+1.35),(cx+1.65,2.44,cz+1.35),(cx,3.9,cz+1.35)],[(0,1,2),(5,4,3)],tint='efdfb7',smooth=False)
for side in [-1,1]:
    mesh('Cottage roof',[(cx,3.94,cz-1.6),(cx,3.94,cz+1.6),(cx+side*1.9,2.35,cz+1.6),(cx+side*1.9,2.35,cz-1.6)],[(0,1,2,3)],tint='b97e58',smooth=False)
    for row in range(7):
        t=(row+.5)/7
        for col in range(10):
            z=cz-1.5+col*.32+(row%2)*.035
            x=cx+side*t*1.9;y=3.96-t*1.59
            # Individually curved tiles make the roof legible when orbiting.
            ellipsoid('Roof tiles',(x,y+.04,z),(.19,.08,.19),rng.choice(['cc956c','cf9b72','d6a177','c68d65']),seg=8,rings=6)
box('Chimney',(cx-.8,3.7,cz-.5),(.43,1.5,.48),'d6b58e')
for y in [3.3,3.6,3.9,4.2]:box('Chimney mortar',(cx-.8,y,cz-.5),(.445,.035,.49),'eed5ac')
box('Chimney cap',(cx-.8,4.47,cz-.5),(.57,.15,.61),'bd8967')
for x in [cx-.85,cx+.85]:
    box('Window cream frame',(x,1.55,cz+1.365),(.78,1.04,.09),'f8eacb')
    box('Blue window glass',(x,1.55,cz+1.42),(.63,.88,.025),'829d9d')
    for yy in [1.1,1.55,2]:box('Window mullions',(x,yy,cz+1.45),(.68,.045,.035),'f8eacb')
    box('Window mullions',(x,1.55,cz+1.45),(.045,.94,.035),'f8eacb')
box('Cottage door',(cx,.65,cz+1.37),(.60,1.3,.08),'aca580')
bush(cx-1.5,cz+1.4,.85,True)

# Four plump cushions, each with a center button, piped edge and radial seams.
for name,x,z,c in [('sage',-1.25,-.8,'94a57c'),('gold',1.35,-1.1,'d9b45c'),('rose',-1.1,2.5,'cf8c78'),('blue',1.6,2.4,'8eabc0')]:
    prefix='Cushion '+name
    interactions.append({'id':'cushion-'+name,'kind':'cushion','name':name+' cushion','node':prefix,'x':x,'z':z,'radius':.65,'height':.75})
    obstacle(x,z,.65)
    vv=[];uv=[];ff=[];seg=48;rings=16
    for j in range(rings+1):
        theta=math.pi*j/rings
        rr=.66*math.sin(theta);y=.19+.20*math.cos(theta)
        if j<rings/2:y-=.09*math.exp(-(rr/.19)**2)
        for i in range(seg+1):
            a=i*math.tau/seg;r=rr*(1-.025*math.cos(a*8)**6)
            vv.append((x+r*math.cos(a),y,z+r*math.sin(a)));uv.append((i/seg,j/rings))
    for j in range(rings):
        for i in range(seg):
            a=j*(seg+1)+i;ff.append((a,a+seg+1,a+seg+2,a+1))
    mesh(prefix+' body',vv,ff,uv,c)
    tube(prefix+' piping',[(x+.66*math.cos(a*math.tau/64),.18,z+.66*math.sin(a*math.tau/64)) for a in range(65)],.015,c,sides=5)
    ellipsoid(prefix+' button',(x,.305,z),(.075,.025,.075),c,seg=12,rings=8)
    for i in range(8):
        a=i*math.tau/8
        tube(prefix+' seams',[(x+r*math.cos(a),.19+.20*math.sqrt(max(0,1-(r/.66)**2))-.09*math.exp(-(r/.19)**2)+.005,z+r*math.sin(a)) for r in [.07,.15,.25,.35,.45,.55,.63]],.006,c,sides=4)

# Folded gingham cloth: actual layered cloth geometry with individually colored checks.
x,z=-3.1,1.25;obstacle(x,z,1.16)
interactions.append({'id':'cloth','kind':'cloth','name':'picnic cloth','node':'Picnic cloth','x':x,'z':z,'radius':1.16,'height':.65})
for layer in range(3):
    box('Cloth folds',(x,.06+layer*.07,z),(1.45,.065,1.03),'eddec0')
for i in range(12):
    for j in range(8):
        cc='d98e80' if i%2 and j%2 else 'f1dfc4' if not i%2 and not j%2 else 'e6b3a1'
        xx=x-.725+i*1.45/12;zz=z-.515+j*1.03/8
        mesh('Gingham cloth',[(xx,.235,zz),(xx+1.45/12,.235,zz),(xx+1.45/12,.235,zz+1.03/8),(xx,.235,zz+1.03/8)],[(0,3,2,1)],tint=cc)

# Wicker hamper with woven sides, a raised lid, leather straps and arch handle.
x,z=3.5,1.25;obstacle(x,z,.85)
interactions.append({'id':'basket','kind':'basket','name':'apple basket','node':'Picnic basket','x':x,'z':z,'radius':.85,'height':1.55})
# A real hollow basket, with apples under a separately hinged lid.
box('Basket body',(x,.09,z),(1.34,.13,.87),'b79258')
for side in [-1,1]:
    box('Basket body',(x,.38,z+side*.405),(1.34,.52,.08),'b79258')
    box('Basket body',(x+side*.63,.38,z),(.08,.52,.79),'b79258')
box('Basket lining',(x,.165,z),(1.15,.025,.66),'e8cd9e')
for i,(dx,dz) in enumerate([(-.37,-.18),(0,-.18),(.36,-.18),(-.22,.17),(.22,.17)]):
    ellipsoid('Basket apples',(x+dx,.41,z+dz),(.19,.205,.18),['c95748','d77051','cd6450'][i%3],seg=20,rings=12,wobble=.045)
    tube('Apple stems',[(x+dx,.58,z+dz),(x+dx+.015,.66,z+dz)],.018,'806640',sides=6)
    ellipsoid('Apple leaves',(x+dx+.07,.64,z+dz),(.085,.018,.035),'91ab65',seg=10,rings=6)
for y in [.09+i*.075 for i in range(8)]:
    for zz in [z-.45,z+.45]:
        tube('Wicker weave',[(x-.67+i*.085,y+.014*math.sin(i*math.pi),zz) for i in range(17)],.026,'e0bd7e',sides=5)
    for xx in [x-.69,x+.69]:
        tube('Wicker weave',[(xx,y+.014*math.sin(i*math.pi),z-.43+i*.086) for i in range(11)],.026,'d6b073',sides=5)
for i in range(16):
    xx=x-.64+i*.085
    for zz in [z-.46,z+.46]:tube('Wicker uprights',[(xx,.055,zz),(xx,.64,zz)],.017,'b28c51',sides=5)
box('Basket lid',(x,.70,z),(1.43,.12,.97),'d9b77b')
for i in range(18):
    tube('Wicker lid',[(x-.69+i*.08,.77,z-.46),(x-.69+i*.08,.77,z+.46)],.025,'ebca8d',sides=5)
for xx in [x-.42,x+.42]:
    box('Leather straps',(xx,.44,z+.483),(.10,.66,.025),'a07c4c')
    box('Leather lid straps',(xx,.78,z),(.10,.022,.97),'a07c4c')
    ellipsoid('Brass clasps',(xx,.52,z+.509),(.047,.053,.018),'d8b66e',seg=10,rings=8)
tube('Basket handle',[(x+.47*math.cos(i*math.pi/24),.77+.46*math.sin(i*math.pi/24),z) for i in range(25)],.06,'c19c61',sides=8)

# A restrained border of daisies and broad leaves, leaving the center easy to read.
for x,z in [(-6.2,3.8),(-6.4,4.2),(-5.8,4.1),(5.7,3.8),(6,4.2),(-5.8,-4.8),(6.8,-4.9),(6.4,-5.1),(-7,-.1)]:
    h=rng.uniform(.23,.40)
    tube('Daisy stems',[(x,0,z),(x+.03,h,z)],.012,'7a9466',sides=5)
    for j in range(7):
        a=j*math.tau/7
        ellipsoid('Daisy petals',(x+.03+.078*math.cos(a),h+.012,z+.078*math.sin(a)),(.065,.018,.046),'fff3d4',seg=8,rings=6)
    ellipsoid('Daisy centers',(x+.03,h+.025,z),(.045,.027,.045),'dfb764',seg=10,rings=6)
    for s in [-1,1]:ellipsoid('Daisy leaves',(x+s*.07,.1,z),(.095,.025,.035),'859a68',seg=8,rings=6)

# Bake batches into named real meshes with embedded textures.
for name,b in batches.items():
    d=bpy.data.meshes.new(name);d.from_pydata(b['v'],[],b['f']);d.update()
    obj=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(obj);d.materials.append(materials[b['mat']])
    uv=d.uv_layers.new(name='Painted surfaces');col=d.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for i,c in enumerate(b['c']):col.data[i].color=c
    for poly,smooth in zip(d.polygons,b['s']):
        poly.use_smooth=smooth
        for li in poly.loop_indices:uv.data[li].uv=b['uv'][d.loops[li].vertex_index]
    obj['castShadow']=name not in ('Lawn','Cream paths','Distant hills')
    # All hand-built faces are made consistently outward for reliable light/shadows.
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)

# Keep interactable parts separate and pivoted in the Blender source and GLB.
def pivot(name,loc,objects,parent=None,interaction=None):
    group=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(group)
    world=Vector((loc[0],-loc[2],loc[1]))
    group.location=world-(parent.location if parent else Vector())
    if parent:group.parent=parent
    if interaction:group['interaction']=interaction
    for obj in objects:
        obj.parent=group;obj.location=-world
        obj['castShadow']=False  # moving props use contact shading in the browser
    return group
for item in interactions:
    if item['kind']=='cushion':
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(item['node']+' ')]
        pivot(item['node'],(item['x'],0,item['z']),objects,interaction=item['id'])
cloth=next(i for i in interactions if i['id']=='cloth')
pivot('Picnic cloth',(cloth['x'],0,cloth['z']),[bpy.data.objects[n] for n in ('Cloth folds','Gingham cloth')],interaction='cloth')
lid_names=('Basket lid','Wicker lid','Leather lid straps','Basket handle')
basket_names=('Basket body','Basket lining','Basket apples','Apple stems','Apple leaves','Wicker weave','Wicker uprights','Leather straps','Brass clasps')
basket=pivot('Picnic basket',(3.5,0,1.25),[bpy.data.objects[n] for n in basket_names],interaction='basket')
pivot('Basket lid hinge',(3.5,.69,.80),[bpy.data.objects[n] for n in lid_names],parent=basket)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'picnic-garden.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_extras=True,export_yup=True,export_materials='EXPORT',export_vertex_color='ACTIVE')
layout={'bounds':{'minX':-7.0,'maxX':7.0,'minZ':-5.65,'maxZ':5.6},'start':{'x':-2.5,'z':3.6},'radius':.35,'obstacles':obstacles,'interactions':interactions}
(ASSETS/'garden-layout.json').write_text(json.dumps(layout,indent=2)+'\n')
scene=bpy.context.scene;scene.world.color=(.65,.70,.64)
light=bpy.data.lights.new('Warm afternoon','AREA');light.energy=1800;light.shape='DISK';light.size=10
obj=bpy.data.objects.new('Warm afternoon',light);bpy.context.collection.objects.link(obj);obj.location=(-7,-5,13)
obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
c=bpy.data.cameras.new('Garden overview');cam=bpy.data.objects.new('Garden overview',c);bpy.context.collection.objects.link(cam)
cam.location=(9,-19,12);cam.rotation_euler=(Vector((0,1.5,.7))-cam.location).to_track_quat('-Z','Y').to_euler();c.type='ORTHO';c.ortho_scale=22;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ASSETS/'garden-blender-preview.png')
scene.view_settings.view_transform='AgX'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'picnic-garden.blend'))
print('GARDEN_COMPLETE '+json.dumps({'objects':len(batches),'vertices':sum(len(b['v']) for b in batches.values()),'glb_bytes':(ASSETS/'picnic-garden.glb').stat().st_size}),flush=True)
