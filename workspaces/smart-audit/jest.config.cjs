// Jest config for the SmartAudit workspace.
//
// The repo root is `"type": "module"`, and the SmartAudit source + tests use ESM
// `import`/`export`. Jest still runs on CommonJS, so babel-jest transpiles each
// file on the way in, using the repo-root babel config (`@babel/preset-env`
// targeting the current Node).
//
// Run with: npm run smart-audit:test

const path = require('path');

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'jsdom',
  clearMocks: true,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  transform: {
    '^.+\\.[cm]?js$': [
      'babel-jest',
      { configFile: path.resolve(__dirname, '..', '..', 'babel.config.cjs') },
    ],
  },
};
