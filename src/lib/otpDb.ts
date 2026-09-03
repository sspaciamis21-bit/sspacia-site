import prisma from '@/lib/prisma';

export type OtpPurpose = 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'REGISTRATION';

export interface OtpRow {
  id: number;
  email: string;
  otp: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

export const OTP_VALIDITY_MINUTES = 4;
export const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000; // 240,000 ms

/**
 * Generates a random 6-digit numeric OTP code
 */
export function generateNumericOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

/**
 * Creates and stores a new OTP for an email and purpose.
 * Invalidates any previous unverified OTPs for the same email and purpose.
 */
export async function createAndStoreOtp(params: {
  email: string;
  purpose: OtpPurpose;
}): Promise<{ otp: string; expiresAt: Date; expiresInSeconds: number }> {
  const email = params.email.trim().toLowerCase();
  const purpose = params.purpose;
  const otp = generateNumericOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_VALIDITY_MS);

  // Invalidate previous OTPs for this email and purpose
  const deleteSql = `
    DELETE FROM \`PasswordResetOtp\`
    WHERE \`email\` = '${email.replace(/'/g, "''")}' AND \`purpose\` = '${purpose}'
  `;
  await (prisma as any).$executeRawUnsafe(deleteSql);

  // Insert new OTP
  const insertSql = `
    INSERT INTO \`PasswordResetOtp\` (\`email\`, \`otp\`, \`purpose\`, \`expiresAt\`, \`verified\`, \`createdAt\`)
    VALUES (
      '${email.replace(/'/g, "''")}',
      '${otp}',
      '${purpose}',
      '${expiresAt.toISOString().slice(0, 19).replace('T', ' ')}',
      false,
      '${now.toISOString().slice(0, 19).replace('T', ' ')}'
    )
  `;
  await (prisma as any).$executeRawUnsafe(insertSql);

  return {
    otp,
    expiresAt,
    expiresInSeconds: OTP_VALIDITY_MINUTES * 60,
  };
}

/**
 * Verifies if an OTP is valid, unexpired (<= 4 minutes), and matches.
 * Marks the OTP as verified in the DB upon successful match.
 */
export async function verifyOtpCode(params: {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}): Promise<{ valid: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  const inputOtp = params.otp.trim();
  const purpose = params.purpose;
  const now = new Date();

  const selectSql = `
    SELECT * FROM \`PasswordResetOtp\`
    WHERE \`email\` = '${email.replace(/'/g, "''")}'
      AND \`purpose\` = '${purpose}'
    ORDER BY \`createdAt\` DESC
    LIMIT 1
  `;
  const rows = (await (prisma as any).$queryRawUnsafe(selectSql)) as any[];

  if (!rows || rows.length === 0) {
    return { valid: false, error: 'No active OTP found. Please click "Resend OTP".' };
  }

  const latestOtp = rows[0];
  const expiresAt = new Date(latestOtp.expiresAt);

  if (now.getTime() > expiresAt.getTime()) {
    return { valid: false, error: 'OTP has expired (validity is 4 minutes). Please request a new OTP.' };
  }

  if (latestOtp.otp !== inputOtp) {
    return { valid: false, error: 'Invalid verification code. Please check and try again.' };
  }

  // Mark as verified
  const updateSql = `
    UPDATE \`PasswordResetOtp\`
    SET \`verified\` = true
    WHERE \`id\` = ${latestOtp.id}
  `;
  await (prisma as any).$executeRawUnsafe(updateSql);

  return { valid: true };
}

/**
 * Checks whether an unexpired, verified OTP exists for the given email and purpose.
 */
export async function isEmailOtpVerified(params: {
  email: string;
  purpose: OtpPurpose;
}): Promise<boolean> {
  const email = params.email.trim().toLowerCase();
  const purpose = params.purpose;
  const now = new Date();

  const selectSql = `
    SELECT * FROM \`PasswordResetOtp\`
    WHERE \`email\` = '${email.replace(/'/g, "''")}'
      AND \`purpose\` = '${purpose}'
      AND \`verified\` = true
    ORDER BY \`createdAt\` DESC
    LIMIT 1
  `;
  const rows = (await (prisma as any).$queryRawUnsafe(selectSql)) as any[];

  if (!rows || rows.length === 0) return false;

  const latest = rows[0];
  const expiresAt = new Date(latest.expiresAt);
  return now.getTime() <= expiresAt.getTime();
}

/**
 * Consumes / Deletes OTP records for an email and purpose once action is completed.
 */
export async function consumeOtpCode(params: {
  email: string;
  purpose: OtpPurpose;
  otp?: string;
}): Promise<void> {

  const email = params.email.trim().toLowerCase();
  const purpose = params.purpose;

  const deleteSql = `
    DELETE FROM \`PasswordResetOtp\`
    WHERE \`email\` = '${email.replace(/'/g, "''")}' AND \`purpose\` = '${purpose}'
  `;
  await (prisma as any).$executeRawUnsafe(deleteSql);
}
