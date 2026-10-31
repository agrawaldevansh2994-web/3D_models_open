import sys,glob
from PIL import Image,ImageDraw
pref,out=sys.argv[1],sys.argv[2]; clips=sys.argv[3:]
rows=[]
for c in clips:
    ims=[Image.open(f'{pref}_{c}_{k}.png').convert('RGB') for k in range(6)]
    w,h=ims[0].size; r=Image.new('RGB',(w*6,h+22),(30,30,30)); d=ImageDraw.Draw(r); d.text((6,4),c,fill=(255,255,255))
    for k,i in enumerate(ims): r.paste(i,(k*w,22))
    rows.append(r)
o=Image.new('RGB',(rows[0].width,sum(r.height for r in rows)))
y=0
for r in rows: o.paste(r,(0,y)); y+=r.height
o.save(out)
