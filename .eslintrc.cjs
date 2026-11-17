module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'scripts', '.eslintrc.cjs', '*.config.js', '*.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // `const { id: _, ...resto } = obj` es la forma de descartar un campo.
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    // Los errores y filas de Supabase se tipan con `any` en ~30 lugares. Tiparlos
    // es un trabajo aparte; mientras tanto el lint no puede quedar en rojo por eso.
    '@typescript-eslint/no-explicit-any': 'off',
  },
  overrides: [
    {
      // Cada context exporta su Provider y su hook (useAuth, useStore...): es el
      // patrón buscado, aunque Fast Refresh recargue la página entera al editarlos.
      files: ['src/context/**'],
      rules: { 'react-refresh/only-export-components': 'off' },
    },
  ],
}
