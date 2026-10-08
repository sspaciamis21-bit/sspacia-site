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

  // Normalize connection pool and timeout parameters for Hostinger MySQL stability
  const baseUrl = dbUrl.split('?')[0];
  const queryStr = dbUrl.includes('?') ? dbUrl.split('?')[1] : '';
  const searchParams = new URLSearchParams(queryStr);
  searchParams.set('connection_limit', '5');
  searchParams.set('pool_timeout', '20');
  searchParams.set('connect_timeout', '15');
  searchParams.set('socket_timeout', '30');

  return `${baseUrl}?${searchParams.toString()}`;
}

let keepAliveTimer: NodeJS.Timeout | null = null;
let isExiting = false;

function ensureKeepAlive() {
  if (keepAliveTimer || typeof setInterval !== 'function') return;
  // Send a lightweight ping every 40s to keep MySQL socket active and prevent Hostinger idle wait_timeout drops
  keepAliveTimer = setInterval(async () => {
    try {
      const client = globalForPrisma.prisma;
      if (client) {
        await (client as any).$queryRawUnsafe('SELECT 1');
      }
    } catch (err: any) {
      if (isPrismaPanic(err)) {
        handleFatalPrismaPanic(err);
      }
    }
  }, 40000);

  if (keepAliveTimer.unref) {
    keepAliveTimer.unref();
  }
}

function handleFatalPrismaPanic(err: any) {
  console.error('[Prisma Fatal Engine Panic] Non-recoverable Query Engine panic detected:', err);
  if (isExiting) return;
  isExiting = true;

  // When the Rust Query Engine panics (e.g. "timer has gone away"), the native N-API binary
  // in the current Node.js process is fatally corrupted. In production under PM2 or Docker,
  // exiting immediately triggers a clean sub-second restart, restoring site health instantly.
  if (process.env.NODE_ENV === 'production' && typeof process.exit === 'function') {
    setTimeout(() => {
      process.exit(1);
    }, 150);
  }
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  ensureKeepAlive();
  return client;
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
        if (prop === '$transaction' && Array.isArray(args[0])) {
          try {
            return await (getRawPrisma() as any).$transaction(...args);
          } catch (err: any) {
            const msg = String(err?.message || '');
            if (
              msg.includes('Prisma Client promises') ||
              msg.includes('All elements of the array need to be')
            ) {
              return await Promise.all(args[0]);
            }
            if (isPrismaPanic(err)) {
              const fresh = resetPrisma();
              try {
                return await (fresh as any).$transaction(...args);
              } catch (retryErr: any) {
                return await Promise.all(args[0]);
              }
            }
            throw err;
          }
        }

        try {
          return await (getRawPrisma() as any)[prop](...args);
        } catch (err: any) {
          if (isPrismaPanic(err)) {
            const fresh = resetPrisma();
            try {
              return await (fresh as any)[prop](...args);
            } catch (retryErr: any) {
              if (isPrismaPanic(retryErr)) {
                handleFatalPrismaPanic(retryErr);
              }
              throw retryErr;
            }
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
                  try {
                    return await ((fresh as any)[prop] as any)[modelProp](...args);
                  } catch (retryErr: any) {
                    if (isPrismaPanic(retryErr)) {
                      handleFatalPrismaPanic(retryErr);
                    }
                    throw retryErr;
                  }
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