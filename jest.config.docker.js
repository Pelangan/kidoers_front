/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // ✅ Correct key name
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Map styles to a proxy so `import './x.css'` works
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    // Map static assets to a stub
    '\\.(png|jpe?g|gif|webp|avif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.spec.{js,jsx,ts,tsx}',
    '!<rootDir>/tests/e2e/**/*', // Exclude Playwright tests
    '!<rootDir>/tests/**/*.vitest', // Exclude Vitest tests
    '!<rootDir>/tests/**/*.vitest.*', // Exclude Vitest tests
  ],

  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // If you later hit ESM packages in node_modules that need transpiling,
  // relax this to a negative lookahead. For now, keep default.
  // transformIgnorePatterns: ['/node_modules/'],
};
