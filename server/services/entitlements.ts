import { prisma } from '../db';

export function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Match priority: strong identifiers (company reg number, loan account
 * number) are trusted outright. Email is treated as weaker — it's the only
 * identifier collected at signup today, but a shared/generic address could
 * be spoofed, so this is the thing to harden first if entitlements ever
 * move beyond a low-stakes pilot.
 */
const MATCH_PRIORITY = ['company_reg_number', 'loan_account_number', 'email'];

async function findActiveEntitlement(identifiers: { email?: string; companyRegNumber?: string }) {
  const values = [identifiers.companyRegNumber, identifiers.email]
    .filter((v): v is string => !!v)
    .map(normalize);

  if (values.length === 0) return null;

  const candidates = await prisma.partnerEntitlement.findMany({
    where: {
      status: 'active',
      validUntil: { gt: new Date() },
      matchValue: { in: values },
    },
  });

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => MATCH_PRIORITY.indexOf(a.matchType) - MATCH_PRIORITY.indexOf(b.matchType)
  );
  return candidates[0];
}

async function grantEntitlement(userId: string, entitlementId: string, actor: string) {
  const entitlement = await prisma.partnerEntitlement.findUnique({ where: { id: entitlementId } });
  if (!entitlement) return null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      group: entitlement.grantedGroup,
      planSource: `${entitlement.partnerId}_partnership`,
      premiumUntil: entitlement.validUntil,
      entitlementId: entitlement.id,
    },
    select: {
      id: true,
      email: true,
      companyName: true,
      role: true,
      group: true,
      createdAt: true,
      planSource: true,
      premiumUntil: true,
    },
  });

  await prisma.entitlementAuditLog.create({
    data: { userId, entitlementId: entitlement.id, action: 'granted', actor },
  });

  return user;
}

/** Runs at signup — checks the new account against active entitlements immediately. */
export async function matchAndGrantOnSignup(userId: string, email: string) {
  const entitlement = await findActiveEntitlement({ email });
  if (!entitlement) return null;
  return grantEntitlement(userId, entitlement.id, 'system');
}

/**
 * Runs after every ingestion batch, and can be triggered manually — catches
 * users who signed up *before* the list that qualifies them arrived.
 */
export async function reconcileEntitlements() {
  const activeEntitlements = await prisma.partnerEntitlement.findMany({
    where: { status: 'active', validUntil: { gt: new Date() } },
  });

  let granted = 0;
  for (const entitlement of activeEntitlements) {
    const user = await prisma.user.findFirst({
      where: {
        email: entitlement.matchValue,
        entitlementId: null,
      },
    });
    if (user) {
      await grantEntitlement(user.id, entitlement.id, 'system');
      granted++;
    }
  }
  return { checked: activeEntitlements.length, granted };
}

/** Nightly job: expires entitlements past validUntil and downgrades affected users. */
export async function runExpiryJob() {
  const expired = await prisma.partnerEntitlement.findMany({
    where: { status: 'active', validUntil: { lte: new Date() } },
  });

  let downgraded = 0;
  for (const entitlement of expired) {
    await prisma.partnerEntitlement.update({
      where: { id: entitlement.id },
      data: { status: 'expired' },
    });

    const affectedUsers = await prisma.user.findMany({ where: { entitlementId: entitlement.id } });
    for (const user of affectedUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { group: 'standard', planSource: null, premiumUntil: null, entitlementId: null },
      });
      await prisma.entitlementAuditLog.create({
        data: { userId: user.id, entitlementId: entitlement.id, action: 'expired', actor: 'system' },
      });
      downgraded++;
    }
  }
  return { expiredEntitlements: expired.length, downgradedUsers: downgraded };
}

/** Immediate revocation (e.g. BOI reports a loan closed early) — doesn't wait for validUntil. */
export async function revokeEntitlement(entitlementId: string, actor: string, notes?: string) {
  const entitlement = await prisma.partnerEntitlement.update({
    where: { id: entitlementId },
    data: { status: 'revoked' },
  });

  const affectedUsers = await prisma.user.findMany({ where: { entitlementId } });
  for (const user of affectedUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { group: 'standard', planSource: null, premiumUntil: null, entitlementId: null },
    });
    await prisma.entitlementAuditLog.create({
      data: { userId: user.id, entitlementId, action: 'revoked', actor, notes },
    });
  }
  return { entitlement, downgradedUsers: affectedUsers.length };
}

interface IngestEntry {
  matchType: 'email' | 'company_reg_number' | 'loan_account_number';
  matchValue: string;
}

/** Phase 1: admin-provided list (CSV/JSON) of qualifying identifiers. Idempotent per (partnerId, matchType, matchValue). */
export async function ingestEntitlementBatch(
  partnerId: string,
  entries: IngestEntry[],
  validityYears: number,
  createdByUserId: string
) {
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + validityYears);

  const errors: { row: number; reason: string }[] = [];
  let processed = 0;

  const batch = await prisma.ingestionBatch.create({
    data: { partnerId, method: 'csv_upload', recordCount: entries.length, createdByUserId },
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.matchType || !entry.matchValue) {
      errors.push({ row: i, reason: 'missing matchType or matchValue' });
      continue;
    }
    if (!MATCH_PRIORITY.includes(entry.matchType)) {
      errors.push({ row: i, reason: `unknown matchType "${entry.matchType}"` });
      continue;
    }

    const matchValue = normalize(entry.matchValue);
    const existing = await prisma.partnerEntitlement.findFirst({
      where: { partnerId, matchType: entry.matchType, matchValue },
    });

    if (existing) {
      await prisma.partnerEntitlement.update({
        where: { id: existing.id },
        data: { status: 'active', validUntil, sourceBatchId: batch.id },
      });
    } else {
      await prisma.partnerEntitlement.create({
        data: {
          partnerId,
          matchType: entry.matchType,
          matchValue,
          validUntil,
          sourceBatchId: batch.id,
        },
      });
    }
    processed++;
  }

  await prisma.ingestionBatch.update({
    where: { id: batch.id },
    data: { processedCount: processed, errorCount: errors.length, errors: JSON.stringify(errors) },
  });

  const reconciliation = await reconcileEntitlements();

  return { batchId: batch.id, processed, errors, reconciliation };
}
