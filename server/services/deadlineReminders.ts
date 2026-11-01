import { prisma } from '../db';
import { sendDeadlineReminderEmail } from './email';

// Mirrors src/utils/taxCalculations.ts nextDeadline() — kept as a separate
// server-side copy since the frontend util isn't importable here.
function nextDeadline(month: number, day: number, now: Date = new Date()): Date {
  const year = now.getFullYear();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const deadline = new Date(`${year}-${mm}-${dd}T23:59:59`);
  return now > deadline ? new Date(`${year + 1}-${mm}-${dd}T23:59:59`) : deadline;
}

// Personal filing deadline: March 31, auto-advancing to next year once passed.
export function nextPersonalDeadline(now: Date = new Date()): Date {
  return nextDeadline(3, 31, now);
}

// Company Income Tax (CIT) filing deadline: June 30, auto-advancing to next
// year once passed.
export function nextCompanyDeadline(now: Date = new Date()): Date {
  return nextDeadline(6, 30, now);
}

function daysUntil(target: Date, now: Date = new Date()): number {
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function sendCampaignIfDue(
  taxType: 'personal' | 'company',
  stage: '30_day' | '3_week' | '1_week',
  thresholdDays: number,
  deadline: Date
) {
  const campaign = `${stage}_${taxType}`;
  const now = new Date();
  const daysLeft = daysUntil(deadline, now);
  // `daysLeft < 0` doesn't reliably catch "deadline already passed": for the
  // ~24h right after the deadline instant, Math.ceil() of the small negative
  // fraction rounds to -0, and `-0 < 0` is false in JS, so that check alone
  // would leave the window open for a day after filing closes. Compare the
  // timestamps directly instead.
  if (daysLeft > thresholdDays || now > deadline) return;

  const already = await prisma.deadlineReminderLog.findUnique({
    where: { campaign_deadline: { campaign, deadline } },
  });
  if (already) return;

  const users = await prisma.user.findMany({ select: { email: true, companyName: true } });
  const deadlineDate = formatDeadline(deadline);

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const ok = await sendDeadlineReminderEmail({ to: user.email, companyName: user.companyName, stage, deadlineDate, taxType });
    if (ok) sent++; else failed++;
    // Small gap between sends to stay well under Gmail's per-second rate limits.
    await new Promise((r) => setTimeout(r, 250));
  }

  await prisma.deadlineReminderLog.create({ data: { campaign, deadline } });
  console.log(`Deadline reminder campaign "${campaign}" sent: ${sent} ok, ${failed} failed (deadline ${deadlineDate})`);
}

export async function checkDeadlineReminders(): Promise<void> {
  const personalDeadline = nextPersonalDeadline();
  await sendCampaignIfDue('personal', '30_day', 30, personalDeadline);
  await sendCampaignIfDue('personal', '3_week', 21, personalDeadline);
  await sendCampaignIfDue('personal', '1_week', 7, personalDeadline);

  const companyDeadline = nextCompanyDeadline();
  await sendCampaignIfDue('company', '30_day', 30, companyDeadline);
  await sendCampaignIfDue('company', '3_week', 21, companyDeadline);
  await sendCampaignIfDue('company', '1_week', 7, companyDeadline);
}
