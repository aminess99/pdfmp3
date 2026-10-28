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
import { findLandingPage } from './data/landingPages';
import { ConversionJob, Voice } from './types';
import { audioEngine } from './lib/audioEngine';
import { useVoices } from './lib/useVoices';
import { useAuth } from './lib/AuthContext';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [landingPage] = useState(() => findLandingPage(window.location.pathname));
  const [isNotFound] = useState(() => !landingPage && !['/', '/index.html'].includes(window.location.pathname));
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

  // All 30 authentic Arabic voices across 14 dialects
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
    let planName = 'باقة القارئ (Starter)';
    let unitRate = 0.03;
    if (planId === 'popular') {
      planName = 'باقة الشغوف (Pro Pack)';
      unitRate = 0.03;
    } else if (planId === 'master') {
      planName = 'باقة النخبة (Master Pack)';
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

  // Handle successful credit recharge
  const handleSuccessPayment = (addedMinutes: number) => {
    // Notify user dashboard / local credit state
    const current = parseInt(localStorage.getItem('user_minutes_quota') || '30', 10);
    localStorage.setItem('user_minutes_quota', (current + addedMinutes).toString());
    window.dispatchEvent(new Event('quota_updated'));
  };

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
        window.location.href = `/#${sectionId}`;
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

  // If User is Authenticated, render App Dashboard directly (no marketing distraction!)
  if (user) {
    return (
      <div className="min-h-screen bg-ink text-slate-100 font-body">
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

        {/* SEO landing page article (only on /<slug> pages) */}
        {landingPage && <LandingContent page={landingPage} />}

        <VoiceSamplesSection availableVoicesList={allVoices} />
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
