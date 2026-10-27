import React, { useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ConversionTool } from './components/ConversionTool';
import { FeaturesBox } from './components/FeaturesBox';
import { ValueMetrics } from './components/ValueMetrics';
import { VoiceSamplesSection } from './components/VoiceSamplesSection';
import { HowItWorks } from './components/HowItWorks';
import { PricingSection } from './components/PricingSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { AudiobookGuidesSection } from './components/AudiobookGuidesSection';
import { FAQSection } from './components/FAQSection';
import { ContactSection } from './components/ContactSection';
import { AuthModals } from './components/AuthModals';
import { AudioPlayerDrawer } from './components/AudioPlayerDrawer';
import { AudioLibraryModal } from './components/AudioLibraryModal';
import { StudioView } from './components/StudioView';
import { UserDashboard } from './components/UserDashboard';
import { Footer } from './components/Footer';
import { PaymentCheckoutModal } from './components/PaymentCheckoutModal';
import { LegalModal } from './components/LegalModal';
import { ConversionJob, Voice } from './types';
import { audioEngine } from './lib/audioEngine';
import { useVoices } from './lib/useVoices';
import { useAuth } from './lib/AuthContext';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login',
  });
  const [libraryOpen, setLibraryOpen] = useState<boolean>(false);
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
      }
    }
  };

  // If User is Authenticated, render App Dashboard directly (no marketing distraction!)
  if (user) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#090d16] text-slate-100' : 'bg-slate-900 text-slate-100'} transition-colors duration-300 font-['Cairo',sans-serif]`}>
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
    <div className={`min-h-screen ${darkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-900 text-slate-100'} transition-colors duration-300 font-['Cairo',sans-serif]`}>
      {/* Header */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
        activeSection={activeSection}
        user={null}
        onLogout={handleLogout}
        onOpenLibrary={() => handleOpenAuth('login')}
        isAdmin={false}
      />

      {/* Main Content Area */}
      <main className="space-y-4">
        {/* Hero Section */}
        <HeroSection />

        {/* Core Interactive Tool & Features Box (Left: Conversion Tool, Right: Features Box) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Box: Core Conversion Tool (7 cols) */}
            <div className="lg:col-span-7 flex">
              <ConversionTool
                onConversionStart={handleConversionStart}
                onPreviewVoiceSample={handlePreviewVoiceSample}
                availableVoicesList={allVoices}
                onRequestAuth={handleOpenAuth}
              />
            </div>

            {/* Right Box: Features & Info Box (5 cols) */}
            <div className="lg:col-span-5 flex">
              <FeaturesBox />
            </div>

          </div>
        </section>

        {/* 4 Metrics Bar */}
        <ValueMetrics />

        {/* Voice Samples & 14 Dialects Explorer */}
        <VoiceSamplesSection availableVoicesList={allVoices} />

        {/* How It Works */}
        <HowItWorks />

        {/* Pricing */}
        <PricingSection onSelectPlan={handleSelectPlan} />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* SEO Guides & Knowledge Base */}
        <AudiobookGuidesSection />

        {/* FAQ */}
        <FAQSection />

        {/* Contact */}
        <ContactSection />
      </main>

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
        />
      )}

      {/* Saved Audio Library Modal */}
      {libraryOpen && (
        <AudioLibraryModal
          isOpen={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onPlayJob={(job) => setActiveJob(job)}
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
