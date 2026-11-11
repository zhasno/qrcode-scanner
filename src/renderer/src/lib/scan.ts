// What the device shows after a scan. Texts are Danish because the pupils read them.

export type ScanErrorCode =
  | 'gammel_kode'
  | 'ugyldig_kode'
  | 'ukendt_elev'
  | 'elev_pause'
  | 'ingen_klasse'
  | 'ingen_undervisning'
  | 'ukendt_apparat'
  | 'ingen_noegle'
  | 'for_mange'
  | 'ingen_forbindelse'
  | 'serverfejl'

export type ScanSuccess = {
  ok: true
  status: 'registreret' | 'allerede'
  name: string
  time: string
  late: boolean
}

export type ScanResult = ScanSuccess | { ok: false; error: ScanErrorCode }

export const ERROR_TEXTS: Record<ScanErrorCode, { title: string; hint: string }> = {
  gammel_kode: {
    title: 'Gammel QR-kode',
    hint: 'Brug det nye billede, du har fået fra skolen.'
  },
  ugyldig_kode: {
    title: 'QR-koden kan ikke bruges',
    hint: 'Det er ikke en kode fra Alharari Skole.'
  },
  ukendt_elev: {
    title: 'Ukendt QR-kode',
    hint: 'Koden findes ikke. Spørg din lærer om et nyt billede.'
  },
  elev_pause: {
    title: 'Du er ikke aktiv',
    hint: 'Spørg din lærer.'
  },
  ingen_klasse: {
    title: 'Du er ikke i en klasse',
    hint: 'Spørg din lærer.'
  },
  ingen_undervisning: {
    title: 'Ingen undervisning i dag',
    hint: 'Din klasse har ikke undervisning i dag.'
  },
  ukendt_apparat: {
    title: 'Apparatet er ikke godkendt',
    hint: 'Apparatets nøgle skal skiftes. Kontakt administrator.'
  },
  ingen_noegle: {
    title: 'Apparatet mangler sin nøgle',
    hint: 'Kontakt administrator.'
  },
  for_mange: {
    title: 'For mange scanninger',
    hint: 'Vent et øjeblik, og prøv igen.'
  },
  ingen_forbindelse: {
    title: 'Ingen forbindelse',
    hint: 'Fremmødet er IKKE registreret. Prøv igen om lidt.'
  },
  serverfejl: {
    title: 'Noget gik galt',
    hint: 'Fremmødet er IKKE registreret. Prøv igen.'
  }
}
