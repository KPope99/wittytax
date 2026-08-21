import React from 'react';
import LegalPageLayout, { SectionHeading, P, Ul } from './LegalPageLayout';

interface Props {
  onBack: () => void;
}

const TermsOfServicePage: React.FC<Props> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="The terms that govern your use of WittyTax"
      lastUpdated="August 2026"
      onBack={onBack}
    >
      <P>
        These Terms of Service ("Terms") govern your access to and use of WittyTax, a product of
        Tech84 Alliance ("Tech84 Alliance", "we", "us"). By creating an account or otherwise using
        WittyTax, you agree to these Terms. If you do not agree, please do not use WittyTax.
      </P>

      <SectionHeading>1. Description of Service</SectionHeading>
      <P>
        WittyTax is a web-based tax calculation and advisory tool for Nigerian individuals and
        businesses, built around the Nigeria Tax Act 2025 (NTA 2025). WittyTax provides Personal
        Income Tax and Company Income Tax calculators, a guided calculation wizard, document
        upload with automated data extraction, tax calculation history, and optional AI-powered
        tax-saving recommendations and business forecasting.
      </P>

      <SectionHeading>2. Not Professional Advice</SectionHeading>
      <P>
        WittyTax provides <strong>estimates and general information only</strong>. It does not
        constitute professional tax, legal, accounting or financial advice, and no
        accountant-client, advisor-client, or similar professional relationship is created by your
        use of the service. Tax outcomes depend on your complete individual circumstances, and
        legislation, rates and thresholds may change. You should consult a qualified tax
        professional and, where appropriate, the Nigeria Revenue Service (NRS) before making
        financial or filing decisions, and before relying on any calculation, recommendation or
        forecast produced by WittyTax.
      </P>

      <SectionHeading>3. AI-Generated Content</SectionHeading>
      <P>
        WittyTax's optional AI features (tax-saving recommendations, TaxChat, and the AI
        Forecasting Engine) use third-party AI models to generate suggestions and forecasts based
        on the information you provide. AI-generated content may be incomplete, generic, or
        inaccurate, and should be treated as a starting point for discussion with a qualified
        professional, not as a final determination of your tax position or business outlook.
      </P>

      <SectionHeading>4. Accounts and Eligibility</SectionHeading>
      <Ul>
        <li>You must provide accurate information when creating an account and keep your login credentials confidential.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account.</li>
        <li>Notify us promptly at support@tech84alliance.com if you suspect unauthorised use of your account.</li>
      </Ul>

      <SectionHeading>5. Acceptable Use</SectionHeading>
      <P>You agree not to:</P>
      <Ul>
        <li>Use WittyTax for any unlawful purpose, including tax evasion or the filing of knowingly false returns;</li>
        <li>Attempt to gain unauthorised access to WittyTax's systems, other users' accounts, or underlying infrastructure;</li>
        <li>Interfere with or disrupt the service, including through excessive automated requests;</li>
        <li>Upload documents or content that you do not have the right to use, or that contain another person's personal or financial information without their consent;</li>
        <li>Reverse engineer, resell, or use WittyTax to build a competing product.</li>
      </Ul>

      <SectionHeading>6. Standard and Premium Access</SectionHeading>
      <P>
        WittyTax offers a Standard tier and a Premium tier with additional AI-powered features.
        Where a paid subscription applies, fees, billing cycle and cancellation terms will be
        clearly presented at the point of purchase and are incorporated into these Terms by
        reference. Subscriptions renew automatically unless cancelled before the renewal date,
        except where a different arrangement is expressly stated at sign-up. We reserve the right
        to change pricing for future billing periods with reasonable advance notice.
      </P>

      <SectionHeading>7. Intellectual Property</SectionHeading>
      <P>
        WittyTax, including its software, design, branding and underlying calculation logic, is
        the property of Tech84 Alliance and is protected by applicable intellectual property laws.
        You retain ownership of the data and documents you submit. By using WittyTax, you grant us
        a limited licence to process that data solely for the purpose of providing the service to
        you.
      </P>

      <SectionHeading>8. Service Availability</SectionHeading>
      <P>
        We aim to keep WittyTax available and reliable, but we do not guarantee uninterrupted
        access. The service may be temporarily unavailable for maintenance, updates, or reasons
        outside our reasonable control.
      </P>

      <SectionHeading>9. Limitation of Liability</SectionHeading>
      <P>
        To the fullest extent permitted by law, Tech84 Alliance will not be liable for any
        indirect, incidental, or consequential loss arising from your use of WittyTax, including
        any penalty, interest, or loss arising from reliance on a calculation, recommendation, or
        forecast produced by the service. WittyTax is provided "as is" and "as available," without
        warranties of any kind beyond those that cannot be excluded by law.
      </P>

      <SectionHeading>10. Termination</SectionHeading>
      <P>
        You may stop using WittyTax and request account deletion at any time. We may suspend or
        terminate accounts that violate these Terms, engage in fraudulent or unlawful activity, or
        pose a security risk to the service or other users.
      </P>

      <SectionHeading>11. Changes to These Terms</SectionHeading>
      <P>
        We may update these Terms as WittyTax evolves. We will update the "Last updated" date above
        when we do, and will make reasonable efforts to notify users of material changes within the
        app. Continued use of WittyTax after a change takes effect constitutes acceptance of the
        updated Terms.
      </P>

      <SectionHeading>12. Governing Law</SectionHeading>
      <P>
        These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to
        conflict of law principles.
      </P>

      <SectionHeading>Contact Us</SectionHeading>
      <P>
        Questions about these Terms can be sent to <strong>support@tech84alliance.com</strong>.
      </P>
    </LegalPageLayout>
  );
};

export default TermsOfServicePage;
