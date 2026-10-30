import React, { useEffect, useState } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { HeroSection } from './components/HeroSection';
import { ConversionTool } from './components/ConversionTool';
import { VoiceSamplesSection } from './components/VoiceSamplesSection';
import { HowItWorks, UseCasesSection } from './components/HowItWorks';
import { PricingSection } from './components/PricingSection';
import { FAQSection } from './components/FAQSection';
import { AuthModals } from './components/AuthModals';
import { StudioView } from './components/StudioView';
import { UserDashboard } from './components/UserDashboard';
import { Footer } from './components/Footer';
import { PaymentCheckoutModal } from './components/PaymentCheckoutModal';
import { LegalModal } from './components/LegalModal';
import { LandingContent } from './components/LandingContent';
import { NotFound } from './components/NotFound';
import { Toaster } from './components/Toaster';
import { SharePage } from './components/SharePage';
import { SummaryPage } from './components/SummaryPage';
import { SummariesHub, SummariesShowcase } from './components/SummariesHub';
import { findSummary, isSummariesHub } from './data/summaries';
import { SHARE_PATH_RE } from './lib/shares';
import { REQUIRE_AUTH_EVENT, OUT_OF_CREDITS_EVENT } from './lib/apiFetch';
import { findLandingPage } from './data/landingPages';
import { HOME_SECTIONS } from './data/homeContent';
import { ConversionJob, Voice } from './types';
import { audioEngine } from './lib/audioEngine';
import { useVoices } from './lib/useVoices';
import { useAuth } from './lib/AuthContext';
import { tr, HOME_PATH, isEn } from './lib/i18n';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [landingPage] = useState(() => findLandingPage(window.location.pathname));
  const [shareId] = useState(() => window.location.pathname.match(SHARE_PATH_RE)?.[1] || null);
  const [summary] = useState(() => findSummary(window.location.pathname));
  const [isHub] = useState(() => isSummariesHub(window.location.pathname));
  const [isNotFound] = useState(() => !landingPage && !shareId && !summary && !isHub && !['/', '/index.html', '/en', '/en/'].includes(window.location.pathname));
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login',
  });
  const [activeJob, setActiveJob] = useState<ConversionJob | null>(null);
  const [activeSection, setActiveSection] = useState<string>('home');

  // Checkout Payment Modal State
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    plan: {
      id: string;
      name: string;
      priceUsd: number;
      minutes: number;
      unitRateUsd: number;
    } | null;
  }>({
    isOpen: false,
    plan: null,
  });

  // Legal Modals State
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    type: 'terms' | 'privacy';
  }>({
    isOpen: false,
    type: 'privacy',
  });

  // All Arabic voices across every supported dialect
  const { allVoices } = useVoices();

  // Real Firebase Auth
  const { user, signOut, isAdmin } = useAuth();

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleConversionStart = (job: ConversionJob) => {
    setActiveJob(job);
  };

  // Select plan handler from Pricing Section
  const handleSelectPlan = (planId: string, minutes: number, price: number) => {
    let planName = tr("باقة القارئ (Starter)", "Reader");
    let unitRate = 0.03;
    if (planId === 'popular') {
      planName = tr("باقة الشغوف (Pro Pack)", "Book lover");
      unitRate = 0.03;
    } else if (planId === 'master') {
      planName = tr("باقة النخبة (Master Pack)", "Pro");
      unitRate = 0.02;
    }

    setCheckoutModal({
      isOpen: true,
      plan: {
        id: planId,
        name: planName,
        priceUsd: price,
        minutes: minutes,
        unitRateUsd: unitRate,
      },
    });
  };

  // Minutes are only ever added by the server (payment webhook), never by the client
  const handleSuccessPayment = () => {};

  // Server answers "sign in first" / "out of minutes" (lib/apiFetch.ts) -> open the right dialog
  useEffect(() => {
    const onRequireAuth = () => setAuthModal({ isOpen: true, mode: 'register' });
    const onOutOfCredits = () => handleSelectPlan('popular', 666, 19.99);
    window.addEventListener(REQUIRE_AUTH_EVENT, onRequireAuth);
    window.addEventListener(OUT_OF_CREDITS_EVENT, onOutOfCredits);
    return () => {
      window.removeEventListener(REQUIRE_AUTH_EVENT, onRequireAuth);
      window.removeEventListener(OUT_OF_CREDITS_EVENT, onOutOfCredits);
    };
  }, []);

  // Listen to background progressive chapter updates
  React.useEffect(() => {
    const handleJobUpdated = (e: any) => {
      if (e.detail && e.detail.id) {
        setActiveJob((prev) => {
          if (prev && prev.id === e.detail.id) {
            return { ...e.detail };
          }
          return prev;
        });
      }
    };
    window.addEventListener('audio_job_updated', handleJobUpdated);
    return () => window.removeEventListener('audio_job_updated', handleJobUpdated);
  }, []);

  const handlePreviewVoiceSample = (voice: Voice) => {
    audioEngine.playVoicePreview(voice);
  };

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Section lives on the home page (e.g. navigating from the 404 page)
        window.location.href = `${HOME_PATH}#${sectionId}`;
      }
    }
  };

  // Content renders after load, so the browser can't jump to a #section on its own
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView(), 300);
    return () => clearTimeout(t);
  }, []);

  // Public content pages (shared clips, book summaries), the same for guests and signed-in users
  if (shareId || summary || isHub) {
    return (
      <div className="min-h-screen bg-ink text-slate-100 font-body">
        <Toaster />
        <SiteHeader onOpenAuth={handleOpenAuth} onNavigate={handleNavigate} />
        <main>
          {shareId ? <SharePage shareId={shareId} /> : summary ? <SummaryPage summary={summary} /> : <SummariesHub />}
        </main>
        <Footer onNavigate={handleNavigate} onOpenLegal={(type) => setLegalModal({ isOpen: true, type })} />
        {authModal.isOpen && (
          <AuthModals
            isOpen={authModal.isOpen}
            mode={authModal.mode}
            onClose={handleCloseAuth}
            onSwitchMode={(mode) => setAuthModal({ isOpen: true, mode })}
          />
        )}
        {legalModal.isOpen && (
          <LegalModal isOpen={legalModal.isOpen} onClose={() => setLegalModal({ ...legalModal, isOpen: false })} type={legalModal.type} />
        )}
      </div>
    );
  }

  // If User is Authenticated, render App Dashboard directly (no marketing distraction!)
  if (user) {
    return (
      <div className="min-h-screen bg-ink text-slate-100 font-body">
      <Toaster />
        <UserDashboard
          user={{ name: user.name, email: user.email }}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onStartJob={(job) => setActiveJob(job)}
          availableVoices={allVoices}
          onOpenCheckout={(plan) => setCheckoutModal({ isOpen: true, plan })}
        />

        {/* Studio View (Single-Screen 100vh Immersion Dashboard with 0-Scroll) */}
        {activeJob && (
          <StudioView
            job={activeJob}
            onExit={() => setActiveJob(null)}
            availableVoices={allVoices}
            isUserLoggedIn={true}
          />
        )}

        {/* Payment Checkout Modal */}
        {checkoutModal.isOpen && (
          <PaymentCheckoutModal
            isOpen={checkoutModal.isOpen}
            onClose={() => setCheckoutModal({ isOpen: false, plan: null })}
            plan={checkoutModal.plan}
            onSuccessPayment={handleSuccessPayment}
          />
        )}
      </div>
    );
  }

  // If Guest (unregistered user), render full Marketing Landing Page + Interactive Conversion Hook
  return (
    <div className="min-h-screen bg-ink text-slate-100 font-body">
      <Toaster />
      <SiteHeader onOpenAuth={handleOpenAuth} onNavigate={handleNavigate} />

      {isNotFound ? (
        <main>
          <NotFound />
        </main>
      ) : (
      <main>
        <HeroSection badge={landingPage?.badge} title={landingPage?.h1} subtitle={landingPage?.subtitle}>
          <ConversionTool
            onConversionStart={handleConversionStart}
            onPreviewVoiceSample={handlePreviewVoiceSample}
            availableVoicesList={allVoices}
            onRequestAuth={handleOpenAuth}
            initialDialectId={landingPage?.dialectId}
            initialInputMode={landingPage?.inputMode}
          />
        </HeroSection>

        {/* SEO article: page-specific on /<slug> landing pages, general on the home page */}
        {landingPage ? (
          <LandingContent
            sections={landingPage.sections}
            faqs={landingPage.faqs}
            faqTitle={`أسئلة حول ${landingPage.linkLabel}`}
            currentSlug={landingPage.slug}
          />
        ) : (
          <LandingContent sections={HOME_SECTIONS} currentSlug="" />
        )}

        <VoiceSamplesSection availableVoicesList={allVoices} />
        {/* The summaries are Arabic only */}
        {!isEn && <SummariesShowcase />}
        <HowItWorks />
        <UseCasesSection />
        <PricingSection onSelectPlan={handleSelectPlan} />
        <FAQSection />
      </main>
      )}

      {/* Footer */}
      <Footer 
        onNavigate={handleNavigate} 
        onOpenLegal={(type) => setLegalModal({ isOpen: true, type })}
      />

      {/* Studio View (Single-Screen 100vh Immersion Dashboard with 0-Scroll) */}
      {activeJob && (
        <StudioView
          job={activeJob}
          onExit={() => setActiveJob(null)}
          availableVoices={allVoices}
          isUserLoggedIn={false}
          onRequestAuth={handleOpenAuth}
        />
      )}


      {/* Authentication Dialog Modal */}
      {authModal.isOpen && (
        <AuthModals
          isOpen={authModal.isOpen}
          mode={authModal.mode}
          onClose={handleCloseAuth}
          onSwitchMode={(mode) => setAuthModal({ isOpen: true, mode })}
        />
      )}

      {/* Payment Checkout Modal */}
      {checkoutModal.isOpen && (
        <PaymentCheckoutModal
          isOpen={checkoutModal.isOpen}
          onClose={() => setCheckoutModal({ isOpen: false, plan: null })}
          plan={checkoutModal.plan}
          onSuccessPayment={handleSuccessPayment}
        />
      )}

      {/* Legal & Privacy Modal */}
      {legalModal.isOpen && (
        <LegalModal
          isOpen={legalModal.isOpen}
          onClose={() => setLegalModal({ isOpen: false, type: 'privacy' })}
          type={legalModal.type}
        />
      )}
    </div>
  );
}
