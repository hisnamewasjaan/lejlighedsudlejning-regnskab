<script setup>
import { computed, reactive } from 'vue'
import { udledFoelgeposteringerForNyLejer, useTenants } from '@/composables/useTenants'
import { useTransactions } from '@/composables/useTransactions'
import { useRecurringTransactions } from '@/composables/useRecurringTransactions'

const props = defineProps({
  ejendomId: { type: [Number, null], required: true },
})

const ejendomId = computed(() => props.ejendomId)
const { tenants, addTenant, deleteTenant } = useTenants(ejendomId)
const { addTransaction } = useTransactions()
const { addTemplate: addRecurringTemplate } = useRecurringTransactions()

const tenantForm = reactive({
  navn: '',
  kontakt: '',
  lejemaalStart: '',
  lejemaalSlut: '',
  maanedligHusleje: null,
  depositum: null,
})

async function onAddTenant() {
  if (!tenantForm.navn || !tenantForm.lejemaalStart) {
    return
  }
  const tenantId = await addTenant({ ...tenantForm })

  const { recurringTemplate, depositumTransaktion } = udledFoelgeposteringerForNyLejer(tenantForm, tenantId)
  if (recurringTemplate) {
    await addRecurringTemplate(recurringTemplate)
  }
  if (depositumTransaktion) {
    await addTransaction(depositumTransaktion)
  }

  Object.assign(tenantForm, {
    navn: '',
    kontakt: '',
    lejemaalStart: '',
    lejemaalSlut: '',
    maanedligHusleje: null,
    depositum: null,
  })
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-medium">Lejere</h2>

    <ul v-if="tenants.length" class="mt-4 divide-y divide-slate-200">
      <li v-for="tenant in tenants" :key="tenant.id" class="flex items-center justify-between py-3 text-sm">
        <div>
          <p class="font-medium">{{ tenant.navn }}</p>
          <p class="text-slate-500">
            {{ tenant.lejemaalStart }} – {{ tenant.lejemaalSlut || 'igangværende' }} ·
            {{ tenant.maanedligHusleje }} kr./md.
          </p>
        </div>
        <button class="text-red-600 hover:text-red-800" @click="deleteTenant(tenant.id)">Slet</button>
      </li>
    </ul>
    <p v-else class="mt-4 text-sm text-slate-500">Ingen lejere registreret endnu.</p>

    <form class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onAddTenant">
      <label class="flex flex-col gap-1 text-sm">
        Navn
        <input v-model="tenantForm.navn" type="text" class="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Kontakt
        <input v-model="tenantForm.kontakt" type="text" class="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Lejemål start
        <input v-model="tenantForm.lejemaalStart" type="date" class="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Lejemål slut (valgfri)
        <input v-model="tenantForm.lejemaalSlut" type="date" class="rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Månedlig husleje (kr.)
        <input
          v-model.number="tenantForm.maanedligHusleje"
          type="number"
          class="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Depositum (kr.)
        <input v-model.number="tenantForm.depositum" type="number" class="rounded border border-slate-300 px-3 py-2" />
      </label>
      <div class="sm:col-span-2">
        <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Tilføj lejer
        </button>
        <p class="mt-2 text-xs text-slate-500">
          Opretter automatisk en depositum-postering og en tilbagevendende husleje-postering, som kan genereres måned
          for måned under <RouterLink to="/bogforing" class="underline">Bogføring</RouterLink>.
        </p>
      </div>
    </form>
  </section>
</template>
