import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as typeof global & {
  prisma?: PrismaClient
}

let dbUrl =
  (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL_PROD)
    ? process.env.DATABASE_URL_PROD
    : (process.env.DATABASE_URL || 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test');

// If running in production on Hostinger Linux server, Hostinger's internal firewall
// blocks outbound connections to its own external IP/hostname on port 3306.
// In that environment, it connects locally to 127.0.0.1:3306 (matches Hostinger's phpMyAdmin).
if (process.env.NODE_ENV === 'production' && process.platform === 'linux') {
  if (dbUrl.includes('srv2088.hstgr.io') || dbUrl.includes('auth-db2088.hstgr.io') || dbUrl.includes('148.222.53.51')) {
    dbUrl = dbUrl
      .replace('srv2088.hstgr.io', '127.0.0.1')
      .replace('auth-db2088.hstgr.io', '127.0.0.1')
      .replace('148.222.53.51', '127.0.0.1');
  }
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

globalForPrisma.prisma = prisma

export default prisma