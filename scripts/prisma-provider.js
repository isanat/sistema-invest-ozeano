#!/usr/bin/env node
/**
 * Prisma Provider Switcher (DEPRECATED - PostgreSQL ONLY)
 *
 * This project uses PostgreSQL exclusively. This script is kept for
 * backward compatibility with local `db:push` and `db:generate` npm scripts,
 * but it will NEVER switch to SQLite.
 *
 * If no DATABASE_URL is found, it defaults to PostgreSQL.
 * If a file:// URL is found, it WARNs and keeps PostgreSQL.
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function main() {
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Find the provider inside the datasource db block
  const datasourceMatch = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"(\w+)"/);
  const currentProvider = datasourceMatch ? datasourceMatch[1] : '';

  // This project ALWAYS uses PostgreSQL. Never switch to SQLite.
  if (currentProvider === 'postgresql') {
    console.log(`[prisma-provider] Provider is "postgresql" — correct. No change needed.`);
    return;
  }

  if (currentProvider === 'sqlite') {
    console.warn(`[prisma-provider] WARNING: Provider was "sqlite" — switching to "postgresql" (this project requires PostgreSQL).`);
    const oldBlock = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"\w+"/);
    if (oldBlock) {
      const newBlock = oldBlock[0].replace(/provider\s*=\s*"\w+"/, 'provider = "postgresql"');
      schema = schema.replace(oldBlock[0], newBlock);
      fs.writeFileSync(schemaPath, schema);
      console.log(`[prisma-provider] Switched provider from "sqlite" to "postgresql".`);
    }
    return;
  }

  console.log(`[prisma-provider] Provider is "${currentProvider}" — no change needed.`);
}

main();
