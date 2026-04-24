const fs = require('fs');

const results = JSON.parse(fs.readFileSync('./apps/api/lint-results.json', 'utf8'));
let count = 0;
for (const file of results) {
  if (count >= 20) break;
  for (const msg of file.messages) {
    if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
      const lines = fs.readFileSync(file.filePath, 'utf8').split('\n');
      console.log(`\nFile: ${file.filePath}:${msg.line}`);
      console.log(`Line: ${lines[msg.line - 1]}`);
      count++;
      if (count >= 20) break;
    }
  }
}
