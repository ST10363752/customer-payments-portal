const { Scanner } = require('sonarqube-scanner');

const scanner = new Scanner({
  serverUrl: 'https://sonarcloud.io',
  token: process.env.SONAR_TOKEN,
  options: {
    'sonar.projectKey': 'ST10363752_customer-payments-portal',
    'sonar.projectName': 'customer-payments-portal',
    'sonar.sources': '.',
    'sonar.exclusions': '**/node_modules/**,**/dist/**,**/build/**',
  },
});

scanner.start();