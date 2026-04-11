# CLM Implementation Agent Prompt

> Paste this prompt into Cursor, Windsurf, Claude Code, or any AI coding agent.
> The agent must read AGENTS.md at the project root before touching any file.

---

## Context

You are implementing a **Contract Lifecycle Management (CLM)** module inside an
existing Next.js 15 (App Router) + Prisma + MySQL project. The project's rules
are in `AGENTS.md` at the root — read it fully before creating any file.

Key constraints from AGENTS.md that apply here:
- API routes live under `/api/public/`, `/api/auth/`, `/api/admin/`, `/api/user/` only.
- Every `/api/admin/` export must be wrapped with `withPermission(module, action, handler)`.
- Every `/api/user/` export must call `requireAuth()`.
- Always use `select: {}` in Prisma — never return a raw model object.
- Every write must produce an `ActivityLog` row.
- Response shape: `{ data }` for success, `{ error }` for failure.
- Use `$transaction` for any multi-table write.

---

## Business rules to keep in mind throughout

1. A **Customer** initiates the contract process by submitting a request. This can
   happen manually or **automatically** when a user submits a purchase request
   via the User Dashboard "Purchase Hub".
2. The **Manager** (admin) reviews the request, then writes the contract body   in
   a rich text editor. Content is stored as JSON in the database — no PDF yet.
3. Every time the manager saves an edit, a new `ContractVersion` row is created
   (version number auto-increments per contract). The previous version is never
   mutated.
4. The manager sends the contract for review. The customer reads the rendered
   text (read-only). They may approve it (Accept Terms) or open a **negotiation thread**.
5. A negotiation thread has messages from both sides. The manager edits the
   document in response, creating another version. This loop repeats in real-time.
6. When the customer is satisfied, they click **Accept Terms**. This transitions the
   status to `ACCEPTED` and locks the negotiation.
7. The customer then submits a **digital signature**. Upon successful signature,
   the system **automatically generates a PDF**, archives it in Google Drive,
   and transitions the status to `SIGNED`.
8. The signature is stored with the IP address, timestamp, and the exact `ContractVersion` id that was signed.

8. Status transitions are strictly enforced:
   ```
   REQUESTED → DRAFT → SENT → NEGOTIATION → SENT → … → PENDING_SIGN → SIGNED
                                                      ↘ TERMINATED
   SIGNED → EXPIRED | TERMINATED
   ```
   Any PATCH that tries to skip or reverse a step must be rejected with 400.

---

## Step 1 — Prisma schema

**File:** `prisma/schema.prisma`

Add the following models **in this exact order** after the existing `Document`
model. Do not remove or alter any existing model.

```prisma
// ── CONTRACT STATUS LOOKUP ───────────────────────────────────────────────────
model ContractStatus {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  displayName String
  color       String?
  isFinal     Boolean    @default(false)
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  contracts   Contract[]
}

// ── CONTRACT REQUEST (customer initiates) ───────────────────────────────────
model ContractRequest {
  id           Int       @id @default(autoincrement())
  customerId   Int
  bookingId    Int?
  requestNote  String?   @db.Text
  status       String    @default("PENDING") // PENDING | ACCEPTED | REJECTED
  rejectedNote String?   @db.Text
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  customer     Customer  @relation(fields: [customerId], references: [id])
  booking      Booking?  @relation(fields: [bookingId], references: [id])
  contract     Contract?

  @@index([customerId])
  @@index([status])
}

// ── CONTRACT ─────────────────────────────────────────────────────────────────
model Contract {
  id               Int                   @id @default(autoincrement())
  contractNumber   String                @unique
  requestId        Int                   @unique
  bookingId        Int
  statusId         Int
  title            String
  expiresAt        DateTime?
  notes            String?               @db.Text
  createdById      Int
  finalDriveFileId String?
  finalDriveUrl    String?               @db.Text
  finalVersionId   Int?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
  request          ContractRequest       @relation(fields: [requestId], references: [id])
  booking          Booking               @relation(fields: [bookingId], references: [id])
  status           ContractStatus        @relation(fields: [statusId], references: [id])
  createdBy        User                  @relation("ContractCreator", fields: [createdById], references: [id])
  versions         ContractVersion[]
  negotiations     ContractNegotiation[]
  signature        ContractSignature?

  @@index([bookingId])
  @@index([statusId])
  @@index([contractNumber])
}

// ── CONTRACT VERSION (rich text in DB) ───────────────────────────────────────
model ContractVersion {
  id            Int      @id @default(autoincrement())
  contractId    Int
  versionNumber Int
  content       String   @db.LongText  // Tiptap JSON stringified
  changeNote    String?  @db.Text
  createdById   Int
  createdAt     DateTime @default(now())
  contract      Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdBy     User     @relation("VersionCreator", fields: [createdById], references: [id])

  @@unique([contractId, versionNumber])
  @@index([contractId])
}

// ── CONTRACT NEGOTIATION ─────────────────────────────────────────────────────
model ContractNegotiation {
  id          Int                  @id @default(autoincrement())
  contractId  Int
  customerId  Int?
  status      String               @default("OPEN") // OPEN | ACCEPTED | REJECTED | WITHDRAWN
  title       String
  resolvedAt  DateTime?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  contract    Contract             @relation(fields: [contractId], references: [id], onDelete: Cascade)
  customer    Customer?            @relation(fields: [customerId], references: [id])
  messages    NegotiationMessage[]

  @@index([contractId])
  @@index([status])
}

// ── NEGOTIATION MESSAGE ───────────────────────────────────────────────────────
model NegotiationMessage {
  id               Int                 @id @default(autoincrement())
  negotiationId    Int
  authorType       String              // CUSTOMER | STAFF
  authorCustomerId Int?
  authorUserId     Int?
  body             String              @db.Text
  attachmentUrl    String?             @db.Text
  createdAt        DateTime            @default(now())
  negotiation      ContractNegotiation @relation(fields: [negotiationId], references: [id], onDelete: Cascade)
  authorCustomer   Customer?           @relation(fields: [authorCustomerId], references: [id])
  authorUser       User?               @relation(fields: [authorUserId], references: [id])

  @@index([negotiationId])
}

// ── CONTRACT SIGNATURE ────────────────────────────────────────────────────────
model ContractSignature {
  id                Int      @id @default(autoincrement())
  contractId        Int      @unique
  contractVersionId Int
  signedById        Int
  signatureData     String   @db.LongText  // base64 PNG
  ipAddress         String?
  userAgent         String?  @db.Text
  signedAt          DateTime @default(now())
  contract          Contract @relation(fields: [contractId], references: [id])
  signedBy          Customer @relation(fields: [signedById], references: [id])

  @@index([contractId])
}
```

After adding all models, add back-relations to existing models:

- `Customer`: add `contractRequests ContractRequest[]`, `negotiations ContractNegotiation[]`, `negotiationMessages NegotiationMessage[]`, `signatures ContractSignature[]`
- `Booking`: add `contractRequests ContractRequest[]`, `contracts Contract[]`
- `User`: add `contractsCreated Contract[] @relation("ContractCreator")`, `contractVersions ContractVersion[] @relation("VersionCreator")`, `negotiationMessages NegotiationMessage[]`

Then run:
```bash
npx prisma migrate dev --name add_clm_module
npx prisma generate
```

---

## Step 2 — Seed contract statuses

**File:** `prisma/seed-clm.ts` (run it once after migration)

Create a standalone seed file that upserts these `ContractStatus` rows:

| name | displayName | color | isFinal | sortOrder |
|------|-------------|-------|---------|-----------|
| REQUESTED | Requested | #6B7280 | false | 1 |
| DRAFT | Draft | #F59E0B | false | 2 |
| SENT | Sent for Review | #3B82F6 | false | 3 |
| NEGOTIATION | In Negotiation | #F97316 | false | 4 |
| PENDING_SIGN | Pending Signature | #8B5CF6 | false | 5 |
| SIGNED | Signed | #10B981 | true | 6 |
| EXPIRED | Expired | #EF4444 | true | 7 |
| TERMINATED | Terminated | #DC2626 | true | 8 |

Use `prisma.contractStatus.upsert({ where: { name }, update: {}, create: { ... } })` for each row.

---

## Step 3 — Shared helper

**File:** `lib/clm/transitions.ts`

```ts
// Allowed status transitions. Key = current status name, value = allowed next names.
export const CONTRACT_TRANSITIONS: Record<string, string[]> = {
  REQUESTED:    ["DRAFT"],
  DRAFT:        ["SENT", "TERMINATED"],
  SENT:         ["NEGOTIATION", "ACCEPTED", "TERMINATED"],
  NEGOTIATION:  ["SENT", "ACCEPTED", "TERMINATED"],
  ACCEPTED:     ["PENDING_SIGN", "TERMINATED"],
  PENDING_SIGN: ["SIGNED", "TERMINATED"],
  SIGNED:       ["EXPIRED", "TERMINATED"],
  EXPIRED:      [],
  TERMINATED:   [],
};


export function canTransition(from: string, to: string): boolean {
  return (CONTRACT_TRANSITIONS[from] ?? []).includes(to);
}
```

**File:** `lib/clm/contractNumber.ts`

```ts
import { prisma } from "@/lib/prisma";

export async function generateContractNumber(): Promise<string> {
  const count = await prisma.contract.count();
  const year = new Date().getFullYear();
  return `CLM-${year}-${String(count + 1).padStart(4, "0")}`;
}
```

---

## Step 4 — Customer API routes

### 4a. Submit a contract request

**File:** `app/api/user/contracts/request/route.ts`

- Method: `POST`
- Auth: `requireAuth()` — the JWT must carry `customerId`
- Body: `{ bookingId?: number, requestNote?: string }`
- Logic:
  1. Validate the customer exists and is active.
  2. If `bookingId` provided, confirm the booking belongs to this customer.
  3. Create `ContractRequest` with `status: "PENDING"`.
  4. Write `ActivityLog` (action: `"CREATE"`, module: `"contracts"`).
- Response: `{ data: { id, contractNumber: null, status: "PENDING" }, message: "Request submitted" }`

### 4b. List own contract requests and contracts

**File:** `app/api/user/contracts/route.ts`

- Method: `GET`
- Auth: `requireAuth()`
- Returns all `ContractRequest` rows for this customer, each including its linked
  `Contract` (if one exists). Include the latest `ContractVersion` versionNumber
  and the contract status name.
- Select only: `id, status, requestNote, createdAt, contract.{ id, contractNumber, status.displayName, versions.{ versionNumber } }`

### 4c. View a single contract (text + negotiations)

**File:** `app/api/user/contracts/[id]/route.ts`

- Method: `GET`
- Auth: `requireAuth()`
- Verify the contract's booking belongs to this customer. Return 403 otherwise.
- Return:
  - Contract metadata (number, title, status, expiresAt)
  - Latest `ContractVersion` content (the Tiptap JSON) — this is what the
    customer reads. Do not return all versions.
  - All `ContractNegotiation` rows with status `OPEN`, each including their
    `NegotiationMessage` list ordered by `createdAt ASC`.
  - `finalDriveUrl` if the contract is `PENDING_SIGN` or `SIGNED`.

### 4d. Open a negotiation thread

**File:** `app/api/user/contracts/[id]/negotiate/route.ts`

- Method: `POST`
- Auth: `requireAuth()`
- Body: `{ title: string, message: string }`
- Guard: contract status must be `SENT`. Return 400 if not.
- Logic:
  1. Create `ContractNegotiation` (`status: "OPEN"`, `customerId`).
  2. Create first `NegotiationMessage` (`authorType: "CUSTOMER"`, `authorCustomerId`).
  3. Update `Contract.statusId` → `NEGOTIATION` status id.
  4. Write `ActivityLog`.
- Response: `{ data: { negotiationId }, message: "Negotiation opened" }`

### 4e. Reply to an existing negotiation thread

**File:** `app/api/user/contracts/[id]/negotiate/[nid]/route.ts`

- Method: `POST`
- Auth: `requireAuth()`
- Body: `{ message: string, attachmentUrl?: string }`
- Guard: negotiation must belong to this contract and have status `OPEN`.
- Create `NegotiationMessage` (`authorType: "CUSTOMER"`).
- Response: `{ data: { messageId } }`

### 4f. Submit digital signature

**File:** `app/api/user/contracts/[id]/sign/route.ts`

- Method: `POST`
- Auth: `requireAuth()`
- Body: `{ signatureData: string }` — base64 PNG string from canvas
- Logic:
  1. Verify status is `PENDING_SIGN` or `ACCEPTED`.
  2. In a `$transaction`:
     - Create `ContractSignature`.
     - Update status to `SIGNED`.
  3. **Post-Transaction**: Trigger `generateContractPDF` utility to create the final document and upload to Google Drive.
- Response: `{ data: { signedAt }, message: "Agreement Signed & Archived" }`

### 4g. Accept Terms

**File:** `app/api/user/contracts/[id]/accept/route.ts`

- Method: `POST`
- Auth: `requireAuth()`
- Logic:
  1. Transition status from `SENT` or `NEGOTIATION` to `ACCEPTED`.
  2. Write `ActivityLog`.
- Response: `{ message: "Terms accepted. Proceed to signature." }`


---

## Step 5 — Admin API routes

All admin routes use `withPermission`. Use the `"bookings"` module with the
actions listed below.

### 5a. List contract requests

**File:** `app/api/admin/contract-requests/route.ts`

- Method: `GET`, permission: `bookings:read`
- Query params: `status` (default `PENDING`), `page`, `limit`
- Return: list of `ContractRequest` with customer name + email + organization, 
  booking number, product name, location name, requestNote, status, createdAt.

### 5b. Accept or reject a request

**File:** `app/api/admin/contract-requests/[id]/route.ts`

- Method: `PATCH`, permission: `bookings:update`
- Body: `{ action: "ACCEPT" | "REJECT", rejectedNote?: string }`
- If `REJECT`: set `ContractRequest.status = "REJECTED"`, store `rejectedNote`.
- If `ACCEPT`: set `ContractRequest.status = "ACCEPTED"`. Do not create the
  contract yet — the manager creates it explicitly in the next step.
- Write `ActivityLog`.

### 5c. Create contract (manager writes the document)

**File:** `app/api/admin/contracts/route.ts`

- Method: `POST`, permission: `bookings:create`
- Body: `{ requestId: number, bookingId: number, title: string, content: string, changeNote?: string, expiresAt?: string }`
  - `content` is a Tiptap JSON string representing the first draft.
- Logic (`$transaction`):
  1. Verify `ContractRequest` exists and has status `ACCEPTED`.
  2. Generate `contractNumber` via `generateContractNumber()`.
  3. Resolve the `DRAFT` status id from `ContractStatus`.
  4. Create `Contract`.
  5. Create `ContractVersion` with `versionNumber: 1`, `content`, `createdById: payload.id`.
  6. Write `ActivityLog`.
- Response: `{ data: { id, contractNumber } }`

- Method: `GET`, permission: `bookings:read`
- Return list with: id, contractNumber, title, status.displayName, customer name,
  createdAt, latest versionNumber, open negotiation count.

### 5d. Get single contract (full detail)

**File:** `app/api/admin/contracts/[id]/route.ts`

- Method: `GET`, permission: `bookings:read`
- Return everything: contract metadata, all versions (id, versionNumber,
  changeNote, createdBy.name, createdAt — **not** the content, to avoid large
  payloads), all negotiations with their messages, signature if exists.

- Method: `PATCH`, permission: `bookings:update`
- Body: `{ statusId?: number, title?: string, notes?: string, expiresAt?: string }`
- If `statusId` is provided, validate the transition with `canTransition()`.
  Return 400 with `{ error: "Invalid status transition" }` on failure.
- Write `ActivityLog` with `oldData` and `newData`.

### 5e. Save a new version (edit the document)

**File:** `app/api/admin/contracts/[id]/versions/route.ts`

- Method: `POST`, permission: `bookings:update`
- Body: `{ content: string, changeNote?: string }`
- Guard: contract must not have status `PENDING_SIGN`, `SIGNED`, `EXPIRED`, or
  `TERMINATED`. Return 400 if it does — the document is locked.
- Logic (`$transaction`):
  1. Find the current highest `versionNumber` for this contract.
  2. Create `ContractVersion` with `versionNumber + 1`.
  3. Write `ActivityLog`.
- Response: `{ data: { versionNumber } }`

- Method: `GET`, permission: `bookings:read`
- Return all versions for this contract (id, versionNumber, changeNote,
  createdBy.name, createdAt). No content field in the list.

### 5f. Get a specific version's content

**File:** `app/api/admin/contracts/[id]/versions/[vid]/route.ts`

- Method: `GET`, permission: `bookings:read`
- Return: `{ data: { versionNumber, content, changeNote, createdBy.name, createdAt } }`
- This is the only endpoint that returns the full `content` field.

### 5g. Send for review (status transition shortcut)

**File:** `app/api/admin/contracts/[id]/send/route.ts`

- Method: `POST`, permission: `bookings:update`
- No body needed.
- Validates current status is `DRAFT` or `NEGOTIATION` (after edits).
- Transitions to `SENT`.
- Writes `ActivityLog`.

### 5h. Respond to a negotiation thread

**File:** `app/api/admin/contracts/[id]/negotiations/[nid]/route.ts`

- Method: `POST`, permission: `bookings:update`
- Body: `{ message: string, action?: "ACCEPT" | "REJECT", attachmentUrl?: string }`
- Always creates a `NegotiationMessage` (`authorType: "STAFF"`, `authorUserId: payload.id`).
- If `action === "ACCEPT"`: set `ContractNegotiation.status = "ACCEPTED"`, set `resolvedAt`.
- If `action === "REJECT"`: set `ContractNegotiation.status = "REJECTED"`, set `resolvedAt`.
- Write `ActivityLog`.
- Response: `{ data: { messageId }, message: "Response sent" }`

### 5i. Finalise — generate PDF and lock the document

**File:** `app/api/admin/contracts/[id]/finalise/route.ts`

- Method: `POST`, permission: `bookings:update`
- No body.
- Guards:
  1. Contract status must be `SENT`. Return 400 otherwise.
  2. All `ContractNegotiation` rows must have status `ACCEPTED`, `REJECTED`, or
     `WITHDRAWN` — no `OPEN` threads. Return 400 with the count of open threads.
- Logic:
  1. Fetch the latest `ContractVersion` content.
  2. Call the Google Apps Script web app (see Step 6) with the rendered HTML.
     The script returns `{ fileId, webViewLink }`.
  3. In a `$transaction`:
     - Set `Contract.finalDriveFileId`, `Contract.finalDriveUrl`,
       `Contract.finalVersionId` (latest version id).
     - Transition status to `PENDING_SIGN`.
  4. Write `ActivityLog`.
- Response: `{ data: { finalDriveUrl }, message: "Contract finalised and PDF generated" }`

---

## Step 6 — Google Apps Script

**File:** `apps-script/upload.gs` (deploy as a web app: execute as Me, access Anyone)

```javascript
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var html    = payload.html;        // rendered HTML string of the contract
    var fileName = payload.fileName;   // e.g. "CLM-2024-0001.pdf"
    var folderId = payload.folderId;   // Drive folder ID from env

    var blob = HtmlService
      .createHtmlOutput(html)
      .getBlob()
      .setName(fileName);

    var folder = DriveApp.getFolderById(folderId);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService
      .createTextOutput(JSON.stringify({
        fileId: file.getId(),
        webViewLink: file.getUrl()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Add two env vars to your Next.js project:
```
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
DRIVE_CONTRACTS_FOLDER_ID=your_drive_folder_id
```

The `finalise` route calls it like this:
```ts
const res = await fetch(process.env.APPS_SCRIPT_URL!, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    html: renderedHtml,   // convert Tiptap JSON → HTML before this call
    fileName: `${contract.contractNumber}.pdf`,
    folderId: process.env.DRIVE_CONTRACTS_FOLDER_ID,
  }),
});
const { fileId, webViewLink, error } = await res.json();
if (error) throw new Error(error);
```

---

## Step 7 — AGENTS.md update

After all routes are created, update the route table in `AGENTS.md`.

Add to `/api/user/` table:

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/user/contracts/request | Submit a contract request |
| GET | /api/user/contracts | List own requests and contracts |
| GET | /api/user/contracts/[id] | View contract text + negotiations |
| POST | /api/user/contracts/[id]/negotiate | Open a negotiation thread |
| POST | /api/user/contracts/[id]/negotiate/[nid] | Reply to a negotiation thread |
| POST | /api/user/contracts/[id]/accept | Accept contract terms |
| POST | /api/user/contracts/[id]/sign | Submit digital signature & Generate PDF |


Add to `/api/admin/` table:

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/admin/contract-requests | bookings:read | List contract requests |
| PATCH | /api/admin/contract-requests/[id] | bookings:update | Accept or reject a request |
| GET | /api/admin/contracts | bookings:read | List all contracts |
| POST | /api/admin/contracts | bookings:create | Create contract from accepted request |
| GET | /api/admin/contracts/[id] | bookings:read | Full contract detail |
| PATCH | /api/admin/contracts/[id] | bookings:update | Update metadata / status |
| POST | /api/admin/contracts/[id]/send | bookings:update | Send for customer review |
| GET | /api/admin/contracts/[id]/versions | bookings:read | List versions (no content) |
| POST | /api/admin/contracts/[id]/versions | bookings:update | Save new version |
| GET | /api/admin/contracts/[id]/versions/[vid] | bookings:read | Get one version with content |
| POST | /api/admin/contracts/[id]/negotiations/[nid] | bookings:update | Respond to negotiation |
| POST | /api/admin/contracts/[id]/finalise | bookings:update | Generate PDF and lock |

### Integrated Booking Flow:
- **`POST /api/user/bookings/request`**: This route now performs a dual action. It creates a `Booking` and immediately creates a linked `ContractRequest` (status: PENDING) so the manager can start the agreement process immediately.

---

## Execution order for the agent

Execute the steps in this exact sequence. Do not skip or reorder.

```
1. Read AGENTS.md fully.
2. Execute Step 1  — add Prisma models + run migration.
3. Execute Step 2  — seed ContractStatus rows.
4. Execute Step 3  — create lib/clm/transitions.ts and lib/clm/contractNumber.ts.
5. Execute Step 4a — POST /api/user/contracts/request
6. Execute Step 4b — GET  /api/user/contracts
7. Execute Step 4c — GET  /api/user/contracts/[id]
8. Execute Step 4d — POST /api/user/contracts/[id]/negotiate
9. Execute Step 4e — POST /api/user/contracts/[id]/negotiate/[nid]
10. Execute Step 4f — POST /api/user/contracts/[id]/sign
11. Execute Step 5a — GET  /api/admin/contract-requests
12. Execute Step 5b — PATCH /api/admin/contract-requests/[id]
13. Execute Step 5c — GET + POST /api/admin/contracts
14. Execute Step 5d — GET + PATCH /api/admin/contracts/[id]
15. Execute Step 5e — GET + POST /api/admin/contracts/[id]/versions
16. Execute Step 5f — GET /api/admin/contracts/[id]/versions/[vid]
17. Execute Step 5g — POST /api/admin/contracts/[id]/send
18. Execute Step 5h — POST /api/admin/contracts/[id]/negotiations/[nid]
19. Execute Step 5i — POST /api/admin/contracts/[id]/finalise
20. Execute Step 6  — create apps-script/upload.gs, add env vars.
21. Execute Step 7  — update AGENTS.md route table.
```

After each step, confirm the file compiles (no TypeScript errors) before moving
to the next step. If a step fails, fix it before proceeding.

---

## Definition of done

The implementation is complete when:

- [ ] `npx prisma migrate dev` runs without errors.
- [ ] `npx prisma generate` runs without errors.
- [ ] All 19 route files exist with no TypeScript errors.
- [ ] Every `/api/admin/` route is wrapped with `withPermission`.
- [ ] Every `/api/user/` route calls `requireAuth()`.
- [ ] Every write operation has a corresponding `ActivityLog` entry.
- [ ] `canTransition()` is called on every status change — invalid transitions return HTTP 400.
- [ ] The finalise route returns HTTP 400 if any negotiation thread is still `OPEN`.
- [ ] The sign route returns HTTP 400 if `finalVersionId` is null (PDF not yet generated).
- [ ] AGENTS.md route table is updated with all new routes.
- [ ] `apps-script/upload.gs` exists and the two env vars are documented in `.env.example`.