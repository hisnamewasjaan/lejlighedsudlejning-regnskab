<script setup>
import { formatKr as kr } from '@/utils/format'

defineProps({
  t: { type: Object, required: true },
  kleur: { type: Object, required: true },
})
</script>

<template>
  <section :id="`trin-${t.id}`" class="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6">
    <h2 class="text-sm font-medium text-slate-700">
      {{ t.titel }} <span class="font-normal text-slate-400">({{ t.paragraf }})</span>
    </h2>

    <div class="mt-4 flex flex-wrap justify-center gap-3">
      <component
        :is="input.kilde ? 'a' : 'div'"
        v-for="input in t.inputs"
        :key="input.label"
        :href="input.kilde ? `#trin-${input.kilde}` : undefined"
        class="w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm"
        :class="input.kilde ? [kleur[input.kilde].borderLeft, 'border-l-4 bg-white hover:bg-slate-50'] : ''"
      >
        <p class="text-xs text-slate-500">
          <span v-if="input.kilde" :class="kleur[input.kilde].text">↑ </span>
          {{ input.label }} <span v-if="input.rubrik" class="text-slate-400">(rubrik {{ input.rubrik }})</span>
        </p>
        <p class="font-medium">
          <span
            v-if="input.fortegn"
            :class="{
              'text-emerald-600': input.fortegn === '+',
              'text-red-600': input.fortegn === '−',
              'text-slate-500': input.fortegn === '×',
            }"
            >{{ input.fortegn }}</span
          >
          {{ input.erProcent ? `${input.vaerdi * 100}%` : kr(input.vaerdi) }}
        </p>
      </component>
    </div>

    <div class="flex justify-center py-2 text-slate-300">
      <svg
        width="16"
        height="22"
        viewBox="0 0 16 22"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 0 V16 M2 13 L8 19 L14 13" />
      </svg>
    </div>

    <div
      class="mx-auto w-fit rounded-lg border-2 border-slate-400 bg-slate-50 px-4 py-2 text-center shadow-sm"
      :class="kleur[t.id] ? [kleur[t.id].borderLeft, 'border-l-4'] : ''"
    >
      <p class="text-xs font-medium text-slate-600">
        = {{ t.resultat.label }}
        <span v-if="t.resultat.rubrik" class="font-normal text-slate-400">(rubrik {{ t.resultat.rubrik }})</span>
      </p>
      <p class="text-lg font-semibold">{{ kr(t.resultat.vaerdi) }}</p>
    </div>
  </section>
</template>
