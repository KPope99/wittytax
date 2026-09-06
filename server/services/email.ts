import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface WelcomeEmailParams {
  to: string;
  companyName: string;
}

interface PasswordResetEmailParams {
  to: string;
  resetCode: string;
  companyName: string;
}

export async function sendPasswordResetEmail({ to, resetCode, companyName }: PasswordResetEmailParams): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"WittyTax" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'WittyTax - Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { background: #1e40af; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 10px; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>We received a request to reset your password for your WittyTax account.</p>
              <p>Use the following code to reset your password:</p>
              <div class="code">${resetCode}</div>
              <p>This code will expire in <strong>15 minutes</strong>.</p>
              <div class="warning">
                <strong>Didn't request this?</strong><br>
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 WittyTax. All rights reserved.</p>
              <p>Your Smart Tax Assistant for Nigeria</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

interface PremiumUpgradeEmailParams {
  to: string;
  companyName: string;
}

export async function sendPremiumUpgradeEmail({ to, companyName }: PremiumUpgradeEmailParams): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"WittyTax" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'WittyTax - Your account has been upgraded to Premium',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fbbf24; color: #78350f; padding: 6px 18px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 10px 0; }
            .feature { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You've been upgraded! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Great news — your WittyTax account has been upgraded to <span class="badge">Premium</span>.</p>
              <p>You now have access to exclusive features:</p>
              <div class="feature"><strong>📊 Financial Tracker</strong> — Track revenue and expenses in real time</div>
              <div class="feature"><strong>💡 Business Health Dashboard</strong> — Monitor your financial health score</div>
              <div class="feature" style="border:none"><strong>💰 Cash Flow Recommendations</strong> — AI-powered insights for your business</div>
              <p style="margin-top:20px">Log in to start using your Premium features today.</p>
              <a href="${process.env.APP_URL || 'https://main.d3bfaf68ke9rhk.amplifyapp.com'}" class="button">Go to WittyTax</a>
            </div>
            <div class="footer">
              <p>&copy; 2026 WittyTax. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Premium upgrade email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending premium upgrade email:', error);
    return false;
  }
}

interface DeadlineReminderEmailParams {
  to: string;
  companyName: string;
  weeksLeft: 3 | 1;
  deadlineDate: string; // pre-formatted, e.g. "Tuesday, 31 March 2026"
}

export async function sendDeadlineReminderEmail({ to, companyName, weeksLeft, deadlineDate }: DeadlineReminderEmailParams): Promise<boolean> {
  const isUrgent = weeksLeft === 1;
  const subject = isUrgent
    ? '🚨 1 week left — don’t miss the tax filing deadline'
    : '⏳ 3 weeks left to file your Nigerian tax return';
  const headline = isUrgent ? 'Final reminder: 1 week to go' : 'Time is running out — 3 weeks to go';
  const urgencyColor = isUrgent ? '#dc2626' : '#1e40af';
  const urgencyGradient = isUrgent
    ? 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';

  try {
    const mailOptions = {
      from: `"WittyTax" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${urgencyGradient}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .deadline-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .deadline-box strong { color: #78350f; }
            .feature { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .button { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${headline}</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Nigeria's tax filing deadline is <strong>${deadlineDate}</strong> — just ${weeksLeft === 1 ? '7 days' : '3 weeks'} away.</p>
              <div class="deadline-box">
                <strong>${weeksLeft === 1 ? 'Last call' : 'Don’t wait until the last minute'}</strong><br>
                ${weeksLeft === 1
                  ? 'If you haven’t filed yet, this is your final reminder to get sorted.'
                  : 'If you haven’t calculated your tax obligation yet, now’s a good time to get ahead of it.'}
              </div>
              <p>WittyTax makes it quick:</p>
              <div class="feature">📊 Calculate your PAYE or Company Income Tax in minutes</div>
              <div class="feature">🧾 See exactly what deductions apply to you</div>
              <div class="feature" style="border:none">📄 Download a report you can file with confidence</div>
              <p style="margin-top:20px">Takes less than 2 minutes. Free, private, and instant.</p>
              <a href="${process.env.APP_URL || 'https://wittytax.com'}" class="button">${isUrgent ? 'Finish My Tax Calculation' : 'Calculate My Tax Now'} →</a>
              ${isUrgent ? '<p style="margin-top:20px; font-size:14px; color:#64748b;">Need help? Reply to this email or use the AI Tax Chat inside your dashboard.</p>' : ''}
            </div>
            <div class="footer">
              <p>&copy; 2026 WittyTax. All rights reserved.</p>
              <p>Your Smart Tax Assistant for Nigeria</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Deadline reminder (${weeksLeft}w) email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${weeksLeft}w deadline reminder email to ${to}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail({ to, companyName }: WelcomeEmailParams): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"WittyTax" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Welcome to WittyTax - Your Smart Tax Assistant',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WittyTax!</h1>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>Thank you for registering with WittyTax - Your Smart Tax Assistant for Small and Large Businesses.</p>
              <p>You now have access to:</p>
              <ul>
                <li>Personal and Company Tax Calculators</li>
                <li>Tax Optimization Recommendations</li>
                <li>NTA 2025 Exemption Calculators</li>
                <li>Receipt & Invoice Management</li>
                <li>PDF Report Generation</li>
              </ul>
              <p>Start optimizing your taxes today!</p>
              <a href="${process.env.APP_URL || 'https://main.d3bfaf68ke9rhk.amplifyapp.com'}" class="button">Go to WittyTax</a>
            </div>
            <div class="footer">
              <p>&copy; 2026 WittyTax. All rights reserved.</p>
              <p>Your Smart Tax Assistant for Nigeria</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}
