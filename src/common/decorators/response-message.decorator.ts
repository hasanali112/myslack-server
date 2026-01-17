import { SetMetadata } from "@nestjs/common";


export const RESPONSE_MESSAGE = "response_message";
export const ResponseMessage = (message: string) => {
    return SetMetadata(RESPONSE_MESSAGE, message);
}