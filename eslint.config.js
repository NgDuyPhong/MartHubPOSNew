import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

const highLevelImportPattern = {
    regex: '^(?:@/|(?:\\.\\./)+)(?:pages|layouts|features)(?:/|$)',
    message: 'Lower-level modules must not import pages, layouts, or feature entry points.',
};

const pageOrFeatureImportPattern = {
    regex: '^(?:@/|(?:\\.\\./)+)(?:pages|features)(?:/|$)',
    message: 'Lower-level modules must not import pages or feature entry points.',
};

const featureImportBoundary = {
    files: ['resources/js/features/**/*.ts', 'resources/js/features/**/*.tsx'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    highLevelImportPattern,
                    {
                        regex: '^@/features(?:/|$)',
                        message: 'A feature must not import another feature; move a stable contract to shared/lib if it is truly cross-domain.',
                    },
                    {
                        regex: '^(?:@/components/(?!ui(?:/|$)|shared(?:/|$))|(?:\\.\\./)+components/(?!ui(?:/|$)|shared(?:/|$)))',
                        message: 'Features may use components/ui primitives and stable components/shared patterns, but must not depend on app-shell components.',
                    },
                ],
            },
        ],
    },
};

const componentImportBoundary = {
    files: [
        'resources/js/components/*.ts',
        'resources/js/components/*.tsx',
        'resources/js/components/shared/**/*.ts',
        'resources/js/components/shared/**/*.tsx',
    ],
    rules: {
        'no-restricted-imports': ['error', { patterns: [highLevelImportPattern] }],
    },
};

const uiImportBoundary = {
    files: ['resources/js/components/ui/**/*.ts', 'resources/js/components/ui/**/*.tsx'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    highLevelImportPattern,
                    {
                        regex: '^@/components/(?!ui(?:/|$))',
                        message: 'UI primitives must not depend on app-shell or feature components.',
                    },
                ],
            },
        ],
    },
};

const layoutImportBoundary = {
    files: ['resources/js/layouts/**/*.ts', 'resources/js/layouts/**/*.tsx'],
    rules: {
        'no-restricted-imports': ['error', { patterns: [pageOrFeatureImportPattern] }],
    },
};

const libImportBoundary = {
    files: ['resources/js/lib/**/*.ts', 'resources/js/lib/**/*.tsx'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    highLevelImportPattern,
                    {
                        regex: '^(?:@/|(?:\\.\\./)+)components(?:/|$)',
                        message: 'Infrastructure helpers must not depend on UI components.',
                    },
                ],
            },
        ],
    },
};

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        ignores: ['vendor', 'node_modules', 'public', 'bootstrap/ssr', 'tailwind.config.js'],
    },
    featureImportBoundary,
    componentImportBoundary,
    uiImportBoundary,
    layoutImportBoundary,
    libImportBoundary,
    prettier, // Turn off all rules that might conflict with Prettier
];
