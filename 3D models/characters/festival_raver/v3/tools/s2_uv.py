import bpy,math,bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='/workspace/work/forge3d/raver/clean.obj')
o=bpy.context.selected_objects[0]; bpy.context.view_layer.objects.active=o; bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
me=o.data
def region(p):
    c=p.center if hasattr(p,'center') else p
    if c.z>1.43: return 'head'
    if abs(c.x)>0.36 and c.z>0.6: return 'hand'
    return 'body'
groups={'head':2.0,'hand':1.5,'body':1.0}
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
for g in groups:
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
    bm=bmesh.from_edit_mesh(me)
    for f in bm.faces: f.select_set(region(f.calc_center_median())==g)
    bmesh.update_edit_mesh(me); print(g,sum(f.select for f in bm.faces))
    bpy.ops.uv.smart_project(angle_limit=math.radians(60),island_margin=0.002,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
# normalize texel density: scale each group's uv by its 3D area / uv area * factor
import mathutils
bm=bmesh.new(); bm.from_mesh(me); uvl=bm.loops.layers.uv.active
def uvarea(f):
    u=[l[uvl].uv for l in f.loops]; a=0
    for i in range(1,len(u)-1): a+=abs((u[i]-u[0]).cross(u[i+1]-u[0]))/2
    return a
dens={}
for g in groups:
    fs=[f for f in bm.faces if region(f.calc_center_median())==g]
    A3=sum(f.calc_area() for f in fs); A2=sum(uvarea(f) for f in fs); dens[g]=(fs,math.sqrt(A3/A2))
for g,(fs,k) in dens.items():
    s=k*groups[g]
    for f in fs:
        for l in f.loops: l[uvl].uv=l[uvl].uv*s
bm.to_mesh(me); bm.free()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM',rotate=True,rotate_method='ANY',scale=True,merge_overlap=False,margin_method='FRACTION',margin=0.003,shape_method='CONCAVE')
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()
bpy.ops.wm.obj_export(filepath='/workspace/work/forge3d/raver/uv.obj',export_selected_objects=False,export_uv=True,export_normals=True,export_materials=False,forward_axis='NEGATIVE_Z',up_axis='Y')
print('UVDONE')
