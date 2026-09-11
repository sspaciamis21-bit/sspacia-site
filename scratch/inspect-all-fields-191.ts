import prisma from '../src/lib/prisma';

async function main() {
  const inv = await prisma.invoiceRecord.findUnique({
    where: { id: 191 }
  });
  console.log(inv);
}

main().catch(console.error).finally(() => process.exit(0));
