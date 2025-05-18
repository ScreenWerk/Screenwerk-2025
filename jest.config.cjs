module.exports = {
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@breejs)/)'
  ],
  testEnvironment: 'node'
}
