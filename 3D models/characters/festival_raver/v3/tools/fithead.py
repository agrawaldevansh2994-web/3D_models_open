import numpy as np, trimesh, json
from PIL import Image, ImageDraw
from scipy import ndimage
exec(open('fitviews.py').read().split('def fit(')[0].replace("m=trimesh.load('clean.obj',process=False)","m=trimesh.load('clean.obj',process=False)"))
cfg=json.load(open('views.json'))['side']
img,mk=img_mask(TS,tuple(cfg['crop']))
Y0=1.42
keep=V[F].min(1)[:,1]>Y0
FH=F[keep]
def hm(s,ox,oy):
    px=np.c_[V[:,2]*s+ox,-V[:,1]*s+oy]; im=Image.new('L',(mk.shape[1],mk.shape[0]),0); d=ImageDraw.Draw(im)
    for f in FH: d.polygon([tuple(px[i]) for i in f],fill=1)
    return np.array(im)>0
s0,ox0,oy0=cfg['s'],cfg['ox'],cfg['oy']
cut=int(-Y0*s0+oy0)
mkh=mk.copy(); mkh[cut:]=False
best=None
for ds in np.linspace(0.92,1.08,9):
  for dx in range(-16,17,2):
    for dy in range(-10,11,2):
      s=s0*ds; ox=ox0+dx; oy=oy0+dy; mm=hm(s,ox,oy); c=int(-Y0*s+oy); t=mkh.copy(); t[c:]=False
      iou=(mm&t).sum()/((mm|t).sum()+1)
      if best is None or iou>best[0]: best=(iou,s,ox,oy)
print(best,'base iou',)
iou,s,ox,oy=best
v=json.load(open('views.json')); v['side_head']=dict(path=TS,crop=cfg['crop'],s=float(s),ox=float(ox),oy=float(oy)); json.dump(v,open('views.json','w'),indent=1)
mm=hm(s,ox,oy); ov=img.copy(); ov[mm&~mk]=[255,0,0]; ov[mk&~mm&(np.arange(mk.shape[0])[:,None]<cut)]=[0,0,255]
Image.fromarray(ov[:260]).resize((680,520)).save('tmp_fithead.png')
