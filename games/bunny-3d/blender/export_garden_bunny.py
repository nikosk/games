"""Make a lighter game export without changing the detailed source character.
Keeps bone weights, body actions and the closed-smile/MouthOpen control.
"""
import bpy, json
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender'/'bow-bunny.blend'))
collection=bpy.data.collections['Bow bunny · character']
skin=next(o for o in collection.objects if o.type=='MESH')
rig=next(o for o in collection.objects if o.type=='ARMATURE')
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=True
for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0);p.scale=(1,1,1)
bpy.context.scene.frame_set(0)
# The simplifier cannot operate on shape-key meshes. Transfer the sparse facial
# displacement back afterward; all small facial surfaces are kept at full detail.
keys=skin.data.shape_keys
speech=next(t.strips[0].action for t in keys.animation_data.nla_tracks if t.name=='Talk')
speech.use_fake_user=True
basis=keys.key_blocks['Basis'];mouth=keys.key_blocks['MouthOpen']
points=[v.co.copy() for v in basis.data]
deltas=[mouth.data[i].co-p for i,p in enumerate(points)]
tree=KDTree(len(points))
for i,p in enumerate(points):tree.insert(p,i)
tree.balance()
skin.shape_key_clear()
bpy.ops.object.select_all(action='DESELECT');skin.select_set(True);bpy.context.view_layer.objects.active=skin
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
meshes=[o for o in collection.objects if o.type=='MESH']
for obj in meshes:
    name=obj.data.materials[0].name
    # Preserve the eyes, lashes, nose, mouth and bow; simplify the dense smooth sculpt.
    if any(s in name for s in ['Soft ivory velvet','Soft painted face','Pale tummy','White muzzle']):
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Game silhouette','DECIMATE');mod.ratio=.10;mod.use_collapse_triangulate=True
        obj.modifiers.move(len(obj.modifiers)-1,0)
        bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();skin=bpy.context.object
skin.name='Bunny · garden mesh';skin.shape_key_add(name='Basis');target=skin.shape_key_add(name='MouthOpen')
for i,v in enumerate(skin.data.vertices):
    if abs(v.co.x)>.55 or not 1<v.co.z<1.4:continue
    nearest=tree.find_n(v.co,3)
    if nearest[0][2]<1e-6:delta=deltas[nearest[0][1]]
    else:
        weights=[1/max(n[2],1e-6)**2 for n in nearest];total=sum(weights)
        delta=sum((deltas[n[1]]*(w/total) for n,w in zip(nearest,weights)),Vector())
    target.data[i].co+=delta
target.value=0
shape_keys=skin.data.shape_keys;shape_keys.animation_data_create()
# Copy the existing Talk action into an NLA track on the new key data block.
track=shape_keys.animation_data.nla_tracks.new();track.name='Talk'
strip=track.strips.new('Talk',0,speech);strip.action_frame_start=0;strip.action_frame_end=120;track.mute=True
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'garden-bunny.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,
    export_skins=True,export_extras=True,export_yup=True,export_materials='EXPORT',export_vertex_color='ACTIVE',
    export_morph=True,export_morph_normal=True,export_morph_animation=True)
info={'vertices':len(skin.data.vertices),'triangles':sum(len(p.vertices)-2 for p in skin.data.polygons),
      'glb_bytes':(ROOT/'assets'/'garden-bunny.glb').stat().st_size,'source':'blender/bow-bunny.blend'}
(ROOT/'assets'/'garden-bunny-info.json').write_text(json.dumps(info,indent=2)+'\n')
print('GAME_BUNNY_COMPLETE '+json.dumps(info),flush=True)
