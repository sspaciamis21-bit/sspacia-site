import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
