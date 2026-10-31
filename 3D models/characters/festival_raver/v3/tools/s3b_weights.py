import bpy,math
o=bpy.data.objects['Raver']; arm=bpy.data.objects['Armature']
vg={g.name:g for g in o.vertex_groups}; gi={g.index:g.name for g in o.vertex_groups}
hips=vg['Hips']
for v in o.data.vertices:
    h=v.co.z
    t=min(max((h-0.80)/0.16,0),1)
    if t<=0: continue
    for g in list(v.groups):
        n=gi[g.group]
        if n in('LeftUpLeg','RightUpLeg'):
            mv=g.weight*t; vg[n].add([v.index],g.weight-mv,'REPLACE'); hips.add([v.index],mv,'ADD')
bpy.context.view_layer.objects.active=o
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL',factor=0.5,repeat=2,expand=0.0)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
bpy.ops.object.vertex_group_clean(group_select_mode='ALL',limit=0.01)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
print('maxinf',max(len(v.groups) for v in o.data.vertices), 'zero',sum(1 for v in o.data.vertices if len(v.groups)==0))
bpy.ops.wm.save_as_mainfile(filepath='/workspace/work/forge3d/raver/rig.blend')
