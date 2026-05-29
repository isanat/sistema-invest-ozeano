import { hash, compare } from 'bcryptjs';
import { db } from '@/lib/db';

const PIN_SALT_ROUNDS = 12;

// ============ PIN Hashing & Verification ============

export async function hashPin(pin: string): Promise<string> {
  return hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hashedPin: string): Promise<boolean> {
  return compare(pin, hashedPin);
}

// ============ PIN Format Validation ============

export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin || pin.length !== 6) {
    return { valid: false, error: 'PIN deve ter exatamente 6 dígitos' };
  }
  if (!/^\d{6}$/.test(pin)) {
    return { valid: false, error: 'PIN deve conter apenas números' };
  }
  // Check for sequential digits (123456, 654321)
  if (/^(012345|123456|234567|345678|456789|987654|876543|765432|654321|543210)$/.test(pin)) {
    return { valid: false, error: 'PIN não pode ser sequencial' };
  }
  // Check for repeated digits (111111, 222222)
  if (/^(\d)\1{5}$/.test(pin)) {
    return { valid: false, error: 'PIN não pode ter todos os dígitos iguais' };
  }
  return { valid: true };
}

// Legacy: simple 6-digit check (used in existing routes)
export function isValidPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

// ============ PIN Storage (User.securityPin) ============

/**
 * Check if an admin user has a PIN set.
 * Checks User.securityPin first, then falls back to AdminPin table for backward compat.
 */
export async function adminHasPin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { securityPin: true, adminPin: { select: { id: true } } },
  });
  return !!(user?.securityPin || user?.adminPin);
}

/**
 * Get PIN status for an admin user.
 * Returns whether PIN is set and when it was last set.
 */
export async function getAdminPinStatus(userId: string): Promise<{ hasPin: boolean; setAt: string | null }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { securityPin: true, securityPinSetAt: true, adminPin: { select: { createdAt: true } } },
  });

  if (!user) return { hasPin: false, setAt: null };

  // Prefer User.securityPin
  if (user.securityPin) {
    return { hasPin: true, setAt: user.securityPinSetAt?.toISOString() || null };
  }

  // Fallback to AdminPin table
  if (user.adminPin) {
    return { hasPin: true, setAt: user.adminPin.createdAt.toISOString() };
  }

  return { hasPin: false, setAt: null };
}

/**
 * Verify admin PIN by userId.
 * Checks User.securityPin first, then falls back to AdminPin table for backward compat.
 */
export async function verifyAdminPin(userId: string, pin: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { securityPin: true, adminPin: { select: { pinHash: true } } },
  });

  if (!user) return false;

  // Prefer User.securityPin
  if (user.securityPin) {
    return verifyPin(pin, user.securityPin);
  }

  // Fallback to AdminPin table
  if (user.adminPin) {
    return verifyPin(pin, user.adminPin.pinHash);
  }

  return false;
}

/**
 * Get the hashed PIN for a user (for internal verification).
 * Checks User.securityPin first, then falls back to AdminPin table.
 */
export async function getAdminPinHash(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { securityPin: true, adminPin: { select: { pinHash: true } } },
  });

  if (!user) return null;

  // Prefer User.securityPin
  if (user.securityPin) return user.securityPin;

  // Fallback to AdminPin table
  if (user.adminPin) return user.adminPin.pinHash;

  return null;
}

// ============ PIN Required Actions ============

// List of action types that require PIN verification
export const PIN_REQUIRED_ACTIONS = [
  'balance_change',      // Changing user balance
  'role_change',         // Promoting/demoting admins
  'withdrawal_approve',  // Approving withdrawal requests
  'withdrawal_reject',   // Rejecting withdrawal requests
  'invite_admin',        // Creating admin invitations
  'approve_admin',       // Approving admin registrations
  'force_release',       // Force releasing locks
  'reset_seed',          // Resetting database
  'migrate_db',          // Running database migrations
] as const;

export type PinRequiredAction = typeof PIN_REQUIRED_ACTIONS[number];

// Sensitive fields that require PIN verification when changed
export const PIN_REQUIRED_FIELDS = [
  'balance',
  'affiliateBalance',
  'voucherBalance',
  'totalInvested',
  'totalRoi',
  'totalWithdrawn',
  'totalAffiliateEarnings',
  'role',
] as const;

// Check if any of the sensitive fields are being changed
export function requiresPinVerification(
  updateData: Record<string, unknown>,
  existingData: Record<string, string>
): boolean {
  return PIN_REQUIRED_FIELDS.some((field) => {
    if (updateData[field] === undefined) return false;
    // For role changes, always require PIN
    if (field === 'role') return updateData[field] !== undefined;
    // For balance fields, require PIN if value is actually changing
    return String(updateData[field]) !== String(existingData[field] ?? '0');
  });
}

/**
 * Determine which PIN action type applies to a user update.
 * Returns 'role_change' if role is being changed, otherwise 'balance_change' if any balance field changes.
 */
export function getPinActionForUserUpdate(
  updateData: Record<string, unknown>,
  existingData: Record<string, string>
): PinRequiredAction | null {
  if (updateData.role !== undefined && String(updateData.role) !== String(existingData.role ?? '')) {
    return 'role_change';
  }
  const balanceFields = ['balance', 'affiliateBalance', 'voucherBalance', 'totalInvested', 'totalRoi', 'totalWithdrawn', 'totalAffiliateEarnings'];
  if (balanceFields.some(f => updateData[f] !== undefined && String(updateData[f]) !== String(existingData[f] ?? '0'))) {
    return 'balance_change';
  }
  return null;
}
