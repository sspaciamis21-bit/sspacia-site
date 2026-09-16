import { Buffer } from 'node:buffer';
import prisma from '../src/lib/prisma';

async function test() {
  try {
    // 1. Create a dummy test PDF buffer
    const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF');

    const storedDoc = await (prisma as any).storedDocument.create({
      data: {
        fileName: 'Test_Candidate_CV.pdf',
        mimeType: 'application/pdf',
        fileData: testPdfBuffer,
        fileSize: testPdfBuffer.length,
        uploadedById: 1,
      },
    });

    console.log('✅ Created StoredDocument with ID:', storedDoc.id);

    // Test fetching it back
    const fetched = await (prisma as any).storedDocument.findUnique({
      where: { id: storedDoc.id },
    });

    console.log('✅ Fetched document back successfully, size:', fetched.fileData.length);
  } catch (e) {
    console.error('❌ Test failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
