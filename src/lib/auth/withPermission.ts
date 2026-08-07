import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWTPayload } from 'jose';
import { requireAuth } from '@/lib/auth';
import { checkPermission } from './checkPermission';

/**
 * The context passed to every protected route handler.
 * `payload` is the verified JWT — use payload.id and payload.email
 * without calling requireAuth() again inside the handler.
 */
export type PermissionContext = {
  params: Promise<Record<string, string>>;
  payload: JWTPayload;
};

type RouteHandler = (
  req: NextRequest,
  context: PermissionContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps a route handler with:
 *  1. JWT authentication (reads the `auth-token` cookie)
 *  2. Permission enforcement via `checkPermission(userId, module, action)`
 *
 * The verified payload is forwarded to the handler as `context.payload`
 * so handlers never need to call requireAuth() themselves.
 */
export function withPermission(
  module: string,
  action: string,
  handler: RouteHandler,
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const payload = await requireAuth();

      if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      }

      const userId = Number(payload.id);
      if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
      }

      const hasPerm = await checkPermission(userId, module, action);

      if (!hasPerm) {
        return NextResponse.json(
          { error: `Forbidden: Missing permission ${module}:${action}` },
          { status: 403 },
        );
      }

      // Forward the verified payload so handlers don't re-authenticate
      return await handler(req, { params: context.params, payload });
    } catch (error) {
      console.error(`[AUTH_MIDDLEWARE] ${module}:${action}`, error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
