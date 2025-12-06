import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkEnv() {
  const envPath = join(__dirname, '..', '.env');
  
  if (!existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('\n📝 Creating .env file...\n');
    
    const envContent = `PORT=5000
NODE_ENV=development
JWT_SECRET=rowdatul-iimaan-secret-key-2024-change-in-production
DATABASE_URL=postgresql://user:password@host:5432/database
`;
    
    require('fs').writeFileSync(envPath, envContent);
    console.log('✅ Created .env file!');
    console.log('\n⚠️  IMPORTANT: Update DATABASE_URL with your database connection string!\n');
    console.log('   For Neon DB: Get connection string from https://neon.tech');
    console.log('   For Local: postgresql://postgres:password@localhost:5432/database\n');
    return false;
  }
  
  const envContent = readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let hasDatabaseUrl = false;
  let databaseUrlValue = '';
  
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      hasDatabaseUrl = true;
      databaseUrlValue = line.split('=')[1]?.trim();
      break;
    }
  }
  
  if (!hasDatabaseUrl || !databaseUrlValue || databaseUrlValue.includes('user:password')) {
    console.log('⚠️  DATABASE_URL not configured!');
    console.log('\n📝 Please edit backend/.env and set your DATABASE_URL:');
    console.log('   DATABASE_URL=postgresql://your-actual-connection-string\n');
    return false;
  }
  
  console.log('✅ .env file found and configured!');
  console.log(`   DATABASE_URL: ${databaseUrlValue.substring(0, 30)}...`);
  return true;
}

checkEnv();


