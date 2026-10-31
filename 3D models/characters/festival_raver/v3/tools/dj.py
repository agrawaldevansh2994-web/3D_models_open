import numpy as np, sys
sys.path.insert(0,'.')
from ik import *
BPM=128.0; BEATS=16; DUR=BEATS*60/BPM; F=int(round(DUR*FPS))
def frame_m(d,n):
    d=d/np.linalg.norm(d); n=n-np.dot(n,d)*d; n/=np.linalg.norm(n); return np.stack([d,n,np.cross(d,n)],1)
def smooth(x): x=np.clip(x,0,1); return x*x*(3-2*x)
def wrot(b,axis,deg):
    W=tgt.rot(b); return W.inv()*R.from_rotvec(np.array(axis,float)*np.radians(deg))*W
def dj_clip():
    Q=np.repeat(sk.Q[None],F,0).copy(); T=np.repeat(sk.T[None],F,0).copy()
    Wr0,Wp0=tgt.Wr0,tgt.Wp0
    hip0=sk.T[sk.idx['Hips']].copy()
    raise_w=np.zeros(F)
    for f in range(F):
        t=f/FPS; b=t*BPM/60
        rw=smooth((b-7.4)/1.0)*(1-smooth((b-12.6)/1.0)); raise_w[f]=rw
        amp=1+0.6*rw
        def setl(name,rot): i=sk.idx[name]; Q[f,i]=(R.from_quat(sk.Q[i])*rot).as_quat()
        # hips bounce/sway
        T[f,sk.idx['Hips']]=hip0+np.array([0.014*np.sin(np.pi*b),-(0.016+0.016*np.cos(2*np.pi*b))*amp,0.0])
        setl('Hips',wrot('Hips',(0,1,0),4*np.sin(np.pi*b))*wrot('Hips',(0,0,1),2.5*np.sin(np.pi*b)))
        setl('Spine',wrot('Spine',(1,0,0),9)*wrot('Spine',(0,0,1),-1.5*np.sin(np.pi*b)))
        setl('Spine1',wrot('Spine1',(1,0,0),10+2*np.cos(2*np.pi*b))*wrot('Spine1',(0,0,1),-2*np.sin(np.pi*b)))
        setl('Spine2',wrot('Spine2',(1,0,0),6)*wrot('Spine2',(0,1,0),-3*np.sin(np.pi*b)))
        nod=np.maximum(np.cos(2*np.pi*(b-0.08)),0)**2
        setl('Neck',wrot('Neck',(1,0,0),4+4*nod*amp))
        setl('Head',wrot('Head',(1,0,0),-6+11*nod*amp-8*rw)*wrot('Head',(0,1,0),3*np.sin(np.pi*b*0.5)))
        setl('RightShoulder',wrot('RightShoulder',(0,0,1),-14*rw))
        # legs: keep feet planted at rest
        for side in ('Left','Right'):
            ia=sk.idx[side+'Foot']
            apply_chain_ik(Q,T,f,side+'UpLeg',side+'Leg',side+'Foot',Wp0[0,ia],pole=Wp0[0,sk.idx[side+'Leg']]+np.array([0,0,0.5]),end_world=Wr0[ia][0])
        # arms
        th=0.9*np.sin(2*np.pi*b*0.5)+0.3*np.sin(2*np.pi*b*2)
        Lt=np.array([0.20+0.028*np.cos(th),1.06+0.008*np.sin(2*np.pi*b),0.32+0.028*np.sin(th)])
        spots=np.array([[-0.11,1.065,0.32],[-0.06,1.07,0.35],[-0.15,1.07,0.33],[-0.08,1.06,0.29]])
        s=b/2.0; k=int(np.floor(s))%4; fr=smooth((s-np.floor(s))/0.35)
        Rt=spots[k]*(1-fr)+spots[(k+1)%4]*fr
        Rt=Rt+np.array([0,0.006*np.sin(2*np.pi*b),0])
        up=np.array([-0.21,1.93+0.05*np.cos(2*np.pi*b),0.12])
        Rt=Rt*(1-rw)+up*rw
        for side,sx,tgtp in (('Left',1,Lt),('Right',-1,Rt)):
            ih=sk.idx[side+'Hand']
            d0=tgt.pos(side+'HandMiddle1')-tgt.pos(side+'Hand'); n0=np.array([-sx,0,0.0])
            Rest=frame_m(d0,n0)
            deck=frame_m(np.array([0.12*sx,-0.45,1.0]),np.array([0,-1.0,0.15]))
            Rdeck=R.from_matrix(deck@Rest.T)
            Rup=R.from_matrix(frame_m(np.array([0,1.0,0.15]),np.array([0,0.2,1.0]))@Rest.T)
            w=rw if side=='Right' else 0.0
            knob=R.from_rotvec(np.array([0,1.0,0])*np.radians(10*np.sin(2*np.pi*b*1.0))) if side=='Right' else R.identity()
            Rh=Slerp([0,1],R.concatenate([knob*Rdeck,Rup]))(w)*tgt.rot(side+'Hand')
            pole=Wp0[0,sk.idx[side+'Arm']]+np.array([0.45*sx,-0.35,-0.35])
            if side=='Right': pole=pole*(1-w)+ (Wp0[0,sk.idx[side+'Arm']]+np.array([-0.5,0.0,-0.2]))*w
            apply_chain_ik(Q,T,f,side+'Arm',side+'ForeArm',side+'Hand',tgtp,pole=pole,end_world=Rh)
    q={b:Q[:,sk.idx[b]].copy() for b in tgt.jn}
    # fingers: light grip on decks, fist on the raise (right)
    for side in ('Left','Right'):
        for fg in ['Index','Middle','Ring','Pinky']:
            for k in (1,2,3):
                bn=f'{side}Hand{fg}{k}'; s=1 if side=='Left' else -1
                d=(tgt.pos(f'{side}Hand{fg}{k+1}') if k<3 else tgt.pos(bn)+(tgt.pos(bn)-tgt.pos(f'{side}Hand{fg}{k-1}')))-tgt.pos(bn)
                ax=np.cross(d,np.array([-s,0,0.0])); ax/=np.linalg.norm(ax)
                for f in range(F):
                    amt=0.35+(1.1*raise_w[f] if side=='Right' else 0)
                    lr=tgt.rot(bn).inv()*R.from_rotvec(ax*amt*(1 if k>1 else 0.8))*tgt.rot(bn)
                    q[bn][f]=(R.from_quat(q[bn][f])*lr).as_quat()
    for bn in q:
        v=q[bn]
        for t in range(1,F):
            if np.dot(v[t],v[t-1])<0: v[t]=-v[t]
    return q,T[:,sk.idx['Hips']].copy()
