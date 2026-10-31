import numpy as np, sys, pickle, json, pygltflib, struct
sys.path.insert(0,'.')
from ik import *
from dj import dj_clip
M='/workspace/work/assets/aist/motions/'
clips={}
for name,src in [('idle','Idle_Loop'),('walk','Walk_Loop'),('dance_bounce','Dance_Loop')]:
    q,loc,W=ual_clip(src); h=np.zeros(len(loc)); loc=ground_to(q,loc,h) if name!='walk' else ground_to(q,loc,h)
    if name in('idle','dance_bounce'):
        q=lock_feet(q,loc); loc=ground_to(q,loc,h)
    clips[name]=(q,loc,src)
for name,f,L in [('dance_house','gHO_sFM_cAll_d21_mHO5_ch20',240),('dance_hiphop','gMH_sFM_cAll_d23_mMH3_ch11',240)]:
    b=best_loop(M+f+'.pkl',L,search=200)
    q,loc,h=aist_clip(M+f+'.pkl',b[1],L); h=np.maximum(h-0.06,0); loc=ground_to(q,loc,h)
    q=curl_fingers(q,0.35)
    q=lock_feet(q,loc); loc=ground_to(q,loc,h)
    q=lock_feet(q,loc); loc=ground_to(q,loc,h)
    clips[name]=(q,loc,f'AIST++ {f} start {b[1]} (30fps)')
q,loc=dj_clip(); clips['dj']=(q,loc,'procedural 128 BPM, 16 beats, drop at beat 8')
pickle.dump(clips,open('anim/clips.pkl','wb'))
for n,(q,loc,src) in clips.items(): print(n,len(loc),round(len(loc)/FPS,2),'s',foot_stats(q,loc))
