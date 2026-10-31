import numpy as np, pickle, json, sys
sys.path.insert(0,'.')
from animlib import *
tgt=Target('raver_skinned.glb'); sk=tgt.sk
FPS=30
# ---------- UAL
U=Skel('/workspace/work/assets/ual/a.gltf')
def side_map(L,l):
    m={f'{L}Shoulder':(f'DEF-shoulder.{l}',f'{L}Arm',f'DEF-upper_arm.{l}'),
       f'{L}Arm':(f'DEF-upper_arm.{l}',f'{L}ForeArm',f'DEF-forearm.{l}'),
       f'{L}ForeArm':(f'DEF-forearm.{l}',f'{L}Hand',f'DEF-hand.{l}'),
       f'{L}Hand':(f'DEF-hand.{l}',f'{L}HandMiddle1',f'DEF-f_middle.01.{l}'),
       f'{L}UpLeg':(f'DEF-thigh.{l}',f'{L}Leg',f'DEF-shin.{l}'),
       f'{L}Leg':(f'DEF-shin.{l}',f'{L}Foot',f'DEF-foot.{l}'),
       f'{L}Foot':(f'DEF-foot.{l}',f'{L}ToeBase',f'DEF-toe.{l}'),
       f'{L}ToeBase':(f'DEF-toe.{l}',None,None)}
    for F,f in (('Index','f_index'),('Middle','f_middle'),('Ring','f_ring'),('Pinky','f_pinky'),('Thumb','thumb')):
        for k in (1,2,3):
            m[f'{L}Hand{F}{k}']=(f'DEF-{f}.0{k}.{l}',f'{L}Hand{F}{k+1}' if k<3 else None,f'DEF-{f}.0{k+1}.{l}' if k<3 else None)
    return m
UMAP={'Hips':('DEF-hips','Spine','DEF-spine.001'),'Spine':('DEF-spine.001','Spine1','DEF-spine.002'),
      'Spine1':('DEF-spine.002','Spine2','DEF-spine.003'),'Spine2':('DEF-spine.003','Neck','DEF-neck'),
      'Neck':('DEF-neck','Head','DEF-head'),'Head':('DEF-head',None,None)}
UMAP.update(side_map('Left','L')); UMAP.update(side_map('Right','R'))
def ual_clip(name):
    Q,T,Sc,F=U.sample(name); Wr,Wp=U.fk(Q[:-1],T[:-1],Sc[:-1]); F=F  # drop duplicate last frame (loop)
    Wr0,Wp0=U.rest()
    srcWr={n:Wr[U.idx[n]] for n in set(v[0] for v in UMAP.values())}
    srcWr0={n:Wr0[U.idx[n]][0] for n in srcWr}
    srcP0={n:Wp0[0,U.idx[n]] for n in U.names}
    hip=Wp[:,U.idx['DEF-hips']]
    ratio=tgt.pos('Hips')[1]/srcP0['DEF-hips'][1]
    return retarget(tgt,srcWr,srcWr0,srcP0,hip,UMAP,F,ratio,'DEF-hips')
# ---------- AIST (SMPL)
J=np.array([[-0.0018,-0.2233,0.0282],[0.0695,-0.3143,0.0234],[-0.0677,-0.3147,0.0214],[-0.0025,-0.1089,0.0013],[0.1040,-0.6973,0.0371],[-0.1060,-0.7004,0.0303],[0.0054,0.0247,0.0280],[0.0880,-1.0957,-0.0089],[-0.0909,-1.1037,-0.0092],[0.0010,0.0773,0.0303],[0.1196,-1.1556,0.1086],[-0.1190,-1.1580,0.1124],[-0.0035,0.2874,-0.0036],[0.0785,0.1956,-0.0071],[-0.0815,0.1938,-0.0108],[0.0040,0.3537,0.0475],[0.1720,0.2265,-0.0189],[-0.1735,0.2240,-0.0236],[0.4334,0.2126,-0.0410],[-0.4315,0.2099,-0.0384],[0.6984,0.2187,-0.0432],[-0.6973,0.2192,-0.0425],[0.7825,0.2116,-0.0566],[-0.7854,0.2148,-0.0570]])
SP=[-1,0,0,0,1,2,3,4,5,6,7,8,9,9,9,12,13,14,16,17,18,19,20,21]
SMAP={'Hips':(0,'Spine',3),'Spine':(3,'Spine1',6),'Spine1':(6,'Spine2',9),'Spine2':(9,'Neck',12),'Neck':(12,'Head',15),'Head':(15,None,None),
 'LeftShoulder':(13,'LeftArm',16),'LeftArm':(16,'LeftForeArm',18),'LeftForeArm':(18,'LeftHand',20),'LeftHand':(20,'LeftHandMiddle1',22),
 'RightShoulder':(14,'RightArm',17),'RightArm':(17,'RightForeArm',19),'RightForeArm':(19,'RightHand',21),'RightHand':(21,'RightHandMiddle1',23),
 'LeftUpLeg':(1,'LeftLeg',4),'LeftLeg':(4,'LeftFoot',7),'LeftFoot':(7,'LeftToeBase',10),'LeftToeBase':(10,None,None),
 'RightUpLeg':(2,'RightLeg',5),'RightLeg':(5,'RightFoot',8),'RightFoot':(8,'RightToeBase',11),'RightToeBase':(11,None,None)}
def smpl_load(pkl,step=2):
    d=pickle.load(open(pkl,'rb')); poses=d['smpl_poses'].reshape(-1,24,3)[::step]; tr=(d['smpl_trans']/d['smpl_scaling'][0])[::step]
    T=len(poses); loc=[R.from_rotvec(poses[:,j]) for j in range(24)]; G=[None]*24
    for j in range(24): G[j]=loc[j] if SP[j]<0 else G[SP[j]]*loc[j]
    return G,tr,poses
def aist_clip(pkl,start,length,xfade=15):
    G,tr,poses=smpl_load(pkl)
    # remove mean facing yaw
    fw=G[0].apply([0,0,1]); yaw=np.arctan2(fw[:,0],fw[:,2]); my=np.arctan2(np.sin(yaw).mean(),np.cos(yaw).mean())
    Ry=R.from_euler('y',-my); G=[Ry*g for g in G]; tr=Ry.apply(tr)
    sl=slice(start,start+length+xfade)
    G=[g[sl] for g in G]; tr=tr[sl]
    F=length+xfade
    srcWr={j:G[j] for j in range(24)}; srcWr0={j:R.identity() for j in range(24)}; srcP0={j:J[j] for j in range(24)}
    n=np.arange(F); xz=tr[:,[0,2]].copy()
    for c in range(2): xz[:,c]-=np.polyval(np.polyfit(n,xz[:,c],1),n)
    hip=np.c_[xz[:,0]*0.6, tr[:,1]-np.median(tr[:,1]), xz[:,1]*0.6]+J[0]
    ratio=(tgt.pos('Hips')[1]-0.035)/(J[0][1]-J[10][1])
    q,loc,W=retarget(tgt,srcWr,srcWr0,srcP0,hip,SMAP,F,ratio,0)
    # crossfade loop
    out={}
    for b,v in q.items():
        res=v[:length].copy()
        for i in range(xfade):
            w=i/xfade; a=R.from_quat(v[length+i]); c=R.from_quat(v[i])
            res[i]=Slerp([0,1],R.concatenate([a,c]))(w).as_quat()
        for t in range(1,len(res)):
            if np.dot(res[t],res[t-1])<0: res[t]=-res[t]
        out[b]=res
    # source sole height (keeps jumps)
    P=[None]*24
    for j in range(24):
        P[j]=(J[0]+tr) if SP[j]<0 else P[SP[j]]+G[SP[j]].apply(J[j]-J[SP[j]])
    sole=np.min(np.stack([P[7][:,1]-(J[7][1]-J[10][1]),P[8][:,1]-(J[8][1]-J[11][1]),P[10][:,1],P[11][:,1]],1),1)
    sole=(sole-np.percentile(sole,3))*ratio
    l2=loc[:length].copy(); s2=sole[:length].copy()
    for i in range(xfade): w=i/xfade; l2[i]=(1-w)*loc[length+i]+w*loc[i]; s2[i]=(1-w)*sole[length+i]+w*sole[i]
    return out,l2,np.maximum(s2,0)
def best_loop(pkl,length,search=150):
    G,tr,poses=smpl_load(pkl); T=len(poses)
    feat=np.concatenate([g.as_quat() for g in G[1:22]],1)
    best=None
    for a in range(0,min(search,T-length-20)):
        d=np.linalg.norm(feat[a]-feat[a+length])+np.linalg.norm((feat[a+1]-feat[a])-(feat[a+length+1]-feat[a+length]))*3
        if best is None or d<best[0]: best=(d,a)
    return best
