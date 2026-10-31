import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
exec(open('/workspace/work/forge3d/raver/r_tex.py').read().split('cam=rutil.setup')[0])
cam=rutil.setup(res=(400,400),samples=16,bg=(0.64,0.64,0.64))
for a in [0,35,70]: rutil.shot(cam,f'{outp}_f{a}.png',a,center=(0,0,1.56),scale=0.36)
rutil.shot(cam,f'{outp}_hand.png',20,center=(0.45,0,0.92),scale=0.32)
