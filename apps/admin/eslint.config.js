export default {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
    ],
    ignorePatterns: ['build', 'node_modules'],
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    settings: { react: { version: '18.2' } },
    rules: {
        'react/prop-types': 'off',
        'no-unused-vars': 'off',
        'react/no-unescaped-entities': 'off',
        'react/no-unknown-property': 'off',
    },
};
