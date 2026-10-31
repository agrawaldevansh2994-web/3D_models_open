import bpy,math,mathutils
def setup(res=(420,720),samples=12,bg=(0.12,0.12,0.13)):
    sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=samples; sc.cycles.use_denoising=False
    sc.render.resolution_x,sc.render.resolution_y=res; sc.render.film_transparent=False
    sc.cycles.device='CPU'; sc.render.threads_mode='AUTO'
    w=bpy.data.worlds.get('World') or bpy.data.worlds.new('World'); sc.world=w; w.use_nodes=True
    w.node_tree.nodes['Background'].inputs[0].default_value=(*bg,1); w.node_tree.nodes['Background'].inputs[1].default_value=1.0
    for o in list(bpy.data.objects):
        if o.type in('LIGHT','CAMERA'): bpy.data.objects.remove(o)
    def L(name,rot,e):
        ld=bpy.data.lights.new(name,'SUN'); ld.energy=e; o=bpy.data.objects.new(name,ld); sc.collection.objects.link(o); o.rotation_euler=rot
    L('key',(math.radians(50),0,math.radians(-30)),3.0); L('fill',(math.radians(60),0,math.radians(140)),1.2); L('top',(0,0,0),0.8)
    cd=bpy.data.cameras.new('cam'); cd.type='ORTHO'; cam=bpy.data.objects.new('cam',cd); sc.collection.objects.link(cam); sc.camera=cam
    return cam
def shot(cam,path,yaw_deg,center=(0,0,0.88),scale=2.0,dist=6,pitch=0):
    y=math.radians(yaw_deg); p=math.radians(pitch); c=mathutils.Vector(center)
    d=mathutils.Vector((math.sin(y)*math.cos(p),-math.cos(y)*math.cos(p),math.sin(p)))
    cam.location=c+d*dist; cam.data.ortho_scale=scale
    cam.rotation_euler=(-d).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.render.filepath=path; bpy.ops.render.render(write_still=True)
