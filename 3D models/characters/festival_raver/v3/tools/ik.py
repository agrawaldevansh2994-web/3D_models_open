import numpy as np, sys
sys.path.insert(0,'.')
from build import *
from scipy.spatial.transform import Rotation as R
def solve_knee(A,T,l1,l2,pole):
    d=T-A; L=np.linalg.norm(d); L=np.clip(L,abs(l1-l2)+1e-4,(l1+l2)*0.9995); dn=d/np.linalg.norm(d)
    T=A+dn*L
    a=(l1*l1-l2*l2+L*L)/(2*L); h=np.sqrt(max(l1*l1-a*a,0))
    p=pole-A; p=p-np.dot(p,dn)*dn; pn=np.linalg.norm(p)
    p=p/pn if pn>1e-6 else np.array([0,0,1.0])
    return A+dn*a+p*h, T
def apply_chain_ik(Q,T,f,up,mid,end,target,pole=None,end_world=None):
    """modify local quats Q[f] for bones up,mid so end reaches target (world). keep end world rot if end_world given."""
    iu,im,ie=sk.idx[up],sk.idx[mid],sk.idx[end]
    Wr,Wp=sk.fk(Q[f:f+1],T[f:f+1])
    A=Wp[0,iu]; K=Wp[0,im]; E=Wp[0,ie]
    l1=np.linalg.norm(K-A); l2=np.linalg.norm(E-K)
    if pole is None: pole=K
    Kn,Tn=solve_knee(A,target,l1,l2,pole)
    Wend=Wr[ie][0] if end_world is None else end_world
    Wu=Wr[iu][0]; r1=minrot(K-A,Kn-A); Wu2=r1*Wu
    Pu=Wr[sk.par[iu]][0]; Q[f,iu]=(Pu.inv()*Wu2).as_quat()
    Wm_inh=Wu2*R.from_quat(Q[f,im]); Ecur=Kn+ (Wm_inh*Wr[im][0].inv()).apply(E-K)
    # direction of mid bone after inheritance
    dcur=(r1).apply(E-K); r2=minrot(dcur,Tn-Kn); Wm2=r2*Wm_inh
    Q[f,im]=(Wu2.inv()*Wm2).as_quat()
    Q[f,ie]=(Wm2.inv()*Wend).as_quat()
def lock_feet(q,loc,thr_h=0.03,thr_v=0.7,blend=4):
    Q,T=to_arrays(q,loc); Wr,Wp=sk.fk(Q,T); F=len(loc)
    ra=tgt.pos('LeftFoot')[1]; rt=tgt.pos('LeftToeBase')[1]
    for side in ('Left','Right'):
        ia,it=sk.idx[side+'Foot'],sk.idx[side+'ToeBase']
        a=Wp[:,ia]; t=Wp[:,it]; sole=np.minimum(a[:,1]-ra,t[:,1]-rt); mid=(a+t)/2
        v=np.r_[0,np.linalg.norm(np.diff(mid[:,[0,2]],axis=0),axis=1)*FPS]
        c=(sole<thr_h)&(v<thr_v)
        # segments
        segs=[]; i=0
        while i<F:
            if c[i]:
                j=i
                while j+1<F and c[j+1]: j+=1
                if j-i>=2: segs.append((i,j))
                i=j+1
            else: i+=1
        off=np.zeros((F,3)); wgt=np.zeros(F)
        for (i,j) in segs:
            anchor=mid[i:j+1,[0,2]].mean(0)
            for k in range(max(0,i-blend),min(F,j+blend+1)):
                w=1.0 if i<=k<=j else (1-(i-k)/blend if k<i else 1-(k-j)/blend)
                if w>wgt[k]:
                    wgt[k]=w; off[k]=0; off[k,[0,2]]=(anchor-mid[k if i<=k<=j else (i if k<i else j),[0,2]]) if i<=k<=j else (anchor-mid[i if k<i else j,[0,2]])
        for k in range(F):
            if wgt[k]<=0: continue
            tgt_ank=Wp[k,ia]+off[k]*wgt[k]
            apply_chain_ik(Q,T,k,side+'UpLeg',side+'Leg',side+'Foot',tgt_ank,pole=None,end_world=Wr[ia][k])
    out={b:Q[:,sk.idx[b]].copy() for b in q}
    for b in out:
        v=out[b]
        for t in range(1,len(v)):
            if np.dot(v[t],v[t-1])<0: v[t]=-v[t]
    return out
