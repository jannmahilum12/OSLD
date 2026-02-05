import { useState, useEffect } from "react";
import { Menu, LogOut, FileText, Calendar, MapPin, Users, DollarSign, Target, Sparkles, Download, Eye, X, Clock, Building2, CheckCircle, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/components/ui/use-toast";

interface SubmissionsPageProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  orgShortName?: string;
  orgFullName?: string;
  orgLogo?: string;
  isEmbedded?: boolean;
  hideNavButtons?: boolean;
  onActivityChange?: () => void; // Callback to refresh activity logs in parent\n  activeSubmissionTab?: string;\n  setActiveSubmissionTab?: (tab: string) => void;
}

interface Submission {
  id: string;
  organization: string;
  submission_type: string;
  activity_title: string;
  activity_duration: string;
  activity_venue: string;
  activity_participants: string;
  activity_funds: string;
  activity_budget: string;
  activity_sdg: string;
  activity_likha: string;
  file_url: string;
  file_name: string;
  status: string;
  revision_reason?: string;
  submitted_at: string;
  event_id?: string;
  coa_opinion?: string;
  activity_due_title?: string;
}

export default function SubmissionsPage({
  activeNav,
  setActiveNav,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  orgShortName = "OSLD",
  orgFullName = "Office of Student Leadership and Development",
  orgLogo = "",
  isEmbedded = false,
  hideNavButtons = false,
  onActivityChange,
  activeSubmissionTab = "Request to Conduct Activity",
  setActiveSubmissionTab,
}: SubmissionsPageProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [revisionItems, setRevisionItems] = useState({
    activityDesign: false,
    budgetaryRequirement: false,
    resolutionForCollection: false,
    budgetProposal: false,
    minutesOfMeeting: false,
    annualProposal: false,
    // For Accomplishment Report
    formatTemplateAccom: false,
    summaryAccom: false,
    // For Liquidation Report
    transitionalDocs: false,
    financialDiscrepancies: false,
    formatTemplateLiq: false,
    formsLiq: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
  }, [orgShortName]);

  const loadSubmissions = async () => {
    let query = supabase.from('submissions').select('*');
    
    // Filter by submitted_to field to show only submissions directed to this org
    // NEW ROUTING:
    // - Request to Conduct Activity: AO/LSG → LCO/USG → OSLD (stays same)
    // - Accomplishment, Liquidation, Letter of Appeal: USG, LCO, GSC, USED, TGP → COA directly
    // - COA receives Accomplishment, Liquidation, and Letter of Appeal from USG, LCO, GSC, USED, TGP
    // - OSLD receives Request to Conduct Activity from all orgs
    if (orgShortName === 'LCO') {
      query = query.eq('submitted_to', 'LCO');
    } else if (orgShortName === 'USG') {
      query = query.eq('submitted_to', 'USG');
    } else if (orgShortName === 'OSLD') {
      query = query.eq('submitted_to', 'OSLD');
    } else if (orgShortName === 'COA') {
      // COA sees all submissions sent to them for stats, but filters by status in tabs
      // Load all statuses: Pending, For Revision, Approved, Rejected
      query = query.eq('submitted_to', 'COA')
                   .in('submission_type', ['Accomplishment Report', 'Liquidation Report', 'Letter of Appeal']);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error loading submissions:', error);
      return;
    }

    setSubmissions(data || []);
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  const handleViewDetails = async (submission: Submission) => {
    console.log('Viewing submission with file_url:', submission.file_url);
    
    // For Letter of Appeal, fetch the activity due title from osld_events
    if (submission.submission_type === 'Letter of Appeal' && submission.event_id) {
      const { data: eventData } = await supabase
        .from('osld_events')
        .select('title')
        .eq('id', submission.event_id)
        .single();
      
      if (eventData) {
        submission.activity_due_title = eventData.title;
      }
    }
    
    setSelectedSubmission(submission);
    setIsDetailDialogOpen(true);
  };

  const submissionTypes = orgShortName === 'COA' 
    ? ["Accomplishment Report", "Liquidation Report", "Letter of Appeal"]
    : ["Request to Conduct Activity", "Accomplishment Report", "Liquidation Report", "Letter of Appeal"];

  const getSubmissionsByType = (type: string) => {
    // All orgs (including COA) only see Pending submissions in the Submissions sidebar
    // After COA approves → submission goes to the SUBMITTING org's Audit Files > Pending Review
    return submissions.filter(s => s.submission_type === type && s.status === 'Pending');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'For Revision':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">For Revision</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-50 font-semibold">Pending Review</Badge>;
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    const orgFullNames: Record<string, string> = {
      OSLD: 'Office of Student Leadership and Development',
      AO: 'Accredited Organizations',
      LSG: 'Local Student Government',
      GSC: 'Graduating Student Council',
      LCO: 'League of Campus Organization',
      USG: 'University Student Government',
      TGP: 'The Gold Panicles',
      USED: 'University Student Enterprise Development',
    };

    try {
      if (selectedSubmission.submission_type === 'Letter of Appeal' && selectedSubmission.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('osld_events')
          .select('*')
          .eq('id', selectedSubmission.event_id)
          .single();

        if (!eventError && eventData) {
          const addWorkingDays = (startDate: Date, days: number): Date => {
            const result = new Date(startDate);
            let addedDays = 0;
            while (addedDays < days) {
              result.setDate(result.getDate() + 1);
              if (result.getDay() !== 0 && result.getDay() !== 6) addedDays++;
            }
            return result;
          };

          const isAccomplishment =
            (selectedSubmission.activity_title || '')
              .toLowerCase()
              .includes('accomplishment');
          const isLiquidation =
            (selectedSubmission.activity_title || '').toLowerCase().includes('liquidation');

          const today = new Date();
          const newDeadline = addWorkingDays(today, 3);
          const newDeadlineString = newDeadline.toISOString().split('T')[0];

          const updateData: Record<string, string> = {};
          if (isAccomplishment) updateData.accomplishment_deadline_override = newDeadlineString;
          else if (isLiquidation) updateData.liquidation_deadline_override = newDeadlineString;

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('osld_events')
              .update(updateData)
              .eq('id', selectedSubmission.event_id);
          }

          const reportType = isAccomplishment ? 'accomplishment' : 'liquidation';

          await supabase.from('notifications').insert({
            event_id: selectedSubmission.id,
            event_title: `Letter of Appeal Approved`,
            event_description: `Your Letter of Appeal for "${selectedSubmission.activity_title}" has been approved by ${orgFullNames[orgShortName] || orgShortName}. You can now submit the ${reportType} report on or before ${newDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (3 days extension). If not submitted by then, your account will be placed on hold.`,
            created_by: orgShortName,
            target_org: selectedSubmission.organization,
          });
        }
      } else {
        await supabase.from('notifications').insert({
          event_id: selectedSubmission.id,
          event_title: `${selectedSubmission.submission_type} Approved`,
          event_description: `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been approved by ${orgFullNames[orgShortName] || orgShortName}. Check it out!`,
          created_by: orgShortName,
          target_org: selectedSubmission.organization,
        });

        if (orgShortName === 'LCO' || orgShortName === 'USG') {
          if (selectedSubmission.submission_type === 'Accomplishment Report') {
            const { error: endorseError } = await supabase
              .from('submissions')
              .update({
                status: 'Approved',
                submitted_to: 'COA',
                endorsed_to_coa: true,
                approved_by: orgShortName,
              })
              .eq('id', selectedSubmission.id);

            if (!endorseError) {
              await supabase.from('notifications').insert({
                event_id: selectedSubmission.id,
                event_title: `Accomplishment Report Endorsed from ${orgShortName}`,
                event_description: `${orgShortName} has endorsed an Accomplishment Report titled "${selectedSubmission.activity_title}" from ${selectedSubmission.organization} to COA for review.`,
                created_by: orgShortName,
                target_org: 'COA',
              });
            }
          } else if (selectedSubmission.submission_type === 'Liquidation Report') {
            const { error: endorseError } = await supabase
              .from('submissions')
              .update({
                status: 'Approved',
                submitted_to: 'COA',
                endorsed_to_coa: true,
                approved_by: orgShortName,
              })
              .eq('id', selectedSubmission.id);

            if (!endorseError) {
              await supabase.from('notifications').insert({
                event_id: selectedSubmission.id,
                event_title: `Liquidation Report Endorsed from ${orgShortName}`,
                event_description: `${orgShortName} has endorsed a Liquidation Report titled "${selectedSubmission.activity_title}" from ${selectedSubmission.organization} to COA for review.`,
                created_by: orgShortName,
                target_org: 'COA',
              });
            }
          }
        }
      }

      if (orgShortName === 'COA') {
        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'Approved',
            approved_by: orgShortName,
            submitted_to: orgShortName,
            coa_reviewed: false,
          })
          .eq('id', selectedSubmission.id);

        if (error) throw error;

        toast({
          title: 'Submission Approved',
          description: `"${selectedSubmission.activity_title}" has been approved and moved to Audit Files.`,
        });

        setIsDetailDialogOpen(false);
        loadSubmissions();
        onActivityChange?.();
        return;
      }

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'Approved',
          approved_by: orgShortName,
          submitted_to: orgShortName,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      // Delete the osld_events record when LCO approves accomplishment or liquidation report
      if (orgShortName === 'LCO' && selectedSubmission.event_id) {
        if (
          selectedSubmission.submission_type === 'Accomplishment Report' ||
          selectedSubmission.submission_type === 'Liquidation Report'
        ) {
          await supabase
            .from('osld_events')
            .delete()
            .eq('id', selectedSubmission.event_id);
        }
      }

      toast({
        title: 'Submission Approved',
        description: `"${selectedSubmission.activity_title}" has been approved successfully.`,
      });

      setIsDetailDialogOpen(false);
      loadSubmissions();
      onActivityChange?.();
    } catch (err: unknown) {
      console.error('Error approving submission:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve submission. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleForRevision = () => {
    setIsRevisionDialogOpen(true);
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('submissions')
      .update({ 
        status: 'Rejected',
        rejection_reason: rejectComment || null,
        approved_by: orgShortName
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: "Error",
        description: "Failed to reject submission. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    const rejectMessage = rejectComment 
      ? `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been rejected by ${orgFullNames[orgShortName] || orgShortName}. Reason: ${rejectComment}`
      : `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been rejected by ${orgFullNames[orgShortName] || orgShortName}.`;
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `${selectedSubmission.submission_type} Rejected`,
        event_description: rejectMessage,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });

    toast({
      title: "Submission Rejected",
      description: `"${selectedSubmission.activity_title}" has been rejected.`,
    });
    setIsRejectDialogOpen(false);
    setIsDetailDialogOpen(false);
    setRejectComment("");
    loadSubmissions();
    // Trigger activity logs refresh in parent
    onActivityChange?.();
  };

  const handleDecline = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'Rejected' })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error declining submission:', error);
      toast({
        title: "Error",
        description: "Failed to decline submission. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    // Get today's date formatted
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `Letter of Appeal Declined`,
        event_description: `Your Letter of Appeal for "${selectedSubmission.activity_title}" has been declined by ${orgFullNames[orgShortName] || orgShortName}. You must submit the required liquidation/accomplishment report today (${todayFormatted}) or your account will be placed on hold.`,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });

    toast({
      title: "Submission Declined",
      description: `"${selectedSubmission.activity_title}" has been declined.`,
    });
    setIsDetailDialogOpen(false);
    loadSubmissions();
  };

  const handleSubmitRevision = async () => {
    if (!selectedSubmission) {
      return;
    }

    // Build revision reason from checkboxes and additional comments
    const selectedItems = [];
    if (revisionItems.activityDesign) selectedItems.push("Activity Design");
    if (revisionItems.budgetaryRequirement) selectedItems.push("Budgetary Requirement");
    if (revisionItems.resolutionForCollection) selectedItems.push("Resolution for Collection");
    if (revisionItems.budgetProposal) selectedItems.push("Budget Proposal");
    if (revisionItems.minutesOfMeeting) selectedItems.push("Minutes of Meeting");
    if (revisionItems.annualProposal) selectedItems.push("Annual Proposal");
    
    // Accomplishment Report items
    if (revisionItems.formatTemplateAccom) selectedItems.push("Format/Template");
    if (revisionItems.summaryAccom) selectedItems.push("Summary of Accomplishment Report");
    
    // Liquidation Report items
    if (revisionItems.transitionalDocs) selectedItems.push("Transitional Documents");
    if (revisionItems.financialDiscrepancies) selectedItems.push("Financial Discrepancies");
    if (revisionItems.formatTemplateLiq) selectedItems.push("Format/Templates");
    if (revisionItems.formsLiq) selectedItems.push("Forms (Procurement, Fiscal)");

    if (selectedItems.length === 0 && !revisionReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select at least one item or provide additional comments.",
        variant: "destructive",
      });
      return;
    }

    let fullRevisionReason = "";
    if (selectedItems.length > 0) {
      fullRevisionReason = `Items requiring revision:\n• ${selectedItems.join("\n• ")}`;
    }
    if (revisionReason.trim()) {
      fullRevisionReason += fullRevisionReason ? `\n\nAdditional Comments:\n${revisionReason}` : revisionReason;
    }
    
    const { error } = await supabase
      .from('submissions')
      .update({ 
        status: 'For Revision',
        revision_reason: fullRevisionReason 
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `${selectedSubmission.submission_type} Requires Revision`,
        event_description: `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" requires revision by ${orgFullNames[orgShortName] || orgShortName}. Check it out!`,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });

    toast({
      title: "Revision Required",
      description: `"${selectedSubmission.activity_title}" has been marked for revision.`,
    });
    setIsRevisionDialogOpen(false);
    setIsDetailDialogOpen(false);
    setRevisionReason("");
    setRevisionItems({
      activityDesign: false,
      budgetaryRequirement: false,
      resolutionForCollection: false,
      budgetProposal: false,
      minutesOfMeeting: false,
      annualProposal: false,
      formatTemplateAccom: false,
      summaryAccom: false,
      transitionalDocs: false,
      financialDiscrepancies: false,
      formatTemplateLiq: false,
      formsLiq: false
    });
    loadSubmissions();
    // Trigger activity logs refresh in parent
    onActivityChange?.();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDialogs = () => (
    <>
      {/* Submission Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ color: "#003b27" }}>
              Submission Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6 py-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                {getStatusBadge(selectedSubmission.status)}
              </div>

              {/* Revision Reason - Show when status is For Revision */}
              {selectedSubmission.status === 'For Revision' && selectedSubmission.revision_reason && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Revision Required</span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    You are advised to revise your request to conduct activity due to the following reasons:
                  </p>
                  <div className="p-3 bg-white border border-orange-100 rounded-lg">
                    <p className="text-gray-800">{selectedSubmission.revision_reason}</p>
                  </div>
                  <p className="text-sm text-gray-600 italic mt-3">
                    Please stay updated for further announcements.
                  </p>
                </div>
              )}

              {/* Activity Title */}
              <div className="p-4 bg-[#003b27]/5 rounded-lg">
                <h3 className="text-xl font-bold text-[#003b27]">
                  {selectedSubmission.activity_title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Submitted by {{
                    "OSLD": "Office of Student Leadership and Development",
                    "AO": "Accredited Organizations",
                    "LSG": "Local Student Government",
                    "GSC": "Graduating Student Council",
                    "LCO": "League of Campus Organization",
                    "USG": "University Student Government",
                    "TGP": "The Gold Panicles",
                    "USED": "University Student Enterprise Development"
                  }[selectedSubmission.organization] || selectedSubmission.organization}
                </p>
              </div>

              {/* Details Grid - Only show for Request Activity submissions */}
              {selectedSubmission.submission_type === 'Request to Conduct Activity' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_duration}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">Venue/Platform</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_venue}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Target Participants</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_participants}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span className="text-lg font-bold">₱</span>
                      <span className="text-sm font-medium">Source of Funds</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_funds}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span className="text-lg font-bold">₱</span>
                      <span className="text-sm font-medium">Budgetary Requirements</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_budget}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">SDG</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_sdg}</p>
                  </div>

                  <div className="p-4 border rounded-lg md:col-span-2">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">LIKHA Agenda</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_likha}</p>
                  </div>
                </div>
              )}

              {/* Submission Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Submitted On</span>
                </div>
                <p className="text-gray-800">{formatDate(selectedSubmission.submitted_at)}</p>
              </div>

              {/* File Attachment */}
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#003b27]/10 rounded-lg">
                      <FileText className="h-5 w-5 text-[#003b27]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {selectedSubmission.submission_type === 'Letter of Appeal' ? 'File for Appeal' : 
                         selectedSubmission.submission_type === 'Request to Conduct Activity' ? 'Google Drive Folder Link' :
                         selectedSubmission.submission_type === 'Accomplishment Report' ? 'Accomplishment Report File' :
                         selectedSubmission.submission_type === 'Liquidation Report' ? 'Liquidation Report File' :
                         'Submission File'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedSubmission.submission_type === 'Request to Conduct Activity' ? 'Contains: Activity Design, Budgetary Requirements, etc.' :
                         'View submitted file'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      size="sm"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      {selectedSubmission.submission_type === 'Letter of Appeal' ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          View File
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Open Link
                        </>
                      )}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
            {selectedSubmission && selectedSubmission.status === 'Pending' && (
              <>
                {selectedSubmission.submission_type === 'Request to Conduct Activity' && (
                  <>
                    <Button
                      onClick={handleRejectClick}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleForRevision}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      For Revision
                    </Button>
                  </>
                )}
                {selectedSubmission.submission_type !== 'Letter of Appeal' && 
                 selectedSubmission.submission_type !== 'Request to Conduct Activity' && (
                  <Button
                    onClick={handleForRevision}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    For Revision
                  </Button>
                )}
                <Button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                {selectedSubmission.submission_type === 'Letter of Appeal' && (
                  <Button
                    onClick={handleDecline}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* For Revision Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Request For Revision
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-gray-700 font-medium">
                Please select the items that need revision:
              </p>
            </div>

            {/* Checkboxes for revision items - conditionally render based on submission type */}
            {selectedSubmission?.submission_type === 'Accomplishment Report' ? (
              <div className="space-y-3 p-4 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="formatTemplateAccom"
                    checked={revisionItems.formatTemplateAccom}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, formatTemplateAccom: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="formatTemplateAccom"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Format/Template
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="summaryAccom"
                    checked={revisionItems.summaryAccom}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, summaryAccom: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="summaryAccom"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Summary of Accomplishment Report
                  </label>
                </div>
              </div>
            ) : selectedSubmission?.submission_type === 'Liquidation Report' ? (
              <div className="space-y-3 p-4 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="transitionalDocs"
                    checked={revisionItems.transitionalDocs}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, transitionalDocs: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="transitionalDocs"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Transitional Documents
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="financialDiscrepancies"
                    checked={revisionItems.financialDiscrepancies}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, financialDiscrepancies: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="financialDiscrepancies"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Financial Discrepancies
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="formatTemplateLiq"
                    checked={revisionItems.formatTemplateLiq}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, formatTemplateLiq: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="formatTemplateLiq"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Format/Templates
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="formsLiq"
                    checked={revisionItems.formsLiq}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, formsLiq: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="formsLiq"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Forms (Procurement, Fiscal)
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="activityDesign"
                    checked={revisionItems.activityDesign}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, activityDesign: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="activityDesign"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Activity Design
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="budgetaryRequirement"
                    checked={revisionItems.budgetaryRequirement}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, budgetaryRequirement: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="budgetaryRequirement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Budgetary Requirement
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="resolutionForCollection"
                    checked={revisionItems.resolutionForCollection}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, resolutionForCollection: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="resolutionForCollection"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Resolution for Collection
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="budgetProposal"
                    checked={revisionItems.budgetProposal}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, budgetProposal: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="budgetProposal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Budget Proposal
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="minutesOfMeeting"
                    checked={revisionItems.minutesOfMeeting}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, minutesOfMeeting: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="minutesOfMeeting"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Minutes of Meeting
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="annualProposal"
                    checked={revisionItems.annualProposal}
                    onCheckedChange={(checked) => 
                      setRevisionItems({...revisionItems, annualProposal: checked as boolean})
                    }
                  />
                  <label
                    htmlFor="annualProposal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Annual Proposal
                  </label>
                </div>
              </div>
            )}

            <Textarea
              placeholder="Enter additional comments or reasons for revision..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              className="min-h-[120px] border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
            <div className="p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600 italic">
                Please stay updated for further announcements.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRevisionDialogOpen(false);
                setRevisionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRevision}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Submit Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <X className="h-5 w-5" />
              Reject Submission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for Rejection (Optional)
              </label>
              <Textarea
                placeholder="Please provide a reason for rejecting this submission..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Confirm Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to logout?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const renderContent = () => (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl lg:text-4xl font-bold" style={{ color: "#0c3b2e" }}>
          Submissions
        </h2>
        <p className="text-gray-600 mt-2">
          {orgShortName === "COA" 
            ? "Review and manage all submitted Accomplishment and Liquidation Reports"
            : "Review and manage all submitted requests"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="p-4 border-l-4 border-l-[#003b27]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Submissions</p>
              <p className="text-2xl font-bold text-[#003b27]">{submissions.length}</p>
            </div>
            <FileText className="h-8 w-8 text-[#003b27] opacity-50" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Declined</p>
              <p className="text-2xl font-bold text-red-600">
                {submissions.filter(s => s.status === 'Rejected').length}
              </p>
            </div>
            <X className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {submissions.filter(s => s.status === 'Pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {submissions.filter(s => s.status === 'Approved').length}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">For Revision</p>
              <p className="text-2xl font-bold text-orange-600">
                {submissions.filter(s => s.status === 'For Revision').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Tabs for Submission Types */}
      {!hideNavButtons && (
      <Tabs value={activeSubmissionTab || "Request to Conduct Activity"} onValueChange={setActiveSubmissionTab} className="w-full">
        <TabsList className={`grid w-full ${orgShortName === 'COA' ? 'grid-cols-3' : 'grid-cols-4'} mb-6 bg-gray-100`}>
          {submissionTypes.map((type) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white text-xs lg:text-sm"
            >
              {type}
            </TabsTrigger>
          ))}
        </TabsList>

        {submissionTypes.map((type) => {
          const typeSubmissions = getSubmissionsByType(type);
          return (
            <TabsContent key={type} value={type}>
              {typeSubmissions.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No pending submissions</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Pending submissions for {type} will appear here
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {typeSubmissions.map((submission) => (
                    <Card 
                      key={submission.id} 
                      className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-[#003b27]"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Section - Main Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-[#003b27]/10">
                              <FileText className="h-5 w-5 text-[#003b27]" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-800">
                                {submission.activity_title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {{
                                    "OSLD": "Office of Student Leadership and Development",
                                    "AO": "Accredited Organizations",
                                    "LSG": "Local Student Government",
                                    "GSC": "Graduating Student Council",
                                    "LCO": "League of Campus Organization",
                                    "USG": "University Student Government",
                                    "TGP": "The Gold Panicles",
                                    "USED": "University Student Enterprise Development"
                                  }[submission.organization] || submission.organization}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(submission.submitted_at).toLocaleDateString()}
                                </span>
                                {submission.submission_type === 'Request to Conduct Activity' && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {submission.activity_venue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Status & Actions */}
                        <div className="flex items-center gap-3">
                          {getStatusBadge(submission.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                            className="border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      )}

      {/* Direct View for COA - Table View for Accomplishment and Liquidation */}
      {hideNavButtons && orgShortName === "COA" && (
        <Tabs defaultValue="Accomplishment Report" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
            <TabsTrigger 
              value="Accomplishment Report"
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white"
            >
              Accomplishment Report
            </TabsTrigger>
            <TabsTrigger 
              value="Liquidation Report"
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white"
            >
              Liquidation Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Accomplishment Report">
            {getSubmissionsByType("Accomplishment Report").length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No accomplishment reports</p>
                <p className="text-gray-400 text-sm mt-2">
                  Accomplishment reports will appear here
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#003b27]">
                      <TableHead className="text-white font-semibold">Approved by</TableHead>
                      <TableHead className="text-white font-semibold">File Name</TableHead>
                      <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                      <TableHead className="text-white font-semibold">Action</TableHead>
                      <TableHead className="text-white font-semibold">Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSubmissionsByType("Accomplishment Report").map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            {submission.organization}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="truncate max-w-[200px]" title={submission.file_name}>
                              {submission.file_name || "Accomplishment Report"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                          >
                            Comment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="Liquidation Report">
            {getSubmissionsByType("Liquidation Report").length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No liquidation reports</p>
                <p className="text-gray-400 text-sm mt-2">
                  Liquidation reports will appear here
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#003b27]">
                      <TableHead className="text-white font-semibold">Approved by</TableHead>
                      <TableHead className="text-white font-semibold">File Name</TableHead>
                      <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                      <TableHead className="text-white font-semibold">Action</TableHead>
                      <TableHead className="text-white font-semibold">Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSubmissionsByType("Liquidation Report").map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            {submission.organization}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="truncate max-w-[200px]" title={submission.file_name}>
                              {submission.file_name || "Liquidation Report"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                          >
                            Comment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Old Direct Liquidation Report View for non-COA */}
      {hideNavButtons && orgShortName !== "COA" && (
        <div className="space-y-4">
          {getSubmissionsByType("Liquidation Report").length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No liquidation reports</p>
              <p className="text-gray-400 text-sm mt-2">
                Liquidation reports will appear here
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#003b27]">
                    <TableHead className="text-white font-semibold">Accredited Org</TableHead>
                    <TableHead className="text-white font-semibold">File Name</TableHead>
                    <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSubmissionsByType("Liquidation Report").map((submission) => (
                    <TableRow key={submission.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          {submission.organization}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="truncate max-w-[200px]" title={submission.file_name}>
                            {submission.file_name || "Liquidation Report"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          submission.status === "Approved" 
                            ? "bg-green-100 text-green-800" 
                            : submission.status === "For Revision"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                // Reload submissions to reflect the change
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => openViewDialog(submission)}
                            variant="outline"
                            size="sm"
                            className="border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}


      {renderDialogs()}
    </>
  );

  // If embedded (used inside another dashboard), just return the content
  if (isEmbedded) {
    return renderContent();
  }

  // Full page layout with sidebar for OSLD
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Menu Button */}
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
              style={{ ringColor: "#d4af37" }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Organization Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                {orgShortName}
              </h1>
              <p className="text-xs text-white/60 mt-1">{orgFullName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {[
            "Dashboard",
            "Accounts",
            "Submissions",
            "Form Templates",
            "Create Account",
            "Activity Logs",
            "Director & Staff",
            "Organizations",
          ].map((item) => (
            <Button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                activeNav === item
                  ? "text-[#003b27]"
                  : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              }`}
              style={
                activeNav === item ? { backgroundColor: "#d4af37" } : undefined
              }
              variant={activeNav === item ? "default" : "ghost"}
            >
              {item}
            </Button>
          ))}
          <Button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
            variant="ghost"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pt-16 lg:pt-0 bg-white">
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}