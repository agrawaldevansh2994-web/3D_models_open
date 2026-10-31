import trimesh,numpy as np,fast_simplification as fs
s=trimesh.load('../h_white.glb'); m=s.to_geometry() if hasattr(s,'to_geometry') else s
m.merge_vertices(digits_vertex=5)
m.update_faces(m.nondegenerate_faces()); m.update_faces(m.unique_faces()); m.remove_unreferenced_vertices()
cc=m.split(only_watertight=False); cc=sorted(cc,key=lambda c:-len(c.faces))
print('comps',[len(c.faces) for c in cc[:8]])
keep=[c for c in cc if len(c.faces)>300]
m=trimesh.util.concatenate(keep); print('kept',len(keep),m.faces.shape)
v,f=fs.simplify(m.vertices.astype(np.float32),m.faces.astype(np.int32),target_count=26000)
d=trimesh.Trimesh(v,f,process=True)
d.update_faces(d.nondegenerate_faces()); d.remove_unreferenced_vertices()
cc=d.split(only_watertight=False); cc=sorted(cc,key=lambda c:-len(c.faces)); print('post comps',[len(c.faces) for c in cc[:6]])
d=trimesh.util.concatenate([c for c in cc if len(c.faces)>50])
trimesh.repair.fix_winding(d); trimesh.repair.fix_inversion(d)
# outward check: fraction normals pointing away from vertical axis
c=d.triangles_center; n=d.face_normals; r=c.copy(); r[:,1]=0
print('outward frac',(np.einsum('ij,ij->i',n,r)>0).mean())
# scale: put feet at y=0, height 1.72m
d.vertices[:,1]-=d.vertices[:,1].min(); sc=1.72/d.vertices[:,1].max(); d.vertices*=sc
d.vertices[:,0]-=(d.vertices[:,0].max()+d.vertices[:,0].min())/2; d.vertices[:,2]-=np.median(d.vertices[:,2])
print(d.faces.shape,d.bounds)
d.export('clean.obj')
