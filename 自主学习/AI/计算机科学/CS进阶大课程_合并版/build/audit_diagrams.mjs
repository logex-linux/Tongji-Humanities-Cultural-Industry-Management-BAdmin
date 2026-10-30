import pw from '<本机用户目录>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const browser=await pw.chromium.launch({headless:true,executablePath:'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'});
try{
 const page=await browser.newPage();await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.waitForFunction(()=>window.CourseApp?.data);
 const report=await page.evaluate(async()=>{
  const graphs=[],errors=[];let rendered=0;
  for(const e of Object.values(CourseApp.data.excerpts)){
   const doc=new DOMParser().parseFromString(e.html,'text/html');
   for(const code of doc.querySelectorAll('code.language-mermaid'))graphs.push({id:e.id,source:code.textContent});
  }
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',flowchart:{htmlLabels:false}});
  for(const [i,g]of graphs.entries()){
   try{await mermaid.render('audit-diagram-'+i,g.source);rendered++;}
   catch(error){errors.push({...g,error:String(error)});document.querySelector('#daudit-diagram-'+i)?.remove();}
  }
  return {total:graphs.length,rendered,errors};
 });
 report.html_sha256=createHash('sha256').update(await fs.readFile(path.join(root,'index.html'))).digest('hex');
 report.status=report.errors.length?'FAIL':'PASS';
 await fs.writeFile(path.join(root,'reports/diagram-audit.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,total:report.total,rendered:report.rendered,errors:report.errors.map(e=>({id:e.id,error:e.error.slice(0,200)}))}));
 if(report.errors.length)process.exitCode=1;
}finally{await browser.close();}
