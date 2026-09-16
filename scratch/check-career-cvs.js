const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const apps = await prisma.careerApplication.findMany({
      orderBy: { id: 'desc' },
      take: 20,
    });
    console.log(`Found ${apps.length} applications:`);
    for (const a of apps) {
      console.log(`ID: ${a.id} | Name: ${a.fullName} | Position: ${a.appliedPosition} | cvUrl: ${a.cvUrl} | cvFileName: ${a.cvFileName}`);
    }

    const docs = await prisma.storedDocument.findMany({
      where: {
        OR: [
          { fileName: { contains: 'Resume' } },
          { fileName: { contains: 'CV' } },
          { fileName: { contains: 'Manish' } }
        ]
      },
      select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true }
    });
    console.log('Matching StoredDocuments:', docs);
  } catch (err) {
    console.error('Error querying career applications:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
