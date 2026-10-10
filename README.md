# ORF Lab

Open `index.html` in a browser. The lab works offline. The two gene choices are copied from the supplied FASTA files into `examples.js` so the page also works when opened directly as a local file.

## What it does

- Scans all three frames of the entered DNA and its reverse complement using the standard genetic code.
- In **AUG to stop** mode, reports each ATG (AUG in RNA) that reaches an in-frame stop, including nested starts.
- In **sense run to stop** mode, reports each uninterrupted run of sense codons from the frame boundary or previous stop through the next stop.
- Requires a terminating stop; incomplete runs at the end of the supplied sequence are omitted.
- Displays coordinates as inclusive, 1-based positions in the entered strand. The arrows for reverse-strand ORFs point left; the codon panel reads their reverse complement 5′ to 3′.
- Applies the minimum amino-acid filter to the translated sense codons, excluding the stop.
- Shows genomic DNA without exon splicing. The *A. lyrata* aroA choice therefore cannot by itself identify the mature protein.

## Sources

- `../The rest of BIS 101 material/aroA_+_NC_000913.3[958619..960287].fa`
- `../a-lyrata_epsps_gene.fa`

Run `node test_logic.cjs` to check frame scanning, coordinates, nested starts, FASTA parsing, and translation.
