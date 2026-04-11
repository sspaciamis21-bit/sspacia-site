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

## API STRUCTURE — 4 PREFIXES
/api/public/**   → No auth. No session. Open to everyone.
/api/auth/**     → Login, logout, /me, signup, profile.
/api/admin/**    → Staff/Admin only. Requires session + withPermission() on every export.
/api/user/**     → Authenticated Customers only. Requires session via requireAuth().

### ABSOLUTE RULES
- NEVER create /api/manager/**, /api/staff/** — use /api/admin/ with permissions.
- NEVER create /api/<resource>/ at root level (e.g. /api/location/)
- The URL path encodes the target audience (Public, Auth, Admin, User)
- If you are unsure which prefix to use → check the table below

### HOW TO DECIDE THE PREFIX
| Condition                               | Prefix        |
|-----------------------------------------|---------------|
| No login needed, public website data    | /api/public/  |
| Auth actions (login, signup, me)        | /api/auth/    |
| Staff/Admin managing DB data            | /api/admin/   |
| Authenticated Customer data/actions     | /api/user/    |

---

## BEFORE CREATING ANY NEW API FILE — CHECKLIST

1. Does this route already exist?
   → Search app/api/ for the resource name before creating anything.
   → If it exists, EDIT it. Do not create a duplicate.

2. Which prefix does it belong to?
   → Use the table above.

3. What is the module and action (for Admin)?
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
| Method | Path                               | Description                         |
|--------|------------------------------------|-------------------------------------|
| GET    | /api/public/cities                 | List active cities                  |
| GET    | /api/public/locations              | List active locations               |
| GET    | /api/public/locations/[slug]       | Single location by slug             |
| GET    | /api/public/products               | List active products                |
| GET    | /api/public/products/[id]          | Single product detail               |
| POST   | /api/public/contact                | Submit contact/inquiry form         |
| GET    | /api/public/book-online            | Data for public booking flow        |
| GET    | /api/public/bookings/booked-slots  | Check seat availability             |

### /api/auth/
| Method | Path               | Description                |
|--------|--------------------|----------------------------|
| POST   | /api/auth/login    | Staff/User login           |
| POST   | /api/auth/logout   | Logout current session     |
| GET    | /api/auth/me       | Current session user       |
| GET    | /api/auth/profile  | Full profile for dashboard |
| POST   | /api/auth/signup   | Customer registration      |

### /api/admin/
| Method | Path                                          | Permission           | Description |
|--------|-----------------------------------------------|----------------------|-------------|
| GET    | /api/admin/dashboard                          | dashboard:view       | Stats and recent activity for staff |
| GET    | /api/admin/cities                             | locations:read       | |
| POST   | /api/admin/cities                             | locations:create     | |
| GET    | /api/admin/cities/[id]                        | locations:read       | |
| PATCH  | /api/admin/cities/[id]                        | locations:update     | |
| DELETE | /api/admin/cities/[id]                        | locations:delete     | |
| GET    | /api/admin/locations                          | locations:read       | |
| POST   | /api/admin/locations                          | locations:create     | |
| GET    | /api/admin/locations/[id]                     | locations:read       | |
| PATCH  | /api/admin/locations/[id]                     | locations:update     | |
| DELETE | /api/admin/locations/[id]                     | locations:delete     | |
| GET    | /api/admin/products                           | products:read        | |
| POST   | /api/admin/products                           | products:create      | |
| GET    | /api/admin/products/[id]                      | products:read        | |
| PATCH  | /api/admin/products/[id]                      | products:update      | |
| DELETE | /api/admin/products/[id]                      | products:delete      | |
| GET    | /api/admin/products/[id]/pricing              | products:read        | |
| POST   | /api/admin/products/[id]/pricing              | products:update      | |
| GET    | /api/admin/products/[id]/amenities            | products:read        | |
| POST   | /api/admin/products/[id]/images               | products:update      | |
| GET    | /api/admin/documents                          | documents:view       | List all documents |
| POST   | /api/admin/documents/drive-upload             | documents:create     | Drive upload + record creation |
| PATCH  | /api/admin/documents                          | documents:approve    | Approve/Reject KYC |
| POST   | /api/admin/checkout                           | payments:create      | Create Razorpay order |
| POST   | /api/admin/checkout/verify                    | payments:create      | Verify payment & update booking |
| GET    | /api/admin/customers                          | customers:read       | |
| POST   | /api/admin/customers                          | customers:create     | |
| GET    | /api/admin/customers/[id]                     | customers:read       | |
| PATCH  | /api/admin/customers/[id]                     | customers:update     | |
| GET    | /api/admin/bookings                            | bookings:read        | |
| POST   | /api/admin/bookings                            | bookings:create      | |
| PATCH  | /api/admin/bookings                            | bookings:update      | |
| GET    | /api/admin/tickets                             | tickets:read         | |
| PATCH  | /api/admin/tickets                             | tickets:update       | |
| GET    | /api/admin/users                               | users:read           | |
| POST   | /api/admin/users                               | users:create         | |
| GET    | /api/admin/roles                               | roles:read           | |
| PATCH  | /api/admin/roles/[id]/permissions              | roles:manage         | |
| GET    | /api/admin/permissions                         | roles:read           | List all system permissions |
| GET    | /api/admin/stats                               | dashboard:view       | Basic numerical stats |
| GET    | /api/admin/contract-requests                    | clm:view             | List all contract requests |
| PATCH  | /api/admin/contract-requests/[id]               | clm:update           | Accept/Reject request |
| GET    | /api/admin/contracts                            | clm:view             | List all contracts |
| POST   | /api/admin/contracts                            | clm:create           | Create contract draft |
| GET    | /api/admin/contracts/[id]                       | clm:view             | Full contract details |
| POST   | /api/admin/contracts/[id]/versions              | clm:create           | Create new version |
| POST   | /api/admin/contracts/[id]/negotiate             | clm:update           | Managers responding to comments |
| POST   | /api/admin/contracts/[id]/send                  | clm:update           | Send to customer review |
| POST   | /api/admin/contracts/[id]/finalise              | clm:approve          | GAS PDF generation |
| ANY    | /api/admin/config/**                          | settings:update      | All Lookup table management |

### /api/user/ (Customers)
| Method | Path                           | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | /api/user/dashboard            | Customer dashboard stats & summary   |
| GET    | /api/user/bookings             | Customer's own bookings              |
| POST   | /api/user/bookings/request     | Submit a new purchase/booking request|
| GET    | /api/user/products             | Products available for booking       |
| GET    | /api/user/tickets              | Customer's support tickets           |
| POST   | /api/user/upload-image         | Upload profile/doc image             |
| GET    | /api/user/documents/status     | Check KYC/Agreements status          |
| POST   | /api/user/contracts/request    | Request a contract for booking       |
| GET    | /api/user/contracts            | List user's contracts                |
| GET    | /api/user/contracts/[id]       | User contract detail + timeline      |
| POST   | /api/user/contracts/[id]/negotiate | Customer adds comment/revision req |
| POST   | /api/user/contracts/[id]/sign  | E-Signature submission               |

---

## MODULE → PERMISSION MAP

| Module    | Actions                           |
|-----------|-----------------------------------|
| bookings  | read, create, update, delete      |
| payments  | read, create, refund              |
| products  | read, create, update, delete      |
| customers | read, create, update, delete      |
| users     | read, create, update, delete      |
| roles     | read, manage                      |
| tickets   | read, create, update, assign      |
| locations | read, create, update, delete      |
| settings  | read, update                      |
| reports   | read, export                      |
| dashboard | view                              |
| clm       | view, create, update, delete, approve, reject, sign |

---

## CODE STANDARDS

### Auth & Session
- Use `requireAuth()` from `@/lib/auth` to get the JWT payload in any route.
- For Admin routes, wrap with `withPermission(module, action, handler)`.

### Imports
```ts
import { prisma } from "@/lib/prisma"
import { withPermission } from "@/lib/auth/withPermission"
import { requireAuth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
```

### Route handler pattern (Admin)
```ts
export const GET = withPermission("module", "read", async (req) => {
  // payload is available via requireAuth() internally in withPermission
  // but you can call await requireAuth() if you need IDs manually
  try {
    const data = await prisma.model.findMany({ 
      where: { isActive: true },
      select: { id: true, name: true } 
    })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
```

### Response shape (never deviate)
```ts
// Success list
{ data: [...], meta?: { total, page, limit, totalPages } }

// Success single / created
{ data: {...}, message?: "..." }

// Error
{ error: "human readable message", code?: "OPTIONAL_ERROR_CODE" }
```

### Prisma rules
- Always use `select: {}` — never return a raw model object.
- Use `isActive: true` on lookups.
- Use `$transaction` for atomic multiple writes.

### Activity log (every write)
```ts
await prisma.activityLog.create({
  data: {
    userId: payload.id, // from requireAuth()
    action: "CREATE" | "UPDATE" | "DELETE",
    module: "<module>",
    recordId: result.id,
    oldData: JSON.stringify(before) ?? null,
    newData: JSON.stringify(result) ?? null,
  }
})
```

---

## WHAT NEVER TO DO

- ✗ Hardcode role names ("ADMIN", "MANAGER") in logic — use permissions.
- ✗ Hardcode status strings ("CONFIRMED") — use IDs or find by name.
- ✗ Skip wrapping /api/admin/ routes with withPermission.
- ✗ Return Prisma objects without explicit select.
- ✗ Expose raw error.message to the client.
- ✗ Create folders outside /api/public/, /api/auth/, /api/admin/, /api/user/

---

## Source of Truth
This file is the primary record of the API contract. Update it every time you modify an endpoint.

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
```