import React from 'react';
import LegalPageLayout, { SectionHeading, P, Ul } from './LegalPageLayout';

interface Props {
  onBack: () => void;
}

const AboutPage: React.FC<Props> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="About WittyTax"
      subtitle="Your Smart Tax Assistant"
      onBack={onBack}
    >
      <SectionHeading>Our Mission</SectionHeading>
      <P>
        Tax compliance in Nigeria has traditionally required either a dedicated finance team or a
        paid accountant — a real barrier for the individual taxpayers and small businesses who can
        least afford to get it wrong. WittyTax exists to close that gap: an accurate, automated,
        and genuinely intelligent tax assistant that gives anyone, regardless of accounting
        background, a professional-grade tax calculation and advisory experience.
      </P>

      <SectionHeading>What WittyTax Does</SectionHeading>
      <P>
        WittyTax is a web-based platform built specifically for Nigerian businesses and individuals
        operating under the Nigeria Tax Act 2025 (NTA 2025). It combines:
      </P>
      <Ul>
        <li>Automated Personal Income Tax and Company Income Tax calculators, calibrated to current NTA 2025 rates, thresholds and exemptions;</li>
        <li>A guided Tax Wizard for anyone filing without an accounting background;</li>
        <li>Document upload with automatic amount extraction from receipts and invoices;</li>
        <li>A personalised dashboard tracking your tax history and financial position over time;</li>
        <li>Optional AI-powered tax-saving recommendations and business forecasting for Premium users;</li>
        <li>TaxChat, an on-demand assistant for quick questions on rates, deductions and filing requirements.</li>
      </Ul>

      <SectionHeading>Who WittyTax Is For</SectionHeading>
      <P>
        WittyTax serves individual taxpayers filing Personal Income Tax, and small, medium and
        large companies calculating Company Income Tax — from sole traders and startups through to
        established businesses. It is built with particular care for the micro and small enterprise
        owner who is managing tax compliance themselves, alongside everything else involved in
        running a business.
      </P>

      <SectionHeading>About Tech84 Alliance</SectionHeading>
      <P>
        WittyTax is built by Tech84 Alliance, a technology company at the forefront of Artificial
        Intelligence and enterprise software development, building for Nigeria and for
        international markets including the United Kingdom and Australia. Our multidisciplinary
        team of software architects, AI engineers, tax technology specialists and user experience
        designers brings together deep expertise across fintech, regulatory technology (RegTech),
        and enterprise software.
      </P>
      <P>
        We are committed to building tools that are not merely functional, but genuinely
        intelligent — systems that learn, adapt, and anticipate the needs of the people and
        businesses they serve. Data protection is treated as a core engineering principle at
        Tech84 Alliance, with every product built around the requirements of the Nigeria Data
        Protection Act (NDPA) 2023.
      </P>

      <SectionHeading>Important Note</SectionHeading>
      <P>
        WittyTax provides estimates based on the Nigeria Tax Act 2025 for informational purposes
        only. It is not a substitute for professional tax advice — for filing and compliance
        matters, please consult a qualified tax professional or the Nigeria Revenue Service (NRS).
      </P>

      <SectionHeading>Get in Touch</SectionHeading>
      <P>
        Questions, feedback, or interested in a partnership or institutional licensing
        conversation? We'd love to hear from you at <strong>support@tech84alliance.com</strong>.
      </P>
    </LegalPageLayout>
  );
};

export default AboutPage;
