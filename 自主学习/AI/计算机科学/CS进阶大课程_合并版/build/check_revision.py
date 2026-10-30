#!/usr/bin/env python3
"""Recompute corrected examples independently; finite checks are not general proofs."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from itertools import count
import copy, hashlib, heapq, json, math
import source_paths

ROOT=Path(__file__).resolve().parents[1]
checks=[]


def check(ok,name):
    checks.append({'name':name,'pass':bool(ok)})
    if not ok:raise AssertionError(name)


def near(a,b):
    return math.isclose(a,b,rel_tol=1e-7,abs_tol=1e-8)


def vector_loss(p):
    x=(1,2)
    z=[sum(p['W'][i][j]*x[j] for j in range(2))+p['b'][i] for i in range(2)]
    h=[max(t,0) for t in z]
    o=sum(v*a for v,a in zip(p['v'],h))+p['c']
    return z,h,o,(o-1)**2/2


params={'W':[[1.,-1.],[2.,1.]],'b':[2.,-1.],'v':[.5,-.25],'c':.25}
z,h,o,loss=vector_loss(params)
check((z,h,o,loss)==([1.,3.],[1.,3.],0.,.5),'AI401 I1 forward: two hidden units and output bias')
expected={'W':[[-.5,-1.],[.25,.5]],'b':[-.5,.25],'v':[-1.,-3.],'c':-1.}
for key,indices in [('W',[(i,j) for i in range(2) for j in range(2)]),('b',[(i,) for i in range(2)]),('v',[(i,) for i in range(2)]),('c',[()])]:
    for index in indices:
        plus,minus=copy.deepcopy(params),copy.deepcopy(params);epsilon=1e-5
        if not index:plus[key]+=epsilon;minus[key]-=epsilon;answer=expected[key]
        elif len(index)==1:plus[key][index[0]]+=epsilon;minus[key][index[0]]-=epsilon;answer=expected[key][index[0]]
        else:
            i,j=index;plus[key][i][j]+=epsilon;minus[key][i][j]-=epsilon;answer=expected[key][i][j]
        difference=(vector_loss(plus)[3]-vector_loss(minus)[3])/(2*epsilon)
        check(near(difference,answer),f'AI401 I1 finite difference {key}{index}')
plus,minus=copy.deepcopy(params),copy.deepcopy(params)
plus['W'][0][0]+=1e-5;minus['W'][0][0]-=1e-5
check(near(vector_loss(plus)[3],.4999950000125) and near(vector_loss(minus)[3],.5000050000125),'AI401 I2 saved perturbation losses')
check(near((.500002000002-.499998000002)/(2e-5),.2),'AI401 I2 inconsistent log difference = 0.2')


def shared(theta,b2):
    z1,z2=theta*2+.5,theta*(-1)+b2
    h1,h2=max(z1,0),max(z2,0)
    output=.2*h1-.4*h2+.1
    error=output-1.3
    parts=(error*.2*(z1>0)*2,error*(-.4)*(z2>0)*(-1))
    return output,error*error/2,parts


for b2,output,loss,gradient in [(1,.8,.125,-.2),(2,.6,.245,-.56)]:
    result=shared(1.5,b2)
    check(near(result[0],output) and near(result[1],loss) and near(sum(result[2]),gradient),'AI401 T1 complete shared path '+str(b2))
    difference=(shared(1.5+1e-6,b2)[1]-shared(1.5-1e-6,b2)[1])/(2e-6)
    check(near(difference,gradient),'AI401 T1 independent theta difference '+str(b2))
z=(-1.25)*(-2)-.5;h=max(z,0);output=.8*h+.2;error=output-.6
check(near(z,2) and near(output,1.8) and near(error*error/2,.72),'AI401 D1 new forward')
check(all(near(a,b) for a,b in zip([error*.8*(-2),error*.8,error*h,error],[-1.92,.96,2.4,1.2])),'AI401 D1 all four gradients')


def search(graph,start,goal,heuristic=None):
    heuristic=heuristic or {};frontier=[(heuristic.get(start,0),start,0,[start])];best={start:0};trace=[]
    while frontier:
        f,node,g,path=heapq.heappop(frontier)
        if g!=best[node]:continue
        trace.append((node,g,f))
        if node==goal:return g,path,trace
        for target,cost in sorted(graph.get(node,[])):
            candidate=g+cost
            if candidate<best.get(target,math.inf):
                best[target]=candidate;heapq.heappush(frontier,(candidate+heuristic.get(target,0),target,candidate,path+[target]))
    return None,None,trace


old={'S':[('A',1),('G',5)],'A':[('S',1),('G',10)]}
check(search(old,'S','G',{'S':5,'A':20})[0]==5,'Rejected A* counterexample actually returns 5')
counter={'S':[('A',1),('G',5)],'A':[('S',1),('G',1)]}
wrong=search(counter,'S','G',{'A':20});right=search(counter,'S','G')
check(wrong[0]==5 and right[0]==2 and wrong[2]==[('S',0,0),('G',5,5)],'True inadmissible-heuristic counterexample returns 5 instead of 2')
main={'S':[('A',1),('B',4)],'A':[('C',2),('G',9)],'B':[('C',1)],'C':[('G',3)]}
ucs=search(main,'S','G');astar=search(main,'S','G',{'S':5,'A':5,'B':1,'C':3})
check(ucs[0]==6 and [n for n,g,f in ucs[2]]==['S','A','C','B','G'],'Corrected lecture UCS chronological order')
check(astar[0]==6 and [n for n,g,f in astar[2]]==['S','B','A','C','G'],'Corrected lecture A* complete frontier order')
i1={'S':[('A',2),('B',1)],'A':[('G',2)],'B':[('C',2)],'C':[('G',2)]}
result=search(i1,'S','G',{'S':2,'A':1,'B':2,'C':1})
check(result[0]==4 and [n for n,g,f in result[2]]==['S','A','B','C','G'],'CS303 U02 I1 fixed alphabetical tie rule')
result=search(i1,'S','G',{'S':2,'A':1,'B':4,'C':0})
check(result[0]==4 and [n for n,g,f in result[2]]==['S','A','G'],'CS303 U02 T1 admissible inconsistent h still succeeds on this graph')
check(4>2+0,'CS303 U02 T1 inconsistency specifically on B to C')
check(search({'S':[('A',5),('B',1)],'B':[('A',1)],'A':[('G',1)]},'S','G')[0]==3,'CS303 U02 I2 strict better-g update')


def permit_search(expiring):
    edges={'A':[('K',1),('D',2),('G',8)],'K':[('A',1)],'D':[('G',1)],'G':[]}
    # Separate full-state enumeration oracle, independent from the answer's successor function.
    graph={}
    for position in edges:
        for permit in range(3 if expiring else 2):
            following=[]
            for target,cost in edges[position]:
                if position=='D' and not permit:continue
                updated=(2 if target=='K' else max(0,permit-1)) if expiring else int(bool(permit) or target=='K')
                following.append(((target,updated),cost))
            graph[(position,permit)]=following
    goal='END';graph[goal]=[]
    for state in list(graph):
        if isinstance(state,tuple) and state[0]=='G':graph[state]=[(goal,0)]
    return search(graph,('A',0),goal)


check(permit_search(False)[0]==5,'CS303 U01 permanent permit model cost 5')
check(permit_search(True)[0]==8,'CS303 U01 expiring permit model cost 8')

# Findings from the cross-unit input-overlap review, independently recomputed.
def bm25(idf,k1,b,length,average,tf):
    return idf*(k1+1)*tf/(k1*(1-b+b*length/average)+tf)

check(near(bm25(math.log(2),1,.5,8,4,2),.7921682063542231),'AI403 fixed F1/lecture numerator = 4')
check(near(1.099*6.6/4.2,1.727),'AI403 F2 fixed rounded-idf arithmetic')
check(near(bm25(math.log(2),1,.75,8,4,2),.7393569925972749) and near(bm25(math.log(2),1,.75,4,4,2),.9241962407465937),'AI403 I1 both corrected document scores')
check(near(bm25(math.log(5),1.5,.4,10,5,3),2.366820459461912),'AI403 D1 genuinely new input')
z=sum(a*b for a,b in zip([.5,1,1,.5],[.2,-.1,.3,.1]));logit=2*z-.2;probability=1/(1+math.exp(-logit))
check(near(z,.35) and near(logit,.5) and near(probability,.6224593312018546),'AI404 corrected neural scoring forward')
check(near((probability-1)*z,-.1321392340793509),'AI404 corrected neural scoring gradient')
p,q=[.6,.8],[1,.5];error=sum(a*b for a,b in zip(p,q))-1.2
dp=[error*q[i]+.05*p[i] for i in range(2)];dq=[error*p[i]+.05*q[i] for i in range(2)]
check(all(near(a,b) for a,b in zip([p[i]-.1*dp[i] for i in range(2)],[.617,.806])) and all(near(a,b) for a,b in zip([q[i]-.1*dq[i] for i in range(2)],[1.007,.5135])),'AI404 delayed MF joint error/regularization update')
check(near(error*error/2+.05/2*(sum(a*a for a in p)+sum(a*a for a in q)),.07625),'AI404 delayed pre-update objective')
check(near(24/(24+6),.8) and near(8/(8+22),4/15) and near(14/(14+6),.7) and near(7/(7+33),.175),'CS303 U09 unseen group denominators and rates')
values=[.70,.76,.74];mean=sum(values)/3;variance=sum((v-mean)**2 for v in values)/2
check(near(mean,11/15) and near(variance,.0009333333333333) and near(math.sqrt(variance),.0305505046330389),'CS303 U09 corrected sample standard deviation')
weights=[.75*.4,.25*.4,.75*.6,.25*.6];colors=[(.2,0,0),(0,.8,0),(0,0,.6),(1,1,1)]
rgb=[sum(w*color[i] for w,color in zip(weights,colors)) for i in range(3)]
check(all(near(a,b) for a,b in zip(rgb,[.21,.23,.42])) and near(sum(weights),1),'CT434 U04 unseen bilinear weights and colors')
check(near(math.sqrt(.2*.8/100),.04) and near((.26-.2)/.04,1.5) and near(2*(1-.9332),.1336),'CS104 U06 new I1 null standard error and two-sided p')
n=2*12**2*(1.96+1.28)**2/4**2
check(near(n,188.9568) and math.ceil(n)==189 and math.ceil(n/.85)==223,'CS104 U06 new I2 power and attrition rounding')
p_abs=math.erfc(2/math.sqrt(2))
check(near(p_abs,2*(1-(1+math.erf(2/math.sqrt(2)))/2)),'Two-sided absolute normal tail is not doubled twice')

with TemporaryDirectory() as tmp:
    base=Path(tmp);oldroot=base/'old';newroot=base/'new';oldroot.mkdir();newroot.mkdir();f=oldroot/'sample.txt';f.write_text('original')
    before={'CS个人课程系统/sample.txt':hashlib.sha256(f.read_bytes()).hexdigest()}
    with patch.object(source_paths,'source_roots',return_value={'old':oldroot,'new':newroot}):
        check(source_paths.check_baseline(before)['status']=='PASS','Configured source roots resolve baseline entries')
        f.write_text('modified');result=source_paths.check_baseline(before)
        check(result['changed_files'] and not result['missing_files'],'Hash change differs from missing path')
        f.unlink();result=source_paths.check_baseline(before)
        check(result['missing_files'] and not result['changed_files'],'Missing file does not masquerade as changed hash')

data=json.loads((ROOT/'build/content.json').read_text())
for target,change in json.loads((ROOT/'content/overrides.json').read_text())['documents'].items():
    check(data['documents'][target]['text']==(ROOT/change['file']).read_text(),'Published override matches file '+target)
check(data['documents']['courses/AI401/exercises/AI401-U03-exercises.md']['assessment_revision']=='2026-10-30-r1','Changed task carries assessment revision')
report={'status':'PASS','checks':checks,'html_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'limits':'Finite computations and exact delivery checks; not a theorem-by-theorem audit.'}
(ROOT/'reports/2026-10-30-repair/example-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'status':report['status'],'checks':len(checks)},ensure_ascii=False))
