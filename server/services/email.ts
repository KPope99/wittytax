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
              <a href="https://main.d3bfaf68ke9rhk.amplifyapp.com" class="button">Go to WittyTax</a>
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
