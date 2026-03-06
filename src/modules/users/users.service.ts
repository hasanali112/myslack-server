import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Find users where username or fullName contains the search term, excluding the current user
    const users = await this.prismaService.user.findMany({
      where: {
        AND: [
          {
            user_id: {
              not: currentUserId,
            },
          },
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { fullName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        avatar: true,
        status: true,
      },
      take: 20, // Limit results
    });

    return users;
  }
}
