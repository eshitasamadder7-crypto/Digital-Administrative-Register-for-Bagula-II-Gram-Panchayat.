import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GovHeader from "@/components/GovHeader";
import GovFooter from "@/components/GovFooter";
import Index from "./pages/Index.tsx";
import DependentCertificate from "./pages/DependentCertificate.tsx";
import WarishCertificate from "./pages/WarishCertificate.tsx";
import LinkageCertificate from "./pages/LinkageCertificate.tsx";
import WarishApplicationFormPage from "./pages/WarishApplicationFormPage.tsx";
import BirthDigitizationFormPage from "./pages/BirthDigitizationFormPage.tsx";
import WbpmsInfo from "./pages/WbpmsInfo.tsx";
import ElectedRepresentatives from "./pages/ElectedRepresentatives.tsx";
import AdminAuth from "./pages/AdminAuth.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import DeoDashboard from "./pages/DeoDashboard.tsx";
import AdminWhatsNew from "./pages/AdminWhatsNew.tsx";
import AdminWarishList from "./pages/AdminWarishList.tsx";
import AdminDependentList from "./pages/AdminDependentList.tsx";
import AdminManageAdmins from "./pages/AdminManageAdmins.tsx";
import AdminAccountSettings from "./pages/AdminAccountSettings.tsx";
import AdminBackups from "./pages/AdminBackups.tsx";
import AdminReview from "./pages/AdminReview.tsx";
import AdminMasterData from "./pages/AdminMasterData.tsx";
import AdminEmployees from "./pages/AdminEmployees.tsx";
import AdminActivityLog from "./pages/AdminActivityLog.tsx";
import AdminNotifications from "./pages/AdminNotifications.tsx";
import AdminDigitalizationSettings from "./pages/AdminDigitalizationSettings.tsx";
import AdminPortalControls from "./pages/AdminPortalControls.tsx";
import AdminProfilesDirectory from "./pages/AdminProfilesDirectory.tsx";
import AdminDeoQuotas from "./pages/AdminDeoQuotas.tsx";
import AdminSystemStatusPage from "./pages/AdminSystemStatusPage.tsx";
import RequirePermission from "./components/RequirePermission";
import RequireAdmin from "./components/RequireAdmin";
import Verify from "./pages/Verify.tsx";
import NotFound from "./pages/NotFound.tsx";
import ComingSoon from "./pages/ComingSoon.tsx";
import ApplicationWizard from "./pages/deo/ApplicationWizard.tsx";
import DarHub from "./pages/dar/DarHub.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import PublicIntro from "./pages/public/PublicIntro.tsx";
import PublicRegister from "./pages/public/PublicRegister.tsx";
import PublicLogin from "./pages/public/PublicLogin.tsx";
import PublicDashboard from "./pages/public/PublicDashboard.tsx";
import { MyProfile, EditProfile, ChangePassword, LanguagePreference } from "./pages/public/PublicProfile.tsx";
import PublicProfileComplete from "./pages/public/PublicProfileComplete.tsx";
import RequireCitizen from "./modules/citizen/RequireCitizen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NavigationHistoryProvider } from "@/hooks/useGoBack";

const queryClient = new QueryClient();

import ServiceDetailPage from "./pages/ServiceDetailPage";

function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDarHub = location.pathname.startsWith("/dar");
  const isPublicPortal = location.pathname.startsWith("/public");
  const isAdmin = location.pathname.startsWith("/admin");
  const hideChrome = isHome || isDarHub || isPublicPortal || isAdmin;

  return (
    <>
      {!hideChrome && <GovHeader />}
      <main className={hideChrome ? "" : "flex-1"}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dar" element={<DarHub />} />
          <Route path="/service/:slug" element={<ServiceDetailPage />} />
          <Route path="/dependent-certificate" element={<RequireAdmin><DependentCertificate /></RequireAdmin>} />
          <Route path="/warish-certificate" element={<RequireAdmin><WarishCertificate /></RequireAdmin>} />
          <Route path="/linkage-certificate" element={<RequireAdmin><LinkageCertificate /></RequireAdmin>} />
          <Route path="/warish-application-form" element={<WarishApplicationFormPage />} />
          <Route path="/warish-form" element={<WarishApplicationFormPage />} />
          <Route path="/birth-digitization-form" element={<BirthDigitizationFormPage />} />
          <Route path="/birth-form" element={<BirthDigitizationFormPage />} />
          <Route path="/legacy-birth-form" element={<BirthDigitizationFormPage />} />
          <Route path="/wbpms-info" element={<WbpmsInfo />} />
          <Route path="/elected-representatives" element={<ElectedRepresentatives />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/public" element={<PublicIntro />} />
          <Route path="/public/register" element={<PublicRegister />} />
          <Route path="/public/login" element={<PublicLogin />} />
          <Route path="/public/dashboard" element={<RequireCitizen><PublicDashboard /></RequireCitizen>} />
          <Route path="/public/apply/:kind" element={<RequireCitizen><ErrorBoundary name="CitizenApplicationWizard"><ApplicationWizard citizen /></ErrorBoundary></RequireCitizen>} />
          <Route path="/public/profile" element={<RequireCitizen><MyProfile /></RequireCitizen>} />
          <Route path="/public/profile/complete" element={<RequireCitizen><PublicProfileComplete /></RequireCitizen>} />
          <Route path="/public/profile/edit" element={<RequireCitizen><EditProfile /></RequireCitizen>} />
          <Route path="/public/profile/password" element={<RequireCitizen><ChangePassword /></RequireCitizen>} />
          <Route path="/public/profile/language" element={<RequireCitizen><LanguagePreference /></RequireCitizen>} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/admin" element={<ErrorBoundary name="AdminAuth"><AdminAuth /></ErrorBoundary>} />
          <Route path="/admin/dashboard" element={<RequireAdmin><ErrorBoundary name="AdminDashboard"><AdminDashboard /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/deo" element={<RequireAdmin><ErrorBoundary name="DeoDashboard"><DeoDashboard /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/deo/apply/:kind" element={<RequireAdmin><ErrorBoundary name="ApplicationWizard"><ApplicationWizard /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/digitalization-settings" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminDigitalizationSettings"><AdminDigitalizationSettings /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/system-settings" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminDigitalizationSettings"><AdminDigitalizationSettings /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/portal-controls" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminPortalControls"><AdminPortalControls /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/review" element={<RequireAdmin><ErrorBoundary name="AdminReview"><AdminReview /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/warish" element={<RequireAdmin><RequirePermission permission="warish_certs"><ErrorBoundary name="AdminWarishList"><AdminWarishList /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/dependent" element={<RequireAdmin><RequirePermission permission="dependent_certs"><ErrorBoundary name="AdminDependentList"><AdminDependentList /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/notices" element={<RequireAdmin><RequirePermission permission="notices"><ErrorBoundary name="AdminWhatsNew"><AdminWhatsNew /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/whats-new" element={<RequireAdmin><RequirePermission permission="notices"><ErrorBoundary name="AdminWhatsNew"><AdminWhatsNew /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/manage" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminManageAdmins"><AdminManageAdmins /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/master-data" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminMasterData"><AdminMasterData /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/employees" element={<RequireAdmin><RequirePermission permission="admins" superAdminOnly><ErrorBoundary name="AdminEmployees"><AdminEmployees /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/profiles-directory" element={<RequireAdmin><RequirePermission permission="admins"><ErrorBoundary name="AdminProfilesDirectory"><AdminProfilesDirectory /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/citizen-cyber-profiles" element={<RequireAdmin><RequirePermission permission="admins"><ErrorBoundary name="AdminProfilesDirectory"><AdminProfilesDirectory /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/deo-quotas" element={<RequireAdmin><ErrorBoundary name="AdminDeoQuotas"><AdminDeoQuotas /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/deo-tiers" element={<RequireAdmin><ErrorBoundary name="AdminDeoQuotas"><AdminDeoQuotas /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/deo-permissions" element={<RequireAdmin><ErrorBoundary name="AdminDeoQuotas"><AdminDeoQuotas /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/activity" element={<RequireAdmin><ErrorBoundary name="AdminActivityLog"><AdminActivityLog /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/notifications" element={<RequireAdmin><ErrorBoundary name="AdminNotifications"><AdminNotifications /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/account" element={<RequireAdmin><ErrorBoundary name="AdminAccountSettings"><AdminAccountSettings /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/system-status" element={<RequireAdmin><ErrorBoundary name="AdminSystemStatusPage"><AdminSystemStatusPage /></ErrorBoundary></RequireAdmin>} />
          <Route path="/admin/backups" element={<RequireAdmin><RequirePermission permission="backups" superAdminOnly><ErrorBoundary name="AdminBackups"><AdminBackups /></ErrorBoundary></RequirePermission></RequireAdmin>} />
          <Route path="/admin/*" element={<RequireAdmin><ErrorBoundary name="ComingSoon"><ComingSoon /></ErrorBoundary></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideChrome && <GovFooter />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavigationHistoryProvider>
          <div className="min-h-screen flex flex-col">
            <AppLayout />
          </div>
        </NavigationHistoryProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
