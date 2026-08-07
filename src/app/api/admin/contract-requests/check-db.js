const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocations() {
  const locations = await prisma.location.findMany();
  console.log('Locations:', locations.map(l => ({ id: l.id, name: l.name })));
  
  const products = await prisma.product.findMany({
    include: { location: true }
  });
  console.log('Products:', products.map(p => ({ id: p.id, name: p.name, location: p.location.name, capacity: p.capacity })));
}

checkLocations()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
