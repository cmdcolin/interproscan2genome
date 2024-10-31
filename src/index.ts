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

  await new Promise((resolve, reject) =>
    fs
      .createReadStream(interproGFF)
      .pipe(gff.parseStream(args))
      .on('data', (feat: GFF3FeatureLineWithRefs[]) => {
        const f = featureData(feat[0])
        if (!map1[f.refName]) {
          map1[f.refName] = [] as Feat[]
        }
        map1[f.refName].push(f)
      })
      .on('finish', resolve)
      .on('error', reject),
  )

  fs.createReadStream(genomeGFF)
    .pipe(gff.parseStream(args))
    .on('data', (feat: GFF3FeatureLineWithRefs[]) => {
      const f = featureData(feat[0])
      if (f.type === 'mRNA' || f.type === 'transcript') {
        processTranscript(f, map1)
      } else if (f.type === 'gene') {
        f.subfeatures?.map(transcript => {
          processTranscript(transcript, map1)
        })
      }
    })
})(ret)

function processTranscript(transcript: Feat, map: Record<string, Feat[]>) {
  const r = genomeToTranscriptSeqMapping(transcript)
  const match = map[transcript.id]
  match?.forEach(row => {
    const { p2g, refName, strand } = r
    const {
      refName: _k1,
      phase: _k2,
      type: _k3,
      strand: _k4,
      subfeatures: _k5,
      // @ts-expect-error
      derived_features: _k6,
      id,
      // @ts-expect-error
      name,
      // @ts-expect-error
      target,
      // @ts-expect-error
      source,
      start,
      end,
      ...rest
    } = row
    const s = p2g[Math.floor(start / 3)]!
    const e = p2g[Math.floor(end / 3) - 1]!
    console.log(
      `${refName}\t${source || '.'}\tprotein_domain\t${Math.min(s, e)}\t${Math.max(s, e)}\t.\t${strand}\t.\t${Object.entries(
        { ...rest, ID: id, Name: name, Target: target },
      )
        .filter(f => !!f[1])
        .map(([key, val]) => `${key}=${val}`)
        .join(';')}`,
    )
  })
}
