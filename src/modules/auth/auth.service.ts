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
import * as crypto from 'crypto';

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

  private generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(userId: string) {
    const rawToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prismaService.refreshToken.create({
      data: {
        user_id: userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private async rotateRefreshToken(rawToken?: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prismaService.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return this.issueRefreshToken(existing.user_id);
  }

  async revokeRefreshToken(rawToken?: string) {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    await this.prismaService.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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
          isVerified: true, // Auto-verify the user
        },
      });

      return { user };
    });

    const payload = {
      sub: result.user.user_id,
      email: result.user.email,
      username: result.user.username,
    };

    const refreshToken = await this.issueRefreshToken(result.user.user_id);

    return {
      message: 'Registration successful',
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
      user: {
        user_id: result.user.user_id,
        email: result.user.email,
        username: result.user.username,
      },
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

    const refreshToken = await this.issueRefreshToken(user.user_id);

    return {
      message: 'Email verified successfully',
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
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

    const refreshToken = await this.issueRefreshToken(user.user_id);

    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async refreshAccessToken(rawToken: string) {
    const newRefreshToken = await this.rotateRefreshToken(rawToken);
    const tokenHash = this.hashToken(newRefreshToken);
    const tokenRecord = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = tokenRecord.user;
    const payload = {
      sub: user.user_id,
      email: user.email,
      username: user.username,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: newRefreshToken,
    };
  }
}
