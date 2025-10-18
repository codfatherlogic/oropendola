module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es6: true,
        node: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',
        'quotes': ['error', 'single', { avoidEscape: true }],
        'semi': ['error', 'always'],
        'indent': ['error', 4, { SwitchCase: 1 }],
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always']
    }
};
