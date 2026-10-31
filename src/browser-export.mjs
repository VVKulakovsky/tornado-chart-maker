// Browser-only download helpers: text files, SVG and PNG made from an SVG string. MIT licence. Nothing is uploaded.
export function downloadBlob(name,blob){
 const url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()
 setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export const downloadText=(name,text,type='text/plain')=>downloadBlob(name,new Blob([text],{type:type+';charset=utf-8'}))
export const downloadSVG=(name,svg)=>downloadText(name,svg,'image/svg+xml')

// Draws the SVG on a canvas at `scale` times its size and returns a PNG Blob.
export function svgToPng(svg,scale=2){
 return new Promise((resolve,reject)=>{
  const m=/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg)
  if(!m)return reject(Error('Chart has no viewBox.'))
  const w=Number(m[1]),h=Number(m[2]),img=new Image()
  img.onload=()=>{
   const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale)
   const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.drawImage(img,0,0,w,h)
   c.toBlob(b=>b?resolve(b):reject(Error('PNG export failed.')),'image/png')
  }
  img.onerror=()=>reject(Error('The chart could not be drawn for PNG export.'))
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
 })
}
export async function downloadPNG(name,svg,scale=2){downloadBlob(name,await svgToPng(svg,scale))}
