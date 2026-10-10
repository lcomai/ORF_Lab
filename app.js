(function(){
'use strict';
const $=id=>document.getElementById(id);
const logic=window.ORF_LOGIC,examples=window.ORF_EXAMPLES;
const toy='GGGTTTATGAAACCCGGGTTCGAATAACCTAGG';
const notes={
  toy:'A short teaching example: 6 bases of 5′ flank, an ATG-to-TAA ORF, and 6 bases of 3′ flank. The flanks serve as toy UTRs.',
  bacterial:'Escherichia coli K-12 aroA region from the supplied FASTA. Scan the sequence as provided.',
  eukaryotic:'A. lyrata aroA genomic sequence from the supplied FASTA. Introns are not removed here; a genomic ORF may differ from the spliced protein.',
  random:'Uniform random A/C/G/T bases. A random sequence may have no complete ORF above the chosen length.'
};
const state={source:'toy',dna:'',orfs:[],selected:null,page:0,definition:'start',minimum:5};
function sourceSequence(key){return key==='toy'?toy:examples[key]?.sequence||'';}
function pickSource(key){
  state.source=key;
  document.querySelectorAll('.source').forEach(b=>{const on=b.dataset.source===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('source-note').textContent=notes[key];$('random-controls').hidden=key!=='random';
  if(key==='random')generateRandom();else{$('sequence').value=sourceSequence(key);refresh();}
}
function generateRandom(){
  const n=Number($('random-length').value);
  if(!Number.isInteger(n)||n<12||n>10000){showError('Enter a whole-number length from 12 to 10,000 bases.');return;}
  const bytes=new Uint8Array(n);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);else for(let i=0;i<n;i++)bytes[i]=Math.floor(Math.random()*256);
  $('sequence').value=Array.from(bytes,b=>'ACGT'[b%4]).join('');refresh();
}
function showError(message){$('error').textContent=message;$('error').hidden=false;$('summary').textContent='Analysis unavailable.';$('orf-map').replaceChildren();$('orf-list').replaceChildren();$('sequence-preview').replaceChildren();$('preview-label').textContent='Correct the sequence to see the selected ORF.';$('zoom').hidden=true;$('zoom-empty').hidden=false;}
function refresh(){
  let dna;
  try{dna=logic.parseDNA($('sequence').value);}catch(e){showError(e.message);return;}
  if(dna.length>10000){showError('Use at most 10,000 bases for this lab.');return;}
  const minimum=Number($('minimum').value);
  if(!Number.isInteger(minimum)||minimum<1||minimum>3000){showError('Minimum amino acids must be a whole number from 1 to 3,000.');return;}
  $('error').hidden=true;state.dna=dna;state.minimum=minimum;
  state.definition=document.querySelector('input[name="definition"]:checked').value;
  const former=state.selected;
  state.orfs=logic.scanORFs(dna,state.definition,minimum);
  state.selected=state.orfs.find(o=>o.id===former)?.id||state.orfs.reduce((best,o)=>!best||o.aminoAcids>best.aminoAcids?o:best,null)?.id||null;
  state.page=0;
  $('summary').textContent=`${dna.length.toLocaleString()} bases · ${state.orfs.length} complete ORF${state.orfs.length===1?'':'s'} with at least ${minimum} amino acid${minimum===1?'':'s'}.`;
  renderMap();renderList();renderSequencePreview();renderZoom();
}
function renderSequencePreview(){
  const preview=$('sequence-preview');preview.replaceChildren();
  const selected=state.orfs.find(o=>o.id===state.selected);
  $('preview-label').textContent=selected?`Frame ${selected.strand}${selected.frame}, bases ${selected.low+1}–${selected.high} highlighted on the entered strand`:'No ORF selected';
  let firstHighlight=null;
  for(let start=0;start<state.dna.length;start+=60){
    const end=Math.min(start+60,state.dna.length),row=document.createElement('div');row.className='seq-row';
    const coord=document.createElement('span');coord.className='coord';coord.textContent=String(start+1).padStart(5,' ');row.append(coord);
    if(selected&&selected.low<end&&selected.high>start){
      const a=Math.max(start,selected.low),b=Math.min(end,selected.high);
      row.append(document.createTextNode(state.dna.slice(start,a)));
      const mark=document.createElement('mark');if(selected.strand==='-')mark.className='reverse';mark.textContent=state.dna.slice(a,b);row.append(mark);
      row.append(document.createTextNode(state.dna.slice(b,end)));
      if(!firstHighlight)firstHighlight=mark;
    }else row.append(document.createTextNode(state.dna.slice(start,end)));
    preview.append(row);
  }
  preview.scrollTop=0;
  if(firstHighlight){const top=firstHighlight.getBoundingClientRect().top-preview.getBoundingClientRect().top;preview.scrollTop=Math.max(0,top+preview.scrollTop-28);}
}
function svgNode(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function renderMap(){
  const svg=$('orf-map');svg.replaceChildren();const W=1100,L=75,R=1065,span=R-L,n=state.dna.length;
  const frames=['+1','+2','+3','-1','-2','-3'];let y=34;
  const arrowPath=(x1,x2,top,reverse)=>{const h=11,w=Math.max(4,x2-x1),head=Math.min(10,w*.42);return reverse?`M ${x2} ${top} L ${x1+head} ${top} L ${x1} ${top+h/2} L ${x1+head} ${top+h} L ${x2} ${top+h} Z`:`M ${x1} ${top} L ${x2-head} ${top} L ${x2} ${top+h/2} L ${x2-head} ${top+h} L ${x1} ${top+h} Z`;};
  for(const frame of frames){
    const items=state.orfs.filter(o=>`${o.strand}${o.frame}`===frame).sort((a,b)=>a.low-b.low||b.high-a.high);
    const ends=[];const tracks=[];
    for(const o of items){let t=ends.findIndex(end=>end<=o.low);if(t<0){t=ends.length;ends.push(o.high);}else ends[t]=o.high;tracks.push(t);}
    const rowH=Math.max(35,18+ends.length*14);
    const label=svgNode('text',{x:14,y:y+rowH/2+4,class:`map-label ${frame[0]==='-'?'minus':''}`});label.textContent=frame;svg.append(label);
    svg.append(svgNode('line',{x1:L,y1:y+rowH-8,x2:R,y2:y+rowH-8,class:'map-baseline'}));
    items.forEach((o,j)=>{const x1=L+o.low/n*span,x2=L+o.high/n*span;const a=svgNode('path',{d:arrowPath(x1,x2,y+5+tracks[j]*14,o.strand==='-'),class:`map-arrow ${o.strand==='-'?'minus':''} ${o.id===state.selected?'selected':''}`,tabindex:0,role:'button','aria-label':`${frame}, bases ${o.low+1} to ${o.high}, ${o.aminoAcids} amino acids`});a.addEventListener('click',()=>selectORF(o.id));a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectORF(o.id);}});const title=svgNode('title',{});title.textContent=`${frame} · bases ${o.low+1}–${o.high} · ${o.aminoAcids} aa`;a.append(title);svg.append(a);});
    if(!items.length){const empty=svgNode('text',{x:L+8,y:y+18,class:'map-empty'});empty.textContent='No ORFs meet the minimum';svg.append(empty);}
    y+=rowH+3;
  }
  const tickY=y+11;for(let i=0;i<=5;i++){const pos=Math.round(n*i/5),x=L+span*i/5;svg.append(svgNode('line',{x1:x,y1:tickY-5,x2:x,y2:tickY+2,class:'map-tick'}));const tick=svgNode('text',{x,y:tickY+17,'text-anchor':'middle',class:'map-axis'});tick.textContent=(pos||1).toLocaleString();svg.append(tick);}
  const axis=svgNode('text',{x:(L+R)/2,y:tickY+34,'text-anchor':'middle',class:'map-axis'});axis.textContent='Position in entered sequence (bases)';svg.append(axis);
  svg.setAttribute('viewBox',`0 0 ${W} ${tickY+43}`);
}
function renderList(){
  const list=$('orf-list');list.replaceChildren();let items=[...state.orfs];
  if($('sort').value==='length')items.sort((a,b)=>b.aminoAcids-a.aminoAcids||a.low-b.low);
  for(const o of items){const b=document.createElement('button');b.type='button';b.className=`orf-item ${o.strand==='-'?'minus':''} ${o.id===state.selected?'selected':''}`;b.setAttribute('aria-pressed',String(o.id===state.selected));const strong=document.createElement('strong');strong.textContent=`${o.strand}${o.frame}`;b.append(strong,document.createTextNode(`bases ${o.low+1}–${o.high}`));const small=document.createElement('small');small.textContent=`${o.aminoAcids} amino acids · ${o.aminoAcids+1} codons incl. stop`;b.append(small);b.addEventListener('click',()=>selectORF(o.id));list.append(b);}
  if(!items.length)list.textContent='No complete ORFs match these settings. Try a shorter minimum or the other definition.';
}
function selectORF(id){state.selected=id;state.page=0;renderMap();renderList();renderSequencePreview();renderZoom();$('zoom-heading').scrollIntoView({block:'nearest',behavior:'smooth'});}
function category(aa,first,dna){if(aa==='*')return 'stop';if(first&&dna==='ATG')return 'start';if('AVILMFW'.includes(aa))return 'hydrophobic';if('STYNCQ'.includes(aa))return 'polar';if('DEKRH'.includes(aa))return 'charged';return 'special';}
function baseHTML(seq){return [...seq].map(base=>`<span class="base-${base.toLowerCase()}">${base}</span>`).join('');}
function renderZoom(){
  const o=state.orfs.find(o=>o.id===state.selected);$('zoom').hidden=!o;$('zoom-empty').hidden=!!o;if(!o)return;
  const all=logic.codonsFor(o),sense=all.slice(0,-1),pageSize=24,pages=Math.ceil(all.length/pageSize);state.page=Math.min(state.page,pages-1);const start=state.page*pageSize,part=all.slice(start,start+pageSize);
  $('zoom-title').textContent=`Frame ${o.strand}${o.frame} · ${o.aminoAcids} amino acids`;
  $('zoom-meta').textContent=`Entered-sequence bases ${o.low+1}–${o.high} · read ${o.strand==='+'?'left → right':'right → left'} · ${o.aminoAcids+1} codons including stop`;
  $('page-label').textContent=`Codons ${start+1}–${start+part.length} of ${all.length}`;$('prev').disabled=state.page===0;$('next').disabled=state.page>=pages-1;
  const flankLeft=o.oriented.slice(Math.max(0,o.start-12),o.start),flankRight=o.oriented.slice(o.stop+3,o.stop+15);
  $('context').innerHTML=`5′ ${baseHTML(flankLeft)} <mark>${baseHTML(o.oriented.slice(o.start,Math.min(o.stop+3,o.start+24)))}${all.length>8?'…':''}</mark> ${baseHTML(flankRight)} 3′ <span class="note">(ORF start, with up to 12 flanking bases)</span>`;
  const container=$('codons');container.replaceChildren();for(const c of part){const tile=document.createElement('div');tile.className=`codon ${category(c.aa,c.index===1,c.dna)}`;tile.innerHTML=`<span class="index">${c.index}</span><span class="dna">${baseHTML(c.dna)}</span><span class="aa">${c.aa==='*'?'STOP':c.aa}</span>`;tile.setAttribute('aria-label',`Codon ${c.index}, ${c.dna}, ${c.aa==='*'?'stop':c.aa}`);container.append(tile);}
  $('protein').textContent=`Protein, this page: ${part.filter(c=>c.aa!=='*').map(c=>c.aa).join('')||'—'}`;
  $('full-protein').textContent=sense.map(c=>c.aa).join('');
  $('zoom-note').textContent=`Full translated product: ${sense.length} amino acids. The stop codon does not encode an amino acid. ${o.strand==='-'?'The codons above are shown as the 5′→3′ reverse complement.':''}`;
}
document.querySelectorAll('.source').forEach(b=>b.addEventListener('click',()=>pickSource(b.dataset.source)));
$('generate').addEventListener('click',generateRandom);
$('sequence').addEventListener('input',refresh);
$('minimum').addEventListener('input',refresh);
document.querySelectorAll('input[name="definition"]').forEach(r=>r.addEventListener('change',refresh));
$('sort').addEventListener('change',renderList);
$('prev').addEventListener('click',()=>{state.page--;renderZoom();});
$('next').addEventListener('click',()=>{state.page++;renderZoom();});
pickSource('toy');
})();
