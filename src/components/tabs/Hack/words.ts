// Word source for the HACK minigame.
//
// This used to fetch BOTH a 274k-word full dictionary (2.74 MB) and a 3.7k
// curated allowlist, then intersected them — which resolves to exactly the
// curated list. 99% of that download was discarded. The full dictionary is
// gone; the curated list is the single source.
//
// To add words, append one lowercase word per line to
// `src/assets/dictionary/common.txt`. Letters only, 4-12 characters.
//
// For a Spanish word list, drop a `common-es.txt` next to it and add a second
// import below — the buckets are keyed by length, so mixing languages works
// without any other change.
import commonUrl from '../../../assets/dictionary/common.txt?url'

export const MIN_WORD_LEN = 4
export const MAX_WORD_LEN = 12

export type WordBuckets = ReadonlyMap<number, readonly string[]>

let cached: WordBuckets | null = null
let pending: Promise<WordBuckets> | null = null

function bucketise(text: string): Map<number, string[]> {
  const buckets = new Map<number, string[]>()

  for (const raw of text.split('\n')) {
    const word = raw.trim().toLowerCase()
    if (word.length < MIN_WORD_LEN || word.length > MAX_WORD_LEN) continue
    if (!/^[a-z]+$/.test(word)) continue

    const upper = word.toUpperCase()
    const bucket = buckets.get(word.length)
    if (bucket) {
      if (!bucket.includes(upper)) bucket.push(upper)
    } else {
      buckets.set(word.length, [upper])
    }
  }

  return buckets
}

function build(): Promise<WordBuckets> {
  return fetch(commonUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`dictionary ${response.status}`)
      return response.text()
    })
    .then(bucketise)
}

/** Synchronous access to the already-loaded dictionary, or null. */
export function getBucketsSync(): WordBuckets | null {
  return cached
}

/** Loads once per page load and caches the length-indexed word buckets. */
export function loadDictionary(): Promise<WordBuckets> {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = build()
      .then((buckets) => {
        cached = buckets
        return buckets
      })
      .finally(() => {
        pending = null
      })
  }
  return pending
}
