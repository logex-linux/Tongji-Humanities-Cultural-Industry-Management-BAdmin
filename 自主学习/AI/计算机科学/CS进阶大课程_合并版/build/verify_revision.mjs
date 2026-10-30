import pw from '<本机用户目录>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'reports/2026-10-30-repair');
const report={status:'RUNNING',html_sha256:createHash('sha256').update(await fs.readFile(path.join(root,'index.html'))).digest('hex'),checks:[],errors:[],requests:[]};
const assert=(ok,name,detail=null)=>{report.checks.push({name,pass:!!ok,...(detail===null?{}:{detail})});if(!ok)throw Error(name);};
const browser=await pw.chromium.launch({headless:true,executablePath:'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
 await context.route(/^https?:/,route=>{report.requests.push(route.request().url());return route.abort();});
 const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 const base=pathToFileURL(path.join(root,'index.html')).href;
 await p.goto(base);await p.waitForFunction(()=>window.CourseApp);
 async function go(hash){await p.evaluate(h=>{location.hash=h;},hash);await p.waitForFunction(h=>document.querySelector('main').dataset.route===h.slice(1),hash);}
 const merged=await p.evaluate(()=>{
  const path=CourseApp.data.courses.find(c=>c.id==='CS102').units[0].exercise_path;
  const old={text:'same response',mode:'independent',at:'2026-10-29T01:00:00Z',attempts:[{text:'first older response',mode:'independent',at:'2026-10-28T01:00:00Z'}]};
  const state=CourseApp.getState();delete state.reviewHistory;state.submissions[path]=old;
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state}));
  const incoming=CourseApp.getState();incoming.submissions[path]={...old,mode:'assisted',attempts:[...old.attempts,{text:'additional evidence',mode:'assisted',at:'2026-10-28T03:00:00Z'}]};
  const backup={format:'cs-merged-backup',state:incoming};
  CourseApp.mergeImport(CourseApp.importValid(backup));const first=CourseApp.getState().submissions[path];
  CourseApp.mergeImport(CourseApp.importValid(backup));const repeat=CourseApp.getState().submissions[path];
  return {path,first,repeat};
 });
 report.backup_reproduction=merged;
 assert(merged.first.mode==='assisted'&&merged.first.mode_conflict,'Same text/time correction retains assisted classification');
 assert(['first older response','additional evidence','same response'].every(t=>merged.first.attempts.some(a=>a.text===t)),'Historical and latest evidence both preserved');
 assert(merged.first.attempts.some(a=>a.text==='same response'&&a.mode==='independent')&&merged.first.attempts.some(a=>a.text==='same response'&&a.mode==='assisted'),'Conflicting raw declarations both preserved');
 assert(merged.first.attempts.length===merged.repeat.attempts.length,'Repeated backup import does not duplicate attempts');
 assert(merged.first.attempts.every(a=>a.origins.length),'Each retained declaration has traceable import/local origin');
 const stableId=await p.evaluate(()=>{
  const task=CourseApp.data.courses.find(c=>c.id==='CS102').units[2].exercise_path;
  const state=CourseApp.getState();state.submissions[task]={id:'corrected-attempt',text:'original wording',mode:'independent',at:'2026-10-29T02:00:00Z'};
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state}));
  const incoming=CourseApp.getState();incoming.submissions[task]={id:'corrected-attempt',text:'corrected wording',mode:'assisted',at:'2026-10-29T03:00:00Z'};
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state:incoming}));return CourseApp.getState().submissions[task];
 });
 assert(stableId.mode==='assisted'&&stableId.attempts.some(a=>a.text==='original wording')&&stableId.attempts.some(a=>a.text==='corrected wording'),'Stable attempt ID preserves correction versions');
 const independent=await p.evaluate(()=>{
  const task=CourseApp.data.courses.find(c=>c.id==='CS102').units[3].exercise_path,s=CourseApp.getState();
  s.submissions[task]={id:'later-independent',text:'new independent attempt',mode:'independent',at:'2026-10-29T04:00:00Z',attempts:[{id:'earlier-assisted',text:'earlier assisted attempt',mode:'assisted',at:'2026-10-28T04:00:00Z'}]};
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state:s}));return CourseApp.getState().submissions[task];
 });
 assert(independent.mode==='independent','Different older assisted attempt does not relabel a later independent declaration');
 const conservativeSummary=await p.evaluate(()=>{
  const task=CourseApp.data.courses.find(c=>c.id==='CS102').units[6].exercise_path,s=CourseApp.getState();
  s.submissions[task]={id:'same-attempt-revised',text:'latest raw independent declaration',mode:'independent',at:'2026-10-29T05:00:00Z',attempts:[{id:'same-attempt-revised',text:'earlier raw assisted declaration',mode:'assisted',at:'2026-10-28T05:00:00Z'}]};
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state:s}));
  const before=CourseApp.getState().submissions[task],backup={format:'cs-merged-backup',state:CourseApp.getState()};
  CourseApp.mergeImport(CourseApp.importValid(backup));CourseApp.mergeImport(CourseApp.importValid(backup));
  return {before,after:CourseApp.getState().submissions[task]};
 });
 assert(conservativeSummary.before.mode==='assisted'&&conservativeSummary.after.attempts.length===2&&conservativeSummary.after.attempts.filter(a=>a.mode==='assisted').every(a=>a.text==='earlier raw assisted declaration'),'Conservative summary is not reimported as an invented raw declaration');
 const invalid=await p.evaluate(()=>{
  const before=JSON.stringify(CourseApp.getState()),s=CourseApp.getState(),task=Object.keys(s.submissions)[0];
  const results=[];for(const bad of [42,[{text:'bad',mode:'invented',at:'not-a-date'}]]){const copy=structuredClone(s);copy.submissions[task].attempts=bad;try{CourseApp.importValid({format:'cs-merged-backup',state:copy});results.push(false);}catch{results.push(true);}}
  const copy=structuredClone(s);copy.reviews['CS102-U01']={due:'2026-02-30'};try{CourseApp.importValid({format:'cs-merged-backup',state:copy});results.push(false);}catch{results.push(true);}
  return {results,unchanged:JSON.stringify(CourseApp.getState())===before};
 });
 assert(invalid.results.every(Boolean)&&invalid.unchanged,'Invalid history and calendar dates rejected without state mutation');
 await go('#lesson/CS102-U05');await p.locator('[data-action="review"]').click();
 const stale=await p.evaluate(()=>({format:'cs-merged-backup',state:CourseApp.getState()}));
 await go('#records');await p.locator('[data-action="review-done"][data-id="CS102-U05"]').click();
 const recall=await p.evaluate(()=>CourseApp.getState());report.recall_completion=recall.reviewHistory.at(-1);
 assert(recall.reviewHistory.some(e=>e.unit==='CS102-U05'&&e.type==='recall'&&e.completed_at),'Recall completion time and type preserved');
 assert(recall.reviews['CS102-U05'].type==='delayed','Recall schedules a distinct delayed check');
 const daygap=await p.evaluate(()=>{const s=CourseApp.getState(),e=s.reviewHistory.at(-1);const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date(e.completed_at));return (Date.parse(s.reviews['CS102-U05'].due)-Date.parse(day))/86400000;});
 assert(daygap===7,'Delayed check is seven days after recalled completion',daygap);
 await go('#lesson/CS102-U05?tab=exercise');await p.locator('#answer-text').fill('界面验收用D1作答，不代表真实学习成绩。');await p.locator('[data-action="submit"]').click();
 await go('#records');await p.locator('[data-action="review-done"][data-id="CS102-U05"]').click();
 const done=await p.evaluate(()=>CourseApp.getState());report.delayed_completion=done.reviewHistory.at(-1);
 assert(!done.reviews['CS102-U05']&&done.reviewHistory.filter(e=>e.unit==='CS102-U05').length===2,'Delayed completion leaves history after queue removal');
 assert(done.reviewHistory.at(-1).submission?.attempt_id&&done.reviewHistory.at(-1).result==='self_reported_completion','Related new submission linked without claiming a passing score');
 await p.evaluate(backup=>CourseApp.mergeImport(CourseApp.importValid(backup)),stale);
 assert(!(await p.evaluate(()=>CourseApp.getState())).reviews['CS102-U05'],'Old backup cannot revive a completed review');
 const legacy=await p.evaluate(()=>{const s=CourseApp.getState();delete s.reviewHistory;s.reviews['CS102-U06']={due:'2026-10-31',created:'2026-10-30T00:00:00Z'};CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state:s}));return {format:'cs-merged-backup',state:s};});
 await go('#records');await p.locator('[data-action="review-done"][data-id="CS102-U06"]').click();
 await p.evaluate(backup=>CourseApp.mergeImport(CourseApp.importValid(backup)),legacy);
 assert((await p.evaluate(()=>CourseApp.getState())).reviews['CS102-U06'].type==='delayed','Legacy review without ID is recognized as completed after import');
 const historyBefore=(await p.evaluate(()=>CourseApp.getState())).reviewHistory.length;
 await p.evaluate(backup=>CourseApp.mergeImport(CourseApp.importValid(backup)),legacy);
 assert((await p.evaluate(()=>CourseApp.getState())).reviewHistory.length===historyBefore,'Review history import is idempotent');
 await go('#records');const download=p.waitForEvent('download');await p.locator('[data-action="export"]').click();const file=await download;await file.saveAs(path.join(out,'isolated-backup.json'));
 const exported=JSON.parse(await fs.readFile(path.join(out,'isolated-backup.json'),'utf8'));
 assert(exported.state.reviewHistory.length===historyBefore&&exported.state.submissions[merged.path].mode==='assisted','JSON export carries history and conservative assisted status');
 await p.reload();await p.waitForFunction(()=>window.CourseApp);
 assert((await p.evaluate(()=>CourseApp.getState())).reviewHistory.length===historyBefore,'Completion history survives reload');
 const changedTask=await p.evaluate(()=>{
  const u=CourseApp.data.courses.find(c=>c.id==='AI401').units.find(u=>u.id==='AI401-U03'),s=CourseApp.getState();
  s.submissions[u.exercise_path]={text:'旧版题面解答',mode:'independent',at:'2026-10-29T05:00:00Z'};s.drafts[u.exercise_path]='旧版草稿保留';s.referenceSeen[u.exercise_path]='2026-10-29T06:00:00Z';s.referenceSeen[u.answer_path]='2026-10-29T06:00:00Z';
  CourseApp.mergeImport(CourseApp.importValid({format:'cs-merged-backup',state:s}));return u.exercise_path;
 });
 await go('#lesson/AI401-U03?tab=answer');assert(await p.locator('.locked').count()===1,'Legacy submission/reference cannot unlock changed assessment');
 await go('#lesson/AI401-U03?tab=exercise');assert((await p.locator('#answer-text').inputValue()).includes('旧版草稿'),'Old draft preserved when assessment changes');
 assert((await p.locator('.notebook').innerText()).includes('题面已修订'),'Changed assessment identifies old evidence');
 await p.locator('#answer-text').fill('修订题独立作答（界面验收模拟数据）。');await p.locator('[data-action="submit"]').click();
 const revised=(await p.evaluate(()=>CourseApp.getState())).submissions[changedTask];
 assert(revised.task_revision==='2026-10-30-r1'&&revised.mode==='independent','New attempt binds to revised task; old different reference does not contaminate it');
 assert(revised.attempts.some(a=>a.text==='旧版题面解答'),'Old attempt remains in evidence history');
 await go('#lesson/AI401-U03?tab=answer');assert(await p.locator('.locked').count()===0,'New submission unlocks matching new answer');
 await go('#lesson/AI401-U03?tab=exercise');await p.locator('[data-action="submit"]').click();assert((await p.evaluate(()=>CourseApp.getState())).submissions[changedTask].mode==='assisted','Reading current answer taints later current-revision declaration');
 await go('#lesson/CS303-U02');assert((await p.locator('#reading').innerText()).includes('仍先弹G并返回5')&&(await p.locator('#reading').innerText()).includes('返回5而错过2'),'Corrected old and new A* examples present');
 await go('#lesson/CS303-U01?tab=exercise');assert((await p.locator('#reading').innerText()).includes('本题不要求搜索算法'),'U01 fixed modeling scope');
 await go('#records');await p.screenshot({path:path.join(out,'records-evidence-1440.png'),fullPage:false});
 await p.setViewportSize({width:320,height:844});await p.screenshot({path:path.join(out,'records-evidence-320.png'),fullPage:false});
 const widths=await p.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert(widths.width<=widths.viewport,'New records page fits 320px',widths);
 assert(report.errors.length===0,'No JavaScript errors',report.errors);assert(report.requests.length===0,'No external resource requests');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;console.error(error.message);}finally{await browser.close();await fs.writeFile(path.join(out,'revision-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,failures:report.checks.filter(c=>!c.pass),errors:report.errors}));if(report.status!=='PASS')process.exitCode=1;}
