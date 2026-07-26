<script setup>
import { RUBRIK } from '@/constants/skatRubrikker'
import { formatKr as kr } from '@/utils/format'

defineProps({
  form: { type: Object, required: true },
  aar: { type: Number, required: true },
  settingsSaved: { type: Boolean, required: true },
  indskudskontoNegativ: { type: Boolean, required: true },
  rentekorrektion: { type: Number, required: true },
  beskattetPrMaaned: { type: Number, required: true },
})

defineEmits(['save'])
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-medium">VSO-stamdata for {{ aar }}</h2>
    <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="$emit('save')">
      <div class="flex flex-col gap-1 text-sm">
        <label for="kapitalafkastsats">Kapitalafkastsats (%)</label>
        <input
          id="kapitalafkastsats"
          v-model.number="form.kapitalafkastsatsPct"
          type="number"
          step="0.1"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Fastsættes af Skattestyrelsen én gang årligt (VSL § 9) – skal ikke hardcodes, slås op og indtastes manuelt
          hvert år. Se
          <a href="https://info.skat.dk/data.aspx?oid=1948937" target="_blank" rel="noopener" class="underline">
            kapitalafkastsatsen på info.skat.dk
          </a>
          (se også SKATTEREGLER.md).
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="rentekorrektionssats">Rentekorrektionssats (%)</label>
        <input
          id="rentekorrektionssats"
          v-model.number="form.rentekorrektionssatsPct"
          type="number"
          step="0.1"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Fastsættes af Skattestyrelsen én gang årligt (VSL § 11) – bruges kun til beregningen hvis indskudskontoen er
          negativ. Se
          <a href="https://info.skat.dk/data.aspx?oid=1948910" target="_blank" rel="noopener" class="underline">
            rentekorrektionssatsen på info.skat.dk
          </a>
          (se også SKATTEREGLER.md).
        </span>
      </div>
      <label class="flex flex-col gap-1 text-sm">
        Indskudskonto (kr.)
        <input v-model.number="form.indskudskonto" type="number" class="rounded border border-slate-300 px-3 py-2" />
        <span class="text-xs text-slate-500"
          >TastSelv → rubrik {{ RUBRIK.indskudskontoUltimo }} (Indskudskonto ultimo).</span
        >
      </label>
      <div class="flex flex-col gap-1 text-sm">
        <label for="opsparet-overskud">Opsparet overskud fra tidligere år, bruttobeløb (kr.)</label>
        <input
          id="opsparet-overskud"
          v-model.number="form.opsparetOverskud"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Har ikke et fast rubriknummer – find det under TastSelv → "Fremført til indkomståret → Opsparet overskud i
          virksomhed" (før den betalte virksomhedsskat er trukket fra).
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="banksaldo">Banksaldo primo året (kr.)</label>
        <input
          id="banksaldo"
          v-model.number="form.banksaldo"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Saldoen på lejlighedskontoen 1. januar – VSL § 8 opgør kapitalafkastgrundlaget ved indkomstårets begyndelse,
          ikke ved udgangen af året.
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="realkreditgaeld-vso">Realkreditgæld primo året (kr.)</label>
        <input
          id="realkreditgaeld-vso"
          v-model.number="form.realkreditgaeld"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Restgælden 1. januar (ikke ultimo) på det/de realkreditlån der hører til VSO – find det i TastSelv →
          Skatteoplysninger → "Renteudgifter og restgæld" for det forudgående år. Har I flere lån, medregn kun det/de
          der er overført til virksomhedsindkomsten (rubrik 117) – se SKATTEREGLER.md punkt 5.
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="skyldigt-depositum">Skyldigt depositum primo året (kr.)</label>
        <input
          id="skyldigt-depositum"
          v-model.number="form.skyldigtDepositum"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Depositum indbetalt af nuværende lejer(e), som skal tilbagebetales – det er en gæld til lejeren, ikke en del
          af lejeindtægten, og trækkes derfor fra i kapitalafkastgrundlaget.
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="realkreditrenter-bidrag">Realkreditrenter og -bidrag i alt (kr.)</label>
        <input
          id="realkreditrenter-bidrag"
          v-model.number="form.realkreditrenterOgBidrag"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Årets samlede renter og bidrag på det/de realkreditlån der hører til VSO, ét tal fra realkreditinstituttets
          årsopgørelse. Skattestyrelsen skelner ikke mellem renter og bidrag på realkreditlån (begge giver samme fradrag
          som negativ kapitalindkomst, jf. ligningsloven § 5, stk. 1, om "løbende provisioner eller præmier for lån") –
          kun afdraget på hovedstolen skal holdes udenfor. Indtastes som ét samlet årligt beløb i stedet for enkelte
          bogføringsposter, da opgørelsen kun kommer én gang om året. Se SKATTEREGLER.md punkt 9.
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="afskrivninger">Afskrivninger i alt (kr.)</label>
        <input
          id="afskrivninger"
          v-model.number="form.afskrivninger"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Kun relevant ved driftsmidler (fx møbler/hvidevarer ved møbleret udlejning, saldoafskrivning op til 25%
          årligt) eller aktiverede forbedringer – selve bygningen kan ikke afskrives ved beboelsesudlejning
          (afskrivningsloven § 14, stk. 2, nr. 4, se SKATTEREGLER.md). 0 kr., hvis ikke relevant. Beregn selv
          saldoafskrivningen og indtast kun årets samlede beløb her.
        </span>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <label for="beskattet-til-raadighed">Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)</label>
        <input
          id="beskattet-til-raadighed"
          v-model.number="form.beskattetTilRaadighed"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
        <span class="text-xs text-slate-500">
          Ingen fast TastSelv-rubrik – oplyses typisk af revisoren efter årsafslutning (fx "hensat til senere hævning"),
          beregnet ud fra rubrik {{ RUBRIK.samledeOverfoersler }}
          (Samlede overførsler). Beløb der kan hæves nu uden yderligere skattemæssige konsekvenser. Bruges også som
          fradrag i kapitalafkastgrundlaget (VSL § 8, stk. 1, jf. §§ 4 og 10, stk. 1) – skal derfor være beløbet primo
          året, ikke den løbende saldo.
        </span>
      </div>
      <div class="flex items-center gap-3 sm:col-span-2">
        <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Gem VSO-stamdata
        </button>
        <span v-if="settingsSaved" class="text-sm text-emerald-600">Gemt</span>
      </div>
    </form>

    <p v-if="indskudskontoNegativ" class="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      Indskudskontoen er negativ. Der beregnes rentekorrektion på {{ kr(rentekorrektion) }} (VSL § 11, TastSelv rubrik
      {{ RUBRIK.rentekorrektion }}).
    </p>

    <p
      v-if="form.beskattetTilRaadighed > 0"
      class="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      Kan hæves i {{ aar }} uden yderligere skat:
      <span class="font-medium">{{ kr(form.beskattetTilRaadighed) }}</span> — svarer til ca.
      <span class="font-medium">{{ kr(beskattetPrMaaned) }}/måned</span>.
    </p>
  </section>
</template>
