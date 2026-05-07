module.exports = {
  preset: 'jest-expo',
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.claude/worktrees'],
  testMatch: ['**/?(*.)+(test).ts'],
};
