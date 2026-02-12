import React, { useState, useRef, useEffect } from 'react';
import { NTA_2025_KNOWLEDGE_BASE } from '../utils/taxCalculations';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const TaxChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your WittyTax Assistant for NTA 2025. Ask me about personal income tax, company tax, deductions, share transfer exemptions, compensation for loss of office, or filing deadlines.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (question: string): string => {
    const q = question.toLowerCase();

    // Personal Tax Questions
    if (q.includes('personal tax') || q.includes('income tax') || q.includes('pit')) {
      if (q.includes('rate') || q.includes('band') || q.includes('bracket')) {
        const bands = NTA_2025_KNOWLEDGE_BASE.personalTax.bands;
        return `**Personal Income Tax Bands (NTA 2025)**\n\n${bands.map(b => `• ${b.range}: **${b.rate}**`).join('\n')}\n\nTax is calculated progressively - each rate applies only to income within that band.`;
      }
      if (q.includes('deadline') || q.includes('filing') || q.includes('when')) {
        return `**Personal Income Tax Filing Deadline**\n\nThe deadline for personal income tax filing is **March 31st** following the end of the tax year.\n\nFor the 2025 tax year, you must file by **March 31, 2026**.`;
      }
      return `**Personal Income Tax (NTA 2025)**\n\nPersonal income tax in Nigeria is calculated using progressive tax bands:\n\n• Up to ₦800,000: 0%\n• ₦800,001 - ₦3,000,000: 15%\n• ₦3,000,001 - ₦12,000,000: 18%\n• ₦12,000,001 - ₦25,000,000: 21%\n• ₦25,000,001 - ₦50,000,000: 23%\n• Over ₦50,000,000: 25%\n\nWould you like to know about deductions or filing deadlines?`;
    }

    // Deductions
    if (q.includes('deduction') || q.includes('relief') || q.includes('allowance')) {
      if (q.includes('pension')) {
        return `**Pension Deduction**\n\n• Rate: **8%** of annual income\n• This is deducted from your gross income before calculating taxable income.\n• It represents employee contribution to pension under the Pension Reform Act.`;
      }
      if (q.includes('nhf') || q.includes('national housing')) {
        return `**National Housing Fund (NHF) Deduction**\n\n• Rate: **2.5%** of annual income\n• Mandatory for employees earning above minimum wage.\n• Deducted from gross income before tax calculation.`;
      }
      if (q.includes('rent')) {
        return `**Rent Relief**\n\n• Rate: **20%** of annual rent paid\n• Maximum cap: **₦500,000**\n• For example, if your annual rent is ₦3,000,000, your rent relief would be ₦500,000 (capped), not ₦600,000.`;
      }
      return `**Available Deductions (NTA 2025)**\n\n1. **Pension**: 8% of annual income\n2. **NHF**: 2.5% of annual income\n3. **Rent Relief**: 20% of annual rent (max ₦500,000)\n4. **Other Allowable Deductions**: Life insurance, gratuities, etc.\n\nThese deductions reduce your taxable income, lowering your tax liability.`;
    }

    // Company Tax Questions
    if (q.includes('company') || q.includes('corporate') || q.includes('cit') || q.includes('business')) {
      if (q.includes('small')) {
        return `**Small Company Definition (NTA 2025)**\n\n A company qualifies as "small" if:\n• Annual turnover ≤ **₦100 million** AND\n• Fixed assets < **₦250 million**\n\n**Tax Rate: 0%** (exempt from CIT and 4% Development Levy)\n\n**Important:** Professional service providers (lawyers, accountants, consultants) are **explicitly excluded** from this exemption regardless of their revenue.`;
      }
      if (q.includes('big') || q.includes('large')) {
        return `**Big Company Tax (NTA 2025)**\n\nCompanies that don't qualify as "small" are taxed as follows:\n\n• **Corporate Income Tax**: 30% of taxable profit\n• **Development Levy**: 4% of assessable profit\n\n**Total effective rate**: Up to 34% for resident companies.\n\nNon-resident companies pay 30% CIT but are exempt from the Development Levy.`;
      }
      if (q.includes('professional') || q.includes('lawyer') || q.includes('accountant') || q.includes('consultant')) {
        return `**Professional Services Tax Treatment (NTA 2025)**\n\nProfessional service providers including:\n• Lawyers\n• Accountants\n• Consultants\n• Other professional practices\n\nAre **explicitly excluded** from the small company exemption.\n\nThey pay **30% CIT** regardless of their turnover or asset size, plus the 4% Development Levy if resident in Nigeria.`;
      }
      if (q.includes('levy') || q.includes('development')) {
        return `**Development Levy (NTA 2025)**\n\n• Rate: **4%** of assessable profits\n• Applies to: Big companies only (resident in Nigeria)\n\n**Exemptions:**\n• Small companies (turnover ≤ ₦100M, assets < ₦250M) - fully exempt\n• Non-resident companies\n\nOnly big companies are required to pay this levy. It is in addition to the 30% Corporate Income Tax.`;
      }
      return `**Company Income Tax (NTA 2025)**\n\n**Small Companies** (Turnover ≤ ₦100M, Assets < ₦250M):\n• Tax Rate: **0%** (exempt from CIT and 4% Development Levy)\n• Note: Professional services excluded\n\n**Big Companies:**\n• CIT: **30%** of taxable profit\n• Development Levy: **4%** of assessable profit (only big companies pay this)\n\nFiling deadline: **Within 6 months** of financial year end (typically June 30).`;
    }

    // Filing Deadlines
    if (q.includes('deadline') || q.includes('when') || q.includes('file') || q.includes('submit')) {
      return `**Tax Filing Deadlines (NTA 2025)**\n\n**Personal Income Tax:**\n• Deadline: **March 31st** following the tax year\n• For 2025: File by March 31, 2026\n\n**Company Income Tax:**\n• Deadline: **Within 6 months** of accounting year end\n• For December year-end: File by June 30\n\n**Penalties:** Late filing attracts penalties and interest charges. File early to avoid issues!`;
    }

    // Non-resident
    if (q.includes('non-resident') || q.includes('foreign')) {
      return `**Non-Resident Companies (NTA 2025)**\n\n• **CIT Rate**: 30% (same as resident big companies)\n• **Development Levy**: EXEMPT\n\nNon-resident companies are taxed on Nigerian-sourced income only. They are not required to pay the 4% Development Levy applicable to resident big companies.`;
    }

    // Share Transfer Exemption
    if (q.includes('share') || q.includes('capital gain') || q.includes('cgt') || q.includes('stock')) {
      if (q.includes('exemption') || q.includes('threshold') || q.includes('exempt')) {
        return `**Share Transfer Exemption (NTA 2025)**\n\n**Key Changes:**\n• Threshold increased from ₦100M to **₦150M**\n• Maximum exemptible gain: **₦10M**\n\n**How it works:**\n• If your share disposal proceeds are below ₦150M, capital gains up to ₦10M may be exempt\n• Additional exemption available if you reinvest in qualifying shares\n\n**CGT Rate:** 10% on taxable gains\n\nUse our Share Transfer Exemption calculator for detailed calculations!`;
      }
      return `**Share Transfer & Capital Gains (NTA 2025)**\n\n• **CGT Rate:** 10% on capital gains\n• **Exemption Threshold:** ₦150M disposal proceeds\n• **Max Exempt Gain:** ₦10M\n• **Reinvestment Relief:** Available for qualifying shares\n\nWould you like to know more about the exemption rules?`;
    }

    // Compensation for Loss of Office
    if (q.includes('compensation') || q.includes('severance') || q.includes('loss of office') || q.includes('golden handshake') || q.includes('redundancy')) {
      return `**Compensation for Loss of Office (NTA 2025)**\n\n**Major Change:**\n• Exemption threshold increased from ₦10M to **₦50M**\n\n**How it works:**\n• Compensation up to ₦50M is **completely tax-exempt**\n• Only amounts exceeding ₦50M are taxable\n• Tax on excess is calculated using progressive personal income tax bands\n\n**Example:**\nIf you receive ₦60M compensation:\n• ₦50M is tax-exempt\n• Only ₦10M is subject to tax\n\nThis provides significant tax relief for employees receiving severance packages!`;
    }

    // Taxable income calculation
    if (q.includes('taxable income') || q.includes('calculate') || q.includes('how')) {
      return `**How to Calculate Taxable Income**\n\n**Personal Tax:**\nTaxable Income = Gross Income - Deductions\n\nDeductions include:\n• Pension (8%)\n• NHF (2.5%)\n• Rent Relief (20%, max ₦500K)\n• Other allowable deductions\n\n**Company Tax:**\nTaxable Profit = Assessable Profit - Capital Allowances - Other Deductions\n\nUse our calculators to compute your exact tax liability!`;
    }

    // NTA 2025 Changes
    if (q.includes('new') || q.includes('change') || q.includes('2025') || q.includes('update')) {
      return `**What's New in NTA 2025?**\n\n**Key Changes:**\n\n1. **Share Transfer Exemption**\n   • Threshold: ₦100M → **₦150M**\n   • Max exempt gain: **₦10M**\n\n2. **Compensation Exemption**\n   • Threshold: ₦10M → **₦50M**\n\n3. **Personal Income Tax Bands**\n   • New 0% band up to ₦800K\n   • Progressive rates from 15% to 25%\n\n4. **Small Company Exemption**\n   • Turnover ≤ ₦100M AND Assets < ₦250M = 0% CIT + exempt from 4% levy\n   • Professional services excluded\n\nWould you like details on any specific change?`;
    }

    // General/Default
    return `I can help you with questions about the **Nigeria Tax Act 2025**, including:\n\n• **Personal Income Tax** rates and bands\n• **Share Transfer Exemption** (new ₦150M threshold)\n• **Compensation Exemption** (new ₦50M threshold)\n• **Company Income Tax** (CIT) rules\n• **Deductions** (Pension, NHF, Rent Relief)\n• **Small company** exemptions\n• **Filing deadlines**\n\nWhat would you like to know about?`;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = generateResponse(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick questions
  const quickQuestions = [
    'Personal tax rates',
    'Share transfer exemption',
    'Compensation exemption',
    'Available deductions',
    'NTA 2025 changes',
    'Filing deadlines',
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700 animate-bounce'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">WittyTax Assistant</h3>
                <p className="text-xs text-primary-100">Your NTA 2025 Tax Guide</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('**').map((part, index) =>
                      index % 2 === 1 ? (
                        <strong key={index}>{part}</strong>
                      ) : (
                        <span key={index}>{part}</span>
                      )
                    )}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-primary-200' : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="px-4 py-2 border-t border-gray-200 bg-white">
            <div className="flex flex-wrap gap-1">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => {
                    setInput(question);
                    setTimeout(handleSend, 100);
                  }}
                  className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about NTA 2025..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaxChat;
