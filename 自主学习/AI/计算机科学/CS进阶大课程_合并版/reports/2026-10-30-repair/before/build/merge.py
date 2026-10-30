#!/usr/bin/env python3
"""Build an auditable merged curriculum without changing either input edition."""
from pathlib import Path
import sys, re, json, hashlib, html, base64, shutil
from html.parser import HTMLParser
import markdown

sys.dont_write_bytecode = True
from editorial import ALIGN, GUIDES, STAGES, ELECTIVES, NOTES

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT.parent
OLD = BASE / 'CS个人课程系统'
NEW = BASE / 'CS_个人课程系统_20261025'
VENDOR = ROOT / 'src/vendor'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def vendor():
    packages = Path('/private/tmp/cs-course-render/node_modules')
    if not VENDOR.exists():
        VENDOR.mkdir()
        for name, source in [('katex.min.js','katex/dist/katex.min.js'),('mermaid.min.js','mermaid/dist/mermaid.min.js')]:
            shutil.copyfile(packages/source, VENDOR/name)
        css = (packages/'katex/dist/katex.min.css').read_text()
        def font(match):
            fontpath = packages/'katex/dist'/match.group(1)
            ext = fontpath.suffix
            mime = {'.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'}[ext]
            return 'url(data:'+mime+';base64,'+base64.b64encode(fontpath.read_bytes()).decode()+')'
        css = re.sub(r'url\((fonts/[^)]+)\)', font, css)
        (VENDOR/'katex.css').write_text(css)
        for name in ['katex','mermaid']:
            licensepath = packages/name/'LICENSE'
            if not licensepath.exists(): licensepath = packages/name/'LICENSE.md'
            shutil.copyfile(licensepath,VENDOR/(name+'-LICENSE.txt'))


# Protect code before math. A placeholder never turns executable code into mathematics.
FORMULA = re.compile(r'\\\[(.*?)\\\]|\\\((.*?)\\\)|(?<!\\)\$\$(.*?)(?<!\\)\$\$|(?<!\\)\$(?!\$)((?:\\.|[^\\$\n])+?)(?<!\\)\$(?!\$)',re.S)


class Safe(HTMLParser):
    tags = set('a abbr b blockquote br caption code col colgroup dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img kbd li mark ol p pre s small span strong sub summary sup table tbody td th thead tr ul input'.split())
    def __init__(self, prefix):
        super().__init__(convert_charrefs=False); self.out=[]; self.prefix=prefix
    def handle_starttag(self,tag,attrs):
        if tag not in self.tags:return
        clean=[]
        for k,v in attrs:
            v=v or ''
            if k in ['title','alt','class','data-tex','data-display','type','disabled','checked'] or k=='id':
                if k=='id':v=self.prefix+'-'+v
                clean.append((k,v))
            elif k=='href':
                if v.startswith(('https://','http://')):clean.extend([('href',v),('target','_blank'),('rel','noopener noreferrer')])
                elif v.startswith('#'):clean.append(('href','#anchor/'+self.prefix+'-'+v[1:]))
        self.out.append('<'+tag+''.join(' '+k+'="'+html.escape(v,quote=True)+'"' for k,v in clean)+'>')
    def handle_endtag(self,tag):
        if tag in self.tags:self.out.append('</'+tag+'>')
    def handle_data(self,data):self.out.append(html.escape(data,quote=False))
    def handle_entityref(self,name):self.out.append('&'+name+';')
    def handle_charref(self,name):self.out.append('&#'+name+';')


def render(text,prefix):
    stash={}
    def hold(m):
        key='CODETOKEN'+str(len(stash))+'END';stash[key]=m.group();return key
    text=re.sub(r'^(`{3,}|~{3,}).*?^\1\s*$',hold,text,flags=re.M|re.S)
    text=re.sub(r'(`+)[^`\n]*?\1',hold,text)
    formulas={}
    def formula(m):
        value=next(g for g in m.groups() if g is not None)
        display=m.group().startswith(('\\[','$$'))
        key='FORMULATOKEN'+str(len(formulas))+'END'
        formulas[key]='<span class="tex" data-display="'+str(int(display))+'" data-tex="'+html.escape(value,quote=True)+'">'+html.escape(value)+'</span>'
        return key
    text=FORMULA.sub(formula,text)
    for key,value in stash.items():text=text.replace(key,value)
    rendered=markdown.markdown(text,extensions=['extra','sane_lists','toc'])
    for key,value in formulas.items():rendered=rendered.replace(key,value)
    parser=Safe(prefix);parser.feed(rendered)
    return ''.join(parser.out)


def sections(text):
    matches=list(re.finditer(r'^##\s+(.*)$',text,re.M))
    return [(m.group(1),text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)].strip()) for i,m in enumerate(matches)]


def extract(code,u,text):
    # Old assessments, solved exercises, claimed timings and sample outputs are deliberately excluded.
    parts=[]
    for title,body in sections(text):
        if re.match(r'[237](?:[.、\s])',title):
            if code=='CS202' and u['index']==1 and title.startswith('3'):
                body=re.sub(r'### 3\.2.*?(?=### |```mermaid|\Z)','### 对数界的完整推导\n\n任意正幂的证明已在本单元“合并补充”中重写；不再沿用原稿从特殊情形跳到一般情形的论证。\n\n',body,flags=re.S)
            # These are rhetorical overclaims, not required mathematical steps.
            body=body.replace('**这是所有深度学习框架的内部做法**','这是本节采用的梯度记号约定')
            body=body.replace('它假设任意整数运算 O(1)','它将固定机器字长范围内的指定基本运算计为 O(1)')
            body=body.replace('（C、Java、Python 都是这样）','（例如 C 和 Java 的常见语法约定；Python 以缩进界定语句块）')
            body=body.replace('合并向前看相同的核心','合并 LR(0) 核心相同的 LR(1) 状态，并对向前看集合取并集')
            parts.append('## '+title+'\n\n'+body)
    if not parts:raise ValueError('Missing substantive sections: '+code+u['id'])
    return fix_diagrams('\n\n'.join(parts),code,u['index'])


def fix_diagrams(text,code,index):
    key=f'{code}-{index:02d}'
    repairs={
        'CS104-06': [('C{E[X]=μ 存在?}','C{"E[X]=μ 存在?"}')],
        'CS203-07': [('mov rsp, rbp（建立新帧）','设置 rbp 为 rsp（建立新帧）'),('mov rbp, rsp; pop rbp（恢复 caller 帧指针）','设置 rsp 为 rbp，再恢复 caller 的 rbp')],
        'CS205-11': [('应用层无队头阻塞; 但共享一条TCP','应用层无队头阻塞，但共享一条TCP'),('Finished (客户端也认证完成)','Finished（验证握手，不一定认证客户端身份）')],
        'CS303-06': [('A2[A] <-- B2[B] --> C2[C]','B2[B] --> A2[A]\n        B2 --> C2[C]'),('A3[A] --> B3[B] <-- C3[C]','A3[A] --> B3[B]\n        C3[C] --> B3')],
        'CS399-12': [('D3{能基于证据回答?]','D3{"能基于证据回答?"}')],
        'CT434-03': [('CS[裁剪空间<br/>w = -z"]','CS["裁剪空间<br/>w = -z（此投影约定）"]'),('NDC[NDC<br/>[-1,1]³]','NDC["NDC<br/>[-1,1]³"]')],
        'DA433-06': [('C3["效应平稳"|"= 稳态"]','C3["效应看似平稳<br/>仍需检查窗口与机制"]')],
    }
    quote_labels={'CS303-02','CS303-09','CS303-10','CS303-11','CS399-01','CS399-05','CS399-06','CT434-07','CT434-04'}
    def patch(match):
        source=match.group(1)
        for before,after in repairs.get(key,[]):source=source.replace(before,after)
        if key in quote_labels:
            def quote_label(m):
                body=m.group(2)
                if body.startswith('"') and body.endswith('"'):return m.group()
                return m.group(1)+'["'+body.replace('"',"'")+'"]'
            source=re.sub(r'(?<!\w)([A-Za-z][A-Za-z0-9_]*)\[([^\[\]\n]*)\]',quote_label,source)
            if key=='CS399-06':source=source.replace('C1{变更模式是<br/>"换框架/换存储"<br/>还是<br/>"加/改用例"?}','C1{"变更模式是<br/>换框架/换存储<br/>还是<br/>加/改用例？"}')
            if key=='CS303-10':source=source.replace('闭式解 w* =','满列秩时，闭式解 w* =')
        return '```mermaid\n'+source+'```'
    return re.sub(r'```mermaid\n(.*?)```',patch,text,flags=re.S)


def build():
    vendor()
    source=json.loads((NEW/'web/build/content.json').read_text())
    docs=source['documents']
    drift=[]
    for path,d in docs.items():
        p=NEW/path
        if p.exists() and p.suffix!='.ppm' and p.read_text().replace('\r\n','\n')!=d['text'].replace('\r\n','\n'):drift.append(path)
    if drift:raise ValueError('Input HTML bundle has drift: '+str(drift))
    # New routes contain no edition-specific path choice for the learner.
    for d in docs.values():
        d['html']=d['html'].replace('#doc/','#document/')
    courses=source['courses']; units=[]; ledger=[]; excerpts={}
    for c in courses:
        code=c['id'];old=json.loads((OLD/'courses'/code/'content.json').read_text())
        assert c['name_zh']==old['name_zh'] and c['requirement']==old['type']
        assert len(ALIGN[code])==len(c['units'])
        flat=[n for ns in ALIGN[code] for n in ns]
        assert sorted(flat)==list(range(1,len(old['units'])+1)),code
        order=c.get('design_finalization',{}).get('teaching_order') or [u['id'] for u in c['units']]
        byid={u['id']:u for u in c['units']}
        c['units']=[byid[i] for i in order]
        question,purpose,retained,evidence=GUIDES[code]
        c['guide']={'question':question,'purpose':purpose,'retained':retained,'evidence':evidence}
        c['stage']=next((s[0] for s in STAGES if code in s[3]),'选修')
        c['deep_count']=len(flat)
        c['glossary_path']='glossary/'+code
        gloss=(OLD/'courses'/code/'glossary.md').read_text()
        docs[c['glossary_path']]={'path':c['glossary_path'],'title':code+' 术语表','text':gloss,'html':render(gloss,'gloss-'+code),'course_id':code,'kind':'glossary','locked':False}
        for position,u in enumerate(c['units']):
            num=int(u['id'].split('-U')[1]);u['course_id']=code;u['position']=position
            u['deep_ids']=[];u['note']=NOTES.get(u['id'],'')
            for n in ALIGN[code][num-1]:
                original=old['units'][n-1];p=OLD/'courses'/code/original['file']
                raw=p.read_text();selected=extract(code,original,raw)
                eid=code+'-D'+str(n).zfill(2)
                excerpts[eid]={'id':eid,'title':original['title'],'original_unit':original['id'],'target':u['id'],'text':selected,'html':render(selected,eid),'path':str(p.relative_to(BASE)),'sha256':digest(p.read_bytes()),'selection':'定义与记号、推导与证明、常见误区；不采用旧评分、旧题库和独立计时演示'}
                u['deep_ids'].append(eid)
                ledger.append({'course':code,'old_unit':original['id'],'old_title':original['title'],'new_unit':u['id'],'new_title':u['title'],'source':str(p.relative_to(BASE)),'sha256':digest(p.read_bytes()),'selected_chars':len(selected)})
            u['search']=u['title']+' '+docs[u['lesson_path']]['text']+' '+ ' '.join(excerpts[e]['text'] for e in u['deep_ids'])
            units.append(u)
    for name in ['算法分析补充.md','complexity_counts.py']:
        p=ROOT/'content'/name;key='merged/'+name;t=p.read_text()
        docs[key]={'path':key,'title':name,'text':t,'html':render(t,'merged-algorithm') if p.suffix=='.md' else '<pre><code class="language-python">'+html.escape(t)+'</code></pre>','course_id':'CS202','kind':'lesson' if p.suffix=='.md' else 'lab','locked':False}
    meta={'title':'CS 进阶大课程','edition':'合并版 · 2026.10.30','date':'2026-10-30','course_count':29,'unit_count':len(units),'excerpt_count':len(excerpts),'required':14,'elective':15,'documents':len(docs),'learner_initial':'not_assessed','input_hash':digest(json.dumps(json.loads((ROOT/'reports/source-before.json').read_text()),sort_keys=True).encode())}
    data={'meta':meta,'courses':courses,'documents':docs,'excerpts':excerpts,'stages':STAGES,'electives':ELECTIVES,'prerequisites':source['prerequisites'],'references':source['references']}
    assert len(units)==269 and len(excerpts)==372
    (ROOT/'build/content.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    (ROOT/'reports/alignment.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2))
    lines=['# 两版逐单元合并映射','', '主线269单元；旧版372篇各有一个明确目标位置。节选仅进入深读，练习和正式评分采用修订版。','', '|课程|旧版单元|旧版主题|合并位置|主线主题|','|---|---|---|---|---|']
    lines += ['|'+ '|'.join(str(x[k]).replace('|','／') for k in ['course','old_unit','old_title','new_unit','new_title'])+'|' for x in ledger]
    (ROOT/'reports/逐单元合并映射.md').write_text('\n'.join(lines))
    assemble(data)


def assemble(data=None):
    if data is None:data=json.loads((ROOT/'build/content.json').read_text())
    template=(ROOT/'src/index.html').read_text()
    replacements={'CSS':(ROOT/'src/app.css').read_text(),'JS':(ROOT/'src/app.js').read_text(),'KATEX_CSS':(VENDOR/'katex.css').read_text(),'KATEX_JS':(VENDOR/'katex.min.js').read_text(),'MERMAID_JS':(VENDOR/'mermaid.min.js').read_text(),'CONTENT':json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')}
    for key,value in replacements.items():template=template.replace('@@'+key+'@@',value)
    (ROOT/'index.html').write_text(template)
    report={'status':'built','bytes':len(template.encode()),'sha256':digest(template.encode()),**data['meta']}
    (ROOT/'reports/build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__':
    if '--assemble' in sys.argv:assemble()
    else:build()
