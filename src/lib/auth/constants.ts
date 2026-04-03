/**
 * Centralised auth & domain constants.
 * Import from here — never hardcode these strings inline in routes.
 */

// ─── Role names (must match DB values exactly) ────────────────────────────────
export const ROLES = {
  ADMIN:       'admin',
  SUPER_ADMIN: 'super_admin',
  MANAGER:     'manager',
  MEMBER:      'user',
  CUSTOMER:    'customer',
} as const;

/** Roles that bypass all permission checks */
export const ADMIN_ROLES: string[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/** Roles that represent regular portal members */
export const MEMBER_ROLES: string[] = [ROLES.MEMBER, ROLES.CUSTOMER];

// ─── Ticket status names (must match DB values exactly) ───────────────────────
export const TICKET_STATUS = {
  OPEN:     'OPEN',
  PENDING:  'PENDING',
  RESOLVED: 'RESOLVED',
  CLOSED:   'CLOSED',
} as const;

/** Statuses that mean a ticket is still unresolved */
export const OPEN_TICKET_STATUSES: string[] = [
  TICKET_STATUS.OPEN,
  TICKET_STATUS.PENDING,
];

/** Statuses that mean a ticket is finished */
export const CLOSED_TICKET_STATUSES: string[] = [
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.CLOSED,
];

// ─── Payment status names ─────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PAID:    'PAID',
  PENDING: 'PENDING',
  FAILED:  'FAILED',
} as const;

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT:     100,
} as const;

// ─── Activity log action names ────────────────────────────────────────────────
export const LOG_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
