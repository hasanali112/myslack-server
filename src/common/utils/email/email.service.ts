import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getVerificationEmailTemplate } from 'src/common/views/emails/verification-email.template';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Initialize nodemailer transporter with ConfigService
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user:
          this.configService.get<string>('EMAIL_USER') ||
          'clientandcontenthub@gmail.com',
        pass:
          this.configService.get<string>('EMAIL_PASS') || 'ocqo flaj sdvg cmyr',
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://my-lark.onrender.com'}/auth/verify-account?token=${token}`;

    const htmlTemplate = getVerificationEmailTemplate(token, verificationLink);

    await this.sendMail(email, 'Verify Your MySlack Account', htmlTemplate);
  }

  private async sendMail(to: string, subject: string, html: string) {
    const from =
      this.configService.get<string>('EMAIL_FROM') ||
      'MySlack <clientandcontenthub@gmail.com>';
    const mailOptions = {
      from,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
