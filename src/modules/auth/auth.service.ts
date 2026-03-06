import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/common/utils/email/email.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly emailService: EmailService,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private passwordHash(password: string) {
    return bcrypt.hashSync(password, 10);
  }

  private generateVerificationToken() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    let username = base;
    let attempt = 0;
    while (true) {
      const existing = await this.prismaService.user.findUnique({
        where: { username },
      });
      if (!existing) return username;
      attempt++;
      username = `${base}${attempt}`;
    }
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, password, fullName } = registerUserDto;

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = this.passwordHash(password);
    const verificationToken = this.generateVerificationToken();
    const username = await this.generateUniqueUsername(email);

    const result = await this.prismaService.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          username,
          fullName,
        },
      });

      const verification = await prisma.verification.create({
        data: {
          user_id: user.user_id,
          token: verificationToken,
        },
      });

      return { user, verification };
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      message: 'Please check your email for verification',
    };
  }

  async resendVerification(email: string) {
    // Check if user exists
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if verification record exists
    const existingVerification =
      await this.prismaService.verification.findFirst({
        where: { user_id: user.user_id },
      });

    const verificationToken = this.generateVerificationToken();

    if (existingVerification) {
      // Update existing token
      await this.prismaService.verification.update({
        where: { verification_id: existingVerification.verification_id },
        data: {
          token: verificationToken,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prismaService.verification.create({
        data: {
          user_id: user.user_id,
          token: verificationToken,
        },
      });
    }

    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      message: 'Verification email sent successfully',
    };
  }

  async verifyEmail(token: string) {
    const verification = await this.prismaService.verification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    const user = verification.user;

    // Update user status and delete verification token
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { user_id: user.user_id },
        data: { isVerified: true },
      }),
      this.prismaService.verification.delete({
        where: { verification_id: verification.verification_id },
      }),
    ]);

    // Auto-login: return JWT so frontend can redirect to chat immediately
    const payload = {
      sub: user.user_id,
      email: user.email,
      username: user.username,
    };

    return {
      message: 'Email verified successfully',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async loginUser(loginUserDto: any) {
    const { email, password } = loginUserDto;

    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.user_id,
      email: user.email,
      username: user.username,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
