import nodemailer, { Transporter } from 'nodemailer';
import { env } from './env.config';

let transporter: Transporter | null = null;
let testAccount: nodemailer.TestAccount | null = null;

export async function initSmtpTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  try {
    // Automatically create a test Ethereal account
    testAccount = await nodemailer.createTestAccount();
    console.log('[SMTP] Ethereal Test Account initialized:');
    console.log(`       User: ${testAccount.user}`);
    console.log(`       Pass: ${testAccount.pass}`);
    console.log(`       Web:  https://ethereal.email/messages`);

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    return transporter;
  } catch (error) {
    console.error('[SMTP] Failed to create Ethereal account, falling back to dummy transporter:', error);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock_ethereal_user',
        pass: 'mock_ethereal_pass',
      },
    });
    return transporter;
  }
}

export function getTransporter(): Transporter | null {
  return transporter;
}

export function getPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
