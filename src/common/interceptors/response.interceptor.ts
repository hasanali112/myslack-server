import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, Observable } from "rxjs";
import { RESPONSE_MESSAGE } from "../decorators/response-message.decorator";


export interface Response<T> {
    statusCode: number;
    message: string;
    meta?: any;
    data: T;
}


@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    constructor(private readonly reflector: Reflector) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const statusCode = response.statusCode;

        const message = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) || 'Success';

        return next.handle().pipe(
            map((res: any) => {
                const hasMeta = res && res.data && res.meta;
                return {
                    statusCode,
                    message,
                    ...(hasMeta && { meta: res.meta }),
                    data: res.data,
                }
            })
        )
    }
}