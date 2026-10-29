'use strict';

module.exports = {
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  // Jest 27+ applies the negations to the patterns before them, so the exclusions come last
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js'
  ],
  coverageDirectory: 'coverage'
};
