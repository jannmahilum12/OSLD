import { useCOAAuditSchedule } from '@/hooks/useCOAAuditSchedule';
import { calculateAuditDeadlines, getNextAuditDeadline, formatDeadlineDisplay, getDeadlineStatus } from '@/lib/auditDeadlines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, CheckCircle, Clock } from 'lucide-react';

export function AuditDeadlineSummary() {
  const { schedule, isLoading, error } = useCOAAuditSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Audit Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || schedule.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to load audit deadlines</AlertDescription>
      </Alert>
    );
  }

  const deadlines = calculateAuditDeadlines(schedule);
  const nextDeadline = getNextAuditDeadline(deadlines);

  if (!nextDeadline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Audit Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No upcoming deadlines</p>
        </CardContent>
      </Card>
    );
  }

  const status = getDeadlineStatus(nextDeadline);
  const statusColors = {
    critical: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
  };

  const statusIcons = {
    critical: <AlertCircle className="h-5 w-5 text-red-600" />,
    warning: <Clock className="h-5 w-5 text-yellow-600" />,
    info: <Calendar className="h-5 w-5 text-blue-600" />,
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
  };

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusIcons[status]}
          Upcoming Audit Deadlines
        </CardTitle>
        <CardDescription>Next submission deadline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold">
            {nextDeadline.auditType} - {nextDeadline.semester}
          </div>
          <div className="text-sm text-gray-600">
            {formatDeadlineDisplay(nextDeadline)}
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Submission Deadline: {nextDeadline.submissionDeadline.toLocaleDateString('en-US')}</div>
            <div>Audit Date: {nextDeadline.dueDate.toLocaleDateString('en-US')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
