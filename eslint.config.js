import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

export default [
  { name: 'app/ignores', ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    name: 'app/language-options',
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } },
  },
  {
    name: 'app/node-config-files',
    files: ['*.config.js', 'tests/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    name: 'app/rules',
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      // VsoView.vue's `form` er bevidst en delt reaktiv objekt-reference sendt ned som prop til
      // flere søskende-komponenter (ikke defineModel, da ingen af dem erstatter hele objektet) -
      // shallowOnly tillader mutation af felter, men fanger stadig en fejlagtig gentildeling af
      // selve prop'en.
      'vue/no-mutating-props': ['error', { shallowOnly: true }],
    },
  },
  skipFormatting, // skal stå sidst
]
