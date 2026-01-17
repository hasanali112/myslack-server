import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    constructor(private configService: ConfigService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const allowedOrigins = this.configService
            .get<string>('CORS_ORIGIN')
            ?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];

        const origin = req.headers.origin;

        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (allowedOrigins.includes('*')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }

        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        );
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Accept, X-Requested-With',
        );
        res.setHeader('Access-Control-Max-Age', '3600');

        if (req.method === 'OPTIONS') {
            res.status(204).send();
            return;
        }

        next();
    }
}
