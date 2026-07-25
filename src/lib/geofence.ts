/* GPS geofence for check-in. Check-in — which triggers the full capture and the
 * first (arrival) release — is only possible when the cleaner's device is
 * physically within a set radius of the property. The check-in stamps time +
 * coordinates on the job and pairs with the "arrived" photo. */

export interface Coords {
  lat: number
  lng: number
}

const EARTH_M = 6371008.8 // mean Earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance between two coordinates, in metres (haversine). */
export function haversineMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Default geofence radius (metres) — a generous ~150m to allow for GPS drift
 * and large luxury lots while still proving physical presence. */
export const DEFAULT_GEOFENCE_RADIUS_M = 150

export interface GeofenceResult {
  withinFence: boolean
  distanceM: number
  radiusM: number
  accuracyM?: number
}

/**
 * Decide whether a device reading permits check-in. `device.accuracy` (metres,
 * from the Geolocation API) widens the allowed distance so a coarse-but-honest
 * reading isn't rejected, but a wildly inaccurate reading (> 2× radius) is.
 */
export function evaluateGeofence(
  property: Coords,
  device: Coords & { accuracy?: number },
  radiusM: number = DEFAULT_GEOFENCE_RADIUS_M,
): GeofenceResult {
  const distanceM = haversineMeters(property, device)
  const accuracyM = device.accuracy
  const tooImprecise = accuracyM != null && accuracyM > radiusM * 2
  const allowance = accuracyM != null ? Math.min(accuracyM, radiusM) : 0
  const withinFence = !tooImprecise && distanceM <= radiusM + allowance
  return { withinFence, distanceM, radiusM, accuracyM }
}

/** Browser geolocation as a promise (used on the cleaner's device). */
export function getCurrentPosition(
  opts: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
): Promise<Coords & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available on this device'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(err),
      opts,
    )
  })
}
