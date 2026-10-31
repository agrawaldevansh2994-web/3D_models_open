import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath='/workspace/work/forge3d/raver/festival_raver_v3.glb')
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
cam=rutil.setup(res=(420,420),samples=12,bg=(0.64,0.64,0.64)); sc=bpy.context.scene
act=bpy.data.actions['dj_Armature']; arm.animation_data_create(); arm.animation_data.action=act
sc.frame_set(20); rutil.shot(cam,'/workspace/work/forge3d/raver/tmp_dj_front.png',0,center=(0,0,1.2),scale=1.1,pitch=15)
rutil.shot(cam,'/workspace/work/forge3d/raver/tmp_dj_side.png',90,center=(0,0,1.2),scale=1.1,pitch=10)
rutil.shot(cam,'/workspace/work/forge3d/raver/tmp_dj_hand.png',30,center=(0.2,-0.25,1.05),scale=0.35,pitch=35)
sc.frame_set(150); rutil.shot(cam,'/workspace/work/forge3d/raver/tmp_dj_drop.png',20,center=(0,0,1.35),scale=1.4,pitch=5)
