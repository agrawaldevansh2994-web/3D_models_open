import numpy as np, pickle, pygltflib, sys
from pygltflib import Accessor, BufferView, Animation, AnimationChannel, AnimationChannelTarget, AnimationSampler
src,out=sys.argv[1],sys.argv[2]
clips=pickle.load(open('anim/clips.pkl','rb'))
g=pygltflib.GLTF2().load(src); blob=bytearray(g.binary_blob()); idx={n.name:i for i,n in enumerate(g.nodes)}
FPS=30
def add(arr,typ,minmax=False):
    global blob
    arr=np.ascontiguousarray(arr,np.float32)
    while len(blob)%4: blob.append(0)
    off=len(blob); blob+=arr.tobytes()
    g.bufferViews.append(BufferView(buffer=0,byteOffset=off,byteLength=arr.nbytes))
    a=Accessor(bufferView=len(g.bufferViews)-1,componentType=5126,count=arr.shape[0],type=typ)
    if minmax: a.min=[float(arr.min())]; a.max=[float(arr.max())]
    g.accessors.append(a); return len(g.accessors)-1
for name,(q,loc,srcn) in clips.items():
    F=len(loc)
    # append first frame at end for seamless loop in three.js (time = F/FPS)
    t=np.arange(F+1)/FPS; ti=add(t.reshape(-1,1),'SCALAR',True)
    an=Animation(name=name,channels=[],samplers=[])
    for b,v in q.items():
        vv=np.vstack([v,v[:1]*np.sign(np.dot(v[-1],v[0]) or 1)])
        vv/=np.linalg.norm(vv,axis=1,keepdims=True)
        oi=add(vv,'VEC4'); an.samplers.append(AnimationSampler(input=ti,output=oi,interpolation='LINEAR'))
        an.channels.append(AnimationChannel(sampler=len(an.samplers)-1,target=AnimationChannelTarget(node=idx[b],path='rotation')))
    ll=np.vstack([loc,loc[:1]]); oi=add(ll,'VEC3'); an.samplers.append(AnimationSampler(input=ti,output=oi,interpolation='LINEAR'))
    an.channels.append(AnimationChannel(sampler=len(an.samplers)-1,target=AnimationChannelTarget(node=idx['Hips'],path='translation')))
    an.extras={'source':srcn,'fps':FPS,'loop':True}
    g.animations.append(an)
while len(blob)%4: blob.append(0)
g.buffers[0].byteLength=len(blob); g.set_binary_blob(bytes(blob))
g.save_binary(out); import os; print(out,os.path.getsize(out)/1e6,'MB', [a.name for a in g.animations])
