import { GFF3FeatureLineWithRefs } from '@gmod/gff'
import { Feat } from 'g2p_mapper'

function parseStrand(strand: string | null) {
  if (strand === '+') {
    return 1
  } else if (strand === '-') {
    return -1
  } else {
    return 0
  }
}
function processAttributes(dataAttributes: Record<string, unknown>) {
  const defaultFields = new Set([
    'start',
    'end',
    'seq_id',
    'score',
    'type',
    'source',
    'phase',
    'strand',
  ])
  const res = {} as Record<string, unknown>
  for (const a of Object.keys(dataAttributes)) {
    let b = a.toLowerCase()
    if (defaultFields.has(b)) {
      // add "suffix" to tag name if it already exists reproduces behavior of
      // NCList
      b += '2'
    }
    if (dataAttributes[a] !== null) {
      const attr = dataAttributes[a]
      res[b] = Array.isArray(attr) && attr.length === 1 ? attr[0] : attr
    }
  }
  return res
}

export function featureData(data: GFF3FeatureLineWithRefs): Feat {
  const {
    child_features,
    score,
    strand,
    seq_id,
    attributes,
    type,
    end,
    start,
    phase,
    ...rest
  } = data
  const attrs = processAttributes(attributes ?? {})
  return {
    ...rest,
    ...attrs,
    start: Number(start) - 1,
    end: Number(end),
    type: String(type),
    strand: parseStrand(strand),
    refName: String(seq_id),
    phase: Number(phase),
    id: String(attrs.id),
    subfeatures: child_features.flatMap(c => c.map(c2 => featureData(c2))),
  }
}
