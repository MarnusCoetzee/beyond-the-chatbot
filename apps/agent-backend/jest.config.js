module.exports = {
  displayName: 'agent-backend',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['**/*.spec.ts'],
  coverageDirectory: '../../coverage/agent-backend',
  moduleNameMapper: {
    '^@consensus-lab/shared-types$':
      '<rootDir>/../../packages/shared-types/src/index.ts',
  },
};
