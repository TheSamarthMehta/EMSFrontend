import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { hasAcceptedTerms, markTermsAccepted } from "@/utils/termsAcceptance";

export default function TermsOfServicePage() {
  const effectiveDate = "April 14, 2026";
  const [acceptedByScroll, setAcceptedByScroll] = useState<boolean>(hasAcceptedTerms());

  useEffect(() => {
    if (acceptedByScroll) {
      return;
    }

    const onScroll = (): void => {
      const doc = document.documentElement;
      const reachedBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 12;

      if (reachedBottom) {
        markTermsAccepted();
        setAcceptedByScroll(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [acceptedByScroll]);

  return (
    <div className="min-h-screen bg-[#05050c] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-indigo-400/20 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <div className="sticky top-4 z-20 mb-6 rounded-xl border border-indigo-400/25 bg-[#0d0d18]/95 px-4 py-3 text-xs sm:text-sm">
          {acceptedByScroll ? (
            <p className="font-medium text-emerald-300">
              Terms accepted. You have reached the end of this page. You can return to signup.
            </p>
          ) : (
            <p className="font-medium text-amber-300">
              Scroll through this page to the bottom to auto-accept Terms of Service.
            </p>
          )}
        </div>
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Legal</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-white/65">
            Welcome to {APP_NAME}. These Terms of Service govern your access to and use of the
            platform, including our web application, APIs, and related services.
          </p>
          <p className="mt-2 text-sm text-white/50">Effective Date: {effectiveDate}</p>
        </header>

        <main className="mt-8 space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-white/70">
              By creating an account, accessing, or using {APP_NAME}, you agree to be bound by
              these Terms and our applicable policies. If you do not agree, you must not use the
              service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Eligibility and Accounts</h2>
            <p className="text-sm leading-relaxed text-white/70">
              You must provide accurate account information and keep your credentials confidential.
              You are responsible for all activity under your account. You must notify us promptly
              if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Service Description</h2>
            <p className="text-sm leading-relaxed text-white/70">
              {APP_NAME} helps users manage personal and group finances, including expense
              tracking, budgeting, reporting, and analytics. Features may evolve over time, and we
              may modify, improve, or discontinue parts of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. User Content and Data</h2>
            <p className="text-sm leading-relaxed text-white/70">
              You retain ownership of the financial and profile data you submit. By using the
              service, you grant us a limited right to process that data solely to operate, secure,
              and improve the platform. You are responsible for ensuring the data you upload is
              lawful and accurate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Acceptable Use</h2>
            <p className="text-sm leading-relaxed text-white/70">
              You agree not to misuse the service, including attempting unauthorized access,
              disrupting system integrity, reverse engineering protected components, transmitting
              malware, or using the platform for unlawful purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Security and Privacy</h2>
            <p className="text-sm leading-relaxed text-white/70">
              We implement reasonable technical and organizational safeguards, but no system is
              completely secure. You acknowledge that internet-based services may involve residual
              risk. Your use of the platform is also subject to our privacy practices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Third-Party Services</h2>
            <p className="text-sm leading-relaxed text-white/70">
              Certain features may rely on third-party providers (for example, authentication,
              cloud storage, or analytics). We are not responsible for third-party platforms and
              their terms or availability.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-white/70">
              The software, branding, and design elements of {APP_NAME} are protected by
              applicable intellectual property laws. Except as explicitly allowed, you may not copy,
              distribute, or create derivative works from our proprietary materials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">9. Disclaimer of Warranties</h2>
            <p className="text-sm leading-relaxed text-white/70">
              The service is provided on an as-is and as-available basis without warranties of any
              kind, whether express or implied, including merchantability, fitness for a particular
              purpose, or non-infringement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">10. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-white/70">
              To the maximum extent permitted by law, {APP_NAME} and its operators are not liable
              for indirect, incidental, special, consequential, or punitive damages, including loss
              of profits, data, or business opportunities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">11. Suspension and Termination</h2>
            <p className="text-sm leading-relaxed text-white/70">
              We may suspend or terminate accounts that violate these Terms, create legal risk, or
              threaten platform security. You may stop using the service at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">12. Updates to Terms</h2>
            <p className="text-sm leading-relaxed text-white/70">
              We may update these Terms to reflect legal, technical, or business changes. Continued
              use after updates become effective constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">13. Contact</h2>
            <p className="text-sm leading-relaxed text-white/70">
              For questions regarding these Terms, please contact the {APP_NAME} support team
              through the official channels provided within the application.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
