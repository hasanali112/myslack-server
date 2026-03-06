import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { JwtService } from "@nestjs/jwt";



@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(req) || this.extractTokenFromCookies(req);
        if (!token) {
            throw new UnauthorizedException('Unauthorized');
        }

        try {
            const decodedToken = this.jwtService.verify(token);
            req.user = decodedToken;
        } catch (error) {
            throw new UnauthorizedException('Unauthorized');
        }
        return true;
    }


    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

    private extractTokenFromCookies(request: any): string | undefined {
        const fromParsed = request.cookies?.auth_token;
        if (fromParsed) return fromParsed;
        const rawCookie = request.headers?.cookie;
        if (!rawCookie) return undefined;
        const match = rawCookie
            .split(';')
            .map((part: string) => part.trim())
            .find((part: string) => part.startsWith('auth_token='));
        return match ? decodeURIComponent(match.split('=')[1]) : undefined;
    }
}
