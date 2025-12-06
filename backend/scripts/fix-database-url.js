import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixDatabaseUrl() {
  const envPath = join(__dirname, '..', '.env');
  
  if (!existsSync(envPath)) {
    console.log('❌ .env file not found!');
    return;
  }
  
  const envContent = readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const newLines = [];
  
  let found = false;
  
  for (let line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      const value = line.split('=')[1]?.trim() || '';
      
      // Check if it's a psql command format
      if (value.startsWith("psql '") || value.startsWith('psql "')) {
        console.log('⚠️  Found psql command format, extracting connection string...');
        // Extract the connection string from psql command
        const match = value.match(/postgresql:\/\/[^'"]+/);
        if (match) {
          line = `DATABASE_URL=${match[0]}`;
          console.log('✅ Fixed DATABASE_URL format');
          found = true;
        }
      }
      
      // Check if it needs sslmode
      if ((value.includes('neon.tech') || value.includes('neon.tech')) && !value.includes('sslmode')) {
        const separator = value.includes('?') ? '&' : '?';
        line = `DATABASE_URL=${value}${separator}sslmode=require`;
        console.log('✅ Added SSL mode for Neon DB');
        found = true;
      } else if (!value.includes('sslmode') && value.includes('postgresql://')) {
        // Add sslmode for any postgresql connection that doesn't have it
        const separator = value.includes('?') ? '&' : '?';
        line = `DATABASE_URL=${value}${separator}sslmode=require`;
        console.log('✅ Added SSL mode');
        found = true;
      }
    }
    newLines.push(line);
  }
  
  if (found) {
    writeFileSync(envPath, newLines.join('\n'), 'utf8');
    console.log('\n✅ .env file updated!');
    console.log('   Run: npm run test-connection\n');
  } else {
    console.log('ℹ️  DATABASE_URL looks correct');
    console.log('\n💡 If connection fails, check:');
    console.log('   1. Connection string format: postgresql://user:pass@host:port/dbname');
    console.log('   2. For Neon DB: Add ?sslmode=require at the end');
    console.log('   3. Credentials are correct\n');
  }
}

fixDatabaseUrl();

