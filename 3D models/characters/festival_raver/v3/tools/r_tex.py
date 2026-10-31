import bpy,sys; sys.path.insert(0,'/workspace/work/forge3d/raver'); import rutil
tex=sys.argv[sys.argv.index('--')+1]; outp=sys.argv[sys.argv.index('--')+2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath='/workspace/work/forge3d/raver/uv.obj')
o=bpy.context.selected_objects[0]
mat=bpy.data.materials.new('M'); mat.use_nodes=True; nt=mat.node_tree; bs=nt.nodes['Principled BSDF']
ti=nt.nodes.new('ShaderNodeTexImage'); ti.image=bpy.data.images.load(tex); nt.links.new(ti.outputs[0],bs.inputs['Base Color']); bs.inputs['Roughness'].default_value=0.75
o.data.materials.clear(); o.data.materials.append(mat)
for p in o.data.polygons: p.use_smooth=True
cam=rutil.setup(res=(400,720),bg=(0.64,0.64,0.64))
for a in [0,45,90,180,270]: rutil.shot(cam,f'{outp}_{a}.png',a)
