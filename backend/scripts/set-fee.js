const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.updateMany({ data: { monthly_fee: 500 } })
  .then((r) => console.log('Updated', r.count, 'users to monthly_fee = 500'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
