// Sends a scanned QR code to icel.dk (Alharari Skole) and turns the answer
// into one of a fixed set of results the screens know how to show.
//
// Security: the address is fixed here. The scanner never posts to an address
// that comes out of a QR code, so a foreign QR code cannot make it hand its
// key to another server. The key stays in the main process; the renderer
// never sees it.

const DEFAULT_ENDPOINT = 'https://icel.dk/wp-json/alharariskole/v1/scan'
const TIMEOUT_MS = 8000
const STUDENT_CODE = /^ALHARARI-[0-9A-F]{32}$/
const DEVICE_KEY = /^[0-9a-f]{64}$/

// The codes are the ones icel.dk answers with, plus three the device sets itself.
export type ScanErrorCode =
  | 'gammel_kode' // an old TaskAPM image
  | 'ugyldig_kode' // not an Alharari code at all
  | 'ukendt_elev'
  | 'elev_pause'
  | 'ingen_klasse'
  | 'ingen_undervisning' // not a school day for the pupil's class
  | 'ukendt_apparat'
  | 'ingen_noegle' // no device key stored
  | 'for_mange'
  | 'ingen_forbindelse' // network down or timed out
  | 'serverfejl'

export type ScanResult =
  | { ok: true; status: 'registreret' | 'allerede'; name: string; time: string; late: boolean }
  | { ok: false; error: ScanErrorCode }

const SERVER_CODES: ScanErrorCode[] = [
  'ugyldig_kode',
  'ukendt_elev',
  'elev_pause',
  'ingen_klasse',
  'ingen_undervisning',
  'ukendt_apparat',
  'for_mange'
]

// ALHARARI_API_URL is only for testing against a local copy of the site.
function endpoint(): string {
  const override = process.env.ALHARARI_API_URL
  return override && override.length > 0 ? override : DEFAULT_ENDPOINT
}

export function isValidDeviceKey(key: string): boolean {
  return DEVICE_KEY.test(key.trim().toLowerCase())
}

export async function registerAttendance(
  data: string,
  deviceKey: string | null
): Promise<ScanResult> {
  const raw = String(data ?? '').trim()

  // The images pupils got from TaskAPM contain a taskapm.com address.
  if (/taskapm\.com/i.test(raw)) {
    console.log('[Attendance] old TaskAPM code scanned')
    return { ok: false, error: 'gammel_kode' }
  }

  const code = raw.toUpperCase()
  if (!STUDENT_CODE.test(code)) {
    console.log('[Attendance] not an Alharari code, length', raw.length)
    return { ok: false, error: 'ugyldig_kode' }
  }

  if (!deviceKey || !isValidDeviceKey(deviceKey)) {
    return { ok: false, error: 'ingen_noegle' }
  }
  const key = deviceKey.trim().toLowerCase()

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        // Same key again: some servers strip the Authorization header.
        'X-Apparat-Noegle': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ kode: code }),
      redirect: 'error',
      signal: abort.signal
    })

    let json: Record<string, unknown> = {}
    try {
      json = (await response.json()) as Record<string, unknown>
    } catch {
      // Not JSON - reported as a server error below.
    }

    if (
      (response.status === 200 || response.status === 201) &&
      (json.status === 'registreret' || json.status === 'allerede') &&
      typeof json.navn === 'string' &&
      json.navn.trim() !== ''
    ) {
      console.log('[Attendance]', json.status, 'HTTP', response.status)
      return {
        ok: true,
        status: json.status,
        name: json.navn,
        time: typeof json.tid === 'string' ? json.tid : '',
        late: json.forsinket === true
      }
    }

    const serverCode = typeof json.code === 'string' ? (json.code as ScanErrorCode) : null
    if (serverCode && SERVER_CODES.includes(serverCode)) {
      console.log('[Attendance] refused:', serverCode, 'HTTP', response.status)
      return { ok: false, error: serverCode }
    }
    if (response.status === 401) return { ok: false, error: 'ukendt_apparat' }
    if (response.status === 429) return { ok: false, error: 'for_mange' }

    console.log('[Attendance] unexpected answer, HTTP', response.status)
    return { ok: false, error: 'serverfejl' }
  } catch (error) {
    console.log('[Attendance] no connection:', error instanceof Error ? error.name : 'Error')
    return { ok: false, error: 'ingen_forbindelse' }
  } finally {
    clearTimeout(timer)
  }
}
