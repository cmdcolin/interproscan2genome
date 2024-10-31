# interproscan2genome

## Install

```bash
npm install -g interproscan2genome
```

## Usage

```bash
interproscan2genome --genomeGFF genes.gff --interproGFF domains.gff > domainsOnTheGenome.gff
```

If you get out of memory error, add the following to add more memory for node.js

```bash
NODE_OPTIONS=--max-old-space-size=8000 interproscan2genome --genomeGFF genes.gff --interproGFF domains.gff > domainsOnTheGenome.gff
```
