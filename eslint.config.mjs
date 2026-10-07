import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// API module boundaries: a module reaches another module only through its index.ts.
const otherModuleInternals = {
  regex: String.raw`^\.\./[^/]+/(?!index\.js$)[^/]+$`,
  message: "Import another module only through its index.ts, e.g. '../profiles/index.js'.",
};
const supabaseOutsideRepositories = {
  group: ['@supabase/*'],
  message: 'Only *.repository.ts files and shared/supabase talk to Supabase.',
};
const fastifyInServices = {
  group: ['fastify', '@fastify/*'],
  message: 'Services hold application rules and must not depend on HTTP; use the controller.',
};
const repositoriesInControllers = {
  group: ['./*.repository.js'],
  message: 'Controllers call services; choose the repository in the module routes file.',
};
const apiModules = 'apps/api/src/modules/*/**/*.ts';
const apiTestFiles = ['apps/api/src/**/*.test.ts', 'apps/api/src/**/*.fake.ts'];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/scripts/**/*.mjs'],
    languageOptions: {
      globals: Object.fromEntries(
        ['URL', 'process', 'console', 'fetch', 'AbortSignal'].map((name) => [name, 'readonly']),
      ),
    },
  },
  {
    files: ['apps/web/src/components/ui/**/*.tsx'],
    ignores: ['apps/web/src/components/ui/dialog.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name="dialog"]',
          message:
            'Use the common Dialog or DialogModalLayout instead of defining another modal shell.',
        },
        {
          selector: 'CallExpression[callee.property.name="showModal"]',
          message: 'Keep modal lifecycle and focus handling in components/ui/dialog.tsx.',
        },
      ],
    },
  },
  {
    files: [apiModules],
    ignores: ['**/*.repository.ts', '**/*.service.ts', '**/*.controller.ts', ...apiTestFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [otherModuleInternals, supabaseOutsideRepositories] },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/*/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [otherModuleInternals, supabaseOutsideRepositories, repositoriesInControllers],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/*/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [otherModuleInternals, supabaseOutsideRepositories, fastifyInServices] },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/*/**/*.repository.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [otherModuleInternals] }] },
  },
  {
    files: ['apps/api/src/modules/index.ts', 'apps/api/src/app.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`modules/[^/]+/(?!index\.js$)[^/]+$`,
              message: 'Register modules through their index.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/shared/**/*.ts', 'apps/api/src/config/**/*.ts'],
    ignores: apiTestFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`/modules/`,
              message: 'Shared code must not depend on feature modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/pages/*', '@/db/*'],
              message:
                'Shared UI must not depend on app code. Declare the props shape here, or import it from @/lib or @ebenezer/contracts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/web/src/App.tsx',
      'apps/web/src/pages/**/*.tsx',
      'apps/web/src/features/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name=/^[a-z]/]',
          message:
            'Compose common components from components/ui instead of introducing page-specific HTML controls or styling.',
        },
        {
          selector: 'JSXAttribute[name.name="className"]',
          message: 'Keep visual styling inside common components in components/ui.',
        },
      ],
    },
  },
);
