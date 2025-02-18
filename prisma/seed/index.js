const fs = require('fs');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const seedersDir = path.join(__dirname, ''); // Directory where your seed files are

const runSeeder = async (seederFile) => {
  try {
    // Dynamically import the seeder file
    const seederFunction = require(path.join(seedersDir, seederFile));

    if (typeof seederFunction === 'function') {
      console.log(`Running seeder: ${seederFile}...`);
      await seederFunction(prisma); // Make sure it's being called with the prisma instance
      console.log(`Seeder ${seederFile} completed successfully.`);
    } else {
      console.log(`Skipping invalid seeder: ${seederFile} (not a function)`);
    }
  } catch (error) {
    console.error(`Error running seeder ${seederFile}: ${error.message}`);
  }
};

const runAllSeeders = async () => {
  console.log('Starting seed process...');
  
  // List all seeder files in the seed folder
  const seedFiles = fs.readdirSync(seedersDir).filter(file => file.endsWith('.js'));
  
  for (const seedFile of seedFiles) {
    await runSeeder(seedFile);
  }
  
  console.log('Seeding process completed!');
};

runAllSeeders().catch((error) => {
  console.error('Seeding process failed:', error);
});
