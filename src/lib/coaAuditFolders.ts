import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  organization: string;
  submission_type: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  activity_title?: string;
}

// Determine semester based on submission date
export const getSemesterFromDate = (date: Date): '1st' | '2nd' => {
  const month = date.getMonth() + 1;
  // 1st Semester: October (10) - December (12) audits
  // 2nd Semester: March (3) - May (5) audits
  if (month >= 10 || month <= 12) {
    return '1st';
  } else {
    return '2nd';
  }
};

// Determine audit type based on month
export const getAuditTypeFromDate = (date: Date, semester: '1st' | '2nd'): 'initial' | 'final' => {
  const month = date.getMonth() + 1;
  
  if (semester === '1st') {
    // October = initial, December = final
    return month === 10 ? 'initial' : 'final';
  } else {
    // March = initial, May = final
    return month === 3 ? 'initial' : 'final';
  }
};

// Copy submission to COA review folder structure
export const copyToAuditFolder = async (
  submission: Submission,
  auditType: 'initial' | 'final'
): Promise<void> => {
  const submissionDate = new Date(submission.submitted_at);
  const year = submissionDate.getFullYear();
  const semester = getSemesterFromDate(submissionDate);
  
  // Build storage path: {year}/{organization}/semester_{semester}/audit_{auditType}/{filename}
  const storagePath = `${year}/${submission.organization}/semester_${semester}/audit_${auditType}/${submission.file_name}`;
  
  // Copy file in storage bucket
  try {
    // Extract the actual file path from the file_url
    // URL format: https://{project}.supabase.co/storage/v1/object/public/submissions/{path}
    const urlParts = submission.file_url.split('/submissions/');
    const originalPath = urlParts.length > 1 ? urlParts[1] : submission.file_name;
    
    // Download original file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('submissions')
      .download(originalPath);
    
    if (downloadError) throw downloadError;
    
    // Upload to new path
    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(storagePath, fileData, {
        contentType: fileData.type,
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL for the copied file
    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(storagePath);
    
    // Save reference in coa_review_copies table
    await supabase
      .from('coa_review_copies')
      .insert({
        submission_id: submission.id,
        organization: submission.organization,
        year,
        semester,
        audit_type: auditType,
        file_name: submission.file_name,
        file_url: publicUrl,
        storage_path: storagePath,
        original_submission_date: submission.submitted_at
      });
    
  } catch (error) {
    console.error('Error copying to audit folder:', error);
    throw error;
  }
};

// Copy pending submissions to initial audit folder (keep them in Pending)
export const copyPendingToInitialAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<void> => {
  // Get all pending submissions for this org
  const { data: pendingSubmissions, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization', organization)
    .eq('submitted_to', 'COA')
    .eq('status', 'Pending')
    .in('submission_type', ['Accomplishment Report', 'Liquidation Report']);
  
  if (fetchError) throw fetchError;
  
  if (!pendingSubmissions || pendingSubmissions.length === 0) return;
  
  // Copy each pending submission to initial audit folder (keep in Pending)
  for (const submission of pendingSubmissions) {
    await copyToAuditFolder(submission, 'initial');
    
    // Update submission to mark it with initial audit type (keep status as Pending)
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        audit_type: 'initial'
      })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error('Error updating submission with initial audit type:', updateError);
      throw updateError;
    }
  }
};

// Check if initial audit has been completed for a submission
export const hasInitialAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('coa_review_copies')
    .select('id')
    .eq('organization', organization)
    .eq('year', year)
    .eq('semester', semester)
    .eq('audit_type', 'initial')
    .limit(1);
  
  if (error) {
    console.error('Error checking initial audit:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
};

// Move pending submissions to final audit folder AND remove from pending
export const movePendingToFinalAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<void> => {
  // Get all pending submissions for this org
  const { data: pendingSubmissions, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization', organization)
    .eq('submitted_to', 'COA')
    .eq('status', 'Pending')
    .in('submission_type', ['Accomplishment Report', 'Liquidation Report']);
  
  if (fetchError) throw fetchError;
  
  if (!pendingSubmissions || pendingSubmissions.length === 0) return;
  
  // Copy each pending submission to final audit folder and mark as 'final'
  for (const submission of pendingSubmissions) {
    await copyToAuditFolder(submission, 'final');
    
    // Update submission to mark it with final audit type and change status
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        audit_type: 'final',
        status: 'In Final Audit'
      })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error('Error updating submission to final audit:', updateError);
      throw updateError;
    }
  }
};

// Get audit folder contents
export const getAuditFolderContents = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd',
  auditType: 'initial' | 'final'
) => {
  const { data, error } = await supabase
    .from('coa_review_copies')
    .select('*')
    .eq('organization', organization)
    .eq('year', year)
    .eq('semester', semester)
    .eq('audit_type', auditType)
    .order('copied_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching audit folder contents:', error);
    return [];
  }
  
  return data || [];
};
