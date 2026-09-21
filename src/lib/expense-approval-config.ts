/**
 * expense-approval-config.ts
 *
 * onOffSAApproval:
 * Controls whether Super Admin approval is required for expenses uploaded by Accountants.
 *
 * - If `true`: Standard approval workflow takes place (Accountant -> Super Admin -> 3rd Payment Approval).
 * - If `false`: Auto-approve for ACCOUNTANTS ONLY:
 *     1. Step 1 (Acc Check) is auto-approved.
 *     2. Step 2 (SA Approval) is auto-approved.
 *     3. Payment Approval (3rd approval / "Sir Pays") is auto-approved.
 *     4. Accountant can immediately enter and save payable details, bank portal, UTR, date, and disbursal.
 *
 * NOTE: For COMMUNITY MANAGERS (CM), the process is ALWAYS the existing workflow
 * (requires both Accountant Check, Super Admin Approval, and Payment Approval).
 */

export const onOffSAApproval: boolean = false;
