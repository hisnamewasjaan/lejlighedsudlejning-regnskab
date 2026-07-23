<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <nav class="border-b border-slate-200 bg-white px-6 py-3">
      <div class="mx-auto flex max-w-5xl items-center gap-6">
        <span class="font-semibold">Lejlighedsudlejning</span>
        <RouterLink to="/" class="text-sm hover:text-slate-600">Dashboard</RouterLink>
        <RouterLink to="/stamdata" class="text-sm hover:text-slate-600">Stamdata</RouterLink>
        <RouterLink to="/bogforing" class="text-sm hover:text-slate-600">Bogføring</RouterLink>
        <RouterLink to="/vso" class="text-sm hover:text-slate-600">VSO</RouterLink>
        <RouterLink to="/beregning" class="text-sm hover:text-slate-600">Beregning</RouterLink>
        <RouterLink to="/rapporter" class="text-sm hover:text-slate-600">Rapporter</RouterLink>
        <RouterLink to="/selvangivelse" class="text-sm hover:text-slate-600">Selvangivelse</RouterLink>
      </div>
    </nav>
    <main class="mx-auto max-w-5xl px-6 py-8">
      <RouterView />
    </main>
  </div>
</template>
