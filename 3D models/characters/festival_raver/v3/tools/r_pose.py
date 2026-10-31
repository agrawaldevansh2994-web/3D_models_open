import bpy,sys,math; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
from mathutils import Euler,Quaternion,Vector
arm=bpy.data.objects['Armature']; pb=arm.pose.bones
def rot_world(name,axis,deg):
    b=pb[name]; M=arm.matrix_world@b.bone.matrix_local
    ax=(M.to_3x3().inverted()@Vector(axis)).normalized()
    b.rotation_mode='QUATERNION'; b.rotation_quaternion=Quaternion(ax,math.radians(deg))@b.rotation_quaternion
# arms: left arm raise up (rotate about +Y? Blender forward is -Y). Left arm is +X; raising = rotate about -Y axis? test
rot_world('LeftArm',(0,1,0),-75)   # raise left arm overhead-ish
rot_world('LeftForeArm',(0,1,0),-40)
rot_world('RightArm',(1,0,0),70)    # right arm forward
rot_world('RightForeArm',(1,0,0),80)
rot_world('LeftUpLeg',(1,0,0),50); rot_world('LeftLeg',(1,0,0),-80)
rot_world('Spine1',(0,0,1),20); rot_world('Head',(1,0,0),20)
for f in ['Index','Middle','Ring','Pinky']:
    for k in (1,2,3): rot_world(f'RightHand{f}{k}',(1,0,0),35)
bpy.context.view_layer.update()
cam=rutil.setup(res=(480,720),bg=(0.64,0.64,0.64))
out=sys.argv[sys.argv.index('--')+1]
for a in [0,40,140]: rutil.shot(cam,f'{out}_{a}.png',a,center=(0,0,0.95),scale=2.1)
