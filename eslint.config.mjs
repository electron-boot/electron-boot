import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-config-prettier';
import pluginRegExp from 'eslint-plugin-regexp';
import pluginN from 'eslint-plugin-n';

export default [
  {
    ignores: ['**/dist/**', '**/fixtures/**'],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginRegExp.configs['flat/recommended'],
  eslintPluginPrettierRecommended,
  {
    name: 'main',
    plugins: {
      n: pluginN,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022,
      },
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'prefer-spread': 'off',
      'n/no-exports-assign': 'error',
      'n/no-unpublished-bin': 'error',
      'n/no-unsupported-features/es-builtins': 'error',
      'n/no-unsupported-features/node-builtins': 'error',
      'n/process-exit-as-throw': 'error',
      'n/hashbang': 'error',
      '@typescript-eslint/no-unused-expressions': 'off',
      eqeqeq: ['warn', 'always', { null: 'never' }],
      'no-debugger': ['error'],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-process-exit': 'off',
      'prefer-const': [
        'warn',
        {
          destructuring: 'all',
        },
      ],

      'n/no-missing-require': [
        'error',
        {
          // for try-catching yarn pnp
          allowModules: ['pnpapi', 'vite'],
          tryExtensions: ['.ts', '.js', '.jsx', '.tsx', '.d.ts'],
        },
      ],
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': [
        'error',
        {
          allowModules: ['vite'],
        },
      ],

      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': ['error', { allowArgumentsExplicitlyTypedAsAny: true }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-extra-semi': 'off',
      '@typescript-eslint/no-extra-semi': 'off', // conflicts with prettier
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-constant-binary-expression': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
      // disable rules set in @typescript-eslint/stylistic which conflict with current code
      // we should discuss if we want to enable these as they encourage consistent code
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-function-type': 'off',
      'regexp/prefer-regexp-exec': 'error',
      'regexp/prefer-regexp-test': 'error',
      // in some cases using explicit letter-casing is more performant than the `i` flag
      'regexp/use-ignore-case': 'off',
    },
  },
];
