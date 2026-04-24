const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCapacities() {
  console.log('Syncing ProductUnit capacities with Product capacities...');
  
  const products = await prisma.product.findMany({
    include: { units: true }
  });

  for (const product of products) {
    if (product.capacity && product.units.length > 0) {
      console.log(`Checking product: ${product.name} (Capacity: ${product.capacity})`);
      for (const unit of product.units) {
        if (unit.capacity !== product.capacity) {
          console.log(`  Updating unit ${unit.name} capacity: ${unit.capacity} -> ${product.capacity}`);
          await prisma.productUnit.update({
            where: { id: unit.id },
            data: { capacity: product.capacity }
          });
        }
      }
    }
  }
  
  console.log('Done.');
}

fixCapacities()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
