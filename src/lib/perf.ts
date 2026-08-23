const DEFAULT_TIER: DeviceTier = {
  lowEnd: false,
  coarsePointer: false,
  reducedMotion: false,
}

export type DeviceTier = {
  lowEnd: boolean
  coarsePointer: boolean
  reducedMotion: boolean
}

function detect(): DeviceTier {
  if (typeof window === 'undefined') return DEFAULT_TIER

  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const reducedMotion = !window.matchMedia('(prefers-reduced-motion: no-preference)').matches

  const lowEnd = cores <= 4 || memory <= 4 || reducedMotion

  return { lowEnd, coarsePointer, reducedMotion }
}

let cached: DeviceTier | null = null

export function getDeviceTier(): DeviceTier {
  if (!cached) cached = detect()
  return cached
}
