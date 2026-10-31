// Tornado and sensitivity chart maker: three explicit statistics and a pure SVG renderer. MIT licence. No employer data.
// Each result names its statistic; the chart prints that name, so a reader always knows what the bars measure.
export const VERSION='1.0.0'
export const LIMITS={inputs:50,rows:100000,shown:15,nameLength:60}
export const STATISTICS={
 oat:{name:'One-at-a-time swing',explain:'Each input is moved from its low to its high value while every other input stays at base. The bar spans the two outputs. Interactions and correlations are ignored.'},
 spearman:{name:'Spearman rank correlation',explain:'Correlation between the ranks of each input and the ranks of the output across simulation iterations (ties share the average rank). Ranges from −1 to +1; it shows direction and consistency, not size of effect.'},
 src:{name:'Standardised regression coefficient',explain:'Coefficients of a linear regression of the output on all inputs, each scaled to standard deviations. Reliable only when the regression explains most of the output variance (high R²).'},
}

const fail=m=>{throw Error(m)}
const finite=(v,m)=>Number.isFinite(v)?v:fail(m)
const checkName=n=>typeof n==='string'&&n.trim()&&n.length<=LIMITS.nameLength?n.trim():fail(`Input names must be text of 1–${LIMITS.nameLength} characters.`)
const byMagnitude=(key)=>(a,b)=>Math.abs(b[key])-Math.abs(a[key])||a.name.localeCompare(b.name,'en')

// ---------- one-at-a-time ----------
// Either outputs already computed for each input (lowOutput / highOutput), or a sum / product model of input values.
/** @param {{output?:string,units?:string,base?:number,model?:string,inputs:Array<{name:string,low?:number,base?:number,high?:number,lowOutput?:number,highOutput?:number}>}} spec */
export function oneAtATime({output='Output',units='',base,model,inputs}={}){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>LIMITS.inputs)fail(`Give 1–${LIMITS.inputs} inputs.`)
 let rows,baseOut
 if(model){
  if(!['sum','product'].includes(model))fail('Model must be sum or product.')
  const items=inputs.map(i=>({name:checkName(i.name),low:finite(i.low,`${i.name}: low must be a number.`),base:finite(i.base,`${i.name}: base must be a number.`),high:finite(i.high,`${i.name}: high must be a number.`)}))
  const calc=vals=>model==='sum'?vals.reduce((s,v)=>s+v,0):vals.reduce((s,v)=>s*v,1)
  baseOut=calc(items.map(i=>i.base))
  rows=items.map((it,k)=>{const at=v=>calc(items.map((x,j)=>j===k?v:x.base));return {name:it.name,inputLow:it.low,inputHigh:it.high,low:at(it.low),high:at(it.high)}})
 }else{
  baseOut=finite(base,'Base output must be a number.')
  rows=inputs.map(i=>({name:checkName(i.name),low:finite(i.lowOutput,`${i.name}: output at low must be a number.`),high:finite(i.highOutput,`${i.name}: output at high must be a number.`)}))
 }
 if(new Set(rows.map(r=>r.name)).size!==rows.length)fail('Input names must be unique.')
 const values=rows.map(r=>({...r,swing:Math.abs(r.high-r.low)})).sort(byMagnitude('swing'))
 return {statistic:'oat',label:`${STATISTICS.oat.name} of ${output}${units?` (${units})`:''}`,output,units,base:baseOut,values,
  notes:['Each bar moves one input at a time; the others stay at base.','Bars do not add up to the total range when inputs interact or are correlated.']}
}

// ---------- sample table ----------
export function parseCSV(text){
 if(typeof text!=='string'||!text.trim())fail('Paste or upload a table with a header row.')
 const lines=text.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim())
 const split=l=>{const out=[];let cur='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'&&l[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=false;else cur+=ch}else if(ch==='"')q=true;else if(ch===','){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out.map(s=>s.trim())}
 const columns=split(lines[0])
 if(columns.length<2)fail('The table needs at least one input column and one output column.')
 if(columns.length>LIMITS.inputs+1)fail(`At most ${LIMITS.inputs} input columns.`)
 columns.forEach(checkName)
 if(new Set(columns).size!==columns.length)fail('Column names must be unique.')
 if(lines.length-1>LIMITS.rows)fail(`At most ${LIMITS.rows.toLocaleString('en')} rows.`)
 const rows=lines.slice(1).map((l,r)=>{const cells=split(l);if(cells.length!==columns.length)fail(`Row ${r+2} has ${cells.length} cells; the header has ${columns.length}.`);return cells.map((c,k)=>{const v=c===''?NaN:Number(c);return Number.isFinite(v)?v:fail(`Row ${r+2}, column ${columns[k]}: "${c.slice(0,20)}" is not a number.`)})})
 return {columns,rows}
}

function columnsOf({columns,rows},output){
 if(!Array.isArray(columns)||!Array.isArray(rows))fail('Give a table with columns and rows.')
 const k=columns.indexOf(output)
 if(k<0)fail(`Output column "${output}" is not in the table.`)
 if(rows.length<3)fail('At least 3 rows are needed.')
 const col=j=>rows.map(r=>r[j])
 const inputs=columns.map((name,j)=>({name,values:col(j)})).filter((_,j)=>j!==k)
 for(const c of [...inputs,{name:output,values:col(k)}])if(c.values.every(v=>v===c.values[0]))fail(`Column ${c.name} does not vary, so its effect cannot be measured.`)
 return {inputs,y:col(k)}
}

export function ranks(values){ // average ranks for ties, 1-based
 const idx=values.map((v,i)=>i).sort((a,b)=>values[a]-values[b]),r=new Array(values.length)
 for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&values[idx[j+1]]===values[idx[i]])j++;const avg=(i+j)/2+1;for(let t=i;t<=j;t++)r[idx[t]]=avg;i=j+1}
 return r
}
export function pearson(x,y){
 const n=x.length,mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n
 let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){const a=x[i]-mx,b=y[i]-my;sxy+=a*b;sxx+=a*a;syy+=b*b}
 return sxy/Math.sqrt(sxx*syy)
}

export function rankCorrelation(table,output){
 const {inputs,y}=columnsOf(table,output),ry=ranks(y)
 const values=inputs.map(c=>({name:c.name,value:pearson(ranks(c.values),ry)})).sort(byMagnitude('value'))
 return {statistic:'spearman',label:`${STATISTICS.spearman.name} with ${output}`,output,n:y.length,values,
  notes:['Measures how consistently the output rises or falls with each input; it is not a share of the range.','Correlated inputs can each show a strong coefficient for the same underlying cause.']}
}

export function regression(table,output){
 const {inputs,y}=columnsOf(table,output),n=y.length,k=inputs.length
 if(n<=k+1)fail(`Regression needs more rows than inputs plus one: ${n} rows for ${k} inputs.`)
 const z=v=>{const m=v.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(n-1));return v.map(x=>(x-m)/sd)}
 const X=inputs.map(c=>z(c.values)),Y=z(y)
 // normal equations on standardised data: (X'X) b = X'Y, solved by Gaussian elimination with partial pivoting
 const A=X.map(a=>[...X.map(b=>a.reduce((s,v,i)=>s+v*b[i],0)),a.reduce((s,v,i)=>s+v*Y[i],0)])
 for(let c=0;c<k;c++){
  let p=c;for(let r=c+1;r<k;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r
  if(Math.abs(A[p][c])<1e-9*n)fail(`Inputs are collinear: ${inputs[c].name} is (almost) a linear combination of other inputs, so their separate effects cannot be estimated. Remove one column or use rank correlation.`)
  ;[A[c],A[p]]=[A[p],A[c]] // swap equations; unknown c stays input c
  for(let r=0;r<k;r++)if(r!==c){const f=A[r][c]/A[c][c];for(let j=c;j<=k;j++)A[r][j]-=f*A[c][j]}
 }
 const beta=new Array(k);for(let c=0;c<k;c++)beta[c]=A[c][k]/A[c][c]
 let sse=0,sst=0;for(let i=0;i<n;i++){const fit=X.reduce((s,x,j)=>s+beta[j]*x[i],0);sse+=(Y[i]-fit)**2;sst+=Y[i]**2}
 const r2=1-sse/sst
 const values=inputs.map((c,j)=>({name:c.name,value:beta[j]})).sort(byMagnitude('value'))
 const notes=['Coefficients assume a linear, additive relationship.','Strongly correlated inputs make coefficients unstable.']
 if(r2<0.7)notes.unshift(`R² is ${r2.toFixed(2)}: the linear fit explains less than 70% of the output variance, so treat these coefficients with caution or use rank correlation.`)
 return {statistic:'src',label:`${STATISTICS.src.name} for ${output} (R² = ${r2.toFixed(2)})`,output,n,r2,values,notes}
}

// ---------- SVG ----------
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const clip=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s
export const THEME={text:'#162b31',muted:'#52656a',line:'#c3c7bd',low:'#557b79',high:'#a84d2c',font:'Arial, Helvetica, sans-serif',background:'#f5f2eb'}
function niceTicks(lo,hi,count=5){
 if(lo===hi){lo-=1;hi+=1}
 const raw=(hi-lo)/count,mag=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw)
 const start=Math.floor(lo/step)*step,ticks=[];for(let v=start;v<=hi+step*1e-9;v+=step)ticks.push(Math.round(v/step)*step)
 if(ticks[ticks.length-1]<hi)ticks.push(ticks[ticks.length-1]+step)
 return ticks
}
const decimals=step=>Math.max(0,Math.min(6,-Math.floor(Math.log10(step)+1e-9)))
const fmt=(v,d)=>{const s=(Math.abs(v)<10**-(d+1)?0:v).toFixed(d);return s.startsWith('-')?'−'+s.slice(1):s}

export function tornadoSVG(result,{title,width=640,shown=LIMITS.shown,theme=THEME,background=true}={}){
 const t={...THEME,...theme},vals=result.values.slice(0,shown),hidden=result.values.length-vals.length
 const oat=result.statistic==='oat',heading=title||result.label
 const left=190,right=width-30,top=58,row=28,bar=18,plotH=vals.length*row,axisY=top+plotH+8
 const lo=oat?Math.min(result.base,...vals.flatMap(v=>[v.low,v.high])):-1,hi=oat?Math.max(result.base,...vals.flatMap(v=>[v.low,v.high])):1
 const ticks=oat?niceTicks(lo,hi):[-1,-0.5,0,0.5,1],d=oat?decimals(ticks[1]-ticks[0]):1
 const x0=ticks[0],x1=ticks[ticks.length-1],X=v=>left+(v-x0)/(x1-x0)*(right-left)
 const ref=oat?result.base:0
 const height=axisY+(hidden?78:60)+(oat?22:0)
 const o=[]
 o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="tc-title tc-desc" font-family="${esc(t.font)}" font-size="13">`)
 o.push(`<title id="tc-title">${esc(heading)}</title>`)
 o.push(`<desc id="tc-desc">${esc(`Tornado chart, ${vals.length} inputs ranked by ${oat?'swing':'absolute value'}. `+vals.map(v=>oat?`${v.name}: ${fmt(v.low,d)} to ${fmt(v.high,d)}`:`${v.name}: ${v.value.toFixed(3)}`).join('; ')+'.')}</desc>`)
 if(background)o.push(`<rect width="${width}" height="${height}" fill="${t.background}"/>`)
 o.push(`<text x="16" y="26" font-size="16" font-weight="bold" fill="${t.text}">${esc(clip(heading,84))}</text>`)
 o.push(`<text x="16" y="45" fill="${t.muted}">${esc(oat?`Base ${fmt(result.base,d)}${result.units?' '+result.units:''}; bars ranked by swing`:`n = ${result.n.toLocaleString('en')} iterations; bars ranked by absolute value`)}</text>`)
 for(const v of ticks)o.push(`<line x1="${X(v).toFixed(1)}" y1="${top-4}" x2="${X(v).toFixed(1)}" y2="${axisY}" stroke="${t.line}" stroke-width="1"/>`,`<text x="${X(v).toFixed(1)}" y="${axisY+16}" text-anchor="middle" fill="${t.muted}">${fmt(v,d)}</text>`)
 o.push(`<line x1="${X(ref).toFixed(1)}" y1="${top-6}" x2="${X(ref).toFixed(1)}" y2="${axisY}" stroke="${t.text}" stroke-width="1.5"/>`)
 vals.forEach((v,i)=>{
  const y=top+i*row+(row-bar)/2,cy=(y+bar/2+4.5).toFixed(1)
  o.push(`<text x="${left-10}" y="${cy}" text-anchor="end" fill="${t.text}">${esc(clip(v.name,26))}</text>`)
  if(oat){
   for(const [val,colour] of [[v.low,t.low],[v.high,t.high]]){const a=Math.min(X(val),X(ref)),w=Math.abs(X(val)-X(ref));if(w>0)o.push(`<rect x="${a.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bar}" fill="${colour}"/>`)}
   o.push(`<text x="${(Math.max(X(v.low),X(v.high),X(ref))+5).toFixed(1)}" y="${cy}" fill="${t.text}">${fmt(v.swing,d)}</text>`)
  }else{
   const a=Math.min(X(v.value),X(0)),w=Math.abs(X(v.value)-X(0)),pos=v.value>=0
   o.push(`<rect x="${a.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${bar}" fill="${pos?t.high:t.low}"/>`)
   o.push(`<text x="${(pos?X(v.value)+5:X(v.value)-5).toFixed(1)}" y="${cy}" text-anchor="${pos?'start':'end'}" fill="${t.text}">${fmt(v.value,2)}</text>`)
  }
 })
 let y=axisY+36
 o.push(`<text x="${((left+right)/2).toFixed(1)}" y="${y}" text-anchor="middle" fill="${t.text}">${esc(clip(result.label,90))}</text>`)
 if(oat){y+=22;o.push(`<rect x="${left}" y="${y-10}" width="12" height="12" fill="${t.low}"/>`,`<text x="${left+18}" y="${y}" fill="${t.text}">Input at low value</text>`,`<rect x="${left+170}" y="${y-10}" width="12" height="12" fill="${t.high}"/>`,`<text x="${left+188}" y="${y}" fill="${t.text}">Input at high value</text>`)}
 if(hidden){y+=20;o.push(`<text x="16" y="${y}" fill="${t.muted}">${hidden} smaller input${hidden>1?'s':''} not shown.</text>`)}
 o.push('</svg>')
 return o.join('\n')+'\n'
}

// ---------- deterministic example data ----------
// Same generator as the site's other tools; normal variates by Box–Muller.
export function seededRandom(seed=42){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return(state+.5)/4294967296}}
export function linearExample(n=2000,seed=42){
 const rand=seededRandom(seed),normal=()=>Math.sqrt(-2*Math.log(rand()))*Math.cos(2*Math.PI*rand())
 const r6=v=>Math.round(v*1e6)/1e6
 const rows=Array.from({length:n},()=>{const x1=r6(normal()),x2=r6(normal()),x3=r6(normal()),e=r6(normal());return [x1,x2,x3,r6(3*x1+2*x2+x3+e)]})
 return {columns:['Productivity','Steel price','Weather days','Total cost'],rows}
}
export const tableToCSV=({columns,rows})=>[columns.join(','),...rows.map(r=>r.join(','))].join('\n')+'\n'
