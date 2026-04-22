import { PrismaClient } from '@prisma/client'

// Use the same URL the production runtime will use (locally accessible)
const DB_URL = process.env.DATABASE_URL || 
  'mysql://u434618106_sspacia:ShriShyam%231234@148.222.53.51:3306/u434618106_sspacia_app'

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
})

async function main() {
  console.log('Testing database connection...')
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully!')
    
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    })
    
    if (userRole) {
      console.log('✅ "USER" role exists.')
    } else {
      console.log('❌ "USER" role is MISSING. Please run seed script.')
    }
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
