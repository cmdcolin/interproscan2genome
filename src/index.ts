#!/usr/bin/env node
import fs from 'fs'
import gff, { GFF3FeatureLineWithRefs } from '@gmod/gff'
import { Feat, genomeToTranscriptSeqMapping } from 'g2p_mapper'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

// locals
import { featureData } from './parse'

const ret = yargs(hideBin(process.argv))
  .options({
    genomeGFF: {
      type: 'string',
      demandOption: true,
      description: 'input gff',
    },
    interproGFF: {
      type: 'string',
      demandOption: true,
      description: 'interproscan GFF',
    },
  })
  .parseSync()

const args = {
  parseFeatures: true,
  parseComments: false,
  parseDirectives: false,
  parseSequences: false,
  disableDerivesFromReferences: true,
}

;(async function main({
  interproGFF,
  genomeGFF,
}: {
  interproGFF: string
  genomeGFF: string
}) {
  const map1 = {} as Record<string, Feat[]>

  gff.parseStringSync(fs.readFileSync(interproGFF, 'utf8'), args).map(feat => {
    // @ts-expect-error
    const f = featureData(feat[0])
    if (!map1[f.refName]) {
      map1[f.refName] = [] as Feat[]
    }
    map1[f.refName].push(f)
  })

  fs.createReadStream(genomeGFF)
    .pipe(gff.parseStream(args))
    .on('data', (feat: GFF3FeatureLineWithRefs[]) => {
      const f = featureData(feat[0])
      if (f.type === 'mRNA' || f.type === 'transcript') {
        const r = genomeToTranscriptSeqMapping(f)
        const match = map1[f.id]
        match?.forEach(row => {
          const { p2g, refName, strand } = r
          const {
            refName: _k1,
            phase: _k2,
            type: _k3,
            strand: _k4,
            subfeatures: _k5,
            start,
            end,
            ...rest
          } = row
          const s = p2g[Math.floor(start / 3)]!
          const e = p2g[Math.floor(end / 3) - 1]!
          console.log(
            `${refName}\tinterpro\tprotein_domain\t${Math.min(s, e)}\t${Math.max(s, e)}\t.\t${strand}\t.\tID=${f.id};${Object.entries(
              rest,
            )
              .map(([key, val]) => `${key}=${encodeURIComponent(`${val}`)}`)
              .join(';')}`,
          )
        })
      }
    })
})(ret)
