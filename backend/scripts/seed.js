/**
 * Seed script — clears all users & payments, then inserts fresh test data.
 * Run: node scripts/seed.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const today = new Date();
today.setHours(0, 0, 0, 0);

const customers = [
  // Fully paid (balance = 0)
  {
    name: 'Kamal Perera',
    address: 'No. 12, Malabe Road, Kaduwela',
    monthly_payment_day: 1,
    monthly_fee: 500,
    balance: 0,
    is_paid: true,
    is_active: true,
    last_payment_date: today,
  },
  {
    name: 'Nimal Silva',
    address: 'No. 45, Galle Road, Moratuwa',
    monthly_payment_day: 5,
    monthly_fee: 500,
    balance: 0,
    is_paid: true,
    is_active: true,
    last_payment_date: today,
  },
  {
    name: 'Malini Dissanayake',
    address: 'No. 78, Kandy Road, Peradeniya',
    monthly_payment_day: 10,
    monthly_fee: 500,
    balance: 0,
    is_paid: true,
    is_active: true,
    last_payment_date: today,
  },
  // Partial payment (paid some, balance > 0 but < 500)
  {
    name: 'Sunil Fernando',
    address: 'No. 23, Negombo Road, Ja-ela',
    monthly_payment_day: 7,
    monthly_fee: 500,
    balance: 250,      // paid 250 of 500
    is_paid: false,
    is_active: true,
    last_payment_date: today,
  },
  {
    name: 'Pradeep Rajapaksa',
    address: 'No. 9, Matara Road, Weligama',
    monthly_payment_day: 15,
    monthly_fee: 500,
    balance: 100,      // paid 400 of 500
    is_paid: false,
    is_active: true,
    last_payment_date: today,
  },
  // Unpaid (balance = 500 — no payment at all this month)
  {
    name: 'Tharanga Wickramasinghe',
    address: 'No. 56, Colombo Road, Kurunegala',
    monthly_payment_day: 3,
    monthly_fee: 500,
    balance: 500,
    is_paid: false,
    is_active: true,
    last_payment_date: null,
  },
  {
    name: 'Chamara Jayawardena',
    address: 'No. 14, Anuradhapura Road, Mihintale',
    monthly_payment_day: 20,
    monthly_fee: 500,
    balance: 500,
    is_paid: false,
    is_active: true,
    last_payment_date: null,
  },
  // Inactive
  {
    name: 'Dilani Senanayake',
    address: 'No. 33, Ratnapura Road, Balangoda',
    monthly_payment_day: 12,
    monthly_fee: 500,
    balance: 500,
    is_paid: false,
    is_active: false,
    last_payment_date: null,
  },
];

async function main() {
  console.log('🗑️  Clearing existing payments and users...');
  await prisma.payment.deleteMany();
  await prisma.user.deleteMany();

  console.log('🌱 Inserting fresh customer records...');
  for (const c of customers) {
    const user = await prisma.user.create({ data: c });
    console.log(`   ✓ ${user.name} — ${
      user.balance <= 0 ? 'Paid' : user.balance < 500 ? `Partial (LKR ${user.balance} owed)` : 'Unpaid'
    } ${user.is_active ? '' : '[Inactive]'}`);
  }

  console.log(`\n✅ Seeded ${customers.length} customers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
