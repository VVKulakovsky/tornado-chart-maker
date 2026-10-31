'use client'
// Tornado and sensitivity chart maker for the website. MIT licence. Tables are read in this browser tab; nothing is uploaded.
import {useState} from 'react'
import {oneAtATime,rankCorrelation,regression,parseCSV,tornadoSVG,tableToCSV,STATISTICS,VERSION} from '@/lib/tornado-chart-maker/sensitivity.mjs'
import {downloadSVG,downloadPNG} from '@/lib/tornado-chart-maker/browser-export.mjs'
import oatExample from '@/lib/tornado-chart-maker/examples/oat-cost-drivers.input.json'
import tiesExample from '@/lib/tornado-chart-maker/examples/spearman-hand.input.json'

type Stat='oat'|'spearman'|'src'
type OatRow={name:string,low:string,base:string,high:string}
const toNum=(s:string)=>s.trim()===''?NaN:Number(s)
const columnsOf=(text:string):string[]=>{try{return parseCSV(text).columns}catch{return []}}

export function TornadoChartMaker({sampleCSV=''}:{sampleCSV?:string}){
 const [stat,setStat]=useState<Stat>('oat')
 const [output,setOutput]=useState(oatExample.spec.output)
 const [units,setUnits]=useState(oatExample.spec.units)
 const [model,setModel]=useState(oatExample.spec.model)
 const [rows,setRows]=useState<OatRow[]>(()=>oatExample.spec.inputs.map((i:any)=>({name:i.name,low:String(i.low),base:String(i.base),high:String(i.high)})))
 const [csv,setCsv]=useState(()=>sampleCSV||tableToCSV(tiesExample.table))
 const [outCol,setOutCol]=useState(sampleCSV?'':tiesExample.output)
 const [error,setError]=useState('')
 const [result,setResult]=useState<any>(null)
 const [svg,setSvg]=useState('')
 const cols=columnsOf(csv)
 const target=cols.includes(outCol)?outCol:cols.at(-1)||''

 function draw(){
  try{
   const r=stat==='oat'?oneAtATime({output:output.trim()||'Output',units:units.trim(),model,inputs:rows.map(x=>({name:x.name,low:toNum(x.low),base:toNum(x.base),high:toNum(x.high)}))})
    :stat==='spearman'?rankCorrelation(parseCSV(csv),target):regression(parseCSV(csv),target)
   setResult(r);setSvg(tornadoSVG(r));setError('')
  }catch(e:any){setError(e.message);setResult(null);setSvg('')}
 }
 const edit=(i:number,k:keyof OatRow,v:string)=>setRows(r=>r.map((x,j)=>j===i?{...x,[k]:v}:x))
 async function readFile(f?:File){if(!f)return;if(f.size>20e6){setError('File is larger than 20 MB.');return}setCsv(await f.text())}

 return <section className="interactive-tool tornado-maker" aria-labelledby="tornado-title">
  <p className="eyebrow">BROWSER-ONLY / OPEN SOURCE / VERSION {VERSION}</p>
  <h2 id="tornado-title">Tornado and sensitivity chart maker</h2>
  <p>Choose the statistic first; the chart title and axis always name it. All calculations stay in this tab.</p>
  <fieldset><legend>Statistic</legend>{(Object.keys(STATISTICS) as Stat[]).map(k=><label key={k} className="method-option"><input type="radio" name="tornado-stat" checked={stat===k} onChange={()=>{setStat(k);setResult(null);setSvg('');setError('')}}/><span><strong>{STATISTICS[k].name}</strong><span className="small muted"> {STATISTICS[k].explain}</span></span></label>)}</fieldset>
  {stat==='oat'?<div>
   <div className="model-options sim-controls">
    <label>Output name<input maxLength={60} value={output} onChange={e=>setOutput(e.target.value)}/></label>
    <label>Units<input maxLength={20} value={units} onChange={e=>setUnits(e.target.value)}/></label>
    <label>Model<select value={model} onChange={e=>setModel(e.target.value)}><option value="sum">Output = sum of inputs</option><option value="product">Output = product of inputs</option></select></label>
   </div>
   <div className="table-scroll"><table className="sim-table"><thead><tr><th>Input</th><th>Low</th><th>Base</th><th>High</th></tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i}>{(['name','low','base','high'] as const).map(k=><td key={k}><input aria-label={`Input ${i+1} ${k}`} {...(k==='name'?{maxLength:60}:{type:'number',step:'any'})} value={r[k]} onChange={e=>edit(i,k,e.target.value)}/></td>)}</tr>)}</tbody></table></div>
   <div className="actions"><button type="button" className="button button-outline" disabled={rows.length>=50} onClick={()=>setRows(r=>[...r,{name:'Input '+(r.length+1),low:'0',base:'1',high:'2'}])}>Add input</button><button type="button" className="button button-outline" disabled={rows.length<=1} onClick={()=>setRows(r=>r.slice(0,-1))}>Remove last</button></div>
  </div>:<div>
   <p className="small">Paste simulation results: a header row, one column per input and one output column, one row per iteration (numbers only, up to 50 inputs and 100,000 rows). A file you open is read in this tab and not uploaded.</p>
   <div className="model-options sim-controls">
    <label>Open a CSV file<input type="file" accept=".csv,text/csv" onChange={e=>readFile(e.target.files?.[0])}/></label>
    <label>Output column<select value={target} onChange={e=>setOutCol(e.target.value)}>{cols.map(c=><option key={c}>{c}</option>)}</select></label>
   </div>
   <textarea aria-label="Sample table as CSV" spellCheck={false} rows={8} value={csv} onChange={e=>setCsv(e.target.value)}/>
  </div>}
  <div className="actions"><button type="button" className="button" onClick={draw}>Draw tornado chart</button></div>
  {error&&<p className="error" role="alert">{error}</p>}
  {result&&<figure className="tornado-result" aria-live="polite">
   <div dangerouslySetInnerHTML={{__html:svg}}/>
   {result.notes.map((n:string,i:number)=><p key={i} className="small">{n}</p>)}
   <div className="actions"><button type="button" className="button button-outline" onClick={()=>downloadSVG(`tornado-${result.statistic}.svg`,svg)}>Download SVG</button><button type="button" className="button button-outline" onClick={()=>downloadPNG(`tornado-${result.statistic}.png`,svg)}>Download PNG</button></div>
  </figure>}
 </section>
}
