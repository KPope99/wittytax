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
