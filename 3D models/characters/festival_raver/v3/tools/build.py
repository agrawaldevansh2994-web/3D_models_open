import numpy as np, sys, json, pygltflib, struct
sys.path.insert(0,'.')
from make_clips import *
sk=tgt.sk; JN=tgt.jn; N=len(sk.names)
def to_arrays(q,loc):
    F=len(loc); Q=np.repeat(sk.Q[None],F,0).copy(); T=np.repeat(sk.T[None],F,0).copy()
    for b,v in q.items(): Q[:,sk.idx[b]]=v
    T[:,sk.idx['Hips']]=loc; return Q,T
def ground_to(q,loc,h):
    Q,T=to_arrays(q,loc); Wr,Wp=sk.fk(Q,T)
    ra=tgt.pos('LeftFoot')[1]; rt=tgt.pos('LeftToeBase')[1]
    sole=np.min(np.stack([Wp[:,sk.idx['LeftFoot'],1]-ra,Wp[:,sk.idx['RightFoot'],1]-ra,Wp[:,sk.idx['LeftToeBase'],1]-rt,Wp[:,sk.idx['RightToeBase'],1]-rt],1),1)
    loc=loc.copy(); loc[:,1]+=h-sole; return loc
def ground(q,loc,keep_jumps=True):
    Q,T=to_arrays(q,loc); Wr,Wp=sk.fk(Q,T)
    rest_ank=tgt.pos('LeftFoot')[1]; rest_toe=tgt.pos('LeftToeBase')[1]
    sole=np.min(np.stack([Wp[:,sk.idx['LeftFoot'],1]-rest_ank,Wp[:,sk.idx['RightFoot'],1]-rest_ank,
                          Wp[:,sk.idx['LeftToeBase'],1]-rest_toe,Wp[:,sk.idx['RightToeBase'],1]-rest_toe],1),1)
    off=np.percentile(sole,10)
    corr=-(sole-off); corr=np.maximum(corr,0)  # lift if penetrating after offset
    loc=loc.copy()
    # parent of hips is armature root (identity-ish); apply in world y approx
    loc[:,1]+= -off+corr
    return loc
def curl_fingers(q,amount=0.35):
    """add relaxed curl to finger bones (constant local rot about bone-local axis computed from rest)"""
    for side,s in (('Left',1),('Right',-1)):
        hand=tgt.rot(side+'Hand')
        for f in ['Index','Middle','Ring','Pinky']:
            for k in (1,2,3):
                b=f'{side}Hand{f}{k}'
                if b not in q: continue
                Wb=tgt.rot(b); d=(tgt.pos(f'{side}Hand{f}{k+1}') if k<3 else tgt.pos(b)+ (tgt.pos(b)-tgt.pos(f'{side}Hand{f}{k-1}')))-tgt.pos(b)
                palm=np.array([-s,0,0.0])  # palm faces body
                ax=np.cross(d,palm); ax/=np.linalg.norm(ax)
                ang=amount*(1.0 if k>1 else 0.7)
                # world rotation about ax applied in bone local: local_new = local * (Wb^-1 Rax Wb)
                lr=Wb.inv()*R.from_rotvec(ax*ang)*Wb
                q[b]=(R.from_quat(q[b])*lr).as_quat()
    return q
def sliding(q,loc):
    Q,T=to_arrays(q,loc); Wr,Wp=sk.fk(Q,T); res={}
    for side in ('Left','Right'):
        p=Wp[:,sk.idx[side+'ToeBase']]; h=p[:,1]; v=np.linalg.norm(np.diff(p[:,[0,2]],axis=0),axis=1)*FPS
        c=(h[1:]<0.05)&(h[:-1]<0.05)
        res[side]=(round(float(c.mean()),2), round(float(np.median(v[c])) if c.any() else 0,3), round(float(np.percentile(v[c],90)) if c.any() else 0,3))
    return res
def foot_stats(q,loc):
    Q,T=to_arrays(q,loc); Wr,Wp=sk.fk(Q,T); out={}
    ra=tgt.pos('LeftFoot')[1]; rt=tgt.pos('LeftToeBase')[1]
    for side in ('Left','Right'):
        a=Wp[:,sk.idx[side+'Foot']]; t=Wp[:,sk.idx[side+'ToeBase']]
        sole=np.minimum(a[:,1]-ra,t[:,1]-rt); c=sole<0.02
        mid=(a+t)/2; v=np.linalg.norm(np.diff(mid[:,[0,2]],axis=0),axis=1)*FPS; cc=c[1:]&c[:-1]
        out[side]=dict(contact=round(float(c.mean()),2),slide_med=round(float(np.median(v[cc])),3) if cc.any() else None,
                       sole_p10=round(float(np.percentile(sole,10)),3),sole_p50=round(float(np.median(sole)),3))
    return out
