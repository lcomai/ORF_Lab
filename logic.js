(function (root) {
  'use strict';
  const TABLE = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
  };
  function parseDNA(text) {
    const dna = String(text).split(/\r?\n/).filter(line => !/^\s*>/.test(line)).join('').replace(/\s/g,'').toUpperCase().replace(/U/g,'T');
    if (!dna) throw new Error('Enter a DNA sequence.');
    const bad = dna.match(/[^ACGT]/);
    if (bad) throw new Error(`Only A, C, G, and T are supported. Found “${bad[0]}”.`);
    return dna;
  }
  function reverseComplement(dna) {
    const complement = {A:'T',C:'G',G:'C',T:'A'};
    return Array.from(dna, base => complement[base]).reverse().join('');
  }
  function scanORFs(dna, definition, minimum) {
    const n = dna.length, result = [];
    for (const strand of ['+','-']) {
      const oriented = strand === '+' ? dna : reverseComplement(dna);
      for (let frame = 0; frame < 3; frame++) {
        let runStart = frame, starts = [];
        for (let i = frame; i + 2 < n; i += 3) {
          const triplet = oriented.slice(i,i+3);
          if (definition === 'start' && triplet === 'ATG') starts.push(i);
          if (TABLE[triplet] !== '*') continue;
          const candidates = definition === 'start' ? starts : [runStart];
          for (const start of candidates) {
            const aminoAcids = (i-start)/3;
            if (aminoAcids < minimum) continue;
            const low = strand === '+' ? start : n-(i+3);
            const high = strand === '+' ? i+3 : n-start;
            result.push({id:`${strand}${frame+1}:${start}:${i}`,strand,frame:frame+1,start,stop:i,low,high,aminoAcids,oriented});
          }
          starts = [];
          runStart = i+3;
        }
      }
    }
    return result.sort((a,b)=>a.low-b.low || b.aminoAcids-a.aminoAcids || a.frame-b.frame);
  }
  function codonsFor(orf) {
    const codons=[];
    for(let i=orf.start;i<=orf.stop;i+=3){const dna=orf.oriented.slice(i,i+3);codons.push({dna,aa:TABLE[dna],index:codons.length+1});}
    return codons;
  }
  root.ORF_LOGIC={TABLE,parseDNA,reverseComplement,scanORFs,codonsFor};
})(typeof module !== 'undefined' && module.exports ? module.exports : window);
