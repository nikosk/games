"""Smooth seated bunny, authored from the supplied blue-eyed yellow-bow reference.

Run using mcp_client.py --script blender/build_bow_bunny.py.
The earlier picnic bunny is kept separately. Blender Z up, front -Y.
"""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
TAU=math.tau
EYE_Y=-.331
EYE_DEPTH=.062
EYE_RX=.168
EYE_RZ=.211
EYE_Z=1.650

# Clear only our named demo collections from the working scene. The previous
# model's GLB and .blend remain intact on disk and in the comparison viewer.
for name in ('Bow bunny · character','Bow bunny · studio','Bunny · authored character','Bunny · studio'):
    previous=bpy.data.collections.get(name)
    if previous:
        for obj in list(previous.objects):bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(previous)
for col in bpy.context.scene.collection.children:
    col.hide_render=True
    col.hide_viewport=True
collection=bpy.data.collections.new('Bow bunny · character')
bpy.context.scene.collection.children.link(collection)

def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4

def rgb(code):return tuple(linear(int(code[i:i+2],16)/255) for i in (0,2,4))+(1,)

# Almost invisible neutral microtexture; no painted strands or spiky hair cards.
# Store the texture in the GLB so its soft surface also works outside Blender.
rng=np.random.default_rng(35)
size=512
noise=rng.normal(0,.0025,(size,size)).astype(np.float32)
pixels=np.ones((size,size,4),dtype=np.float32)
for channel,base in enumerate((.925,.910,.885)):
    pixels[:,:,channel]=np.clip(base+noise,0,1)
surface=bpy.data.images.new('Bow bunny · soft ivory surface',width=size,height=size)
surface.pixels.foreach_set(pixels.ravel())
surface.filepath_raw=str(ASSETS/'bow-bunny-surface.png');surface.file_format='PNG';surface.save();surface.pack()
materials={};quadrants={}
def material(name,color,roughness=.7,texture=False,sheen=0):
    mat=bpy.data.materials.get('Bow · '+name) or bpy.data.materials.new('Bow · '+name)
    mat.use_nodes=True;tree=mat.node_tree;tree.nodes.clear()
    shader=tree.nodes.new('ShaderNodeBsdfPrincipled');out=tree.nodes.new('ShaderNodeOutputMaterial')
    shader.inputs['Base Color'].default_value=rgb(color)
    shader.inputs['Roughness'].default_value=roughness
    shader.inputs['Specular IOR Level'].default_value=.28
    shader.inputs['Sheen Weight'].default_value=sheen
    shader.inputs['Sheen Roughness'].default_value=.65
    tree.links.new(shader.outputs['BSDF'],out.inputs['Surface'])
    if texture:
        tex=tree.nodes.new('ShaderNodeTexImage');tex.image=surface
        tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    mat.diffuse_color=rgb(color);materials[name]=mat
    return mat
fur=material('Soft ivory velvet','eeeae3',.72,True,.22)
headmat=material('Soft painted face','eeeae3',.74,True,.18)
bellymat=material('Pale tummy','f3efea',.79,False,.2)
muzzle=material('White muzzle','f7f3ed',.78,False,.16)
pink=material('Inner ear rose','d39aab',.83,False,.2)
outereye=material('Lid crease','958582',.87)
sclera=material('Warm eye whites','f5f5ee',.30)
iris=material('Blue iris fibres','ffffff',.34)
pupil=material('Deep pupil','060d17',.18)
catchlight=material('Soft eye catchlights','ffffff',.18)
lashmat=material('Fine eyelashes','372c2e',.80)
browmat=material('Soft eyebrows','9e928e',.94)
nosemat=material('Rose petal nose','dfa4b3',.5)
smilemat=material('Little smile','54363b',.96)
tonguemat=material('Little pink tongue','e7a0ad',.88)
gold=material('Honey silk bow','e3a42f',.49,False,.4)
goldcrease=material('Bow fold shadow','ba7a24',.81)
crease=material('Soft paw creases','b6a8a3',.93)
parts = []

def ease(value):
    t=max(0,min(1,value))
    return t*t*t*(t*(t*6-15)+10)

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

def painted(obj,values):
    attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for vertex,color in zip(obj.data.vertices,values):attr.data[vertex.index].color=color
    mat=obj.data.materials[0];tree=mat.node_tree
    if any(n.type=='VERTEX_COLOR' for n in tree.nodes):return
    vertex=tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color'
    shader=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
    texture=next((n for n in tree.nodes if n.type=='TEX_IMAGE'),None)
    if texture:
        mix=tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
        tree.links.new(texture.outputs['Color'],mix.inputs[1]);tree.links.new(vertex.outputs['Color'],mix.inputs[2]);tree.links.new(mix.outputs[0],shader.inputs['Base Color'])
    else:tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color'])

def sculpt(objects,name,mat,bone,voxel=.008):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        if obj in parts:parts.remove(obj)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    remesh=obj.modifiers.new('Joined soft volumes','REMESH');remesh.mode='VOXEL';remesh.voxel_size=voxel;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=obj.modifiers.new('Smooth sculpt','SMOOTH');smooth.factor=.9;smooth.iterations=7
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    obj.data.materials.clear();obj.data.materials.append(mat)
    obj.vertex_groups.clear();weights(obj,bone)
    while obj.data.uv_layers:obj.data.uv_layers.remove(obj.data.uv_layers[0])
    layer=obj.data.uv_layers.new(name='Surface')
    low=min(v.co.z for v in obj.data.vertices);high=max(v.co.z for v in obj.data.vertices)
    for polygon in obj.data.polygons:
        polygon.use_smooth=True
        for li in polygon.loop_indices:
            p=obj.data.vertices[obj.data.loops[li].vertex_index].co
            layer.data[li].uv=(math.atan2(p.x,-p.y)/TAU+.5,(p.z-low)/(high-low))
    parts.append(obj);return obj

# A broad seated pear with softly folded haunches and small forward paws.
body=sculpt([
    ellipsoid('Round seated body',(0,.065,.54),(.435,.335,.49),fur),
    ellipsoid('Soft chest',(0,.04,.86),(.30,.25,.30),fur),
], 'Seated body sculpt',fur,'Body',.008)
# A pale tummy is vertex-painted into the body, with feathered edges.
body_colors=[]
for v in body.data.vertices:
    x,y,z=v.co
    mask=math.exp(-((x/.28)**4+((z-.50)/.32)**4))*max(0,min(1,(-y-.06)/.17))
    body_colors.append((.96+.04*mask,.95+.05*mask,.93+.07*mask,1))
painted(body,body_colors)
for s,side in [(-1,'L'),(1,'R')]:
    ellipsoid('Folded haunch '+side,(s*.355,.055,.365),(.23,.275,.295),fur,'Leg.'+side,48,32)
    foot=ellipsoid('Rounded seated foot '+side,(s*.335,-.128,.102),(.212,.273,.111),fur,'Foot.'+side,52,32,
        deform=lambda p:Vector((p.x,p.y,max(-.90,p.z))))
    for dx in (-.063,.035):
        tube('Toe indentation '+side,bezier((s*.335+dx,-.368,.063),(s*.335+dx,-.380,.102),(s*.335+dx,-.320,.185),(s*.335+dx,-.268,.205)),.0024,crease,'Foot.'+side,7,True)
    # Resting forearms follow the chest and end in little inward-facing mittens.
    def arm_weights(v,side=side):
        shoulder=ease((.97-v.z)/.15)
        elbow=ease((.80-v.z)/.13)
        wrist=ease((.68-v.z)/.11)
        return {'Body':1-shoulder,'Arm.'+side:shoulder*(1-elbow),
            'Forearm.'+side:shoulder*elbow*(1-wrist),'Hand.'+side:shoulder*elbow*wrist}
    arm=sculpt([
        ellipsoid('Round shoulder '+side,(s*.252,-.095,.887),(.108,.125,.122),fur,'Arm.'+side,44,28),
        tube('Soft curved arm '+side,bezier((s*.265,-.09,.907),(s*.40,-.12,.82),(s*.34,-.29,.65),(s*.263,-.329,.565),40),[.100+.025*math.sin(math.pi*i/40)-.006*i/40 for i in range(41)],fur,'Arm.'+side,28),
        ellipsoid('Resting hand '+side,(s*.263,-.329,.565),(.092,.098,.106),fur,'Hand.'+side,44,28),
        ellipsoid('Soft thumb '+side,(s*.214,-.324,.557),(.055,.065,.079),fur,'Hand.'+side,32,24),
    ],'Resting paw '+side,fur,arm_weights,.006)
    for dx in (-.025,.025):
        points=bezier((s*.263+dx,-.42,.477),(s*.263+dx,-.43,.495),(s*.263+dx,-.43,.520),(s*.263+dx,-.42,.540))
        projected=[]
        for point in points:
            hit,loc,normal,index=arm.ray_cast(Vector((point.x,-2,point.z)),Vector((0,1,0)))
            if hit:projected.append(Vector((point.x,loc.y-.002,point.z)))
        if len(projected)>2:tube('Small paw crease '+side,projected,.0017,crease,'Hand.'+side,6,True)
tail=ellipsoid('Round cotton tail',(0,.377,.390),(.185,.20,.184),fur,'Tail',52,32)

# The head is one continuous broad-cheeked sculpt, including both muzzle lobes.
def head_shape(p):
    p.x*=1+.19*math.exp(-((p.z+.40)/.55)**2)-.08*max(p.z,0)
    return p
head=sculpt([
    ellipsoid('Round skull',(0,-.008,1.623),(.605,.425,.578),fur,'Head',80,56,head_shape),
    ellipsoid('Muzzle L',(-.102,-.388,1.324),(.169,.118,.122),fur,'Head',48,32),
    ellipsoid('Muzzle R',(.102,-.388,1.324),(.169,.118,.122),fur,'Head',48,32),
], 'Round head with sculpted cheeks',headmat,'Head',.006)
face_surface=BVHTree.FromPolygons([v.co.copy() for v in head.data.vertices],
    [tuple(p.vertices) for p in head.data.polygons])
# Shallow anatomical sockets leave space behind each globe. Their shoulders
# taper into the original face, while the eyelid surfaces bridge the opening.
for vertex in head.data.vertices:
    if vertex.co.y>-.13:continue
    for s in (-1,1):
        dx=vertex.co.x-s*.300;dz=vertex.co.z-EYE_Z
        r=math.hypot(dx/EYE_RX,dz/(EYE_RZ*(.88 if dz>0 else 1)))
        if r>=1.24:continue
        t=max(0,min(1,(r-1)/.24))
        blend=1-t*t*(3-2*t)
        back=EYE_Y+s*.40*dx+.020+EYE_DEPTH*math.sqrt(max(0,1-r*r))
        vertex.co.y+=max(0,back-vertex.co.y)*blend
head.data.update()
def face_color(p):
    x,y,z=p
    front=max(0,min(1,(-y-.10)/.19))
    blush=math.exp(-(((abs(x)-.485)/.12)**2+((z-1.385)/.09)**2))*front
    muzzlelight=math.exp(-((x/.376)**4+((z-1.322)/.163)**4))*front
    socket=math.exp(-(((abs(x)-.302)/.22)**4+((z-1.69)/.27)**4))*front
    return (1-.035*socket,.98+.02*muzzlelight-.065*blush-.04*socket,.95+.05*muzzlelight-.055*blush-.04*socket,1)
painted(head,[face_color(v.co) for v in head.data.vertices])

# Project details onto the real sculpt, avoiding floating stickers and stray lines.
def on_face(points,offset=.003):
    result=[]
    for p in points:
        p=Vector(p);hit,location,normal,index=head.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)))
        result.append(Vector((p.x,location.y-offset if hit else p.y,p.z)))
    return result

def mouth_part(obj,kind):
    # A point attribute survives joining the character's material surfaces.
    attr=obj.data.attributes.new(name='mouth_part',type='INT',domain='POINT')
    for item in attr.data:item.value=kind
    return obj

mouth_part(head,3)

def face_patch(name,outline,mat,offset=.003):
    center=sum(outline,Vector())/len(outline);count=len(outline);rings=8
    vs=on_face([center],offset);uv=[(.5,.5)];fs=[]
    for j in range(1,rings+1):
        t=j/rings;vs.extend(on_face([center.lerp(p,t) for p in outline],offset))
        uv.extend([(.5+.5*t*math.cos(TAU*i/count),.5+.5*t*math.sin(TAU*i/count)) for i in range(count)])
        for i in range(count):
            a=1+(j-1)*count+i;b=1+(j-1)*count+(i+1)%count
            fs.append((0,a,b) if j==1 else (a-count,a,b,b-count))
    if name in ('Small happy mouth','Tongue'):
        for v in vs:
            v.y=min(v.y,-.4455+.0207*(v.x/.1475)**2+.0092*((v.z-1.213)/.083)**2-(.0023 if name=='Tongue' else 0))
    return mesh(name,vs,fs,uv,mat,'Head')

# A broader happy smile, tucked beneath the muzzle, with a little pink tongue.
smile_top=bezier((-.130,-.494,1.260),(-.052,-.494,1.235),(.052,-.494,1.235),(.130,-.494,1.260))
smile_bottom=bezier((.130,-.494,1.260),(.098,-.482,1.158),(-.098,-.482,1.158),(-.130,-.494,1.260))
mouth_part(face_patch('Small happy mouth',smile_top[:-1]+smile_bottom[:-1],smilemat),1)
mouth_part(face_patch('Tongue',[Vector((.070*math.cos(TAU*i/48),-.494,1.206+.014*math.sin(TAU*i/48))) for i in range(48)],tonguemat,.004),2)
for s in (-1,1):
    tube('Muzzle smile '+str(s),on_face(bezier((0,-.52,1.297),(s*.050,-.52,1.244),(s*.146,-.482,1.265),(s*.198,-.471,1.303))),.0026,crease,'Head',8,True)
# Soft triangular nose with a subtle heart-shaped upper contour.
vs=[];uv=[];fs=[]
outline=[(-.094,1.417),(-.057,1.440),(0,1.428),(.057,1.440),(.094,1.417),(.041,1.366),(0,1.349),(-.041,1.366)]
for j,(y,scale) in enumerate([(-.462,.8),(-.523,1),(-.547,.61)]):
    for i,(x,z) in enumerate(outline):vs.append((x*scale,y,1.401+(z-1.401)*scale));uv.append((i/8,j/2))
for j in range(2):
    for i in range(8):
        a=j*8+i;b=j*8+(i+1)%8;fs.append((a,b,b+8,a+8))
fs.extend([tuple(reversed(range(8))),tuple(range(16,24))])
nose=mesh('Little heart nose',vs,fs,uv,nosemat,'Head')
bpy.context.view_layer.objects.active=nose
mod=nose.modifiers.new('Soft nose contour','SUBSURF');mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
tube('Short nose line',on_face(bezier((0,-.54,1.358),(0,-.54,1.335),(0,-.54,1.309),(0,-.52,1.296))),.0031,crease,'Head',8)

# Large blue eyes: every colour follows one curved eyeball surface. Iris fibres
# are radial vertex colours; pupils have no thick raised rims or separate disks.
for s,side in [(-1,'L'),(1,'R')]:
    center=Vector((s*.300,EYE_Y,EYE_Z));rx=EYE_RX;rz=EYE_RZ;depth=EYE_DEPTH
    ellipsoid('Inset eye white '+side,center,(rx,depth,rz),sclera,'Eye.'+side,72,48,deform=lambda p:Vector((p.x,p.y+s*(.40*rx/depth)*p.x,p.z*.88 if p.z>0 else p.z)))
    def eye_point(x,z,offset=0):
        return center+Vector((x,-depth*math.sqrt(max(.015,1-(x/rx)**2-(z/(rz*.88 if z>0 else rz))**2))+s*.40*x-offset,z))
    # Dark limbal ring, luminous blue fibres, and a large round pupil.
    irx=.146;irz=.194;shift=-s*.006
    verts=[];uv=[];faces=[];colors=[];rings=28;segments=128
    for j in range(rings+1):
        r=j/rings
        for i in range(segments+1):
            a=TAU*i/segments;x=shift+irx*r*math.cos(a);z=-.012+irz*r*math.sin(a)
            verts.append(eye_point(x,z,.001));uv.append((.5+.5*r*math.cos(a),.5+.5*r*math.sin(a)))
            outer=max(0,min(1,(1-r)/.10));inner=max(0,min(1,(r-.59)/.12))
            blue=outer*inner
            fibre=.76+.13*math.sin(67*a+3*r)+.06*math.sin(119*a-7*r)+.05*math.sin(39*a+11*r)
            light=blue*fibre*(.72+.28*max(0,-math.sin(a)))
            colors.append((.005+.032*light,.012+.17*light,.025+.32*light,1))
    for j in range(rings):
        for i in range(segments):
            a=j*(segments+1)+i;faces.append((a,a+1,a+segments+2,a+segments+1))
    irisobj=mesh('Radial blue iris '+side,verts,faces,uv,iris,'Eye.'+side);painted(irisobj,colors)
    # Pupil is a curved cap with the same depth as the iris.
    verts=[];uv=[];faces=[]
    for j in range(15):
        r=j/14
        for i in range(97):
            a=TAU*i/96;verts.append(eye_point(shift+.112*r*math.cos(a),-.012+.154*r*math.sin(a),.0017));uv.append((i/96,r))
    for j in range(14):
        for i in range(96):
            a=j*97+i;faces.append((a,a+1,a+98,a+97))
    mesh('Curved pupil '+side,verts,faces,uv,pupil,'Eye.'+side)
    for label,x,z,size_x,size_z in [('Window',-.047,.080,.026,.031),('Tiny glint',.058,-.090,.008,.010)]:
        # Conform the whole highlight to the eye so its round edge does not
        # intersect the curved pupil when viewed from another angle.
        highlights=[];highlight_uv=[];highlight_faces=[]
        for j in range(9):
            r=j/8
            for i in range(33):
                a=TAU*i/32
                highlights.append(eye_point(shift+x+size_x*r*math.cos(a),z+size_z*r*math.sin(a),.003))
                highlight_uv.append((i/32,r))
        for j in range(8):
            for i in range(32):
                a=j*33+i;highlight_faces.append((a,a+1,a+34,a+33))
        mesh(label+' '+side,highlights,highlight_faces,highlight_uv,catchlight,'Eye.'+side)
    # Soft skin lids close over the recessed globe. The inner edge follows the
    # blink bone; the outer edge stays attached to the head instead of exposing
    # an empty socket when the eyes close.
    inner_radius=.970;outer_radius=1.36;blend_radius=1.20
    verts=[];uv=[];faces=[];lidcolors=[];steps=24;segments=128
    for j in range(steps+1):
        t=j/steps;r=inner_radius+(outer_radius-inner_radius)*t
        for i in range(segments+1):
            a=TAU*i/segments
            axis_z=rz*(.88 if math.sin(a)>0 else 1)
            inner=eye_point(rx*inner_radius*math.cos(a),axis_z*inner_radius*math.sin(a),.004)
            p=center+Vector((rx*r*math.cos(a),0,axis_z*r*math.sin(a)))
            skin,normal,index,distance=face_surface.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)))
            # Match the original face's curvature before the outer boundary,
            # then tuck the final edge just inside it to hide the mesh join.
            blend=max(0,min(1,(r-inner_radius)/(blend_radius-inner_radius)))
            blend=blend*blend*(3-2*blend)
            inset=inner.y+s*.40*(p.x-inner.x)
            skin_y=skin.y if skin is not None else inset
            edge=max(0,min(1,(r-1.24)/.06))
            p.y=inset*(1-blend)+(skin_y-.0004+.006*edge*edge)*blend
            verts.append(p);uv.append((math.atan2(p.x,-p.y)/TAU+.5,(p.z-1.045)/1.156))
            # A gentle crease remains readable under the browser's soft lights.
            shade=.94+.06*blend
            lidcolors.append(tuple(c*shade for c in face_color(p)[:3])+(1,))
    for j in range(steps):
        for i in range(segments):
            a=j*(segments+1)+i;faces.append((a,a+1,a+segments+2,a+segments+1))
    def lid_weights(p,side=side,center=center.copy()):
        z=p.z-center.z
        r=math.hypot((p.x-center.x)/rx,z/(rz*(.88 if z>0 else 1)))
        t=max(0,min(1,(r-inner_radius)/(blend_radius-inner_radius)))
        w=1-t*t*(3-2*t)
        return {'Eye.'+side:w,'Head':1-w}
    lids=mesh('Blended socket lids '+side,verts,faces,uv,headmat,lid_weights)
    painted(lids,lidcolors)
    # Fine lash line sits along the inset upper edge, not on a raised eye rim.
    upper=[]
    for i in range(49):
        a=math.pi*i/48
        upper.append(eye_point(rx*inner_radius*math.cos(a),rz*.88*inner_radius*math.sin(a),.005))
    tube('Upper lash line '+side,upper,.0055,lashmat,'Eye.'+side,10,True)
    for i,(angle,length) in enumerate(((.80,.034),(.58,.044),(.36,.045),(.15,.034))):
        start=eye_point(s*rx*.985*math.cos(angle),rz*.88*.973*math.sin(angle),.004)
        points=bezier(start,start+Vector((s*.022,-.01,.004)),start+Vector((s*length,-.016,.025)),start+Vector((s*(length+.008),-.018,.039-i*.007)),20)
        tube('Fine curved lash '+side+str(i),points,[.0039*(1-j/20)**.9+.0001 for j in range(21)],lashmat,'Eye.'+side,8)
    brow=on_face(bezier((s*.19,-.35,1.982),(s*.25,-.35,2.038),(s*.34,-.29,2.043),(s*.408,-.25,1.997)),.002)
    tube('Soft expressive brow '+side,brow,[.0008+.011*math.sin(math.pi*i/(len(brow)-1))**.8 for i in range(len(brow))],browmat,'Head',10)

# Upright, slightly splayed ears with soft edges and gently cupped pink interiors.
def ear_center(s,t):
    return Vector((s*(.230+.370*t+.035*math.sin(math.pi*t)),.040+.055*t+.035*math.sin(math.pi*t),2.110+1.04*t-.035*t*t))

def ear_size(t):return .182*math.sin(math.pi*t)**.5+.036*(1-t),.080*math.sin(math.pi*t)**.7+.026*(1-t)
for s,side in [(-1,'L'),(1,'R')]:
    def ew(v,side=side,s=s):
        axis=ear_center(s,1)-ear_center(s,0);a=(v-ear_center(s,0)).dot(axis)/axis.length_squared
        t=max(0,min(1,(a-.40)/.60));return {'Ear.'+side:1-t,'EarTip.'+side:t}
    vs=[];uv=[];fs=[];n=52;m=40
    for j in range(n+1):
        t=j/n;c=ear_center(s,t);w,d=ear_size(t)
        tangent=ear_center(s,min(1,t+.01))-ear_center(s,max(0,t-.01));right=Vector((tangent.z,0,-tangent.x)).normalized()
        for i in range(m+1):
            a=TAU*i/m;vs.append(c+right*w*math.cos(a)+Vector((0,d*math.sin(a)+.055*max(0,-math.sin(a))**4*math.sin(math.pi*t),0)));uv.append((i/m,t))
    for j in range(n):
        for i in range(m):a=j*(m+1)+i;fs.append((a,a+1,a+m+2,a+m+1))
    mesh('Soft outer ear '+side,vs,fs,uv,fur,ew)
    vs=[];uv=[];fs=[];cols=[]
    for j in range(45):
        q=j/44;t=.072+.866*q;c=ear_center(s,t);w,d=ear_size(t)
        tangent=ear_center(s,t+.005)-ear_center(s,t-.005);right=Vector((tangent.z,0,-tangent.x)).normalized()
        width=w*.79*math.sin(math.pi*q)**.36
        for i in range(25):
            u=2*i/24-1
            vs.append(c+right*u*width+Vector((0,-d*math.sqrt(max(.08,1-(u*width/max(w,.001))**2))+.055*max(0,1-(u*width/max(w,.001))**2)**2*math.sin(math.pi*t)-.002,0)));uv.append((i/24,q))
            shade=.78+.22*q+.10*abs(u)
            base=rgb('d79aaa');cols.append(tuple(c*shade for c in base[:3])+(1,))
    for j in range(44):
        for i in range(24):a=j*25+i;fs.append((a,a+1,a+26,a+25))
    inset=mesh('Rose velvet inner ear '+side,vs,fs,uv,pink,ew);painted(inset,cols)
# A few broad sculpted crown locks, not individual hair spikes.
for i,(x,lean,height) in enumerate([(-.065,-.07,.10),(0,.025,.14),(.068,.055,.105)]):
    path=bezier((x,.017,2.158),(x,.011,2.215),(x+lean,-.006,2.22+height*.45),(x+lean,.009,2.175+height),20)
    tube('Soft crown tuft '+str(i),path,[.036*(1-j/20)**1.3+.0005 for j in range(21)],fur,'Head',14)

# A proper folded silk bow: hollow loops, a wrapped knot and two draped tails.
for s,side in [(-1,'L'),(1,'R')]:
    vs=[];uv=[];fs=[];n=52;m=20
    for j in range(n+1):
        t=j/n;w=.024+.083*math.sin(math.pi*t)**.8
        c=Vector((s*(.050+.202*math.sin(math.pi*t)),-.419-.057*math.cos(math.pi*t)-.037*math.sin(math.pi*t),.923+.031*math.sin(math.pi*t)))
        for i in range(m+1):
            a=TAU*i/m
            vs.append(c+Vector((0,.009*math.sin(a)+.010*math.cos(3*a)*math.sin(math.pi*t),w*math.cos(a))))
            uv.append((i/m,t))
    for j in range(n):
        for i in range(m):a=j*(m+1)+i;fs.append((a,a+1,a+m+2,a+m+1))
    fs.extend([tuple(reversed(range(m))),tuple(range(n*(m+1),n*(m+1)+m))])
    mesh('Folded bow loop '+side,vs,fs,uv,gold,'Body')
    vs=[];uv=[];fs=[]
    for j in range(29):
        t=j/28;cx=s*(.045+.093*t);width=.045+.027*t
        for i in range(17):
            u=2*i/16-1
            vs.append((cx+u*width,-.437-.031*math.sin(math.pi*t)-.016*math.cos(math.pi*u)*math.sin(math.pi*t),.905-.275*t+.038*t**10*(1-abs(u))))
            uv.append((i/16,t))
    for j in range(28):
        for i in range(16):a=j*17+i;fs.append((a,a+1,a+18,a+17))
    ribbon=mesh('Draped ribbon '+side,vs,fs,uv,gold,'Body')
    bpy.context.view_layer.objects.active=ribbon
    solid=ribbon.modifiers.new('Silk thickness','SOLIDIFY');solid.thickness=.006;bpy.ops.object.modifier_apply(modifier=solid.name)
    bevel=ribbon.modifiers.new('Soft ribbon edge','BEVEL');bevel.width=.003;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
ellipsoid('Bow wrapped knot',(0,-.473,.931),(.055,.035,.049),gold,'Body',48,32,rotation=Matrix.Rotation(.16,3,'Y'))
for s in (-1,1):
    tube('Knot fold',bezier((s*.032,-.481,.972),(s*.022,-.509,.953),(s*.014,-.509,.920),(s*.026,-.488,.891)),.0017,goldcrease,'Body',8,True)

# Seat the folded bow against the chest, with its tails following the belly.
for obj in parts:
    if obj.name.startswith(('Folded bow loop','Draped ribbon','Bow wrapped knot','Knot fold')):
        for v in obj.data.vertices:
            t=max(0,min(1,(.905-v.co.z)/.275)) if obj.name.startswith('Draped ribbon') else 0
            v.co.y+=.17-.06*t
# The narrow ribbon behind the knot wraps around the neck rather than floating.
vs=[];uv=[];fs=[]
for j in range(65):
    a=TAU*j/64
    for i in range(13):
        b=TAU*i/12
        vs.append(((.278+.007*math.cos(b))*math.sin(a),.03-(.237+.007*math.cos(b))*math.cos(a),.947+.023*math.sin(b)))
        uv.append((j/64,i/12))
for j in range(64):
    for i in range(12):
        a=j*13+i;fs.append((a,a+1,a+14,a+13))
mesh('Ribbon around neck',vs,fs,uv,gold,'Body')

# Skeleton keeps ears, eyes, arms, feet and tail usable in the viewer's four poses.
armdata=bpy.data.armatures.new('Bow bunny skeleton')
rig=bpy.data.objects.new('Bow Bunny',armdata);collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=armdata.edit_bones[parent]
    return b
bone('Root',(0,0,0),(0,0,.20))
bone('Body',(0,.05,.28),(0,.04,1.06),'Root')
bone('Head',(0,.015,1.035),(0,.015,1.99),'Body')
bone('Tail',(0,.29,.39),(0,.53,.39),'Body')
for s,side in [(-1,'L'),(1,'R')]:
    bone('Arm.'+side,(s*.265,-.090,.907),(s*.345,-.205,.735),'Body')
    bone('Forearm.'+side,(s*.345,-.205,.735),(s*.290,-.310,.625),'Arm.'+side)
    bone('Hand.'+side,(s*.290,-.310,.625),(s*.270,-.335,.515),'Forearm.'+side)
    bone('Leg.'+side,(s*.27,.05,.45),(s*.39,-.01,.26),'Root')
    bone('Shin.'+side,(s*.39,-.01,.26),(s*.335,-.11,.12),'Leg.'+side)
    bone('Foot.'+side,(s*.335,-.11,.12),(s*.335,-.35,.09),'Shin.'+side)
    bone('Ear.'+side,ear_center(s,0),ear_center(s,.52),'Head')
    bone('EarTip.'+side,ear_center(s,.52),ear_center(s,1),'Ear.'+side)
    bone('Eye.'+side,(s*.300,EYE_Y,EYE_Z),(s*.300,EYE_Y,EYE_Z+.10),'Head')
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
skin=bpy.context.object;skin.name='Bow bunny · smooth sculpt and silk bow'
skin.parent=rig
mod=skin.modifiers.new('Bunny armature','ARMATURE');mod.object=rig

# Consistent outward normals after custom loft construction.
bpy.context.view_layer.objects.active=skin
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')

# Closed smile is the actual rest geometry. MouthOpen unfolds the curved mouth
# and tongue while letting the lower face move gently with the opening.
basis=skin.shape_key_add(name='Basis')
mouth_open=skin.shape_key_add(name='MouthOpen')
mouth_open.slider_min=0;mouth_open.slider_max=1
part_ids=skin.data.attributes['mouth_part']
for i,vertex in enumerate(skin.data.vertices):
    kind=part_ids.data[i].value
    p=vertex.co.copy()
    if kind in (1,2):
        smile_z=1.243+.017*(p.x/.130)**2
        closed=Vector((p.x,p.y,smile_z+(p.z-smile_z)*.035))
        # The tongue tucks behind the face instead of remaining a pink line.
        location,normal,index,distance=face_surface.ray_cast(Vector((closed.x,-2,closed.z)),Vector((0,1,0)))
        if location is not None:closed.y=location.y+(-.0025 if kind==1 else .012)
        basis.data[i].co=closed
        vertex.co=closed
    elif kind==3:
        front=max(0,min(1,(-p.y-.12)/.16))
        cavity=math.exp(-((p.x/.155)**4+((p.z-1.222)/.060)**4))*front
        jaw=math.exp(-((p.x/.24)**4+((p.z-1.13)/.085)**4))*front
        lower=max(0,min(1,(1.20-p.z)/.08))
        mouth_open.data[i].co.y+=.035*cavity+.006*jaw
        mouth_open.data[i].co.z-=.012*jaw*lower
skin.data.attributes.remove(part_ids)
skin.data.update()
mouth_open.value=0

scene=bpy.context.scene
scene.render.fps=30
for p in rig.pose.bones:p.rotation_mode='XYZ'

def reset():
    for p in rig.pose.bones:
        p.location=(0,0,0);p.rotation_euler=(0,0,0);p.scale=(1,1,1)

def front_rotation(name,angle):
    # Rotate in the character's frontal plane, independent of bone roll.
    rest=armdata.bones[name].matrix_local.to_3x3()
    rig.pose.bones[name].rotation_euler=(rest.inverted()@Matrix.Rotation(angle,3,'Y')@rest).to_euler('XYZ')

def pose(frame,seconds,kind):
    reset();p=rig.pose.bones;t=seconds
    period={'Idle':4,'Wave':4.2,'Hop':1.6,'Curious':4}[kind]
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
        lift=ease((t-.12)/1.05)*(1-ease((t-2.94)/1.08))
        bend=ease((t-.30)/.98)*(1-ease((t-2.85)/1.05))
        wrist_lift=ease((t-.47)/.90)*(1-ease((t-2.78)/1.02))
        wave_t=max(0,min(1,(t-1.38)/1.30))
        wave=math.sin(TAU*2*wave_t)*math.sin(math.pi*wave_t)**2
        front_rotation('Arm.R',-1.35*lift)
        front_rotation('Forearm.R',-1.50*bend+.045*wave)
        front_rotation('Hand.R',-.30*wrist_lift+.20*wave)
        p['Head'].rotation_euler.y=-.055*lift
        p['Ear.L'].rotation_euler.x+=.055*lift
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
        p['Head'].rotation_euler.z=.13*h
        p['Head'].rotation_euler.y=-.10*h
        p['Ear.L'].rotation_euler.x=.13*h
        p['Ear.R'].rotation_euler.z=-.14*h
    for pb in p:
        pb.keyframe_insert('location',frame=frame,group=pb.name)
        pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
        pb.keyframe_insert('scale',frame=frame,group=pb.name)

for kind,seconds in [('Idle',4),('Wave',4.2),('Hop',1.6),('Curious',4)]:
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

# A separate speech clip drives only the mouth, so a game can layer it over
# any body animation or drive MouthOpen directly from speech timing (0–1).
speech_keys=[(0,0),(4,0),(8,.68),(11,.14),(15,.94),(19,0),(23,.42),(26,0),
    (32,.78),(36,.16),(40,.55),(45,0),(56,0),(61,.85),(66,.10),(71,.55),
    (75,0),(81,.95),(86,.2),(91,.60),(96,0),(120,0)]
shape_keys=skin.data.shape_keys
shape_keys.animation_data_create()
speech_action=bpy.data.actions.new('Talk')
shape_keys.animation_data.action=speech_action
for frame in range(121):
    for (a,va),(b,vb) in zip(speech_keys,speech_keys[1:]):
        if a<=frame<=b:
            t=(frame-a)/(b-a);t=(1-math.cos(math.pi*t))*.5
            mouth_open.value=va+(vb-va)*t
            mouth_open.keyframe_insert('value',frame=frame,group='Mouth')
            break
speech_track=shape_keys.animation_data.nla_tracks.new();speech_track.name='Talk'
speech_strip=speech_track.strips.new('Talk',0,speech_action)
speech_strip.action_frame_start=0;speech_strip.action_frame_end=120
speech_track.mute=True
shape_keys.animation_data.action=None
mouth_open.value=0

# Named attachment points survive GLB export for future games.
for name,loc in [('LookTarget',(0,-.5,1.65)),('CarryPoint',(.28,-.33,.6)),('Ground',(0,0,0))]:
    obj=bpy.data.objects.new(name,None);collection.objects.link(obj);obj.parent=rig;obj.location=loc
rig['character']='Seated bunny with blue eyes and a yellow bow'
rig['source']='Supplied reference in ../assets/bow-bunny-reference.png'
rig['authoring']='Blender smooth sculpt, radial blue irises, folded silk bow, skeletal animation'

# Export the real character, independently of the presentation scene.
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'bow-bunny.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_frame_range=False,export_skins=True,export_extras=True,export_yup=True,
    export_materials='EXPORT',export_texcoords=True,export_normals=True,export_image_format='AUTO',
    export_vertex_color='ACTIVE',export_all_vertex_colors=False,
    export_morph=True,export_morph_normal=True,export_morph_animation=True)

# Authoring view and a render setup are kept in the .blend but excluded from GLB.
studio=bpy.data.collections.get('Bow bunny · studio')
if studio:
    for obj in list(studio.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.collections.remove(studio)
studio=bpy.data.collections.new('Bow bunny · studio');scene.collection.children.link(studio)
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
camera.location=(2.2,-8,2.5);target=Vector((0,0,1.56))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=3.75;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ASSETS/'bow-bunny-portrait.png')
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
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'bow-bunny.blend'))
info={'vertices':len(skin.data.vertices),'polygons':len(skin.data.polygons),'bones':len(armdata.bones),
      'materials':len(skin.data.materials),'animations':['Idle','Wave','Hop','Curious','Talk'],
      'mouth_control':'MouthOpen (0 = closed smile, 1 = open)',
      'height':round(max(v.co.z for v in skin.data.vertices),3),'glb_bytes':(ASSETS/'bow-bunny.glb').stat().st_size}
(ASSETS/'bow-bunny-info.json').write_text(json.dumps(info,indent=2)+'\n')
print('BOW_BUNNY_BUILD_COMPLETE '+json.dumps(info),flush=True)
