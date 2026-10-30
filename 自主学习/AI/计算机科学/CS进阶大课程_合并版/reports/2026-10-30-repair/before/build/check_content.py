#!/usr/bin/env python3
"""Check merged scope, traceability, preserved inputs and known assessment regressions."""
from pathlib import Path
import json, hashlib, re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]


def check(value,label):
    checks.append({'name':label,'pass':bool(value)})
    if not value:raise AssertionError(label)


data=json.loads((ROOT/'build/content.json').read_text())
before=json.loads((ROOT/'reports/source-before.json').read_text())
changed=[]
for name,digest in before.items():
    p=ROOT.parent/name
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:changed.append(name)
check(not changed,'Both original editions remain byte-identical: 2726 files')
check(len(data['courses'])==29,'Course scope = 29')
check(sum(c['requirement']=='required' for c in data['courses'])==14,'Required 14, elective 15')
check(sum(len(c['units']) for c in data['courses'])==269,'Main units = 269')
check(len(data['excerpts'])==372,'Topic readings = 372')
check(not any(p.startswith('learner/') for p in data['documents']),'No original learner records embedded as generated achievement')
allids={u['id'] for c in data['courses'] for u in c['units']}
for c in data['courses']:
    for u in c['units']:
        for kind in ['lesson_path','exercise_path','answer_path']:
            check(u[kind] in data['documents'],u['id']+' '+kind+' exists')
        for dep in u.get('prerequisite_units',[]):
            # IDs may also be external skills; stable unit IDs must be real.
            if isinstance(dep,str) and re.match(r'^[A-Z]+\d+-U\d+$',dep):check(dep in allids,'Known prerequisite '+dep)
    check(all(c['guide'].values()),'Specific editorial introduction '+c['id'])
for e in data['excerpts'].values():
    check(e['target'] in allids,'Reading target '+e['id'])
    check(len(e['text'])>200,'Nonempty substantive reading '+e['id'])
    check('CODETOKEN' not in e['html'] and 'FORMULATOKEN' not in e['html'],'No placeholder leakage '+e['id'])
    check(not re.search(r'^##\s+(?:5|8|10)\.',e['text'],re.M),'Old standalone experiment/assessment excluded '+e['id'])
for code,terms in {
    'CS303':['90/30/30','30/10/10','S≥40/50','M≥40/50','缺S或M','不能虚构'],
    'AI402':['P1','P2','P3','本人实现','保存','重载','两种设置'],
    'SE415':['微控制器','模拟器','实机'],
    'TH421':['3-SAT','VERTEX-COVER','双向','多项式'],
    'AI403':['Q01','Q10','qrels','动作预算'],
    'AI404':['历史统计','Cq','MF','MLP','不设未定义的Agent memory'],
}.items():
    text=data['documents'][f'courses/{code}/assessments/{code}-A02.md']['text']
    for term in terms:check(term in text,'Retained assessment contract '+code+' / '+term)
causal=data['documents']['courses/DA433/lessons/DA433-U07.md']['text']
for term in ['平行趋势','ATT','LATE','2.5','12.5','SMD']:check(term in causal,'Causal derivation coverage '+term)
subprocess.run([sys.executable,str(ROOT/'content/complexity_counts.py')],check=True,capture_output=True)
check(True,'New operation-count experiment actually executed')
check(len({e['original_unit'] for e in data['excerpts'].values()})==372,'Each old unit has one mapped reading')
report={'status':'PASS','checks':checks,'protected_files':len(before),'changed_files':changed,'main_units':269,'readings':372,'units_with_readings':sum(bool(u['deep_ids']) for c in data['courses'] for u in c['units']),'reading_chars':sum(len(e['text']) for e in data['excerpts'].values()),'html_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'limitations':['Contract keyword checks only verify retention, not academic correctness.','Original learner evidence is not inferred from this build.','372 readings have not been individually certified theorem by theorem.']}
(ROOT/'reports/content-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['checks','limitations']},ensure_ascii=False))
print('checks',len(checks))
