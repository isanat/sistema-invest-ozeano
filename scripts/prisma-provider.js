#!/usr/bin/env node
/**
 * Prisma Provider Switcher
 * 
 * Automatically sets the correct Prisma provider based on DATABASE_URL:
 * - file: URLs → sqlite (local development)
 * - postgresql: URLs → postgresql (production/Vercel)
 * 
 * Runs BEFORE prisma generate via the package.json "postinstall" or "pregenerate" hook.
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function getDatabaseUrl() {
  // Environment variable takes priority (Vercel sets DATABASE_URL as env var)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Fallback to .env file (local development)
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function main() {
  const dbUrl = getDatabaseUrl();
  const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Find the provider inside the datasource db block
  const datasourceMatch = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"(\w+)"/);
  const currentProvider = datasourceMatch ? datasourceMatch[1] : '';

  if (currentProvider === targetProvider) {
    console.log(`[prisma-provider] Provider already set to "${targetProvider}" — no change needed`);
    return;
  }

  // Replace the provider in the datasource db block only
  const oldBlock = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"\w+"/);
  if (oldBlock) {
    const newBlock = oldBlock[0].replace(/provider\s*=\s*"\w+"/, `provider = "${targetProvider}"`);
    schema = schema.replace(oldBlock[0], newBlock);
    fs.writeFileSync(schemaPath, schema);
    console.log(`[prisma-provider] Switched provider from "${currentProvider}" to "${targetProvider}" (URL: ${dbUrl.substring(0, 25)}...)`);
  } else {
    console.error('[prisma-provider] Could not find datasource db block in schema.prisma');
    process.exit(1);
  }
}

main();
