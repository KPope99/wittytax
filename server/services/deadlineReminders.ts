import { prisma } from '../db';
import { sendDeadlineReminderEmail } from './email';

// Mirrors src/utils/taxCalculations.ts nextDeadline(3, 31) — kept as a
// separate server-side copy since the frontend util isn't importable here.
// Personal filing deadline: March 31, auto-advancing to next year once passed.
export function nextPersonalDeadline(now: Date = new Date()): Date {
  const year = now.getFullYear();
  const deadline = new Date(`${year}-03-31T23:59:59`);
  return now > deadline ? new Date(`${year + 1}-03-31T23:59:59`) : deadline;
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

async function sendCampaignIfDue(campaign: '3_week' | '1_week', thresholdDays: number, deadline: Date) {
  const daysLeft = daysUntil(deadline);
  if (daysLeft > thresholdDays || daysLeft < 0) return;

  const already = await prisma.deadlineReminderLog.findUnique({
    where: { campaign_deadline: { campaign, deadline } },
  });
  if (already) return;

  const users = await prisma.user.findMany({ select: { email: true, companyName: true } });
  const deadlineDate = formatDeadline(deadline);
  const weeksLeft = campaign === '3_week' ? 3 : 1;

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const ok = await sendDeadlineReminderEmail({ to: user.email, companyName: user.companyName, weeksLeft, deadlineDate });
    if (ok) sent++; else failed++;
    // Small gap between sends to stay well under Gmail's per-second rate limits.
    await new Promise((r) => setTimeout(r, 250));
  }

  await prisma.deadlineReminderLog.create({ data: { campaign, deadline } });
  console.log(`Deadline reminder campaign "${campaign}" sent: ${sent} ok, ${failed} failed (deadline ${deadlineDate})`);
}

export async function checkDeadlineReminders(): Promise<void> {
  const deadline = nextPersonalDeadline();
  await sendCampaignIfDue('3_week', 21, deadline);
  await sendCampaignIfDue('1_week', 7, deadline);
}
