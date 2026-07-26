<script setup>
import { RUBRIK } from '@/constants/skatRubrikker'
import { formatKr as kr } from '@/utils/format'

defineProps({
  aar: { type: Number, required: true },
  form: { type: Object, required: true },
  property: { type: Object, default: null },
  kapitalafkastgrundlag: { type: Number, required: true },
  kapitalafkast: { type: Number, required: true },
  aaretsDriftsresultat: { type: Number, required: true },
  aaretsRenteindtaegt: { type: Number, required: true },
  aaretsOverskud: { type: Number, required: true },
  opsparetIAar: { type: Number, required: true },
  virksomhedsskat: { type: Number, required: true },
})
</script>

<template>
  <div>
    <h2 class="text-lg font-medium">Beregning for {{ aar }}</h2>
    <p class="mt-1 text-sm text-slate-500">Sådan fremkommer tallene, trin for trin.</p>

    <div class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div>
        <h3 class="text-sm font-medium text-slate-700">Kapitalafkastgrundlag (VSL § 8)</h3>
        <table class="mt-2 w-full text-sm">
          <tbody>
            <tr>
              <td class="py-1 text-slate-500">Anskaffelsessum (fast ejendom)</td>
              <td class="py-1 text-right">{{ kr(property?.anskaffelsespris) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">+ Banksaldo</td>
              <td class="py-1 text-right">{{ kr(form.banksaldo) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Realkreditgæld</td>
              <td class="py-1 text-right">−{{ kr(form.realkreditgaeld) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Skyldigt depositum</td>
              <td class="py-1 text-right">−{{ kr(form.skyldigtDepositum) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Hensat til senere hævning</td>
              <td class="py-1 text-right">−{{ kr(form.beskattetTilRaadighed) }}</td>
            </tr>
            <tr class="border-t border-slate-300 font-medium">
              <td class="py-1">= Kapitalafkastgrundlag</td>
              <td class="py-1 text-right">{{ kr(kapitalafkastgrundlag) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-1 text-xs text-slate-500">
          Ingen fast TastSelv-rubrik – beregningsgrundlag for kapitalafkastet. Alle tal skal være værdier primo året (1.
          januar), jf. VSL § 8.
        </p>
        <details class="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <summary class="cursor-pointer font-medium text-slate-700">
            Sådan beregnes kapitalafkastgrundlaget (VSL § 8, stk. 1)
          </summary>
          <p class="mt-2">Afkastgrundlaget = virksomhedens aktiver minus:</p>
          <ol class="mt-1 list-decimal space-y-1 pl-5">
            <li>Gæld (fx realkreditgæld)</li>
            <li>Beløb afsat efter §§ 4 og 10, stk. 1 ("hensat til senere hævning")</li>
            <li>Indestående på mellemregningskonto (§ 4a) <span class="text-slate-400">– ikke relevant her</span></li>
            <li>Tidligere års beløb efter § 4b, stk. 1 <span class="text-slate-400">– ikke relevant her</span></li>
            <li>
              Beløb overført fra VSO til privatøkonomien med virkning fra årets begyndelse
              <span class="text-slate-400">– ikke relevant her</span>
            </li>
          </ol>
          <p class="mt-2">
            Fast ejendom værdiansættes til den kontante anskaffelsessum, ikke den løbende offentlige ejendomsvurdering.
            Alt opgøres primo året (1. januar), ikke ultimo. Se SKATTEREGLER.md punkt 6 for kilder og udregning.
          </p>
        </details>
      </div>

      <div>
        <h3 class="text-sm font-medium text-slate-700">
          Kapitalafkast (VSL § 7) <span class="font-normal text-slate-500">– rubrik {{ RUBRIK.kapitalafkast }}</span>
        </h3>
        <table class="mt-2 w-full text-sm">
          <tbody>
            <tr>
              <td class="py-1 text-slate-500">Kapitalafkastgrundlag</td>
              <td class="py-1 text-right">{{ kr(kapitalafkastgrundlag) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">× Kapitalafkastsats</td>
              <td class="py-1 text-right">{{ form.kapitalafkastsatsPct }}%</td>
            </tr>
            <tr class="border-t border-slate-300 font-medium">
              <td class="py-1">= Kapitalafkast</td>
              <td class="py-1 text-right">{{ kr(kapitalafkast) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-1 text-xs text-slate-500">Beskattes som kapitalindkomst, ikke personlig indkomst.</p>
      </div>

      <div>
        <h3 class="text-sm font-medium text-slate-700">Årets overskud (VSL § 10)</h3>
        <table class="mt-2 w-full text-sm">
          <tbody>
            <tr>
              <td class="py-1 text-slate-500">
                Driftsresultat <span class="text-xs">(rubrik {{ RUBRIK.overskudVirksomhed }})</span>
              </td>
              <td class="py-1 text-right">{{ kr(aaretsDriftsresultat) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">
                + Renteindtægt i virksomhed <span class="text-xs">(rubrik {{ RUBRIK.renteindtaegtVirksomhed }})</span>
              </td>
              <td class="py-1 text-right">{{ kr(aaretsRenteindtaegt) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">
                − Renteudgift og -bidrag i virksomhed
                <span class="text-xs">(rubrik {{ RUBRIK.renteudgiftVirksomhed }})</span>
              </td>
              <td class="py-1 text-right">−{{ kr(form.realkreditrenterOgBidrag) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Afskrivninger</td>
              <td class="py-1 text-right">−{{ kr(form.afskrivninger) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">
                − Kapitalafkast <span class="text-xs">(rubrik {{ RUBRIK.kapitalafkast }})</span>
              </td>
              <td class="py-1 text-right">−{{ kr(kapitalafkast) }}</td>
            </tr>
            <tr class="border-t border-slate-300 font-medium">
              <td class="py-1">
                = Årets overskud
                <span class="font-normal text-xs text-slate-500"
                  >(rubrik {{ RUBRIK.indkomstTilVirksomhedsbeskatning }})</span
                >
              </td>
              <td class="py-1 text-right">{{ kr(aaretsOverskud) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-1 text-xs text-slate-500">
          Afskrivninger indtastes ovenfor under VSO-stamdata (0 kr., medmindre der er driftsmidler eller aktiverede
          forbedringer – selve bygningen kan ikke afskrives, se SKATTEREGLER.md). Driftsresultatet holder
          renteindtægter/-udgifter uden for sig selv, ligesom i TastSelv – de lægges til/trækkes fra særskilt her, jf.
          vso-tal.md.
        </p>
      </div>
    </div>

    <fieldset class="mt-6">
      <legend class="text-sm font-medium">Skal overskuddet hæves eller opspares?</legend>
      <div class="mt-2 flex gap-4 text-sm">
        <label class="flex items-center gap-2">
          <input v-model="form.opsparValg" type="radio" value="haev" />
          Hæves (beskattes som personlig indkomst)
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.opsparValg" type="radio" value="opspar" />
          Opspares i VSO (22% foreløbig virksomhedsskat)
        </label>
      </div>
    </fieldset>

    <p v-if="form.opsparValg === 'opspar'" class="mt-4 text-sm">
      Foreløbig virksomhedsskat: <span class="font-medium">{{ kr(virksomhedsskat) }}</span> — netto til rådighed for
      fremtidig hævning: <span class="font-medium">{{ kr(opsparetIAar - virksomhedsskat) }}</span>
    </p>
  </div>
</template>
