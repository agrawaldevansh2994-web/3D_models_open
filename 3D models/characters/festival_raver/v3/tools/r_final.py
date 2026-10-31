import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath='/workspace/work/forge3d/raver/festival_raver_v3.glb')
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
if arm.animation_data: arm.animation_data.action=None
for t in (arm.animation_data.nla_tracks if arm.animation_data else []): t.mute=True
for pb in arm.pose.bones: pb.matrix_basis.identity()
bpy.context.view_layer.update()
R='/workspace/work/forge3d/raver/renders/'
cam=rutil.setup(res=(440,760),samples=24,bg=(0.64,0.64,0.64))
for a in [0,45,90,180,225]: rutil.shot(cam,f'{R}v_{a}.png',a,center=(0,0,0.87),scale=1.95)
cam=rutil.setup(res=(480,480),samples=32,bg=(0.64,0.64,0.64))
for a in [0,35,70]: rutil.shot(cam,f'{R}face_{a}.png',a,center=(0,0,1.57),scale=0.34)
rutil.shot(cam,f'{R}hand_R.png',-20,center=(-0.44,0,0.92),scale=0.26)
rutil.shot(cam,f'{R}hand_L.png',60,center=(0.44,0,0.92),scale=0.26)
