import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {oneAtATime,rankCorrelation,regression,parseCSV,ranks,tornadoSVG,linearExample,tableToCSV,STATISTICS} from '../src/sensitivity.mjs'
import {inputs,expectedFor,outPath,tableFor,dir} from '../src/make-fixtures.mjs'

const fx=Object.fromEntries(inputs().map(x=>[x.input.fixture,x]))
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`)

test('every example still gives its stored result and byte-identical SVG',()=>{
 for(const {file,input} of Object.values(fx)){
  const e=expectedFor(input)
  assert.deepEqual(e,JSON.parse(fs.readFileSync(outPath(file,'.expected.json'),'utf8')),file)
  if(e.result)assert.equal(tornadoSVG(e.result),fs.readFileSync(outPath(file,'.expected.svg'),'utf8'),file)
 }
})

test('generated example table is reproducible from its seed',()=>{
 assert.equal(tableToCSV(linearExample(2000,42)),fs.readFileSync(path.join(dir,'linear-known.csv'),'utf8'))
})

test('one-at-a-time swings equal the hand-worked values, ranked by swing',()=>{
 const {input}=fx['oat-cost-drivers'],r=oneAtATime(input.spec),h=input.handChecked
 assert.equal(r.base,h.base);assert.deepEqual(r.values.map(v=>v.name),h.order)
 for(const v of r.values)assert.deepEqual([v.low,v.high,v.swing],h.outputs[v.name])
 const given=oneAtATime({output:'NPV',units:'m',base:50,inputs:[{name:'Price',lowOutput:30,highOutput:72},{name:'Opex',lowOutput:58,highOutput:44}]})
 assert.deepEqual(given.values.map(v=>[v.name,v.swing]),[['Price',42],['Opex',14]])
 const prod=oneAtATime({model:'product',inputs:[{name:'Qty',low:9,base:10,high:12},{name:'Rate',low:1.8,base:2,high:2.5}]})
 assert.equal(prod.base,20);assert.deepEqual(prod.values.map(v=>[v.name,v.low,v.high]),[['Rate',18,25],['Qty',18,24]])
})

test('Spearman with ties equals the hand-worked coefficients',()=>{
 const {input}=fx['spearman-hand'],r=rankCorrelation(input.table,'Y')
 for(const v of r.values)close(v.value,input.handChecked[v.name],1e-12)
 assert.deepEqual(r.values.map(v=>v.name),['X2','X1','X3'])
 assert.deepEqual(ranks([3,1,4,1,5,9]),[3,1.5,4,1.5,5,6])
})

test('regression recovers the known linear structure and reports R²',()=>{
 const {input}=fx['linear-known'],r=regression(tableFor(input),'Total cost')
 for(const v of r.values)close(v.value,input.theory[v.name],0.03)
 assert.ok(r.r2>0.9&&r.r2<0.96,String(r.r2));assert.match(r.label,/R² = 0\.9\d\)$/)
 assert.ok(!r.notes.some(n=>n.startsWith('R² is')))
})

test('weak linear fit carries a caution note',()=>{
 const rows=Array.from({length:50},(_,i)=>[i,(i*7919)%13,((i-25)**2)])
 const r=regression({columns:['A','B','Y'],rows},'Y')
 assert.ok(r.r2<0.7);assert.match(r.notes[0],/^R² is 0\.\d\d: .*caution/)
})

test('rejections: collinear inputs, constant columns, too few rows, bad cells',()=>{
 assert.throws(()=>regression(fx['collinear-rejected'].input.table,'Cost'),/collinear: Steel price/)
 assert.throws(()=>rankCorrelation({columns:['A','Y'],rows:[[1,1],[1,2],[1,3]]},'Y'),/Column A does not vary/)
 assert.throws(()=>regression({columns:['A','B','Y'],rows:[[1,2,3],[2,1,4],[3,5,1]]},'Y'),/more rows than inputs plus one/)
 assert.throws(()=>rankCorrelation({columns:['A','Y'],rows:[[1,2],[2,3]]},'Y'),/At least 3 rows/)
 assert.throws(()=>rankCorrelation({columns:['A','Y'],rows:[[1,2],[2,3],[3,1]]},'Z'),/Output column "Z"/)
 assert.throws(()=>parseCSV('A,Y\n1,2\n3,x\n'),/Row 3, column Y: "x" is not a number/)
 assert.throws(()=>parseCSV('A,Y\n1,2,3\n'),/Row 2 has 3 cells/)
 assert.throws(()=>parseCSV('A,A\n1,2\n'),/unique/)
 assert.throws(()=>oneAtATime({model:'mean',inputs:[{name:'a',low:1,base:2,high:3}]}),/sum or product/)
 assert.throws(()=>oneAtATime({base:1,inputs:[{name:'a',lowOutput:NaN,highOutput:2}]}),/a: output at low/)
})

test('CSV parser reads quoted headers and a byte-order mark',()=>{
 const t=parseCSV('﻿"Steel, price",Y\r\n1,2\r\n3,4\r\n')
 assert.deepEqual(t,{columns:['Steel, price','Y'],rows:[[1,2],[3,4]]})
})

test('SVG names the statistic, escapes text and colours by sign',()=>{
 const r=rankCorrelation({columns:['<script>alert(1)</script>','Down','Y & "out"'],rows:[[1,3,1],[2,2,2],[3,1,3],[4,0,5]]},'Y & "out"')
 const svg=tornadoSVG(r)
 assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
 assert.doesNotMatch(svg,/<script/);assert.match(svg,/&lt;script&gt;/)
 assert.match(svg,/Spearman rank correlation with Y &amp; &quot;out&quot;/)
 assert.match(svg,/fill="#a84d2c"\/>/);assert.match(svg,/fill="#557b79"\/>/)
 for(const k of Object.keys(STATISTICS)){
  const res=k==='oat'?oneAtATime(fx['oat-cost-drivers'].input.spec):k==='spearman'?rankCorrelation(fx['spearman-hand'].input.table,'Y'):regression(tableFor(fx['linear-known'].input),'Total cost')
  assert.ok(tornadoSVG(res).includes(STATISTICS[k].name),k)
 }
})

test('long lists show the top 15 and say how many are hidden',()=>{
 const inputs=Array.from({length:20},(_,i)=>({name:'Input '+i,lowOutput:100-i,highOutput:100+i}))
 const svg=tornadoSVG(oneAtATime({base:100,inputs}))
 assert.match(svg,/5 smaller inputs not shown/);assert.equal((svg.match(/<rect x=/g)||[]).length,15*2+2)
})

test('page copy quotes the current fixture results',async()=>{
 const {resourceGuide,cmsRecord}=await import('../src/page/site-kit.mjs')
 const e=n=>JSON.parse(fs.readFileSync(outPath(n+'.input.json','.expected.json'),'utf8')).result
 const r=e('linear-known'),s=e('linear-known-spearman'),f=n=>v=>v.value.toFixed(3)
 const b=resourceGuide.body
 assert.ok(b.includes(`regression gives ${r.values.map(f()).join(', ').replace(/, ([^,]*)$/,' and $1')} with R² = ${r.r2.toFixed(2)}`))
 assert.ok(b.includes(`rank correlation gives ${s.values.map(f()).join(', ').replace(/, ([^,]*)$/,' and $1')}`))
 assert.doesNotMatch(cmsRecord.limitations,/Local tools keep their inputs/)
})
