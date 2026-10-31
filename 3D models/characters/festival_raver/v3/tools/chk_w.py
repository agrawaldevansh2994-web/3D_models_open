import bpy
o=bpy.data.objects['Raver']; names={g.index:g.name for g in o.vertex_groups}
from collections import defaultdict
st=defaultdict(list)
for v in o.data.vertices:
    gs=sorted(v.groups,key=lambda g:-g.weight)
    if gs: st[names[gs[0].group]].append(v.co.copy())
for n,l in sorted(st.items()):
    xs=[c.x for c in l]; zs=[c.z for c in l]
    print(f'{n:22s} {len(l):5d} x[{min(xs):.2f},{max(xs):.2f}] h[{min(zs):.2f},{max(zs):.2f}]')
mx=max(len(v.groups) for v in o.data.vertices); print('maxinf',mx)
