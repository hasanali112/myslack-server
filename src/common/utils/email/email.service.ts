import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { getVerificationEmailTemplate } from "src/common/views/emails/verification-email.template";


@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        // Initialize nodemailer transporter with ConfigService
        this.transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: this.configService.get<string>("EMAIL_USER"),
                pass: this.configService.get<string>("EMAIL_PASS")
            }
        });
    }

    async sendVerificationEmail(email: string, token: string) {
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-account?token=${token}`;

        const htmlTemplate = getVerificationEmailTemplate(token, verificationLink);

        await this.sendMail(
            email,
            'Verify Your MySlack Account',
            htmlTemplate
        );
    }

    private async sendMail(to: string, subject: string, html: string) {
        const mailOptions = {
            from: "MySlack <clientandcontenthub@gmail.com>",
            to,
            subject,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${to}`);
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}