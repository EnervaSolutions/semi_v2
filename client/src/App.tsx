import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/auth-page";
import PasswordReset from "@/pages/PasswordReset";
import Dashboard from "@/pages/Dashboard";
import Applications from "@/pages/Applications";
import Documents from "@/pages/Documents";
import TeamManagement from "@/pages/TeamManagement";
import AdminPanel from "@/pages/AdminPanel";
import AdminDashboard from "@/pages/AdminDashboard";
import ContractorManagement from "@/pages/ContractorManagement";
import Profile from "@/pages/Profile";
import SecuritySettings from "@/pages/security-settings";
import VerifyEmail from "@/pages/verify-email";
import ApplicationDetails from "@/pages/application-details";
import AdminFormBuilder from "@/pages/admin-form-builder";
import AdminActivityTemplates from "@/pages/AdminActivityTemplates";
import AdminApplicationDetails from "@/pages/AdminApplicationDetails";
import AdminApprovalDashboard from "@/pages/AdminApprovalDashboard";
import AdminSubmissionReview from "@/pages/AdminSubmissionReview";
import AdminApplicationsPage from "@/pages/AdminApplicationsPage";
import ThreadedMessages from "@/pages/threaded-messages";
import AdminSupportDashboard from "@/pages/admin-support-dashboard";
import AdminGhostIdsPage from "@/pages/AdminGhostIdsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminCompaniesPage from "@/pages/AdminCompaniesPage";
import AdminFacilityActivitiesPage from "@/pages/AdminFacilityActivitiesPage";
import AdminApplicationLimitsPage from "@/pages/AdminApplicationLimitsPage";
import AdminContractorAssignmentPage from "@/pages/AdminContractorAssignmentPage";
import ContractorDashboard from "@/pages/contractor-dashboard-new";
import ContractorApplications from "@/pages/contractor-applications";
import ContractorServices from "@/pages/contractor-services";
import ContractorTeam from "@/pages/contractor-team";
import ContractorProfile from "@/pages/contractor-profile";
import ContractorAssignments from "@/pages/contractor-assignments";
import SystemNotifications from "@/pages/SystemNotifications";
import AdminArchiveSettingsPage from "@/pages/AdminArchiveSettingsPage";
import AdminRecognitionPage from "@/pages/AdminRecognitionPage";
import RecognitionPage from "@/pages/RecognitionPage";
import TermsOfUse from "@/pages/TermsOfUse";
import Accessibility from "@/pages/Accessibility";
import Layout from "@/components/Layout";
import AcceptInvite from './pages/accept-invite';
import AcceptContractorInvite from '@/pages/accept-contractor-invite';

// Component to handle admin redirect
function AdminRedirect() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'system_admin' && location === '/') {
      setLocation('/admin');
    }
  }, [user, location, setLocation]);

  return null;
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/reset-password" component={PasswordReset} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/contractor-dashboard" component={ContractorDashboard} />
        <Route path="/terms-of-use" component={TermsOfUse} />
        <Route path="/accessibility" component={Accessibility} />
        <Route path="/accept-invite/:token" component={AcceptInvite} />
        <Route path="/accept-contractor-invite/:token" component={AcceptContractorInvite} />
        <Route path="*" component={NotFound} />
      </Switch>
    );
  }

  if (user?.role === 'system_admin') {
    return (
      <Layout>
        <AdminRedirect />
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/dashboard" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/form-builder" component={AdminFormBuilder} />
          <Route path="/admin/activity-templates" component={AdminActivityTemplates} />
          <Route path="/applications" component={AdminApplicationsPage} />
          <Route path="/applications/:id" component={ApplicationDetails} />
          <Route path="/admin/applications" component={AdminApplicationsPage} />
          <Route path="/admin/applications/:id" component={ApplicationDetails} />
          <Route path="/admin/ghost-ids" component={AdminGhostIdsPage} />
          <Route path="/admin/approvals" component={AdminApprovalDashboard} />
          <Route path="/admin/submissions/:id/review" component={AdminSubmissionReview} />
          <Route path="/admin/users" component={AdminUsersPage} />
          <Route path="/admin/companies" component={AdminCompaniesPage} />
          <Route path="/admin/facility-activities" component={AdminFacilityActivitiesPage} />
          <Route path="/admin/application-limits" component={AdminApplicationLimitsPage} />
          <Route path="/admin/contractor-assignment" component={AdminContractorAssignmentPage} />
          <Route path="/admin/archive-settings" component={AdminArchiveSettingsPage} />
          <Route path="/admin/system-notifications" component={SystemNotifications} />
          <Route path="/admin/recognition" component={AdminRecognitionPage} />
          <Route path="/admin/support" component={AdminSupportDashboard} />
          <Route path="/recognition" component={RecognitionPage} />
          <Route path="/documents" component={Documents} />
          <Route path="/messages" component={ThreadedMessages} />
          <Route path="/support" component={AdminSupportDashboard} />
          <Route path="/team" component={TeamManagement} />
          <Route path="/contractors" component={ContractorManagement} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Profile} />
          <Route path="/security" component={SecuritySettings} />
          <Route path="*" component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  if (user?.role === 'contractor_individual' || user?.role === 'contractor_team_member' || user?.role === 'contractor_account_owner' || user?.role === 'contractor_manager') {
    return (
      <Layout>
        <Switch>
          <Route path="/" component={ContractorDashboard} />
          <Route path="/dashboard" component={ContractorDashboard} />
          <Route path="/contractor-dashboard" component={ContractorDashboard} />
          <Route path="/applications" component={ContractorApplications} />
          <Route path="/applications/:id" component={ApplicationDetails} />
          <Route path="/assignments" component={ContractorAssignments} />
          <Route path="/services" component={ContractorServices} />
          <Route path="/team" component={ContractorTeam} />
          <Route path="/profile" component={ContractorProfile} />
          <Route path="/messages" component={ThreadedMessages} />
          <Route path="/settings" component={ContractorProfile} />
          <Route path="/security" component={SecuritySettings} />
          <Route path="*" component={NotFound} />
        </Switch>
      </Layout>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/applications" component={Applications} />
        <Route path="/applications/:id" component={ApplicationDetails} />
        <Route path="/documents" component={Documents} />
        <Route path="/messages" component={ThreadedMessages} />
        <Route path="/team" component={TeamManagement} />
        <Route path="/contractors" component={ContractorManagement} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/admin/panel" component={AdminPanel} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/approvals" component={AdminApprovalDashboard} />
        <Route path="/admin/submission-review/:submissionId" component={AdminSubmissionReview} />
        <Route path="/admin/applications" component={AdminApplicationsPage} />
        <Route path="/admin/application-details/:id" component={AdminApplicationDetails} />
        <Route path="/admin/support" component={AdminSupportDashboard} />
        <Route path="/admin/ghost-ids" component={AdminGhostIdsPage} />
        <Route path="/recognition" component={RecognitionPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Profile} />
        <Route path="/security" component={SecuritySettings} />
        <Route path="*" component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;