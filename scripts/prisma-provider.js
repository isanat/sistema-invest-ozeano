#!/usr/bin/env node
/**
 * Prisma Provider Switcher
 *
 * Auto-detects the correct Prisma provider based on DATABASE_URL:
 * - postgresql:// or postgres:// → provider = "postgresql"
 * - file:// or no protocol       → provider = "sqlite"
 *
 * This allows the same schema to work with PostgreSQL in production
 * and SQLite in local development.
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function main() {
  const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
  const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && dbUrl.length > 0);
  const targetProvider = isPostgres ? 'postgresql' : isSqlite ? 'sqlite' : 'sqlite';

  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Find the current provider
  const datasourceMatch = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"(\w+)"/);
  const currentProvider = datasourceMatch ? datasourceMatch[1] : '';

  if (currentProvider === targetProvider) {
    console.log(`[prisma-provider] Provider is "${targetProvider}" — correct. No change needed.`);
    return;
  }

  // Switch provider
  const oldBlock = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"\w+"/);
  if (oldBlock) {
    const newBlock = oldBlock[0].replace(/provider\s*=\s*"\w+"/, `provider = "${targetProvider}"`);
    schema = schema.replace(oldBlock[0], newBlock);
    fs.writeFileSync(schemaPath, schema);
    console.log(`[prisma-provider] Switched provider from "${currentProvider}" to "${targetProvider}".`);
  }
}

main();
