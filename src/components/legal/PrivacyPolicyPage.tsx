import React from 'react';
import LegalPageLayout, { SectionHeading, P, Ul } from './LegalPageLayout';

interface Props {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<Props> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How WittyTax collects, uses and protects your information"
      lastUpdated="August 2026"
      onBack={onBack}
    >
      <P>
        WittyTax is operated by Tech84 Alliance ("Tech84 Alliance", "we", "us"). This Privacy Policy
        explains what information we collect when you use WittyTax, how we use it, who we share it
        with, and the choices and rights you have. By creating an account or using WittyTax, you
        agree to the collection and use of information as described here.
      </P>

      <SectionHeading>1. Information We Collect</SectionHeading>
      <P>We collect the following categories of information:</P>
      <Ul>
        <li><strong>Account information:</strong> your email address, company name (if applicable), and a securely hashed password.</li>
        <li><strong>Tax calculation data:</strong> the income, revenue, deduction, business and other figures you enter to generate a Personal or Company tax calculation.</li>
        <li><strong>Uploaded documents:</strong> receipts, invoices and financial documents you choose to upload, along with the amounts extracted from them.</li>
        <li><strong>Usage and account activity:</strong> your saved calculation history, and basic technical information (such as browser type) needed to operate the service securely.</li>
      </Ul>
      <P>We only collect what is necessary to provide the service — we do not ask for or require identity documents, national identification numbers, or bank account details.</P>

      <SectionHeading>2. How We Store Your Information</SectionHeading>
      <P>
        Unlike a purely offline calculator, WittyTax is an account-based service: your tax
        calculation history, uploaded documents and account details are stored securely in our
        cloud database so that you can log in from any device and see your saved history. Access
        to your account is protected by password authentication and secure session tokens.
      </P>

      <SectionHeading>3. Document Upload and OCR Processing</SectionHeading>
      <P>
        When you upload a receipt or invoice, the initial text and amount extraction (optical
        character recognition) runs locally in your browser before anything is saved. The
        extracted data — and, where you choose to keep it as part of your records, the document
        itself — is then stored securely in your account so it remains available in your tax
        history. You can remove uploaded documents from your account at any time.
      </P>

      <SectionHeading>4. AI-Powered Features</SectionHeading>
      <P>
        WittyTax's optional, Premium AI features — personalised tax-saving recommendations and the
        AI Forecasting Engine — are powered by OpenAI's models. When you use these features, the
        relevant figures from your calculation (for example, revenue, expenses and tax paid) are
        sent to OpenAI in order to generate a response. We do not send your name, email address, or
        uploaded documents to OpenAI as part of this process. These AI features are optional — you
        can use WittyTax's core tax calculators without ever triggering an AI request.
      </P>

      <SectionHeading>5. Other Third-Party Services</SectionHeading>
      <Ul>
        <li><strong>Cloud database hosting:</strong> your account and calculation data is stored with our database infrastructure provider, used solely to operate WittyTax.</li>
        <li><strong>Email delivery:</strong> we use a third-party email service to send account-related emails such as password reset links.</li>
        <li><strong>Hosting infrastructure:</strong> WittyTax's website and backend services run on cloud infrastructure that provides the underlying servers and network.</li>
      </Ul>
      <P>We do not sell your personal information to any third party, for any purpose.</P>

      <SectionHeading>6. Data Security</SectionHeading>
      <P>
        We apply reasonable technical safeguards to protect your information, including encrypted
        connections (HTTPS), hashed password storage, and access controls that restrict who can
        view account data. No online service can guarantee absolute security, and we encourage you
        to use a strong, unique password for your WittyTax account.
      </P>

      <SectionHeading>7. Data Retention</SectionHeading>
      <P>
        We retain your account and calculation history for as long as your account remains active,
        so that your tax history stays available to you year to year. If you wish to have your
        account and associated data deleted, contact us using the details at the end of this
        policy and we will action your request within a reasonable timeframe, subject to any
        retention required by law.
      </P>

      <SectionHeading>8. Your Rights</SectionHeading>
      <P>Subject to applicable law, including the Nigeria Data Protection Act (NDPA) 2023, you have the right to:</P>
      <Ul>
        <li>Access the personal information we hold about you;</li>
        <li>Request correction of inaccurate information;</li>
        <li>Request deletion of your account and associated data;</li>
        <li>Withdraw consent to optional AI features by simply not using them;</li>
        <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC) if you believe your data has been mishandled.</li>
      </Ul>

      <SectionHeading>9. Children's Privacy</SectionHeading>
      <P>
        WittyTax is intended for business owners, finance professionals and individual taxpayers.
        It is not directed at children, and we do not knowingly collect information from anyone
        under the age of 18.
      </P>

      <SectionHeading>10. Cookies and Local Storage</SectionHeading>
      <P>
        WittyTax uses browser storage to keep you logged in between visits and to remember basic
        preferences. This is functional storage necessary for the service to work, not third-party
        advertising tracking.
      </P>

      <SectionHeading>11. Changes to This Policy</SectionHeading>
      <P>
        We may update this Privacy Policy from time to time as WittyTax evolves. We will update the
        "Last updated" date above when we do, and material changes will be communicated within the
        app.
      </P>

      <SectionHeading>12. Disclaimer</SectionHeading>
      <P>
        WittyTax provides tax estimates based on the Nigeria Tax Act 2025 for informational
        purposes only and does not constitute professional tax, legal or financial advice. Please
        consult a qualified tax professional or the Nigeria Revenue Service (NRS) for official
        filing and compliance matters.
      </P>

      <SectionHeading>Contact Us</SectionHeading>
      <P>
        If you have questions about this Privacy Policy or wish to exercise any of your rights,
        contact us at <strong>support@tech84alliance.com</strong>.
      </P>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
