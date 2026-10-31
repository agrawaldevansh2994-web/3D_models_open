import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
args=sys.argv[sys.argv.index('--')+1:]; glb=args[0]; outp=args[1]; only=args[2:] 
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=glb)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
cam=rutil.setup(res=(300,460),samples=10,bg=(0.64,0.64,0.64))
sc=bpy.context.scene
print('ACTIONS',[a.name for a in bpy.data.actions])
for act in bpy.data.actions:
    nm=act.name.split('_Armature')[0].split('|')[0]
    if only and nm not in only: continue
    arm.animation_data_create(); arm.animation_data.action=act
    for tr in list(arm.animation_data.nla_tracks): tr.mute=True
    f0,f1=act.frame_range
    for k in range(6):
        f=f0+(f1-f0)*k/6.0
        sc.frame_set(int(round(f)))
        rutil.shot(cam,f'{outp}_{nm}_{k}.png',25,center=(0,0,1.0),scale=2.35)
