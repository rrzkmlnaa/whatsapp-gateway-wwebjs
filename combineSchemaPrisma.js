const fs = require('fs');
const path = require('path');

// Tentukan direktori tempat file-model .prisma berada
const prismaDir = path.join(__dirname, 'prisma', 'models'); // Ganti dengan path yang sesuai
const outputFile = path.join(__dirname, 'prisma', 'schema.prisma'); // File output

// Fungsi untuk membaca semua file dalam folder dan menggabungkan konten mereka
const combinePrismaFiles = async () => {
  try {
    const files = fs.readdirSync(prismaDir); // Baca semua file di direktori
    let combinedSchema = '';
    const addedModels = new Set(); // To keep track of models already added
    const addedEnums = new Set(); // To keep track of enums already added

    // Cek apakah schema.prisma sudah ada dan baca isinya
    if (fs.existsSync(outputFile)) {
      // Baca konten file schema.prisma jika sudah ada
      combinedSchema = fs.readFileSync(outputFile, 'utf-8');
      
      // Hapus bagian model sebelumnya untuk menghindari duplikasi
      combinedSchema = combinedSchema.replace(/model\s+\w+\s+\{[^}]*\}/g, ''); // Hapus semua model sebelumnya
      combinedSchema = combinedSchema.replace(/enum\s+\w+\s+\{[^}]*\}/g, ''); // Hapus semua enum sebelumnya
    }

    // Tambahkan bagian generator dan datasource (pastikan tidak ada duplikasi)
    if (!combinedSchema.includes('generator client') || !combinedSchema.includes('datasource db')) {
      combinedSchema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

${combinedSchema}`; // Menambahkan bagian default di atas konten yang sudah ada
    }

    // Gabungkan model-model Prisma dari file lain
    for (const file of files) {
      if (file.endsWith('.prisma')) { // Pastikan hanya file .prisma yang diproses
        const filePath = path.join(prismaDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Check and add models and enums only once
        const modelMatches = fileContent.match(/model\s+\w+\s+\{[^}]*\}/g);
        if (modelMatches) {
          modelMatches.forEach((model) => {
            const modelName = model.match(/model\s+(\w+)/);
            if (modelName && !addedModels.has(modelName[1])) {
              combinedSchema += `\n\n// Content from ${file}\n`;
              combinedSchema += model;
              addedModels.add(modelName[1]);
            }
          });
        }

        const enumMatches = fileContent.match(/enum\s+\w+\s+\{[^}]*\}/g);
        if (enumMatches) {
          enumMatches.forEach((enumDef) => {
            const enumName = enumDef.match(/enum\s+(\w+)/);
            if (enumName && !addedEnums.has(enumName[1])) {
              combinedSchema += `\n\n// Content from ${file}\n`;
              combinedSchema += enumDef;
              addedEnums.add(enumName[1]);
            }
          });
        }
      }
    }

    // Tulis konten yang digabungkan ke dalam schema.prisma
    fs.writeFileSync(outputFile, combinedSchema);
    console.log('Schema has been successfully generated!');
  } catch (error) {
    console.error('Error combining Prisma files:', error);
  }
};

// Jalankan fungsi untuk menggabungkan file
combinePrismaFiles();
