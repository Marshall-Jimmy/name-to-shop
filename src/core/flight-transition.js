export function flightAmplitudeAt(from, to, progress) {
  const p = Math.max(0, Math.min(1, progress))
  return from + (to - from) * p
}
