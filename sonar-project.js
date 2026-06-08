const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: 'https://sonarcloud.io',
    token: process.env.SONAR_TOKEN,
    options: {
      'sonar.projectKey': 'ST10363752_customer-payments-portal',
      'sonar.projectName': 'customer-payments-portal',
      'sonar.sources': 'server',
      'sonar.exclusions': '**/node_modules/**,**/dist/**,**/build/**',
      'sonar.javascript.lcov.reportPaths': '',
    },
  },
  () => process.exit()
);