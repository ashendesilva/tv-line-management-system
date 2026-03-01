const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  console.log(`Admin created: ${admin.username}`);

  // Create sample users
  const users = [
    {
      name: 'Juan dela Cruz',
      address: 'Block 1, Lot 5, Sampaguita St., Barangay Mabini',
      monthly_payment_day: 5,
      is_active: true,
      is_paid: false,
    },
    {
      name: 'Maria Santos',
      address: '123 Rizal Avenue, Brgy. San Pedro',
      monthly_payment_day: 10,
      is_active: true,
      is_paid: true,
      last_payment_date: new Date(),
    },
    {
      name: 'Pedro Reyes',
      address: 'Purok 3, Narra St., Barangay Magsaysay',
      monthly_payment_day: 15,
      is_active: false,
      is_paid: false,
    },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.log(`${users.length} sample users created.`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
