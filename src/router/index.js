import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import StamdataView from '@/views/StamdataView.vue'
import BogforingView from '@/views/BogforingView.vue'
import VsoView from '@/views/VsoView.vue'
import BeregningView from '@/views/BeregningView.vue'
import RapporterView from '@/views/RapporterView.vue'
import SelvangivelseView from '@/views/SelvangivelseView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/stamdata', name: 'stamdata', component: StamdataView },
    { path: '/bogforing', name: 'bogforing', component: BogforingView },
    { path: '/vso', name: 'vso', component: VsoView },
    { path: '/beregning', name: 'beregning', component: BeregningView },
    { path: '/rapporter', name: 'rapporter', component: RapporterView },
    { path: '/selvangivelse', name: 'selvangivelse', component: SelvangivelseView },
  ],
})
