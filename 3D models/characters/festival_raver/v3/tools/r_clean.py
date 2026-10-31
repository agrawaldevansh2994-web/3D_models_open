import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='/workspace/work/forge3d/raver/clean.obj')
cam=rutil.setup()
for a in [0,90,180]: rutil.shot(cam,f'/workspace/work/forge3d/raver/tmp_clean_{a}.png',a)
