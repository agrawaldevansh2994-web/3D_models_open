import bpy,sys,math,mathutils
sys.path.insert(0,'/workspace/work/forge3d/raver'); from joints import J,tail
def B(p): return mathutils.Vector((p[0],-p[2],p[1]))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='/workspace/work/forge3d/raver/uv.obj')
o=bpy.context.selected_objects[0]; o.name='Raver'; o.data.name='Raver'
bpy.context.view_layer.objects.active=o; bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for p in o.data.polygons: p.use_smooth=True
mat=bpy.data.materials.new('M_Raver'); mat.use_nodes=True; nt=mat.node_tree; bs=nt.nodes['Principled BSDF']
ti=nt.nodes.new('ShaderNodeTexImage'); ti.image=bpy.data.images.load('/workspace/work/forge3d/raver/basecolor.jpg'); nt.links.new(ti.outputs[0],bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value=0.8; bs.inputs['Metallic'].default_value=0.0
o.data.materials.clear(); o.data.materials.append(mat)
ad=bpy.data.armatures.new('Armature'); arm=bpy.data.objects.new('Armature',ad); bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm; bpy.ops.object.mode_set(mode='EDIT')
eb={}
for n,(p,par) in J.items():
    b=ad.edit_bones.new(n); b.head=B(p); b.tail=B(tail(n)); eb[n]=b
for n,(p,par) in J.items():
    if par: eb[n].parent=eb[par]; eb[n].use_connect=False
# rolls: make local Z point forward-ish (-Y blender) for limbs for sane axes
for n,b in eb.items(): b.align_roll(mathutils.Vector((0,-1,0)) if not ('Hand' in n and n[-1].isdigit()) else mathutils.Vector((0,0,1)))
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active=arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
bpy.context.view_layer.objects.active=o; o.select_set(True)
# report unweighted
vg={g.index:g.name for g in o.vertex_groups}
zero=sum(1 for v in o.data.vertices if sum(g.weight for g in v.groups)<1e-4)
print('ZEROW',zero,len(o.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath='/workspace/work/forge3d/raver/rig_auto.blend')
