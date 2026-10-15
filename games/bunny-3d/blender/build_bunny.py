"""Editable, reproducible Bunny sculpt, clothing, rig and animation.

Run through mcp_client.py, or `blender -b --python blender/build_bunny.py`.
Blender coordinates: Z up, Bunny faces -Y. The exported GLB is Y up.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
random.seed(24)
TAU = math.tau

# Only replace this demo's collection when iterating in a live Blender session.
old = bpy.data.collections.get('Bunny · authored character')
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(old)
collection = bpy.data.collections.new('Bunny · authored character')
bpy.context.scene.collection.children.link(collection)
for obj in list(bpy.context.scene.objects):
    if obj.name in ('Cube', 'Camera', 'Light'):
        bpy.data.objects.remove(obj, do_unlink=True)

def put(obj):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

def rgb(hexcode):
    return tuple(linear(int(hexcode[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)

atlas = bpy.data.images.load(str(ASSETS / 'bunny-materials-v2.png'), check_existing=False)
atlas.pack()
materials = {}
quadrants = {}

def material(name, color, roughness=.75, metallic=0, quadrant=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    shader = tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = rgb(color)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['IOR'].default_value = 1.45
    tree.links.new(shader.outputs['BSDF'], out.inputs['Surface'])
    if quadrant is not None:
        tex = tree.nodes.new('ShaderNodeTexImage')
        tex.image = atlas
        tex.label = 'Generated storybook surface atlas'
        tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
        quadrants[name] = quadrant
    mat.diffuse_color = rgb(color)
    materials[name] = mat
    return mat

fur = material('01 · Warm cream fur', 'eddbb7', .87, quadrant=(0, .5))
ivory = material('02 · Soft muzzle fur', 'f7e9cc', .88, quadrant=(.5, 0))
cloth = material('03 · Raspberry cotton twill', 'b74b5a', .91, quadrant=(.5, .5))
earpink = material('04 · Peach inner ears', 'dca38d', .91, quadrant=(0, 0))
seam = material('05 · Raspberry piping', '813943', .88)
stitch = material('06 · Rose cotton stitching', 'dca0a0', .85)
gold = material('07 · Warm brass buttons', 'cda05a', .33, .62)
goldrim = material('08 · Polished button rims', 'e1bd7b', .27, .72)
eye = material('09 · Cocoa glass eyes', '251810', .13)
iris = material('10 · Chestnut iris', '68402b', .36)
pupil = material('11 · Deep brown pupils', '241713', .28)
white = material('12 · Eye catchlights', 'fff8e6', .2)
nosemat = material('13 · Rose nose', 'd48c80', .5)
mouthmat = material('14 · Warm smile', '754b43', .88)
mouthinside = material('20 · Smiling mouth interior', '633038', .96)
tonguemat = material('21 · Little rose tongue', 'eb929a', .91)
lashmat = material('22 · Soft cocoa eyelashes', '493025', .91)
furshadow = material('15 · Fur accents', 'cdb488', .94)
blushmat = material('16 · Cheek warmth', 'e7b696', .96)
finefur = material('18 · Fine down cream', 'e7d7b8', 1)
finetail = material('19 · Fine down ivory', 'f1e4ca', 1)
for mat in (finefur,finetail):
    next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Specular IOR Level'].default_value=0

parts = []

def weights(obj, mapping):
    if isinstance(mapping, str):
        obj.vertex_groups.new(name=mapping).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    else:
        names = set()
        values = []
        for v in obj.data.vertices:
            w = mapping(v.co)
            names.update(w)
            values.append(w)
        groups = {n: obj.vertex_groups.new(name=n) for n in names}
        for i, w in enumerate(values):
            for n, value in w.items():
                if value > .0001:
                    groups[n].add([i], value, 'REPLACE')

def mesh(name, vertices, faces, uv, mat, bone='Body'):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    layer = data.uv_layers.new(name='Surface')
    offset = quadrants.get(mat.name)
    for polygon in data.polygons:
        polygon.use_smooth = True
        for li in polygon.loop_indices:
            u, v = uv[data.loops[li].vertex_index]
            if offset:
                # Inset the texture quadrant to keep filtering clear of neighbours.
                u, v = offset[0] + .012 + u * .476, offset[1] + .012 + v * .476
            layer.data[li].uv = (u, v)
    if bone:
        weights(obj, bone)
        parts.append(obj)
    return obj

def ellipsoid(name, center, scale, mat, bone='Body', segments=40, rings=24, deform=None, rotation=None):
    center = Vector(center)
    rotation = rotation or Matrix.Identity(3)
    vertices, uv, faces = [], [], []
    for j in range(rings+1):
        lat = math.pi * j / rings
        for i in range(segments+1):
            az = TAU * i / segments
            p = Vector((math.sin(lat)*math.sin(az), -math.sin(lat)*math.cos(az), math.cos(lat)))
            if deform:
                p = deform(p)
            p = Vector((p.x*scale[0], p.y*scale[1], p.z*scale[2]))
            vertices.append(center + rotation @ p)
            uv.append((i/segments, 1-j/rings))
    for j in range(rings):
        for i in range(segments):
            a = j*(segments+1)+i
            faces.append((a, a+1, a+segments+2, a+segments+1))
    return mesh(name, vertices, faces, uv, mat, bone)

def tube(name, points, radius, mat, bone='Body', sides=8, taper=False):
    points = [Vector(p) for p in points]
    verts, faces, uv = [], [], []
    for j, p in enumerate(points):
        tangent = (points[min(j+1,len(points)-1)]-points[max(j-1,0)]).normalized()
        cross = Vector((0, -1, 0))
        if abs(tangent.dot(cross)) > .95:
            cross = Vector((1, 0, 0))
        right = tangent.cross(cross).normalized()
        up = tangent.cross(right).normalized()
        r = radius if isinstance(radius, (int,float)) else radius[j]
        if taper:
            r *= max(.09, math.sin(math.pi*(j+.15)/(len(points)-.7))**.5)
        for i in range(sides):
            angle = TAU*i/sides
            verts.append(p+r*(right*math.cos(angle)+up*math.sin(angle)))
            uv.append((i/sides,j/max(1,len(points)-1)))
    for j in range(len(points)-1):
        for i in range(sides):
            a=j*sides+i; b=j*sides+(i+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces += [tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))]
    return mesh(name, verts, faces, uv, mat, bone)

def bezier(a,b,c,d,n=24):
    a,b,c,d=map(Vector,(a,b,c,d))
    return [(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d for t in [i/n for i in range(n+1)]]

def dashed(name, points, radius=.0025, mat=stitch, bone='Body', every=2):
    for i in range(0,len(points)-1,every):
        a=Vector(points[i]); b=Vector(points[min(i+1,len(points)-1)])
        tube(name,[a,b],radius,mat,bone,sides=5)

def arm_weight(side):
    def fn(v):
        t = max(0,min(1,(1.16-v.z)/.30))
        return {f'Arm.{side}':1-t,f'Forearm.{side}':t}
    return fn

def leg_weight(side):
    def fn(v):
        t=max(0,min(1,(.55-v.z)/.27))
        return {f'Leg.{side}':1-t,f'Shin.{side}':t}
    return fn

def sculpt_union(objects, name, mat, bone_name, voxel=.009):
    """Fuse intersecting volumes into an actual smooth sculpt, then remap its UVs."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        if obj in parts:parts.remove(obj)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    remesh=obj.modifiers.new('Continuous sculpt surface','REMESH');remesh.mode='VOXEL';remesh.voxel_size=voxel;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=obj.modifiers.new('Polished organic contours','SMOOTH');smooth.factor=.75;smooth.iterations=4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    obj.data.materials.clear();obj.data.materials.append(mat)
    obj.vertex_groups.clear();weights(obj,bone_name)
    while obj.data.uv_layers:obj.data.uv_layers.remove(obj.data.uv_layers[0])
    layer=obj.data.uv_layers.new(name='Surface')
    center=sum((v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
    zmin=min(v.co.z for v in obj.data.vertices);zmax=max(v.co.z for v in obj.data.vertices)
    offset=quadrants[mat.name]
    for p in obj.data.polygons:
        p.use_smooth=True
        for li in p.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            u=math.atan2(co.x-center.x,-(co.y-center.y))/TAU+.5
            v=(co.z-zmin)/(zmax-zmin)
            layer.data[li].uv=(offset[0]+.012+u*.476,offset[1]+.012+v*.476)
    parts.append(obj)
    return obj

# Soft pear-shaped body and neck, visible through the bib's curved arm holes.
ellipsoid('Body sculpt', (0,.015,1.04),(.32,.24,.43),fur,segments=48,rings=32,
          deform=lambda p:Vector((p.x*(1-.13*p.z),p.y,p.z)))
ellipsoid('Neck', (0,.015,1.48),(.175,.17,.24),fur,'Head')

# The broad lower cheeks and narrower crown are shaped into the head itself.
def head_shape(p):
    widen=1+.085*math.exp(-((p.z+.3)/.4)**2)-.055*max(p.z,0)
    p.x*=widen
    if p.y < 0:
        p.y-=.10*math.exp(-((p.z+.3)/.3)**2)*(-p.y)**3
    return p

headparts=[ellipsoid('Sculpted head', (0,-.006,1.91),(.455,.345,.427),fur,'Head',64,40,head_shape),
    ellipsoid('Muzzle left',(-.092,-.315,1.785),(.153,.079,.099),ivory,'Head',40,24),
    ellipsoid('Muzzle right',(.092,-.315,1.785),(.153,.079,.099),ivory,'Head',40,24),
    ellipsoid('Chin',(0,-.252,1.682),(.16,.094,.057),ivory,'Head',36,20)]
headmat=material('17 · Painted face with soft cheek warmth','f7e9cc',.91,quadrant=(.5,0))
head=sculpt_union(headparts,'Continuous head and muzzle',headmat,'Head',.007)
colors=head.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for v in head.data.vertices:
    x,y,z=v.co
    muzzle=math.exp(-((x/.26)**4+((z-1.77)/.12)**4))*max(0,min(1,(-y-.20)/.12))
    cheek=math.exp(-(((abs(x)-.286)/.091)**2+((z-1.834)/.071)**2))*max(0,min(1,(-y-.10)/.12))
    base=(1,.92+.08*muzzle,.79+.21*muzzle)
    # Paint a broad, feathered rose blush directly on the sculpt. Vertex colours
    # survive GLB export and wrap around the cheeks at every viewing angle.
    rose=(1,.19,.245)
    colors.data[v.index].color=tuple(a*(1-.91*cheek)+b*.91*cheek for a,b in zip(base,rose))+(1,)
color_node=headmat.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name='Color'
mix=headmat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
tex=next(n for n in headmat.node_tree.nodes if n.type=='TEX_IMAGE')
bsdf=next(n for n in headmat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
headmat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);headmat.node_tree.links.new(color_node.outputs['Color'],mix.inputs[2]);headmat.node_tree.links.new(mix.outputs[0],bsdf.inputs['Base Color'])

# A softly rounded triangular nose rather than a pink sphere.
nosev=[]; noseuv=[]; nosefaces=[]
outline=[(-.067,1.856),(-.048,1.88),(.047,1.88),(.07,1.857),(.044,1.825),(0,1.798),(-.044,1.825)]
for y, factor in [(-.363,.85),(-.414,1),(-.426,.68)]:
    for i,(x,z) in enumerate(outline):
        nosev.append((x*factor,y,1.845+(z-1.845)*factor));noseuv.append((i/len(outline),factor))
for j in range(2):
    for i in range(7):
        a=j*7+i;b=j*7+(i+1)%7
        nosefaces.append((a,b,b+7,a+7))
nosefaces.extend([tuple(reversed(range(7))),tuple(range(14,21))])
nose=mesh('Heart-shaped rose nose',nosev,nosefaces,noseuv,nosemat,'Head')
modifier=nose.modifiers.new('Soft nose edges','SUBSURF');modifier.levels=2
bpy.context.view_layer.objects.active=nose
bpy.ops.object.modifier_apply(modifier=modifier.name)
def on_face(points,offset=.004):
    out=[]
    for p in points:
        hit,location,normal,index=head.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)))
        out.append(Vector((p.x,location.y-offset if hit else p.y,p.z)))
    return out
tube('Philtrum',on_face(bezier((0,-.394,1.815),(0,-.401,1.79),(0,-.401,1.761),(0,-.394,1.745)),.007),.005,mouthmat,'Head')

def face_patch(name, outline, mat, offset=.006):
    # Subdivide and project the entire filled surface, not just its perimeter,
    # so the mouth hugs the muzzle without sinking into it or floating off it.
    center=sum(outline,Vector())/len(outline)
    vertices=on_face([center],offset);uv=[(.5,.5)];faces=[]
    count=len(outline);rings=8
    for j in range(1,rings+1):
        t=j/rings
        vertices.extend(on_face([center.lerp(p,t) for p in outline],offset))
        uv.extend([(.5+.5*t*math.cos(TAU*i/count),.5+.5*t*math.sin(TAU*i/count)) for i in range(count)])
        for i in range(count):
            current=1+(j-1)*count+i;following=1+(j-1)*count+(i+1)%count
            if j==1:faces.append((0,current,following))
            else:faces.append((current-count,current,following,following-count))
    return mesh(name,vertices,faces,uv,mat,'Head')

smile_top=bezier((-.103,-.39,1.763),(-.043,-.40,1.739),(.043,-.40,1.739),(.103,-.39,1.763))
smile_bottom=bezier((.103,-.39,1.763),(.074,-.40,1.673),(-.074,-.40,1.673),(-.103,-.39,1.763))
smile_outline=smile_top[:-1]+smile_bottom[:-1]
face_patch('Little open smile',smile_outline,mouthinside)
tube('Rounded smile rim',on_face(smile_outline+[smile_outline[0]],.007),.0038,mouthmat,'Head',10)
tongue_outline=[Vector((.041*math.cos(TAU*i/48),-.4,1.710+.014*math.sin(TAU*i/48))) for i in range(48)]
face_patch('Little tongue inside smile',tongue_outline,tonguemat,.008)
for s in (-1,1):
    tube('Upturned smile corner',on_face(bezier((s*.097,-.39,1.757),(s*.124,-.39,1.763),(s*.143,-.38,1.784),(s*.15,-.37,1.798)),.006),.005,mouthmat,'Head',10,True)

# Glass eyes sit within soft, subtly raised lids. Separate eye bones enable blinks.
for s, side in [(-1,'L'),(1,'R')]:
    x=s*.188
    center=Vector((x,-.30,1.994))
    rot=Matrix.Rotation(s*.28,3,'Z')
    ellipsoid('Eye socket '+side,center+Vector((0,.025,0)),(.081,.029,.109),furshadow,'Eye.'+side,40,28,rotation=rot)
    ellipsoid('Eye ivory '+side,center+Vector((0,.008,0)),(.071,.024,.099),ivory,'Eye.'+side,40,28,rotation=rot)
    ellipsoid('Eye chestnut '+side,center+Vector((s*.008,-.005,.002)),(.059,.022,.086),iris,'Eye.'+side,40,28,rotation=rot)
    ellipsoid('Eye pupil '+side,center+Vector((s*.009,-.015,.005)),(.046,.016,.073),pupil,'Eye.'+side,36,24,rotation=rot)
    ellipsoid('Eye sparkle '+side,center+Vector((-.015,-.031,.038)),(.012,.004,.017),white,'Eye.'+side,24,16)
    ellipsoid('Eye glint '+side,center+Vector((.021,-.031,-.035)),(.005,.002,.006),white,'Eye.'+side,20,12)
    upper=[]
    for i in range(21):
        a=math.pi*i/20
        p=center+rot@Vector((.076*math.cos(a),.018,.108*math.sin(a)))
        upper.append(p)
    tube('Upper eyelid '+side,upper,.006,furshadow,'Eye.'+side,8,True)
    # Three tapered strokes grow from the outer upper lid. Keep lashes and their
    # dark lash line on the eye bone so they close with the animated eyelid.
    lashline=[center+rot@Vector((s*.074*math.cos(a),-.012,.101*math.sin(a)))
              for a in [math.pi*.07+math.pi*.77*i/32 for i in range(33)]]
    tube('Cocoa upper lash line '+side,lashline,.0048,lashmat,'Eye.'+side,10,True)
    for i,(angle,length) in enumerate(((.83,.045),(.55,.052),(.27,.047))):
        start=center+rot@Vector((s*.074*math.cos(angle),-.012,.101*math.sin(angle)))
        points=bezier(start,
            start+rot@Vector((s*.017,-.010,.003)),
            start+rot@Vector((s*length,-.017,.016)),
            start+rot@Vector((s*(length+.002),-.014,.037-i*.007)),20)
        radii=[.0058*(1-j/20)**.78+.00025 for j in range(21)]
        tube('Curved eyelash '+side+' '+str(i+1),points,radii,lashmat,'Eye.'+side,10)
    brow=bezier((s*.13,-.262,2.149),(s*.175,-.244,2.193),(s*.217,-.214,2.198),(s*.251,-.216,2.162))
    tube('Kind eyebrow '+side,on_face(brow,.003),.006,furshadow,'Head',8,True)

# Ears have curved volume, a cream rim, and an inset pink velvet surface.
def ear_center(s,t):
    if s<0:
        return Vector((-.225-.71*t-.035*math.sin(t*math.pi),.022+.03*t,2.255+.51*t-.060*t*t))
    return Vector((.205+.095*t+.024*math.sin(t*math.pi),.032+.065*t,2.26+.94*t-.025*t*t))

def ear_size(s,t):
    return (.152 if s<0 else .14)*math.sin(math.pi*t)**.67+.026*(1-t), .053*math.sin(math.pi*t)**.7+.018*(1-t)

for s,side in [(-1,'L'),(1,'R')]:
    vs=[];uv=[];fs=[]
    n=36;m=28
    def ew(v,side=side,s=s):
        axis=ear_center(s,1)-ear_center(s,0)
        along=(v-ear_center(s,0)).dot(axis)/axis.length_squared
        t=max(0,min(1,(along-.35)/.65))
        return {'Ear.'+side:1-t,'EarTip.'+side:t}
    for j in range(n+1):
        t=j/n;c=ear_center(s,t);w,d=ear_size(s,t)
        # Cross-sections perpendicular to the ear centreline in the XZ plane.
        tangent=ear_center(s,min(1,t+.01))-ear_center(s,max(0,t-.01))
        right=Vector((tangent.z,0,-tangent.x)).normalized()
        for i in range(m+1):
            a=TAU*i/m
            vs.append(c+right*(w*math.cos(a))+Vector((0,d*math.sin(a),0)))
            uv.append((i/m,t))
    for j in range(n):
        for i in range(m):
            a=j*(m+1)+i;fs.append((a,a+1,a+m+2,a+m+1))
    mesh('Sculpted ear '+side,vs,fs,uv,fur,ew)
    vs=[];uv=[];fs=[]
    for j in range(33):
        q=j/32;t=.115+.79*q;c=ear_center(s,t);w,d=ear_size(s,t)
        tangent=ear_center(s,t+.005)-ear_center(s,t-.005)
        right=Vector((tangent.z,0,-tangent.x)).normalized()
        width=w*.72*math.sin(math.pi*q)**.42
        for i in range(17):
            a=2*i/16-1
            vs.append(c+right*(a*width)+Vector((0,-d*math.sqrt(max(.1,1-(a*width/max(w,.001))**2))-.003,0)))
            uv.append((i/16,q))
    for j in range(32):
        for i in range(16):
            a=j*17+i;fs.append((a,a+1,a+18,a+17))
    mesh('Inset velvet ear '+side,vs,fs,uv,earpink,ew)

# Rounded hips and short, cuffed trouser legs.
ellipsoid('Hips',(0,.025,.704),(.342,.262,.31),cloth,'Body',48,32)
for s,side in [(-1,'L'),(1,'R')]:
    ellipsoid('Trouser leg '+side,(s*.193,.017,.485),(.173,.223,.24),cloth,leg_weight(side),44,28)
    ellipsoid('Cream ankle '+side,(s*.206,-.012,.285),(.113,.126,.166),fur,'Shin.'+side,36,24)
    foot=ellipsoid('Long bunny paw '+side,(s*.209,-.114,.102),(.158,.244,.124),ivory,'Foot.'+side,48,28,
                   deform=lambda p:Vector((p.x*(1-.08*p.y),p.y,max(p.z,-.83))))
    # Toe ridges and tiny creases, not separate ball-shaped toes.
    for dx in (-.055,.055):
        tube('Paw toe crease '+side,bezier((s*.209+dx,-.337,.1),(s*.209+dx,-.354,.139),(s*.209+dx,-.30,.187),(s*.209+dx,-.258,.205)),.0034,furshadow,'Foot.'+side,6,True)
    rings=[(.326,.172,.204),(.339,.182,.219),(.392,.179,.225),(.406,.166,.211)]
    vs=[];uv=[];fs=[]
    for j,(z,rx,ry) in enumerate(rings):
        for i in range(49):
            a=TAU*i/48
            vs.append((s*.194+rx*math.sin(a),.012-ry*math.cos(a),z+.007*math.sin(2*a)))
            uv.append((i/48,j/3))
    for j in range(3):
        for i in range(48):
            a=j*49+i;fs.append((a,a+1,a+50,a+49))
    mesh('Turned trouser cuff '+side,vs,fs,uv,cloth,leg_weight(side))
    line=[(s*.194+.176*math.sin(TAU*i/64),.012-.222*math.cos(TAU*i/64),.353+.007*math.sin(2*TAU*i/64)) for i in range(65)]
    dashed('Cuff stitch '+side,line,.0025,bone='Shin.'+side)

# Tail is full geometry, visible from behind and with a softly scalloped outline.
tailparts=[ellipsoid('Cotton tail',(0,.302,.803),(.153,.174,.164),ivory,'Tail',40,28)]
for i in range(15):
    a=TAU*i/15
    tailparts.append(ellipsoid('Tail soft tuft',(math.sin(a)*.098,.354+.025*math.sin(a*3),.813+math.cos(a)*.112),(.062,.07,.067),ivory,'Tail',20,12))
tail=sculpt_union(tailparts,'Sculpted fluffy tail',ivory,'Tail',.009)

# Continuous draped bib shell; its upper boundary dips under the arms.
vs=[];uv=[];fs=[];top=[]
for j in range(25):
    t=j/24
    for i in range(97):
        a=TAU*i/96
        front=min(a,TAU-a);back=abs(a-math.pi)
        topz=1.047+.291*math.exp(-(front/.86)**4)+.264*math.exp(-(back/.9)**4)
        z=.65+(topz-.65)*t
        rx=.358-.092*((z-.78)/.65)**2-.024*(1-t)**4
        ry=.266-.057*((z-.78)/.65)**2-.014*(1-t)**4
        # Gentle sewn fabric folds near the waist.
        fold=.0045*math.sin(a*10+z*13)*math.sin(math.pi*t)
        p=(math.sin(a)*(rx+fold),.01-math.cos(a)*(ry+fold),z)
        vs.append(p);uv.append((i/96,t))
        if j==24:top.append(p)
for j in range(24):
    for i in range(96):
        a=j*97+i;fs.append((a,a+1,a+98,a+97))
mesh('Tailored dungaree bib',vs,fs,uv,cloth,'Body')
tube('Bib rolled edge',top,.010,seam,'Body')
dashed('Bib topstitch',[(x*1.012,y*1.025,z-.018) for x,y,z in top],.0022)

# Shoulder straps follow the body over the shoulders, joining the back bib.
for s,side in [(-1,'L'),(1,'R')]:
    path=bezier((s*.205,-.218,1.33),(s*.226,-.27,1.63),(s*.214,.245,1.64),(s*.208,.223,1.245),40)
    vs=[];uv=[];fs=[]
    for j,p in enumerate(path):
        for i in range(5):
            offset=(i/4-.5)*.088
            vs.append(p+Vector((offset,-.007*math.sin(math.pi*i/4),0)));uv.append((i/4,j/40))
    for j in range(40):
        for i in range(4):
            a=j*5+i;fs.append((a,a+1,a+6,a+5))
    strap=mesh('Curved shoulder strap '+side,vs,fs,uv,cloth,'Body')
    solid=strap.modifiers.new('Real strap thickness','SOLIDIFY');solid.thickness=.018
    bpy.context.view_layer.objects.active=strap;bpy.ops.object.modifier_apply(modifier=solid.name)
    for edge in (-.036,.036):
        line=[p+Vector((edge,-.006,0)) for p in path]
        tube('Strap piping',line,.005,seam)
        dashed('Strap stitch',[p+Vector((-math.copysign(.01,edge),-.004,0)) for p in line],.0023)
    # Brass button with a rim and two inset sewing holes.
    c=Vector((s*.205,-.249,1.335))
    ellipsoid('Brass button '+side,c,(.047,.018,.047),gold,'Body',36,24)
    rim=[c+Vector((.037*math.cos(TAU*i/40),-.017,.037*math.sin(TAU*i/40))) for i in range(41)]
    tube('Button rim',rim,.004,goldrim,'Body')
    for dx in (-.011,.011):
        ellipsoid('Button hole',c+Vector((dx,-.020,0)),(.0045,.002,.006),seam,'Body',16,10)
    tube('Button sewing thread',[c+Vector((-.01,-.022,0)),c+Vector((.01,-.022,0))],.0024,stitch)

# Applied pocket, with a curved bottom, rolled opening and visible individual stitches.
outline=[]
outline+=bezier((-.136,-.272,1.20),(-.05,-.295,1.20),(.05,-.295,1.20),(.136,-.272,1.20),24)
outline+=bezier((.136,-.272,1.20),(.148,-.284,1.02),(.14,-.294,.996),(0,-.299,.985),24)[1:]
outline+=bezier((0,-.299,.985),(-.14,-.294,.996),(-.148,-.284,1.02),(-.136,-.272,1.20),24)[1:]
center=Vector((0,-.306,1.107))
pv=[center]+outline;pu=[(.5,.5)]+[((p.x+.15)/.3,(p.z-.98)/.23) for p in outline]
pf=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
mesh('Rounded front pocket',pv,pf,pu,cloth,'Body')
tube('Pocket binding',outline+[outline[0]],.005,seam)
dashed('Pocket hand stitching',[center+(p-center)*.91+Vector((0,-.003,0)) for p in outline],.0023)

# Arms taper smoothly into mitten paws, with small thumbs and three subtle finger lines.
for s,side in [(-1,'L'),(1,'R')]:
    aw=arm_weight(side)
    path=bezier((s*.268,.005,1.34),(s*.44,-.025,1.245),(s*.47,-.065,1.02),(s*.439,-.104,.934),32)
    radii=[.075+.036*math.sin(math.pi*i/(len(path)-1)) for i in range(len(path))]
    armparts=[tube('Arm '+side,path,radii,fur,aw,20),
        ellipsoid('Mitten paw '+side,(s*.438,-.107,.954),(.103,.104,.132),fur,aw,36,24),
        ellipsoid('Soft thumb '+side,(s*.376,-.174,.996),(.043,.055,.065),ivory,aw,28,18,rotation=Matrix.Rotation(s*-.35,3,'Y'))]
    sculpt_union(armparts,'Sculpted arm and paw '+side,fur,aw,.008)
    for dx in (-.027,.027):
        tube('Finger fold',bezier((s*.438+dx,-.186,.885),(s*.438+dx,-.208,.913),(s*.438+dx,-.208,.938),(s*.438+dx,-.202,.962)),.0025,furshadow,aw,6,True)

# Delicate short raised fur locks enrich silhouettes without a costly hair system.
for s,side in [(-1,'L'),(1,'R')]:
    for i in range(10):
        t=i/9
        start=Vector((s*(.418-.035*t),-.073-.091*t,1.96-.29*t))
        end=start+Vector((s*(.012+.006*math.sin(i*2)),.006,-.013-.009*math.sin(i)**2))
        tube('Cheek fur lock',bezier(start,start+Vector((s*.008,-.004,0)),end+Vector((0,0,.006)),end,5),[.006,.006,.005,.004,.002,.0004],fur,'Head',5)
    for i in range(3):
        t=i/4
        start=Vector((s*(.078+.039*i),-.12+.07*t,2.287-.018*i))
        end=start+Vector((s*.012,.023,.026-.005*i))
        tube('Crown fur lock',bezier(start,start+Vector((0,-.004,.016)),end+Vector((0,-.009,.005)),end,8),[.013,.012,.010,.009,.007,.005,.003,.001,.0003],fur,'Head',7)

# Short geometry fibres catch light and soften the silhouette at close range.
def down_fur(source,count,length,bone_name):
    source.data.update()
    verts=[];uv=[];faces=[]
    candidates=list(source.data.vertices)
    for _ in range(count):
        v=random.choice(candidates);p=v.co.copy();n=v.normal.normalized()
        if source is head and p.y<-.14:continue
        tangent=n.cross(Vector((.13,.05,1))).normalized()
        radius=random.uniform(.0007,.0014)
        size=length*random.uniform(.45,1)
        end=p+n*size+Vector((0,0,-size*.45))
        base=len(verts)
        verts.extend([p-tangent*radius,p+tangent*radius,p+n*size*.45+Vector((0,0,-size*.15)),end])
        uv.extend([(.5,.5),(.52,.5),(.51,.52),(.51,.54)])
        faces.extend([(base,base+1,base+2),(base,base+2,base+3),(base+1,base+3,base+2)])
    mesh('Fine down · '+source.name,verts,faces,uv,finefur if source is head else finetail,bone_name)
down_fur(head,2500,.010,'Head')
down_fur(tail,1400,.023,'Tail')

# Armature: deformable limbs, independently posing ears, eye blink controls and tail.
armdata=bpy.data.armatures.new('Bunny skeleton')
rig=bpy.data.objects.new('Bunny',armdata);collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
    return b
bone('Root',(0,0,0),(0,0,.3))
bone('Body',(0,0,.66),(0,0,1.43),'Root')
bone('Head',(0,.01,1.48),(0,.01,2.22),'Body')
bone('Tail',(0,.23,.8),(0,.45,.88),'Body')
for s,side in [(-1,'L'),(1,'R')]:
    bone('Arm.'+side,(s*.30,0,1.34),(s*.437,-.04,1.13),'Body')
    bone('Forearm.'+side,(s*.437,-.04,1.13),(s*.439,-.10,.9),'Arm.'+side)
    bone('Leg.'+side,(s*.185,.015,.70),(s*.195,.01,.43),'Root')
    bone('Shin.'+side,(s*.195,.01,.43),(s*.205,-.015,.16),'Leg.'+side)
    bone('Foot.'+side,(s*.205,-.015,.16),(s*.205,-.28,.12),'Shin.'+side)
    bone('Ear.'+side,ear_center(s,0),ear_center(s,.52),'Head')
    bone('EarTip.'+side,ear_center(s,.52),ear_center(s,1),'Ear.'+side)
    # Bone's local Y lies vertically so blinking compresses its longitudinal scale.
    bone('Eye.'+side,(s*.188,-.30,1.994),(s*.188,-.30,2.094),'Head')
bpy.ops.object.mode_set(mode='OBJECT')

# Merge surfaces into one skinned mesh. Material slots retain their authoring names.
for obj in parts:
    if not obj.data.color_attributes.get('Color'):
        attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
        for c in attr.data:c.color=(1,1,1,1)
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
skin=bpy.context.object;skin.name='Bunny · tailored and textured skin'
skin.parent=rig
mod=skin.modifiers.new('Bunny armature','ARMATURE');mod.object=rig

# Consistent outward normals after custom loft construction.
bpy.context.view_layer.objects.active=skin
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')

scene=bpy.context.scene
scene.render.fps=30
for p in rig.pose.bones:p.rotation_mode='XYZ'

def reset():
    for p in rig.pose.bones:
        p.location=(0,0,0);p.rotation_euler=(0,0,0);p.scale=(1,1,1)

def pose(frame,seconds,kind):
    reset();p=rig.pose.bones;t=seconds
    period={'Idle':4,'Wave':3,'Hop':1.6,'Curious':4}[kind]
    cycle=t*TAU/period
    # Slow breathing with a grounded root and a tiny curious head tilt.
    p['Body'].scale=(1+.006*math.sin(cycle),1+.009*math.sin(cycle),1+.006*math.sin(cycle))
    p['Head'].rotation_euler=(.018*math.sin(cycle),.032*math.sin(cycle),.028*math.sin(cycle+.4))
    for s,side in [(-1,'L'),(1,'R')]:
        p['Ear.'+side].rotation_euler.x=.025*math.sin(cycle+s*.5)
        p['EarTip.'+side].rotation_euler.x=.032*math.sin(cycle+s*.5-.6)
    p['Tail'].rotation_euler.x=.03*math.sin(cycle*2)
    if kind=='Idle':
        blink=max(0,1-abs((t-1.8)/.115))
        for side in ('L','R'):p['Eye.'+side].scale.y=1-.94*blink
    if kind=='Wave':
        envelope=math.sin(math.pi*min(1,t/3))**.65
        p['Arm.R'].rotation_euler.z=-1.9*envelope
        p['Forearm.R'].rotation_euler.z=-.35*envelope+.18*math.sin(t*TAU*2)*envelope
        p['Head'].rotation_euler.y=-.10*envelope
        p['Ear.L'].rotation_euler.x+=.09*envelope
    if kind=='Hop':
        h=math.sin(math.pi*t/1.6)**2
        # Root bone local Y follows Blender's world Z (its head-to-tail axis).
        p['Root'].location.y=.25*h
        p['Body'].rotation_euler.x=.07*math.sin(TAU*t/1.6)
        for s,side in [(-1,'L'),(1,'R')]:
            p['Leg.'+side].rotation_euler.x=.16*h
            p['Shin.'+side].rotation_euler.x=-.30*h
            p['Arm.'+side].rotation_euler.z=-s*.5*h
            p['EarTip.'+side].rotation_euler.x=.15*math.sin(TAU*t/1.6)
    if kind=='Curious':
        h=math.sin(math.pi*t/4)**2
        p['Head'].rotation_euler.z=.21*h
        p['Head'].rotation_euler.y=-.16*h
        p['Ear.L'].rotation_euler.x=.13*h
        p['Ear.R'].rotation_euler.z=-.14*h
    for pb in p:
        pb.keyframe_insert('location',frame=frame,group=pb.name)
        pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
        pb.keyframe_insert('scale',frame=frame,group=pb.name)

for kind,seconds in [('Idle',4),('Wave',3),('Hop',1.6),('Curious',4)]:
    rig.animation_data_create()
    action=bpy.data.actions.new(kind)
    rig.animation_data.action=action
    frames=round(seconds*30)
    for frame in range(frames+1):pose(frame,frame/30,kind)
    track=rig.animation_data.nla_tracks.new();track.name=kind
    strip=track.strips.new(kind,0,action);strip.action_frame_start=0;strip.action_frame_end=frames
    track.mute=True
rig.animation_data.action=None
reset();scene.frame_set(0)

# Named attachment points survive GLB export for future games.
for name,loc in [('LookTarget',(0,-.45,2)),('CarryPoint',(.40,-.2,1)),('Ground',(0,0,0))]:
    obj=bpy.data.objects.new(name,None);collection.objects.link(obj);obj.parent=rig;obj.location=loc
rig['character']='Bunny from Bunny’s Picnic'
rig['source']='Original painted reference in ../bunnys-picnic/assets/concepts/characters-v1.png'
rig['authoring']='Blender sculpt, tailored clothing, generated surface atlas, skeletal animation'

# Export the real character, independently of the presentation scene.
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'bunny.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_frame_range=False,export_skins=True,export_extras=True,export_yup=True,
    export_materials='EXPORT',export_texcoords=True,export_normals=True,export_image_format='AUTO',
    export_vertex_color='ACTIVE',export_all_vertex_colors=False)

# Authoring view and a render setup are kept in the .blend but excluded from GLB.
studio=bpy.data.collections.get('Bunny · studio')
if studio:
    for obj in list(studio.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.collections.remove(studio)
studio=bpy.data.collections.new('Bunny · studio');scene.collection.children.link(studio)
def studio_put(obj):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    studio.objects.link(obj)
    return obj
ground=material('Studio warm paper','e5ddcd',.92)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008))
studio_put(bpy.context.object).data.materials.append(ground)
def area(name,location,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector((0,0,1.4))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Large warm window',(-3,-4,6),450,4,(1,.91,.8))
area('Cool soft fill',(4,-1,3.6),260,3,(.8,.89,1))
area('Rim light',(1,3,4.2),450,3,(1,.89,.72))
world=scene.world or bpy.data.worlds.new('Bunny world');scene.world=world;world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.52,.56,.61,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35
camera_data=bpy.data.cameras.new('Bunny portrait')
camera=bpy.data.objects.new('Bunny portrait',camera_data);studio.objects.link(camera)
camera.location=(4,-8,3.2);target=Vector((0,0,1.56))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.75;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ASSETS/'bunny-portrait.png')
for screen in bpy.data.screens:
    for area_view in screen.areas:
        if area_view.type=='VIEW_3D':
            area_view.spaces.active.region_3d.view_distance=4.5
            area_view.spaces.active.region_3d.view_location=(0,0,1.5)
            area_view.spaces.active.shading.type='MATERIAL'
            area_view.spaces.active.overlay.show_overlays=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
rig.animation_data.action=next(track.strips[0].action for track in rig.animation_data.nla_tracks if track.name=='Idle')
scene.frame_start=0;scene.frame_end=120;scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'bunny.blend'))
info={'vertices':len(skin.data.vertices),'polygons':len(skin.data.polygons),'bones':len(armdata.bones),
      'materials':len(skin.data.materials),'animations':['Idle','Wave','Hop','Curious'],
      'height':round(max(v.co.z for v in skin.data.vertices),3),'glb_bytes':(ASSETS/'bunny.glb').stat().st_size}
(ASSETS/'model-info.json').write_text(json.dumps(info,indent=2)+'\n')
print('BUNNY_BUILD_COMPLETE '+json.dumps(info),flush=True)
