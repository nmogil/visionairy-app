import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15, // 15 minutes (following docs recommendation)
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    
    // Generate 6-digit code
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const { Resend } = await import("resend");
    const resend = new Resend(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "prompty <hello@prompty.games>",
      to: [email],
      subject: `Your prompty login code: ${token}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px;">
            <h1 style="color: #18181b; font-size: 24px; margin-bottom: 10px;">Your login code</h1>
            <p style="color: #71717a; margin-bottom: 30px;">Enter this code to sign in to prompty:</p>
            
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b; font-family: monospace;">
                ${token}
              </span>
            </div>
            
            <p style="color: #71717a; font-size: 14px; margin-bottom: 10px;">
              This code will expire in 15 minutes.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
            
            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Your prompty login code: ${token}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});