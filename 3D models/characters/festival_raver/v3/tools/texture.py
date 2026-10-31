import numpy as np, trimesh, json, time
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
T=2048
m=trimesh.load('uv.obj',process=False); V=m.vertices.copy(); F=m.faces; UV=m.visual.uv
# smooth normals merged by position
key=np.round(V,5); _,inv=np.unique(key,axis=0,return_inverse=True); inv=inv.ravel()
fn=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]])
acc=np.zeros((inv.max()+1,3))
for k in range(3): np.add.at(acc,inv[F[:,k]],fn)
VN=acc[inv]; VN/=np.linalg.norm(VN,axis=1,keepdims=True)+1e-12
def raster(P2,Z,faces,W,H,attr=None):
    """returns zbuf (max) and face id"""
    zb=np.full((H,W),-1e9); fid=np.full((H,W),-1,np.int32)
    for i,f in enumerate(faces):
        p=P2[f]; x0=int(max(np.floor(p[:,0].min()),0)); x1=int(min(np.ceil(p[:,0].max()),W-1))
        y0=int(max(np.floor(p[:,1].min()),0)); y1=int(min(np.ceil(p[:,1].max()),H-1))
        if x1<x0 or y1<y0: continue
        xs,ys=np.meshgrid(np.arange(x0,x1+1)+0.5,np.arange(y0,y1+1)+0.5)
        a,b,c=p; den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-12: continue
        l0=((b[1]-c[1])*(xs-c[0])+(c[0]-b[0])*(ys-c[1]))/den
        l1=((c[1]-a[1])*(xs-c[0])+(a[0]-c[0])*(ys-c[1]))/den; l2=1-l0-l1
        ins=(l0>=-1e-4)&(l1>=-1e-4)&(l2>=-1e-4)
        if not ins.any(): continue
        z=l0*Z[f[0]]+l1*Z[f[1]]+l2*Z[f[2]]
        sub=zb[y0:y1+1,x0:x1+1]; fs=fid[y0:y1+1,x0:x1+1]
        upd=ins&(z>sub); sub[upd]=z[upd]; fs[upd]=i
    return zb,fid
t0=time.time()
# --- texel rasterization in UV space
P2=np.c_[UV[:,0]*T, (1-UV[:,1])*T]
_,tfid=raster(P2,np.zeros(len(V)),F,T,T)
cov=tfid>=0; ys,xs=np.nonzero(cov); fi=tfid[ys,xs]
# barycentrics per texel
A=P2[F[fi,0]];B=P2[F[fi,1]];C=P2[F[fi,2]]; px=xs+0.5; py=ys+0.5
den=(B[:,1]-C[:,1])*(A[:,0]-C[:,0])+(C[:,0]-B[:,0])*(A[:,1]-C[:,1])
l0=((B[:,1]-C[:,1])*(px-C[:,0])+(C[:,0]-B[:,0])*(py-C[:,1]))/den
l1=((C[:,1]-A[:,1])*(px-C[:,0])+(A[:,0]-C[:,0])*(py-C[:,1]))/den; l2=1-l0-l1
L=np.clip(np.c_[l0,l1,l2],0,1); L/=L.sum(1,keepdims=True)
pos=sum(L[:,k:k+1]*V[F[fi,k]] for k in range(3)); nrm=sum(L[:,k:k+1]*VN[F[fi,k]] for k in range(3)); nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)
print('texels',len(pos),time.time()-t0)
np.savez('texels.npz',ys=ys,xs=xs,pos=pos,nrm=nrm,fi=fi)
views=json.load(open('views.json'))
def img_mask(im):
    a=np.array(im).astype(int); bg=np.median(a[:8].reshape(-1,3),0)
    d=np.abs(a-bg).max(2); sat=a.max(2)-a.min(2); mk=(d>28)|(sat>30)
    mk=ndimage.binary_opening(mk,iterations=2); mk=ndimage.binary_fill_holes(ndimage.binary_closing(mk,iterations=3))
    lab,n=ndimage.label(mk); sz=ndimage.sum(mk,lab,range(1,n+1)); mk=lab==(1+np.argmax(sz))
    return ndimage.binary_erosion(mk,iterations=3)
def sample(img,u,v):
    return np.stack([ndimage.map_coordinates(img[...,c].astype(np.float32),[v-0.5,u-0.5],order=1,mode='nearest') for c in range(3)],1)
acc=np.zeros((len(pos),3)); wsum=np.zeros(len(pos))
SS=2
for name,cfg in views.items():
    im=Image.open(cfg['path']).convert('RGB')
    if cfg['crop']: im=im.crop(tuple(cfg['crop']))
    img=np.array(im); mk=img_mask(im); H,W=mk.shape
    s,ox,oy=cfg['s'],cfg['ox'],cfg['oy']
    passes=[]
    if name=='front': passes=[(V[:,0],V[:,2],pos[:,0],pos[:,2],np.clip(nrm[:,2],0,1),1.0)]
    if name=='back': passes=[(-V[:,0],-V[:,2],-pos[:,0],-pos[:,2],np.clip(-nrm[:,2],0,1),1.0)]
    if name in('side','side_head'):
        passes=[(V[:,2],-V[:,0],pos[:,2],-pos[:,0],np.clip(-nrm[:,0],0,1),0.55),  # right side real
                (V[:,2],V[:,0],pos[:,2],pos[:,0],np.clip(nrm[:,0],0,1),0.45)]    # left side mirrored
    for uV,dV,uT,dT,facing,wt in passes:
        Pv=np.c_[uV*s+ox,-V[:,1]*s+oy]*SS
        zb,_=raster(Pv,dV,F,W*SS,H*SS)
        tu=uT*s+ox; tv=-pos[:,1]*s+oy
        zi=ndimage.map_coordinates(zb,[tv*SS-0.5,tu*SS-0.5],order=0,mode='nearest')
        vis=dT>=zi-0.012
        dist=ndimage.distance_transform_edt(mk)
        dd=ndimage.map_coordinates(dist,[tv-0.5,tu-0.5],order=1,mode='constant')
        inm=np.where(pos[:,1]>1.42,(dd>0.5).astype(float),np.clip((dd-1.0)/6.0,0,1))
        head=pos[:,1]>1.40
        pw=np.where(head,2.0,4.0)
        w=wt*facing**pw*vis*inm
        if name=='front': w=w*np.where(head,2.0,1.0)
        if name=='side': w=w*np.clip((1.40-pos[:,1])/0.03,0,1)
        if name=='side_head': w=w*np.clip((pos[:,1]-1.37)/0.03,0,1)*np.clip((0.03-pos[:,2])/0.04,0,1)
        col=sample(img,tu,tv)
        acc+=w[:,None]*col; wsum+=w
        print(name,'vis',vis.mean().round(3),'w>0',(w>0.01).mean().round(3),time.time()-t0)
valid=wsum>0.02
col0=np.zeros((len(pos),3)); col0[valid]=acc[valid]/wsum[valid,None]
br=col0.mean(1); sat=col0.max(1)-col0.min(1)
greyish=(sat<14)&(br>135)&(pos[:,1]<1.45)
print('greyish',(greyish&valid).sum())
valid=valid&~greyish&~((pos[:,1]>1.42)&(wsum<0.08))
col=np.zeros((len(pos),3)); col[valid]=acc[valid]/wsum[valid,None]
print('valid frac',valid.mean())
def regl(p):
    r=np.zeros(len(p),int); r[(np.abs(p[:,0])>0.36)&(p[:,1]<1.04)&(p[:,1]>0.75)]=1; r[p[:,1]>1.42]=2; return r
rg=regl(pos)
for k in range(3):
    src=valid&(wsum>(0.15 if k==2 else 0.12))&(rg==k); dst=(~valid)&(rg==k)
    if dst.sum()==0: continue
    tree=cKDTree(pos[src]); d,j=tree.query(pos[dst],k=8)
    w=1/(d+1e-3); col[dst]=(col[src][j]*w[...,None]).sum(1)/w.sum(1,keepdims=True)
np.save('texcol.npy',col); np.save('texw.npy',wsum)
tex=np.zeros((T,T,3),np.float32); tex[ys,xs]=col
idx=ndimage.distance_transform_edt(~cov,return_distances=False,return_indices=True)
tex=tex[idx[0],idx[1]]
Image.fromarray(np.clip(tex,0,255).astype(np.uint8)).save('basecolor_raw.png')
print('done',time.time()-t0)
