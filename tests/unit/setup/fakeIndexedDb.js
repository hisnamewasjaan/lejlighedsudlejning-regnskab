// Registreret som en global Vitest setupFile (se vite.config.js), så fake-indexeddb altid er sat
// op, før noget testmodul indlæser 'dexie' - ellers indfanger Dexie et manglende indexedDB-object,
// hvis rækkefølgen af imports i en testfil tilfældigvis indlæser en Dexie-afhængig fil før dette.
import 'fake-indexeddb/auto'
