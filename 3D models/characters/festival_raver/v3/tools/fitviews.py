import numpy as np, trimesh, json
from PIL import Image, ImageDraw
from scipy import ndimage
m=trimesh.load('clean.obj',process=False); V=m.vertices; F=m.faces
TS='/workspace/work/m3d/3D models/characters/festival_raver/concept/turnaround_sheet.png'
def img_mask(path,crop=None):
    im=Image.open(path).convert('RGB')
    if crop: im=im.crop(crop)
    a=np.array(im).astype(int); bg=np.median(a[:8].reshape(-1,3),0)
    d=np.abs(a-bg).max(2); sat=a.max(2)-a.min(2)
    mk=(d>28)|(sat>30)
    mk=ndimage.binary_opening(mk,iterations=2); mk=ndimage.binary_fill_holes(ndimage.binary_closing(mk,iterations=3))
    lab,n=ndimage.label(mk); sizes=ndimage.sum(mk,lab,range(1,n+1)); mk=lab==(1+np.argmax(sizes))
    return np.array(im),mk
def mesh_mask(view,W,H,s,ox,oy):
    # view: 'front' u=x, 'back' u=-x, 'side' (viewer at +x? see below)
    if view=='front': u=V[:,0]
    elif view=='back': u=-V[:,0]
    elif view=='side': u=V[:,2]   # character faces image-right => +z maps to +u ; viewer on -x side (character's right side)
    px=np.c_[u*s+ox, -V[:,1]*s+oy]
    im=Image.new('L',(W,H),0); d=ImageDraw.Draw(im)
    for f in F: d.polygon([tuple(px[i]) for i in f],fill=1)
    return np.array(im)>0
def fit(view,mk):
    H,W=mk.shape; ys,xs=np.nonzero(mk)
    top,bot=ys.min(),ys.max(); s=(bot-top)/V[:,1].max(); oy=bot
    u=V[:,0] if view=='front' else (-V[:,0] if view=='back' else V[:,2])
    ox=(xs.min()+xs.max())/2-(u.min()+u.max())/2*s
    if view=='side': ox=xs.mean()-np.mean(u)*s
    best=None
    for ds in [0.97,0.985,1,1.015,1.03]:
        for dx in range(-8,9,2):
            for dy in range(-6,7,3):
                mm=mesh_mask(view,W,H,s*ds,ox+dx,oy+dy); iou=(mm&mk).sum()/(mm|mk).sum()
                if best is None or iou>best[0]: best=(iou,s*ds,ox+dx,oy+dy)
    return best
out={}
views={'front':('../front.png',None),'back':(TS,(900,0,1376,768)),'side':(TS,(560,0,900,768))}
for v,(p,c) in views.items():
    img,mk=img_mask(p,c); b=fit(v,mk); print(v,b)
    out[v]=dict(path=p,crop=c,s=b[1],ox=b[2],oy=b[3],iou=b[0])
    mm=mesh_mask(v,mk.shape[1],mk.shape[0],b[1],b[2],b[3])
    ov=img.copy(); ov[mm&~mk]=[255,0,0]; ov[mk&~mm]=[0,0,255]
    Image.fromarray(ov).save(f'tmp_fit_{v}.png')
json.dump(out,open('views.json','w'),indent=1)
