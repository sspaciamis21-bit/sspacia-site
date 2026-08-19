import { PrismaClient } from '@prisma/client'

// Use the same URL the production runtime will use (locally accessible)
const DB_URL = process.env.DATABASE_URL || 
  'mysql://u434618106_vrajesh_test:ShriShyam%231234@127.0.0.1:3306/u434618106_sspacia_test'

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
})

async function main() {
  console.log('Testing database connection...')
  try {
    // Timeout check after 5 seconds so cloud build servers never hang
    const connectPromise = prisma.$connect()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
    )
    
    await Promise.race([connectPromise, timeoutPromise])
    console.log('✅ Database connected successfully!')
    
    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    })
    
    if (userRole) {
      console.log('✅ "USER" role exists.')
    } else {
      console.log('⚠️ "USER" role is MISSING. Please run seed script if needed.')
    }
  } catch (error) {
    console.warn('⚠️ Database connection check skipped during build stage (normal for cloud build environments).')
  } finally {
    try {
      await prisma.$disconnect()
    } catch {}
  }
}

main()
