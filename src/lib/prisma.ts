import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as typeof global & {
  prisma?: PrismaClient
}

function getDatabaseUrl(): string {
  const isLinux = process.platform === 'linux';
  let dbUrl = (isLinux && process.env.DATABASE_URL_PROD)
    ? process.env.DATABASE_URL_PROD
    : (process.env.DATABASE_URL || 'mysql://u434618106_vrajesh_test:ShriShyam%231234@srv2088.hstgr.io:3306/u434618106_sspacia_test');

  // If running in production on Hostinger Linux server, Hostinger's internal firewall
  // blocks outbound connections to its own external IP/hostname on port 3306.
  // In that environment, it connects locally to 127.0.0.1:3306 (matches Hostinger's phpMyAdmin).
  if (isLinux) {
    if (dbUrl.includes('srv2088.hstgr.io') || dbUrl.includes('auth-db2088.hstgr.io') || dbUrl.includes('148.222.53.51')) {
      dbUrl = dbUrl
        .replace('srv2088.hstgr.io', '127.0.0.1')
        .replace('auth-db2088.hstgr.io', '127.0.0.1')
        .replace('148.222.53.51', '127.0.0.1');
    }
  }

  // Ensure connection pool and timeout parameters are present to prevent Tokio runtime panics
  if (!dbUrl.includes('connection_limit')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}connection_limit=10&pool_timeout=30&connect_timeout=20`;
  }

  return dbUrl;
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function isPrismaPanic(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err?.stack || err || '');
  return (
    msg.includes('PANIC') ||
    msg.includes('timer has gone away') ||
    msg.includes('RustPanicError') ||
    msg.includes('Query engine library has panicked') ||
    msg.includes('non-recoverable error') ||
    msg.includes('Engine is not running')
  );
}

function getRawPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

function resetPrisma(): PrismaClient {
  console.warn('[Prisma Auto-Recovery] Discarding crashed Query Engine and initializing fresh client...');
  try {
    globalForPrisma.prisma?.$disconnect().catch(() => {});
  } catch (_) {}
  globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

// Resilient Proxy: intercepts queries. If the query engine has a panic ("timer has gone away"),
// it immediately discards the dead instance, spins up a fresh client, and retries the query seamlessly.
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const raw = getRawPrisma();
    const val = (raw as any)[prop];

    // Top-level methods: $queryRaw, $executeRaw, $transaction, $disconnect, etc.
    if (typeof val === 'function') {
      return async function (...args: any[]) {
        try {
          return await (getRawPrisma() as any)[prop](...args);
        } catch (err: any) {
          if (isPrismaPanic(err)) {
            const fresh = resetPrisma();
            return await (fresh as any)[prop](...args);
          }
          throw err;
        }
      };
    }

    // Model properties: prisma.user, prisma.invoiceRecord, prisma.clientMaster, etc.
    if (typeof val === 'object' && val !== null) {
      return new Proxy(val, {
        get(modelTarget, modelProp: string | symbol) {
          const method = modelTarget[modelProp];
          if (typeof method === 'function') {
            return async function (...args: any[]) {
              try {
                return await ((getRawPrisma() as any)[prop] as any)[modelProp](...args);
              } catch (err: any) {
                if (isPrismaPanic(err)) {
                  const fresh = resetPrisma();
                  return await ((fresh as any)[prop] as any)[modelProp](...args);
                }
                throw err;
              }
            };
          }
          return method;
        },
      });
    }

    return val;
  },
});

export default prisma