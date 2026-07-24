<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useEjendomme } from '@/composables/useEjendomme'
import { useValgtEjendom } from '@/composables/useValgtEjendom'

const { ejendomme } = useEjendomme()
const valgtEjendomId = useValgtEjendom()
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <nav class="border-b border-slate-200 bg-white px-6 py-3">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-6">
          <span class="font-semibold">Lejlighedsudlejning</span>
          <RouterLink to="/" class="text-sm hover:text-slate-600">Dashboard</RouterLink>
          <RouterLink to="/stamdata" class="text-sm hover:text-slate-600">Stamdata</RouterLink>
          <RouterLink to="/bogforing" class="text-sm hover:text-slate-600">Bogføring</RouterLink>
          <RouterLink to="/vso" class="text-sm hover:text-slate-600">VSO</RouterLink>
          <RouterLink to="/beregning" class="text-sm hover:text-slate-600">Beregning</RouterLink>
          <RouterLink to="/rapporter" class="text-sm hover:text-slate-600">Rapporter</RouterLink>
          <RouterLink to="/selvangivelse" class="text-sm hover:text-slate-600">Selvangivelse</RouterLink>
        </div>
        <select
          v-if="ejendomme.length"
          v-model.number="valgtEjendomId"
          aria-label="Valgt ejendom"
          class="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option v-for="e in ejendomme" :key="e.id" :value="e.id">{{ e.adresse || 'Unavngivet ejendom' }}</option>
        </select>
        <RouterLink v-else to="/stamdata" class="text-sm font-medium text-slate-900 underline">
          Opret din første ejendom
        </RouterLink>
      </div>
    </nav>
    <main class="mx-auto max-w-5xl px-6 py-8">
      <RouterView />
    </main>
  </div>
</template>
