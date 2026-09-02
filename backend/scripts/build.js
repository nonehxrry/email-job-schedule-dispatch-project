const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

// Create a local .env file in backend directory if it does not exist
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `PORT=5000\nNODE_ENV=production\nDATABASE_URL="file:./dev.db"\nCLIENT_URL=*\nJWT_SECRET=reachinbox-prod-secret\n`
  );
  console.log('[Build] Created default .env with DATABASE_URL="file:./dev.db"');
}

console.log('[Build] Running Prisma Generate...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

console.log('[Build] Running Prisma DB Push...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });

console.log('[Build] Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit', env: process.env });

console.log('✅ [Build] Backend built successfully!');
