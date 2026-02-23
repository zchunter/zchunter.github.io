// jest.config.cjs
// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/configuration

module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/smart-audit/"
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(unified|retext-.*|vfile.*|syllables|bail|trough|vfile|unist-.*|micromark.*|mdast.*|hast.*|rehype.*|remark.*|devlop|extend|is-plain-obj|yoast|zwitch|cheerio)/)"
  ]
}; 
