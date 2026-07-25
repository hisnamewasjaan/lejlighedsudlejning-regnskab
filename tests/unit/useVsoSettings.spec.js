import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { nulstilDatabase, ventPaa } from './setup/testDb'

let db
let useVsoSettings

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
  ;({ useVsoSettings } = await import('@/composables/useVsoSettings'))
})

describe('useVsoSettings', () => {
  it('returnerer null når intet ejendomId er givet', async () => {
    const { settings, loading } = useVsoSettings(null, 2026)
    await ventPaa(() => !loading.value)
    expect(settings.value).toBeNull()
  })

  it('foreslår fornuftige standardværdier når der ikke findes indstillinger for ejendom+år endnu', async () => {
    const { settings, loading } = useVsoSettings(1, 2026)
    await ventPaa(() => !loading.value)

    expect(settings.value).toMatchObject({
      ejendomId: 1,
      aar: 2026,
      kapitalafkastsats: 0.02,
      rentekorrektionssats: 0.05,
      opsparValg: 'haev',
    })
    expect(settings.value.id).toBeUndefined()
  })

  it('indlæser eksisterende indstillinger for det specifikke ejendomId+år, ikke andre år', async () => {
    await db.vsoSettings.bulkAdd([
      { ejendomId: 1, aar: 2025, kapitalafkastsats: 0.03, banksaldo: 1000 },
      { ejendomId: 1, aar: 2026, kapitalafkastsats: 0.04, banksaldo: 2000 },
    ])

    const { settings, loading } = useVsoSettings(1, 2026)
    await ventPaa(() => !loading.value)

    expect(settings.value).toMatchObject({ aar: 2026, kapitalafkastsats: 0.04, banksaldo: 2000 })
  })

  it('opretter en ny række ved første save, når ingen fandtes', async () => {
    const { settings, loading, save } = useVsoSettings(1, 2026)
    await ventPaa(() => !loading.value)

    await save({ banksaldo: 5000 })

    expect(settings.value).toMatchObject({ ejendomId: 1, aar: 2026, banksaldo: 5000 })
    expect(await db.vsoSettings.count()).toBe(1)
  })

  it('opdaterer den eksisterende række ved efterfølgende saves, i stedet for at duplikere', async () => {
    const { loading, save } = useVsoSettings(1, 2026)
    await ventPaa(() => !loading.value)

    await save({ banksaldo: 5000 })
    await save({ banksaldo: 6000 })

    expect(await db.vsoSettings.count()).toBe(1)
    expect((await db.vsoSettings.toArray())[0].banksaldo).toBe(6000)
  })

  it('ignorerer save uden ejendomId', async () => {
    const { loading, save } = useVsoSettings(null, 2026)
    await ventPaa(() => !loading.value)

    await save({ banksaldo: 5000 })

    expect(await db.vsoSettings.count()).toBe(0)
  })

  it('genindlæser reaktivt når året skifter', async () => {
    await db.vsoSettings.add({ ejendomId: 1, aar: 2025, banksaldo: 1000 })
    const aar = ref(2025)

    const { settings, loading } = useVsoSettings(1, aar)
    await ventPaa(() => !loading.value)
    expect(settings.value.banksaldo).toBe(1000)

    aar.value = 2026
    await ventPaa(() => settings.value.aar === 2026)
    expect(settings.value.id).toBeUndefined()
  })
})
