import bpy
for im in bpy.data.images: im.reload()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath='/workspace/work/forge3d/raver/raver_skinned.glb',export_format='GLB',export_skins=True,export_animations=False,
  export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_apply=False,export_texcoords=True,export_normals=True,export_materials='EXPORT',
  export_def_bones=False,export_morph=False,export_all_influences=False)
print('EXPORTED')
