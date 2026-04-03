# Project Agent Instructions
> Read this entire file before creating, editing, or deleting any API route.
> This is the single source of truth for API structure in this project.

---

## STACK
- Next.js 15 (App Router)
- Prisma + MySQL
- TypeScript strict mode
- Auth: next-auth (session.user.id = logged-in staff User ID)

---

## API STRUCTURE — 3 PREFIXES ONLY

/api/public/**   → No auth. No session. Open to everyone.
/api/auth/**     → Login, logout, /me only.
/api/admin/**    → Requires session + withPermission() on every export.

### ABSOLUTE RULES
- NEVER create /api/user/**, /api/manager/**, /api/staff/**
- NEVER create /api/<resource>/ at root level (e.g. /api/location/)
- The URL path NEVER encodes a role — roles are enforced inside handlers only
- If you are unsure which prefix to use → check the table below

### HOW TO DECIDE THE PREFIX
| Condition                              | Prefix        |
|----------------------------------------|---------------|
| No login needed, public website data   | /api/public/  |
| Login/logout/session                   | /api/auth/    |
| Anything that reads or writes DB data  | /api/admin/   |

---

## BEFORE CREATING ANY NEW API FILE — CHECKLIST

1. Does this route already exist?
   → Search app/api/ for the resource name before creating anything.
   → If it exists, EDIT it. Do not create a duplicate.

2. Which prefix does it belong to?
   → Use the table above.

3. What is the module and action?
   → Use the permission map below.
   → Every /api/admin/ export must be wrapped with withPermission(module, action, handler).

4. Does the response follow the standard shape?
   → Check the response format section below.

---

## EXISTING API ROUTES
<!-- 
  UPDATE THIS TABLE every time a new route is created or deleted.
  This is how agents know what already exists.
-->

### /api/public/
| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | /api/public/cities            | List active cities           |
| GET    | /api/public/locations         | List active locations        |
| GET    | /api/public/locations/[slug]  | Single location by slug      |
| GET    | /api/public/products          | List active products         |
| GET    | /api/public/products/[slug]   | Single product by slug       |
| POST   | /api/public/inquiry           | Submit contact/inquiry form  |

### /api/auth/
| Method | Path              | Description           |
|--------|-------------------|-----------------------|
| POST   | /api/auth/login   | Staff login           |
| POST   | /api/auth/logout  | Staff logout          |
| GET    | /api/auth/me      | Current session user  |

### /api/admin/
| Method | Path                                      | Permission           |
|--------|-------------------------------------------|----------------------|
| GET    | /api/admin/cities                         | locations:read       |
| POST   | /api/admin/cities                         | locations:create     |
| GET    | /api/admin/cities/[id]                    | locations:read       |
| PATCH  | /api/admin/cities/[id]                    | locations:update     |
| DELETE | /api/admin/cities/[id]                    | locations:delete     |
| GET    | /api/admin/locations                      | locations:read       |
| POST   | /api/admin/locations                      | locations:create     |
| GET    | /api/admin/locations/[id]                 | locations:read       |
| PATCH  | /api/admin/locations/[id]                 | locations:update     |
| DELETE | /api/admin/locations/[id]                 | locations:delete     |
| GET    | /api/admin/products                       | products:read        |
| POST   | /api/admin/products                       | products:create      |
| GET    | /api/admin/products/[id]                  | products:read        |
| PATCH  | /api/admin/products/[id]                  | products:update      |
| DELETE | /api/admin/products/[id]                  | products:delete      |
| GET    | /api/admin/customers                      | customers:read       |
| POST   | /api/admin/customers                      | customers:create     |
| GET    | /api/admin/customers/[id]                 | customers:read       |
| PATCH  | /api/admin/customers/[id]                 | customers:update     |
| DELETE | /api/admin/customers/[id]                 | customers:delete     |
| GET    | /api/admin/bookings                       | bookings:read        |
| POST   | /api/admin/bookings                       | bookings:create      |
| GET    | /api/admin/bookings/[id]                  | bookings:read        |
| PATCH  | /api/admin/bookings/[id]                  | bookings:update      |
| DELETE | /api/admin/bookings/[id]                  | bookings:delete      |
| GET    | /api/admin/payments                       | payments:read        |
| POST   | /api/admin/payments                       | payments:create      |
| GET    | /api/admin/payments/[id]                  | payments:read        |
| PATCH  | /api/admin/payments/[id]                  | payments:update      |
| GET    | /api/admin/tickets                        | tickets:read         |
| POST   | /api/admin/tickets                        | tickets:create       |
| GET    | /api/admin/tickets/[id]                   | tickets:read         |
| PATCH  | /api/admin/tickets/[id]                   | tickets:update       |
| GET    | /api/admin/users                          | users:read           |
| POST   | /api/admin/users                          | users:create         |
| GET    | /api/admin/users/[id]                     | users:read           |
| PATCH  | /api/admin/users/[id]                     | users:update         |
| DELETE | /api/admin/users/[id]                     | users:delete         |
| GET    | /api/admin/roles                          | roles:read           |
| POST   | /api/admin/roles                          | roles:manage         |
| GET    | /api/admin/roles/[id]                     | roles:read           |
| PATCH  | /api/admin/roles/[id]                     | roles:manage         |
| DELETE | /api/admin/roles/[id]                     | roles:manage         |
| PATCH  | /api/admin/roles/[id]/permissions         | roles:manage         |
| GET    | /api/admin/config/product-types           | settings:read        |
| POST   | /api/admin/config/product-types           | settings:update      |
| PATCH  | /api/admin/config/product-types/[id]      | settings:update      |
| GET    | /api/admin/config/duration-types          | settings:read        |
| POST   | /api/admin/config/duration-types          | settings:update      |
| PATCH  | /api/admin/config/duration-types/[id]     | settings:update      |
| GET    | /api/admin/config/space-categories        | settings:read        |
| POST   | /api/admin/config/space-categories        | settings:update      |
| PATCH  | /api/admin/config/space-categories/[id]   | settings:update      |
| GET    | /api/admin/config/booking-statuses        | settings:read        |
| GET    | /api/admin/config/payment-statuses        | settings:read        |
| GET    | /api/admin/config/ticket-statuses         | settings:read        |
| GET    | /api/admin/config/amenities               | settings:read        |
| POST   | /api/admin/config/amenities               | settings:update      |
| PATCH  | /api/admin/config/amenities/[id]          | settings:update      |
| GET    | /api/admin/settings                       | settings:read        |
| PATCH  | /api/admin/settings                       | settings:update      |
| GET    | /api/admin/activity-logs                  | settings:read        |
| GET    | /api/admin/reports/revenue                | reports:read         |
| GET    | /api/admin/reports/occupancy              | reports:read         |
| GET    | /api/admin/reports/bookings               | reports:read         |

---

## MODULE → PERMISSION MAP

| Module    | Actions                          |
|-----------|----------------------------------|
| bookings  | read, create, update, delete     |
| payments  | read, create, refund             |
| products  | read, create, update, delete     |
| customers | read, create, update, delete     |
| users     | read, create, update, delete     |
| roles     | read, manage                     |
| tickets   | read, create, update, assign     |
| locations | read, create, update, delete     |
| settings  | read, update                     |
| reports   | read, export                     |

---

## CODE STANDARDS

### Imports (always use these paths)
```ts
import { prisma } from "@/lib/prisma"
import { withPermission } from "@/lib/auth/withPermission"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
```

### Route handler pattern
```ts
// GET /api/admin/[resource]
export const GET = withPermission("module", "read", async (req) => {
  try {
    const data = await prisma.model.findMany({ where: { isActive: true }, select: {} })
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[MODULE_READ]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

// POST /api/admin/[resource]
export const POST = withPermission("module", "create", async (req) => {
  try {
    const body = await req.json()
    // validate...
    const result = await prisma.model.create({ data: body, select: {} })
    // activity log...
    return NextResponse.json({ data: result, message: "Created successfully" }, { status: 201 })
  } catch (error) {
    console.error("[MODULE_CREATE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
```

### Response shape (never deviate)
```ts
// Success list
{ data: [...], total?: number }

// Success single / created
{ data: {...}, message?: "..." }

// Error
{ error: "human readable message" }

// Status codes
200 → GET / PATCH / DELETE success
201 → POST success
400 → Validation / bad input
401 → No session
403 → No permission
404 → Record not found
500 → Server error
```

### Handler body order
1. Parse & validate input (params, body, querystring)
2. Return 400 if invalid
3. Check record exists for PATCH/DELETE → return 404 if missing
4. Prisma operation
5. Write ActivityLog for CREATE / UPDATE / DELETE
6. Return response

### Prisma rules
- Always use `select: {}` — never return a raw model object
- `where: { isActive: true }` on all lookup table queries
- `parseInt(params.id, 10)` for ID params — return 400 if NaN
- Use `$transaction` when multiple writes must be atomic

### Activity log (every write)
```ts
await prisma.activityLog.create({
  data: {
    userId: session.user.id,
    action: "CREATE" | "UPDATE" | "DELETE",
    module: "<module>",
    recordId: result.id,
    oldData: JSON.stringify(before) ?? null,
    newData: JSON.stringify(result) ?? null,
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  }
})
```

---

## WHAT NEVER TO DO

- ✗ Hardcode role names ("ADMIN", "MANAGER")
- ✗ Hardcode status strings ("CONFIRMED", "PENDING")
- ✗ Skip withPermission on any /api/admin/ route
- ✗ Create a route that already exists in the table above
- ✗ Use `any` type
- ✗ Return Prisma objects without select
- ✗ Expose error.message to the client
- ✗ Create folders outside /api/public/, /api/auth/, /api/admin/
```

---

## Then point each editor to it

**`.cursorrules`**
```
See AGENTS.md at the project root. Follow every instruction in that file before
writing any API route. The existing route table in that file is the source of
truth — check it before creating any new file.
```

**`.windsurfrules`** — same content as above

**`CLAUDE.md`** — same content as above (Claude Code reads this automatically)

**`.github/copilot-instructions.md`** — same content as above

---

## The one habit that makes this actually work

Every time an agent creates or deletes a route, tell it:
```
Update the route table in AGENTS.md to reflect what you just created.