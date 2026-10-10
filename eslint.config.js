// ESLint flat config: TypeScript (type-checked), React hooks and accessibility.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'node_modules',
      '.venv',
      '.venv-audio',
      'test-results',
      'playwright-report',
      'blob-report',
      '.build-review',
      '.venv',
      'docs/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['src/**/*.tsx'],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      // role="list" on unstyled lists is deliberate: Safari drops list semantics without it.
      // The same for a table laid out as a grid on a phone (the teacher guide's session plan).
      'jsx-a11y/no-redundant-roles': [
        'error',
        {
          ul: ['list'],
          ol: ['list'],
          table: ['table'],
          thead: ['rowgroup'],
          tbody: ['rowgroup'],
          tfoot: ['rowgroup'],
          tr: ['row'],
          th: ['columnheader', 'rowheader'],
          td: ['cell'],
        },
      ],
      // jsx-a11y counts <td> as interactive (a grid cell); role="cell" is its plain table meaning.
      'jsx-a11y/no-interactive-element-to-noninteractive-role': ['error', { tr: ['none', 'presentation'], canvas: ['img'], td: ['cell'] }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Promises in React event handlers are common and handled inside.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Learner data goes in IndexedDB through src/storage.' },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts', 'e2e-dev/**/*.ts', 'scripts/**/*.{js,mjs}', 'tools/**/*.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // tools/shoot.mjs and scripts/render_svg.js run in Node (Playwright) but
    // also pass callbacks to page.evaluate() that execute in the browser, so
    // they need both globals.
    files: ['tools/**/*.{js,mjs}', 'scripts/render_svg.js', 'scripts/make_social_card.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // scripts/render_svg.js is a plain Node script, not part of any tsconfig.
    files: ['eslint.config.js', 'tools/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
);
