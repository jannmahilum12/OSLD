import { COAAuditSchedule } from '@/hooks/useCOAAuditSchedule';

export interface AuditDeadline {
  auditType: string;
  semester: string;
  dueDate: Date;
  submissionDeadline: Date;
  daysUntil: number;
  isUpcoming: boolean;
  isPast: boolean;
}

/**
 * Calculate audit deadlines for a given year
 * Deadlines are set to the 15th of the audit month
 * Submission deadline is 7 days before the audit
 */
export function calculateAuditDeadlines(
  schedule: COAAuditSchedule[],
  year: number = new Date().getFullYear()
): AuditDeadline[] {
  const now = new Date();

  return schedule.map((item) => {
    // Audit on 15th of the month
    const auditDate = new Date(year, item.month - 1, 15);

    // Submission deadline 7 days before audit
    const submissionDeadline = new Date(auditDate);
    submissionDeadline.setDate(submissionDeadline.getDate() - 7);

    // Calculate days until submission deadline
    const daysUntil = Math.ceil(
      (submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isPast = submissionDeadline < now;
    const isUpcoming = daysUntil > 0 && daysUntil <= 30;

    return {
      auditType: item.audit_type,
      semester: item.semester,
      dueDate: auditDate,
      submissionDeadline,
      daysUntil,
      isUpcoming,
      isPast,
    };
  });
}

/**
 * Get the next upcoming audit deadline
 */
export function getNextAuditDeadline(deadlines: AuditDeadline[]): AuditDeadline | null {
  const upcomingDeadlines = deadlines.filter((d) => !d.isPast).sort((a, b) => a.daysUntil - b.daysUntil);
  return upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : null;
}

/**
 * Format deadline display
 */
export function formatDeadlineDisplay(deadline: AuditDeadline): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (deadline.isPast) {
    return `Passed on ${deadline.submissionDeadline.toLocaleDateString('en-US', options)}`;
  }

  if (deadline.daysUntil === 0) {
    return 'Due today';
  }

  if (deadline.daysUntil === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${deadline.daysUntil} days (${deadline.submissionDeadline.toLocaleDateString('en-US', options)})`;
}

/**
 * Get audit deadline status for UI styling
 */
export function getDeadlineStatus(deadline: AuditDeadline): 'critical' | 'warning' | 'info' | 'success' {
  if (deadline.isPast) {
    return 'success'; // Already passed
  }

  if (deadline.daysUntil <= 7) {
    return 'critical'; // Critical - less than a week
  }

  if (deadline.daysUntil <= 14) {
    return 'warning'; // Warning - less than 2 weeks
  }

  return 'info'; // Info - more than 2 weeks
}
