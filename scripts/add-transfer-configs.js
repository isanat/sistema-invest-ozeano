// One-time script to add transfer configs to the database
// Usage: node scripts/add-transfer-configs.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = [
    { key: 'transfer_enabled', value: 'true', type: 'boolean', description: 'Permitir transferências entre usuários', category: 'transfer', isActive: true },
    { key: 'transfer_min', value: '5', type: 'number', description: 'Valor mínimo para transferência em USDT', category: 'transfer', isActive: true },
    { key: 'transfer_max', value: '0', type: 'number', description: 'Valor máximo para transferência em USDT (0 = sem limite)', category: 'transfer', isActive: true },
    { key: 'transfer_fee_pct', value: '1', type: 'number', description: 'Taxa de transferência (%)', category: 'transfer', isActive: true },
    { key: 'transfer_daily_limit', value: '5', type: 'number', description: 'Limite diário de transferências', category: 'transfer', isActive: true },
    { key: 'transfer_cooldown_min', value: '30', type: 'number', description: 'Cooldown entre transferências (minutos)', category: 'transfer', isActive: true },
  ];

  for (const c of configs) {
    const result = await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: { value: c.value, description: c.description, category: c.category, isActive: c.isActive },
      create: c,
    });
    console.log(`✓ ${c.key} = ${c.value}`);
  }

  console.log('\nTransfer configs added successfully!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
