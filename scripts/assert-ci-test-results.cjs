const fs = require('node:fs');

const reportPath = process.argv[2];
if (!reportPath || !fs.existsSync(reportPath)) {
  throw new Error('Jest JSON results are required.');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (!Array.isArray(report.testResults)) {
  throw new Error('Jest JSON report is missing test suite results.');
}

const integration = report.testResults.find(result =>
  result.name.replaceAll('\\', '/').endsWith('/test/training.integration.spec.ts'),
);

if (!integration) {
  throw new Error('PostgreSQL training integration suite was not run.');
}

if (
  integration.status !== 'passed' ||
  integration.assertionResults.length === 0 ||
  integration.assertionResults.some(assertion => assertion.status !== 'passed')
) {
  throw new Error('PostgreSQL training integration suite did not pass.');
}

if (
  report.numPendingTests !== 0 ||
  report.numTodoTests !== 0 ||
  report.numFailedTests !== 0 ||
  report.numTotalTests !== report.numPassedTests
) {
  throw new Error(
    `CI requires every Jest test to pass without skips or todos; total=${report.numTotalTests}, passed=${report.numPassedTests}, failed=${report.numFailedTests}, skipped=${report.numPendingTests}, todo=${report.numTodoTests}.`,
  );
}

if (report.numPassedTests < 223) {
  throw new Error(`Expected to preserve at least 223 tests; Jest ran ${report.numPassedTests}.`);
}

console.log(
  `Validated ${report.numPassedTests} Jest tests; PostgreSQL integration passed and none were skipped.`,
);
