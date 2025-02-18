const bcrypt = require('bcryptjs');

async function seedUsers(prisma) {
  console.log('Seeding users...');

  // Sample user data
  const users = [
    {
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10), // Hash password
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      email: 'user@example.com',
      password: await bcrypt.hash('user123', 10), // Hash password
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
    },
    {
      email: 'moderator@example.com',
      password: await bcrypt.hash('moderator123', 10), // Hash password
      firstName: 'Alex',
      lastName: 'Smith',
      role: 'MODERATOR',
      status: 'ACTIVE',
    },
    {
      email: 'inactive_user@example.com',
      password: await bcrypt.hash('inactive123', 10), // Hash password
      firstName: 'Tom',
      lastName: 'Brown',
      role: 'USER',
      status: 'INACTIVE',
    },
    {
      email: 'suspended_user@example.com',
      password: await bcrypt.hash('suspended123', 10), // Hash password
      firstName: 'Emma',
      lastName: 'Wilson',
      role: 'USER',
      status: 'SUSPENDED',
    },
  ];

  // Create users in the database
  for (const user of users) {
    await prisma.user.create({
      data: user,
    });
  }

  console.log('Users seeded successfully!');
}

// Ensure you are exporting the function
module.exports = seedUsers;
