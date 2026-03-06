import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from 'src/common/utils/email/email.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private readonly emailService: EmailService, private readonly prismaService: PrismaService) { }

    private passwordHash(password: string) {
        return bcrypt.hashSync(password, 10);
    }

    private generateVerificationToken() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private generateUsername(email: string) {
        return email.split("@")[0];
    }

    async registerUser(registerUserDto: RegisterUserDto) {
        const { email, password } = registerUserDto;

        const existingUser = await this.prismaService.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = this.passwordHash(password);
        const verificationToken = this.generateVerificationToken();
        const username = this.generateUsername(email);

        const existingUsername = await this.prismaService.user.findUnique({
            where: { username }
        });

        if (existingUsername) {
            throw new ConflictException('Username already exists');
        }

        const result = await this.prismaService.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                }
            });


            const verification = await prisma.verification.create({
                data: {
                    user_id: user.user_id,
                    token: verificationToken,
                }
            });

            return { user, verification };
        });

        // Send verification email
        await this.emailService.sendVerificationEmail(email, verificationToken);

        return {
            message: "Please check your email for verification",
        };
    }

    async resendVerification(email: string) {
        // Check if user exists
        const user = await this.prismaService.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if verification record exists
        const existingVerification = await this.prismaService.verification.findFirst({
            where: { user_id: user.user_id }
        });

        const verificationToken = this.generateVerificationToken();

        if (existingVerification) {
            // Update existing token
            await this.prismaService.verification.update({
                where: { verification_id: existingVerification.verification_id },
                data: {
                    token: verificationToken,
                    updatedAt: new Date()
                }
            });
        } else {
            await this.prismaService.verification.create({
                data: {
                    user_id: user.user_id,
                    token: verificationToken
                }
            });
        }

        await this.emailService.sendVerificationEmail(email, verificationToken);

        return {
            message: "Verification email sent successfully"
        };
    }
}
