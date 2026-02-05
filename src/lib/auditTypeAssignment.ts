import { supabase } from './supabase';

/**
 * Determines the audit type (semester and initial/final) based on the current date.
 * 
 * Schedule:
 * - 1st Semester: October (Initial), December (Final)
 * - 2nd Semester: March (Initial), May (Final)
 * 
 * Date-based logic:
 * - January-February → 2nd Semester Initial (because we're before March)
 * - March-April → 2nd Semester Initial
 * - May-September → 2nd Semester Final
 * - October-November → 1st Semester Initial
 * - December → 1st Semester Final
 * 
 * @param organization - The organization short name (e.g., 'USED', 'USG')
 * @returns Object containing semester, audit_type, and submission_count
 */
export async function getNextAuditType(organization: string): Promise<{
  semester: '1st' | '2nd';
  audit_type: 'Initial' | 'Final';
  submission_count: number;
  display_text: string;
}> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  // Count how many audits have been submitted for this org this year
  // We count submissions where COA has added opinion AND comment (coa_reviewed = true)
  const { data, error } = await supabase
    .from('submissions')
    .select('id, audit_type')
    .eq('organization', organization)
    .eq('coa_reviewed', true)
    .gte('coa_reviewed_at', `${currentYear}-01-01`)
    .lte('coa_reviewed_at', `${currentYear}-12-31`);

  if (error) {
    console.error('Error counting audit submissions:', error);
    throw error;
  }

  const submission_count = data?.length || 0;
  
  // Determine audit type based on current date
  let semester: '1st' | '2nd';
  let audit_type: 'Initial' | 'Final';
  let display_text: string;
  
  if (currentMonth >= 1 && currentMonth <= 4) {
    // January to April → 2nd Semester Initial (March deadline)
    semester = '2nd';
    audit_type = 'Initial';
    display_text = '2nd Semester Initial Audit';
  } else if (currentMonth >= 5 && currentMonth <= 9) {
    // May to September → 2nd Semester Final (May deadline)
    semester = '2nd';
    audit_type = 'Final';
    display_text = '2nd Semester Final Audit';
  } else if (currentMonth >= 10 && currentMonth <= 11) {
    // October to November → 1st Semester Initial (October deadline)
    semester = '1st';
    audit_type = 'Initial';
    display_text = '1st Semester Initial Audit';
  } else {
    // December → 1st Semester Final (December deadline)
    semester = '1st';
    audit_type = 'Final';
    display_text = '1st Semester Final Audit';
  }
  
  return {
    semester,
    audit_type,
    submission_count,
    display_text
  };
}

/**
 * Get a summary of all audit submissions for an organization in the current year
 */
export async function getAuditSubmissionSummary(organization: string): Promise<{
  year: number;
  total_audits: number;
  audits: Array<{
    semester: string;
    audit_type: string;
    submitted_at: string;
  }>;
}> {
  const currentYear = new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('submissions')
    .select('audit_type, coa_reviewed_at')
    .eq('organization', organization)
    .eq('coa_reviewed', true)
    .gte('coa_reviewed_at', `${currentYear}-01-01`)
    .lte('coa_reviewed_at', `${currentYear}-12-31`)
    .order('coa_reviewed_at', { ascending: true });

  if (error) {
    console.error('Error fetching audit summary:', error);
    throw error;
  }

  const audits = (data || []).map((item, index) => {
    // Reconstruct the audit type from position
    const position = index % 4;
    let semester: string;
    let audit_type: string;
    
    switch (position) {
      case 0:
        semester = '1st';
        audit_type = 'Initial';
        break;
      case 1:
        semester = '1st';
        audit_type = 'Final';
        break;
      case 2:
        semester = '2nd';
        audit_type = 'Initial';
        break;
      case 3:
        semester = '2nd';
        audit_type = 'Final';
        break;
      default:
        semester = '1st';
        audit_type = 'Initial';
    }
    
    return {
      semester,
      audit_type,
      submitted_at: item.coa_reviewed_at || ''
    };
  });

  return {
    year: currentYear,
    total_audits: audits.length,
    audits
  };
}
