#!/usr/bin/env python3
"""Flag literal numeric input overlap for human review, never grade semantic similarity."""
from pathlib import Path
from decimal import Decimal
import hashlib,json,re,unicodedata
from source_paths import source_roots

ROOT=Path(__file__).resolve().parents[1]
NUMBER=r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)'
ASSIGN=re.compile(r'(?<![\w/∂])([A-Za-zθ][A-Za-z0-9_]*(?:\([A-Za-z]+\))?)\s*=\s*(\([^()\n]+\)|'+NUMBER+r')(?![\d./])')
EDGE=re.compile(r'(?<!\w)([A-Za-z])\s*(?:→|-)\s*([A-Za-z])\s*=\s*('+NUMBER+r')')


def features(text):
    text=unicodedata.normalize('NFKC',text).replace('−','-').replace('，',',')
    result={}
    for match in ASSIGN.finditer(text):
        value=match.group(2);parts=value.strip('()').split(',')
        if all(re.fullmatch(NUMBER,p.strip()) for p in parts):
            values=','.join(format(Decimal(p.strip()).normalize(),'f') for p in parts)
            result.setdefault(match.group(1).lower(),values)
    for a,b,value in EDGE.findall(text):result.setdefault('edge:'+a+'-'+b,format(Decimal(value).normalize(),'f'))
    return result


def tasks(text):
    headings=list(re.finditer(r'^(?:#{2,4}\s+)?(?:\d+\.\s+)?(?:\*\*)?([FITD]\d+)(?=[（(.：\s])',text,re.M))
    result={}
    for i,m in enumerate(headings):result[m.group(1)]=text[m.end():headings[i+1].start() if i+1<len(headings) else len(text)].strip()
    return result


def compare(task,resources):
    wanted=features(task)
    if len(wanted)<3:return None
    for source,text in resources:
        paragraphs=re.split(r'\n\s*\n',text)
        for i,paragraph in enumerate(paragraphs):
            window='\n'.join(paragraphs[i:i+2])[:3000]
            known=features(window)
            shared={k:v for k,v in wanted.items() if known.get(k)==v}
            if len(shared)>=3 and len(shared)/len(wanted)>=.9:
                return {'source':source,'matching_inputs':shared,'task_inputs':wanted,'task_excerpt':task[:450],'source_excerpt':window[:650]}
    return None


def main():
    data=json.loads((ROOT/'build/content.json').read_text())
    candidates=[];count=0;unparsed=[]
    for c in data['courses']:
        for u in c['units']:
            resources=[(u['lesson_path'],data['documents'][u['lesson_path']]['text'])]+[(eid,data['excerpts'][eid]['text']) for eid in u['deep_ids']]
            prompts=tasks(data['documents'][u['exercise_path']]['text'])
            if not prompts:unparsed.append(u['id'])
            for qid,task in prompts.items():
                if qid[0] not in 'ITD':continue
                count+=1
                # A transfer may inherit I1 input and explicitly change some values.
                if qid[0] in 'TD' and 'I1' in task:
                    base=features(prompts.get('I1',''));base.update(features(task))
                    task='; '.join(k+'='+v if ',' not in v else k+'=('+v+')' for k,v in base.items())+'\n'+task
                match=compare(task,resources)
                if match:
                    reviewed=u['id']=='AI402-U03' and qid=='D1'
                    candidates.append({'unit':u['id'],'question':qid,**match,'assessment':'人工已确认输入不同' if reviewed else '需人工确认；数字同现不证明语义重复','review_status':'reviewed_distinct_input' if reviewed else 'pending','reason':'虽共享h0/Wx/Wh，D1输入[1,3]及上游导数1不同于讲例[2,1]及导数2，另含padding新条件。' if reviewed else None})
    original=source_roots()['new']/'courses/AI401'
    old_tasks=tasks((original/'exercises/AI401-U03-exercises.md').read_text())
    old_match=compare(old_tasks['I1'],[('original lecture',(original/'lessons/AI401-U03.md').read_text())])
    assert old_match,'Known old I1 reuse must be detected'
    revised=[x for x in candidates if x['unit']=='AI401-U03']
    assert not revised,'Revised AI401 independent inputs must not match old solved inputs'
    pending=sum(c['review_status']=='pending' for c in candidates)
    report={'status':'REVIEW_CANDIDATES' if pending else 'REVIEWED_LITERAL_CANDIDATES','units_scanned':269,'unparsed_units':unparsed,'unparsed_note':'CS203-U03明确是形成性练习；独立考核在A03，不将其猜成I/T/D题。','prompts_scanned':count,'candidate_count':len(candidates),'unresolved_candidates':pending,'candidates':candidates,'known_original_I1_detected':bool(old_match),'revised_AI401_U03_candidates':len(revised),'reviewed_units':['AI401-U03','CS303-U01','CS303-U02','AI402-U03','AI402-U07','AI403-U02','AI404-U03','CS303-U09','CT434-U04','CS104-U06'],'html_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'limitations':['只检查至少3个固定数值赋值/图边的高重合；不检测所有语义复用。','候选不是已证实错误，通用常数和有意保留的形成性对照需人工判断。','本轮联合审阅覆盖列出的单元与命中的题目；不宣称其余单元已逐题审定。']}
    (ROOT/'reports/2026-10-30-repair/task-overlap-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in report.items() if k not in ['candidates','limitations']},ensure_ascii=False))


if __name__=='__main__':main()
