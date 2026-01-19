
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = async (to: string, name: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Impact 24x7 <reply@impact24x7.com>',
      to: [to],
      subject: 'Welcome to ImpactFlow OS',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h1 style="color: #4f46e5;">Welcome to the Workspace, ${name}!</h1>
          <p>Your logistics digital transformation journey starts here. Your account has been successfully provisioned on ImpactFlow OS.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">You can now access your shared inbox, deal pipeline, and project workspaces.</p>
          </div>
          <a href="https://impactflow-os.run.app" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Launch ImpactFlow</a>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">Impact 24x7 Logistics Enterprise • 2024</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Welcome Email Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Welcome Email Dispatch Failed:', err);
    return { success: false, error: err };
  }
};

export const sendVerificationCodeEmail = async (to: string, code: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Impact 24x7 <reply@impact24x7.com>',
      to: [to],
      subject: 'Your ImpactFlow Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">Verification Code</h2>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Enter the following code to access your ImpactFlow OS account:</p>
          <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; display: inline-block; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #1e293b; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">This code is valid for the next 10 minutes. If you did not request this code, please ignore this email.</p>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
             <p style="font-size: 11px; color: #cbd5e1;">Impact 24x7 Logistics • Digital Infrastructure</p>
          </div>
        </div>
      `,
    });

    if (error) {
       console.error('Resend Verification Email Error:', error);
       return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Verification Email Dispatch Failed:', err);
    return { success: false, error: err };
  }
};
