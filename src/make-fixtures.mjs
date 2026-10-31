// Writes examples/<name>.expected.json and .expected.svg (and the generated CSV) from examples/<name>.input.json. MIT licence.
// Run after an intentional change: node src/make-fixtures.mjs. Tests check results and SVG bytes still match;
// tests/independent/verify.py checks the numbers with a separate implementation.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {oneAtATime,rankCorrelation,regression,parseCSV,tornadoSVG,linearExample,tableToCSV,VERSION} from './sensitivity.mjs'

export const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','examples')
export const tableFor=input=>input.csv?parseCSV(fs.readFileSync(path.join(dir,input.csv),'utf8')):input.table
export function resultFor(input){
 if(input.statistic==='oat')return oneAtATime(input.spec)
 const table=tableFor(input)
 return input.statistic==='spearman'?rankCorrelation(table,input.output):regression(table,input.output)
}
export function expectedFor(input){
 try{return {fixture:input.fixture,version:VERSION,result:resultFor(input)}}
 catch(e){return {fixture:input.fixture,version:VERSION,error:e.message}}
}
export const inputs=()=>fs.readdirSync(dir).filter(f=>f.endsWith('.input.json')).sort().map(f=>({file:f,input:JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))}))
export const outPath=(f,ext)=>path.join(dir,f.replace('.input.json',ext))

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const g=linearExample(2000,42)
 fs.writeFileSync(path.join(dir,'linear-known.csv'),tableToCSV(g),'utf8')
 for(const {file,input} of inputs()){
  const e=expectedFor(input)
  fs.writeFileSync(outPath(file,'.expected.json'),JSON.stringify(e,null,1)+'\n','utf8')
  if(e.result)fs.writeFileSync(outPath(file,'.expected.svg'),tornadoSVG(e.result),'utf8')
 }
 console.log('Fixtures written to',dir)
}
