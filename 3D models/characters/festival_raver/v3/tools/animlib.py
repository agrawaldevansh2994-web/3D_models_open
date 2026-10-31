import numpy as np, pygltflib, os, pickle
from scipy.spatial.transform import Rotation as R, Slerp
FPS=30
def read_acc(g,i,base):
    a=g.accessors[i]; bv=g.bufferViews[a.bufferView]; buf=g.buffers[bv.buffer]
    if not hasattr(g,'_blobs'): g._blobs={}
    if bv.buffer not in g._blobs:
        g._blobs[bv.buffer]=g.binary_blob() if buf.uri is None else open(os.path.join(base,buf.uri),'rb').read()
    data=g._blobs[bv.buffer]
    nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a.type]
    dt={5126:np.float32,5123:np.uint16,5121:np.uint8,5125:np.uint32,5122:np.int16,5120:np.int8}[a.componentType]
    off=(bv.byteOffset or 0)+(a.byteOffset or 0); st=bv.byteStride
    itemsize=np.dtype(dt).itemsize*nc
    if st and st!=itemsize:
        arr=np.stack([np.frombuffer(data,dt,nc,off+k*st) for k in range(a.count)])
    else: arr=np.frombuffer(data,dt,a.count*nc,off).reshape(a.count,nc)
    arr=arr.astype(np.float64)
    if a.normalized and dt!=np.float32: arr=arr/np.iinfo(dt).max
    return arr
class Skel:
    def __init__(s,path):
        g=pygltflib.GLTF2().load(path); s.g=g; s.base=os.path.dirname(path)
        s.names=[n.name for n in g.nodes]; s.idx={n:i for i,n in enumerate(s.names)}
        s.par=[-1]*len(g.nodes)
        for i,n in enumerate(g.nodes):
            for c in (n.children or []): s.par[c]=i
        s.T=np.array([n.translation or [0,0,0] for n in g.nodes],float)
        s.Q=np.array([n.rotation or [0,0,0,1] for n in g.nodes],float)
        s.S=np.array([n.scale or [1,1,1] for n in g.nodes],float)
        s.order=[]; seen=set()
        def visit(i):
            if i in seen: return
            if s.par[i]>=0: visit(s.par[i])
            seen.add(i); s.order.append(i)
        for i in range(len(g.nodes)): visit(i)
    def fk(s,Q,T,Sc=None):
        """Q:[F,N,4] local quats, T:[F,N,3] -> world rot (list of R) and pos [F,N,3] (scale applied to child translations)"""
        F=Q.shape[0]; N=len(s.names); Wr=[None]*N; Wp=np.zeros((F,N,3)); Ws=np.ones((F,N,3))
        Sc=np.broadcast_to(s.S,(F,N,3)) if Sc is None else Sc
        for i in s.order:
            r=R.from_quat(Q[:,i]); p=s.par[i]
            if p<0: Wr[i]=r; Wp[:,i]=T[:,i]; Ws[:,i]=Sc[:,i]
            else:
                Wr[i]=Wr[p]*r; Wp[:,i]=Wp[:,p]+Wr[p].apply(T[:,i]*Ws[:,p]); Ws[:,i]=Ws[:,p]*Sc[:,i]
        return Wr,Wp
    def rest(s):
        Wr,Wp=s.fk(s.Q[None],s.T[None]); return Wr,Wp
    def sample(s,anim_name,fps=FPS):
        g=s.g; a=[x for x in g.animations if x.name==anim_name][0]
        dur=max(read_acc(g,sm.input,s.base).max() for sm in a.samplers)
        F=int(round(dur*fps)); t=np.arange(F+1)/fps
        Q=np.repeat(s.Q[None],F+1,0).copy(); T=np.repeat(s.T[None],F+1,0).copy(); Sc=np.repeat(s.S[None],F+1,0).copy()
        for c in a.channels:
            sm=a.samplers[c.sampler]; ti=read_acc(g,sm.input,s.base)[:,0]; v=read_acc(g,sm.output,s.base)
            if sm.interpolation=='CUBICSPLINE': v=v.reshape(len(ti),3,-1)[:,1]
            n=c.target.node; tt=np.clip(t,ti[0],ti[-1])
            if c.target.path=='rotation':
                if len(ti)==1: Q[:,n]=v[0]
                elif sm.interpolation=='STEP': Q[:,n]=v[np.clip(np.searchsorted(ti,tt,'right')-1,0,len(ti)-1)]
                else: Q[:,n]=Slerp(ti,R.from_quat(v))(tt).as_quat()
            else:
                arr=T if c.target.path=='translation' else Sc
                if sm.interpolation=='STEP' or len(ti)==1: arr[:,n]=v[np.clip(np.searchsorted(ti,tt,'right')-1,0,len(ti)-1)]
                else:
                    for k in range(3): arr[:,n,k]=np.interp(tt,ti,v[:,k])
        return Q,T,Sc,F
def minrot(a,b):
    a=a/np.linalg.norm(a); b=b/np.linalg.norm(b); v=np.cross(a,b); c=np.dot(a,b)
    if np.linalg.norm(v)<1e-8: return R.identity() if c>0 else R.from_rotvec(np.array([0,0,np.pi]))
    return R.from_rotvec(v/np.linalg.norm(v)*np.arccos(np.clip(c,-1,1)))
def norm_rot(Wr):  # strip scale: already rotations
    return Wr
BONES=None
class Target:
    def __init__(s,path):
        s.sk=Skel(path); sk=s.sk
        skin=sk.g.skins[0]; s.joints=list(skin.joints); s.jn=[sk.names[j] for j in s.joints]
        s.Wr0,s.Wp0=sk.rest()
    def pos(s,n): return s.Wp0[0,s.sk.idx[n]]
    def rot(s,n): return s.Wr0[s.sk.idx[n]][0]
def retarget(tgt,srcWr,srcWr0,srcP0,srcHip,mapping,F,hip_ratio,src_hip_name):
    """srcWr: dict srcjoint->R (F) world rot; srcWr0: dict->R rest world; srcP0 dict -> rest pos;
       mapping: target bone -> (src joint, target child or None, src child or None)
       returns local quats dict and hips local translation"""
    sk=tgt.sk; W={}
    for b in tgt.jn:
        if b in mapping:
            s,tc,sc=mapping[b]
            D=srcWr[s]*srcWr0[s].inv()
            if tc is not None:
                C=minrot(tgt.pos(tc)-tgt.pos(b), srcP0[sc]-srcP0[s])
            else: C=R.identity()
            W[b]=D*C*tgt.rot(b)
    out={}
    def parW(b):
        p=sk.par[sk.idx[b]]; pn=sk.names[p]
        if pn in W: return W[pn]
        if pn in tgt.jn:  # unmapped joint: follow parent with rest local
            W[pn]=parW(pn)*R.from_quat(np.repeat(sk.Q[p][None],F,0)); return W[pn]
        return R.from_quat(np.repeat(tgt.Wr0[p][0].as_quat()[None],F,0))
    for b in tgt.jn:
        if b not in W: W[b]=parW(b)*R.from_quat(np.repeat(sk.Q[sk.idx[b]][None],F,0))
    for b in tgt.jn:
        q=(parW(b).inv()*W[b]).as_quat()
        for t in range(1,len(q)):
            if np.dot(q[t],q[t-1])<0: q[t]=-q[t]
        out[b]=q
    # hips translation in world
    hp0=tgt.pos('Hips')
    d=(srcHip-srcP0[src_hip_name])*hip_ratio
    wpos=hp0[None]+d
    p=sk.par[sk.idx['Hips']]
    Pw=tgt.Wr0[p][0]; Pp=tgt.Wp0[0,p]
    loc=Pw.inv().apply(wpos-Pp)
    return out,loc,W
