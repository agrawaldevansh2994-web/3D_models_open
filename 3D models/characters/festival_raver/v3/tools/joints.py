import numpy as np
# mesh coords: Y up, +Z front, character left = +X
J={}
def S(n,p,parent): J[n]=(np.array(p,float),parent)
S('Hips',(0,0.93,-0.01),None)
S('Spine',(0,1.02,-0.015),'Hips')
S('Spine1',(0,1.13,-0.02),'Spine')
S('Spine2',(0,1.25,-0.02),'Spine1')
S('Neck',(0,1.43,-0.025),'Spine2')
S('Head',(0,1.52,-0.005),'Neck')
for side,sx in (('Left',1),('Right',-1)):
    S(side+'Shoulder',(0.045*sx,1.385,-0.025),'Spine2')
    S(side+'Arm',(0.175*sx,1.34,-0.03),side+'Shoulder')
    S(side+'ForeArm',(0.315*sx,1.15,-0.025),side+'Arm')
    S(side+'Hand',(0.415*sx,0.995,0.03),side+'ForeArm')
    d=np.array([0.36*sx,-0.93,0.0]); d/=np.linalg.norm(d)
    for f,(bx,by,bz),L in (('Index',(0.448,0.915,0.095),(0.032,0.025,0.02)),('Middle',(0.456,0.91,0.063),(0.034,0.027,0.022)),
                         ('Ring',(0.455,0.912,0.035),(0.032,0.025,0.02)),('Pinky',(0.45,0.92,0.01),(0.026,0.02,0.017))):
        p=np.array([bx*sx,by,bz]); par=side+'Hand'
        for k in range(3):
            n=f'{side}Hand{f}{k+1}'; S(n,p,par); par=n; p=p+d*L[k]
    tp=[(0.415,0.965,0.085),(0.418,0.935,0.11),(0.425,0.905,0.12)]; par=side+'Hand'
    for k,q in enumerate(tp):
        n=f'{side}HandThumb{k+1}'; S(n,(q[0]*sx,q[1],q[2]),par); par=n
    S(side+'UpLeg',(0.10*sx,0.885,-0.01),'Hips')
    S(side+'Leg',(0.148*sx,0.485,0.0),side+'UpLeg')
    S(side+'Foot',(0.158*sx,0.115,-0.05),side+'Leg')
    S(side+'ToeBase',(0.165*sx,0.035,0.075),side+'Foot')
TAILS={'Head':(0,1.72,0.0),'LeftToeBase':(0.168,0.03,0.14),'RightToeBase':(-0.168,0.03,0.14)}
def tail(n):
    if n in TAILS: return np.array(TAILS[n],float)
    kids=[k for k,(p,par) in J.items() if par==n]
    pref={'Hips':'Spine','Spine2':'Neck','Hand':'Middle1'}
    for k in kids:
        if n=='Hips' and k=='Spine': return J[k][0]
        if n=='Spine2' and k=='Neck': return J[k][0]
        if n.endswith('Hand') and k.endswith('Middle1'): return J[k][0]
    if len(kids)==1: return J[kids[0]][0]
    # leaf: extend along parent direction
    p,par=J[n]; d=p-J[par][0]; return p+d/np.linalg.norm(d)*0.018
