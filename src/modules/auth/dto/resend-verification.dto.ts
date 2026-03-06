import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendVerificationDto {
    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({ example: "user@example.com", description: "The email address to resend the verification link to" })
    email: string;
}
