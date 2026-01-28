const { execSync } = require('child_process');
const fs = require('fs');

// Ensure dist/scripts directory exists
if (!fs.existsSync('dist/scripts')) {
  fs.mkdirSync('dist/scripts', { recursive: true });
}

// Compile seed script
execSync('npx tsc src/scripts/seed.ts --outDir dist/scripts --moduleResolution node --esModuleInterop true --target es2020 --lib es2020', {
  stdio: 'inherit'
});

console.log('✅ Seed scripts compiled successfully');