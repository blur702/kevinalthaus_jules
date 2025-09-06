import * as nodemailer from 'nodemailer';
import { logger } from '../utils/logger.utils';
import { CryptoUtils } from '../utils/crypto.utils';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email Service for authentication flows
 * Following OWASP email security guidelines
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private appName: string;
  private appUrl: string;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@example.com';
    this.appName = process.env.APP_NAME || 'AuthService';
    this.appUrl = process.env.APP_URL || 'https://example.com';

    // Configure transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Verify connection
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error('Email service connection failed', error);
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${this.appUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      const expiryHours = 24;

      const template = this.getVerificationEmailTemplate(verificationUrl, expiryHours);
      
      await this.sendEmail(email, template);
      
      logger.info('Verification email sent', {
        email: CryptoUtils.maskSensitiveData(email),
        token: CryptoUtils.maskSensitiveData(token)
      });
    } catch (error) {
      logger.error('Failed to send verification email', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${this.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const expiryHours = 1;

      const template = this.getPasswordResetEmailTemplate(resetUrl, expiryHours);
      
      await this.sendEmail(email, template);
      
      logger.info('Password reset email sent', {
        email: CryptoUtils.maskSensitiveData(email),
        token: CryptoUtils.maskSensitiveData(token)
      });
    } catch (error) {
      logger.error('Failed to send password reset email', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send 2FA enabled notification
   */
  async send2FAEnabledEmail(email: string, backupCodes: string[]): Promise<void> {
    try {
      const template = this.get2FAEnabledEmailTemplate(backupCodes);
      
      await this.sendEmail(email, template);
      
      logger.info('2FA enabled email sent', {
        email: CryptoUtils.maskSensitiveData(email)
      });
    } catch (error) {
      logger.error('Failed to send 2FA enabled email', error);
      throw new Error('Failed to send 2FA enabled email');
    }
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlertEmail(
    email: string,
    alertType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const template = this.getSecurityAlertEmailTemplate(alertType, details);
      
      await this.sendEmail(email, template);
      
      logger.info('Security alert email sent', {
        email: CryptoUtils.maskSensitiveData(email),
        alertType
      });
    } catch (error) {
      logger.error('Failed to send security alert email', error);
      // Don't throw - security alerts are non-critical
    }
  }

  /**
   * Send account locked notification
   */
  async sendAccountLockedEmail(email: string, reason: string): Promise<void> {
    try {
      const template = this.getAccountLockedEmailTemplate(reason);
      
      await this.sendEmail(email, template);
      
      logger.info('Account locked email sent', {
        email: CryptoUtils.maskSensitiveData(email)
      });
    } catch (error) {
      logger.error('Failed to send account locked email', error);
    }
  }

  /**
   * Core email sending function
   */
  private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `${this.appName} <${this.fromAddress}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        'X-Priority': '3',
        'X-Mailer': this.appName,
        'X-Entity-Ref-ID': CryptoUtils.generateNonce()
      }
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Email Templates
   */
  private getVerificationEmailTemplate(verificationUrl: string, expiryHours: number): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Welcome to ${this.appName}!</h2>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <code style="background: #f4f4f4; padding: 5px; word-break: break-all;">
                ${verificationUrl}
              </code>
            </p>
            <p style="color: #e74c3c; margin-top: 20px;">
              This link will expire in ${expiryHours} hours.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If you didn't create an account with ${this.appName}, you can safely ignore this email.
            </p>
            <p style="color: #999; font-size: 12px;">
              For security reasons, this email was sent to ${new Date().toUTCString()}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to ${this.appName}!

Thank you for registering. Please verify your email address to activate your account.

Verification Link: ${verificationUrl}

This link will expire in ${expiryHours} hours.

If you didn't create an account with ${this.appName}, you can safely ignore this email.

For security reasons, this email was sent to ${new Date().toUTCString()}
    `.trim();

    return {
      subject: `[${this.appName}] Verify Your Email Address`,
      html,
      text
    };
  }

  private getPasswordResetEmailTemplate(resetUrl: string, expiryHours: number): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Password Reset Request</h2>
            <p>We received a request to reset your password for your ${this.appName} account.</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <code style="background: #f4f4f4; padding: 5px; word-break: break-all;">
                ${resetUrl}
              </code>
            </p>
            <p style="color: #e74c3c; margin-top: 20px;">
              This link will expire in ${expiryHours} hour(s).
            </p>
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; 
                        border-radius: 5px; margin: 20px 0;">
              <strong>Security Notice:</strong><br>
              If you didn't request this password reset, please ignore this email 
              and consider changing your password as a precaution.
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This password reset was requested from IP: [IP Address Masked for Privacy]<br>
              Time: ${new Date().toUTCString()}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

We received a request to reset your password for your ${this.appName} account.

Reset Link: ${resetUrl}

This link will expire in ${expiryHours} hour(s).

Security Notice:
If you didn't request this password reset, please ignore this email and consider changing your password as a precaution.

This password reset was requested at ${new Date().toUTCString()}
    `.trim();

    return {
      subject: `[${this.appName}] Password Reset Request`,
      html,
      text
    };
  }

  private get2FAEnabledEmailTemplate(backupCodes: string[]): EmailTemplate {
    const codesHtml = backupCodes.map(code => `<code>${code}</code>`).join('<br>');
    const codesText = backupCodes.join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Two-Factor Authentication Enabled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #27ae60;">Two-Factor Authentication Enabled</h2>
            <p>Great news! Two-factor authentication has been successfully enabled for your account.</p>
            
            <div style="background: #d4edda; border: 1px solid #28a745; padding: 15px; 
                        border-radius: 5px; margin: 20px 0;">
              <strong>Important: Backup Codes</strong><br>
              <p>Save these backup codes in a secure place. Each code can be used once if you lose access to your authenticator app:</p>
              <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 3px; font-family: monospace;">
                ${codesHtml}
              </div>
            </div>
            
            <h3>What's next?</h3>
            <ul>
              <li>Use your authenticator app to generate codes when logging in</li>
              <li>Store your backup codes securely (not in your email)</li>
              <li>Consider printing the backup codes and storing them safely</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              2FA enabled at: ${new Date().toUTCString()}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Two-Factor Authentication Enabled

Great news! Two-factor authentication has been successfully enabled for your account.

IMPORTANT: Backup Codes
Save these backup codes in a secure place. Each code can be used once if you lose access to your authenticator app:

${codesText}

What's next?
- Use your authenticator app to generate codes when logging in
- Store your backup codes securely (not in your email)
- Consider printing the backup codes and storing them safely

2FA enabled at: ${new Date().toUTCString()}
    `.trim();

    return {
      subject: `[${this.appName}] Two-Factor Authentication Enabled`,
      html,
      text
    };
  }

  private getSecurityAlertEmailTemplate(alertType: string, details: Record<string, any>): EmailTemplate {
    const alertMessages: Record<string, string> = {
      new_device: 'A new device was used to access your account',
      password_changed: 'Your password was recently changed',
      suspicious_activity: 'Suspicious activity was detected on your account',
      multiple_failed_logins: 'Multiple failed login attempts were detected'
    };

    const message = alertMessages[alertType] || 'Security activity was detected on your account';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c;">Security Alert</h2>
            <p>${message}</p>
            
            <div style="background: #f8d7da; border: 1px solid #dc3545; padding: 15px; 
                        border-radius: 5px; margin: 20px 0;">
              <strong>Details:</strong><br>
              <ul>
                <li>Time: ${new Date().toUTCString()}</li>
                <li>Location: ${details.location || 'Unknown'}</li>
                <li>Device: ${details.device || 'Unknown'}</li>
              </ul>
            </div>
            
            <h3>Was this you?</h3>
            <p>If you recognize this activity, you can safely ignore this email.</p>
            <p>If you don't recognize this activity:</p>
            <ol>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication</li>
              <li>Review your account activity</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated security alert from ${this.appName}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Security Alert

${message}

Details:
- Time: ${new Date().toUTCString()}
- Location: ${details.location || 'Unknown'}
- Device: ${details.device || 'Unknown'}

Was this you?
If you recognize this activity, you can safely ignore this email.

If you don't recognize this activity:
1. Change your password immediately
2. Enable two-factor authentication
3. Review your account activity

This is an automated security alert from ${this.appName}
    `.trim();

    return {
      subject: `[${this.appName}] Security Alert - ${alertType.replace(/_/g, ' ').toUpperCase()}`,
      html,
      text
    };
  }

  private getAccountLockedEmailTemplate(reason: string): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Locked</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c;">Account Locked</h2>
            <p>Your account has been temporarily locked due to: <strong>${reason}</strong></p>
            
            <div style="background: #f8d7da; border: 1px solid #dc3545; padding: 15px; 
                        border-radius: 5px; margin: 20px 0;">
              <strong>What happened?</strong><br>
              <p>To protect your account, we've temporarily locked it after detecting unusual activity.</p>
            </div>
            
            <h3>How to unlock your account:</h3>
            <ol>
              <li>Wait 30 minutes for the automatic unlock</li>
              <li>Reset your password using the "Forgot Password" option</li>
              <li>Contact support if you need immediate assistance</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Account locked at: ${new Date().toUTCString()}
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
Account Locked

Your account has been temporarily locked due to: ${reason}

What happened?
To protect your account, we've temporarily locked it after detecting unusual activity.

How to unlock your account:
1. Wait 30 minutes for the automatic unlock
2. Reset your password using the "Forgot Password" option
3. Contact support if you need immediate assistance

Account locked at: ${new Date().toUTCString()}
    `.trim();

    return {
      subject: `[${this.appName}] Account Locked - Action Required`,
      html,
      text
    };
  }
}