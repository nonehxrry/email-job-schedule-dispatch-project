import { initSmtpTransporter, getPreviewUrl } from '../config/smtp.config';
import { env } from '../config/env.config';

export interface SendEmailOptions {
  to: string;
  recipientName?: string;
  subject: string;
  html?: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface SendEmailResult {
  messageId: string;
  etherealPreviewUrl: string | null;
  accepted: string[];
  rejected: string[];
}

export class SmtpService {
  public async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transporter = await initSmtpTransporter();

    const fromAddress = `"${options.fromName || env.DEFAULT_SENDER_NAME}" <${options.fromEmail || env.DEFAULT_SENDER_EMAIL}>`;
    const toAddress = options.recipientName ? `"${options.recipientName}" <${options.to}>` : options.to;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]*>?/gm, '') || '',
      html: options.html || `<p>${options.text || options.subject}</p>`,
    });

    const previewUrl = getPreviewUrl(info) || null;

    console.log(`[SMTP] Email dispatched to ${options.to} (ID: ${info.messageId})`);
    if (previewUrl) {
      console.log(`       Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      etherealPreviewUrl: previewUrl,
      accepted: (info.accepted as string[]) || [options.to],
      rejected: (info.rejected as string[]) || [],
    };
  }
}

export const smtpService = new SmtpService();
