// ================================
// ESLint Configuration for Oropendola AI Extension
// ================================

module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es6: true,
        es2020: true,
        node: true,
        mocha: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        // Code Quality
        'no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_'
        }],
        'no-undef': 'error',
        'no-unreachable': 'error',
        'no-constant-condition': 'warn',
        'no-empty': ['error', { allowEmptyCatch: true }],

        // Console
        'no-console': 'off', // We use console for logging

        // Code Style
        'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
        'semi': ['error', 'always'],
        'indent': ['error', 4, { SwitchCase: 1 }],
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],

        // Best Practices
        'eqeqeq': ['error', 'always', { null: 'ignore' }],
        'curly': ['error', 'all'],
        'brace-style': ['error', '1tbs', { allowSingleLine: true }],
        'prefer-const': 'warn',
        'no-var': 'error',
        'prefer-arrow-callback': 'warn',

        // ES6+
        'arrow-spacing': 'error',
        'arrow-parens': ['error', 'as-needed'],
        'template-curly-spacing': 'error',
        'object-shorthand': ['warn', 'properties'],

        // Async/Await
        'require-await': 'warn',
        'no-return-await': 'warn',

        // Error Handling
        'no-throw-literal': 'error',
        'prefer-promise-reject-errors': 'error'
    },
    overrides: [
        {
            // Test files
            files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
            env: {
                mocha: true
            },
            rules: {
                'no-unused-expressions': 'off' // Allow chai assertions
            }
        },
        {
            // Extension entry point
            files: ['extension.js'],
            rules: {
                'no-unused-vars': ['warn', { args: 'none' }]
            }
        }
    ]
};
