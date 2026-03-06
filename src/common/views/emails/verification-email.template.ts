export function getVerificationEmailTemplate(token: string, verificationLink: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4f5f7;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        
        .email-wrapper {
            padding: 40px 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e1e4e8;
        }
        
        .email-header {
            background-color: #4a154b; /* Slack-like profesional color */
            padding: 30px 40px;
            text-align: left;
        }
        
        .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin: 0;
        }
        
        .email-body {
            padding: 40px;
            color: #1d1c1d;
        }
        
        h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 24px;
            color: #1d1c1d;
        }
        
        p {
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px;
            color: #616061;
        }
        
        .button-container {
            margin: 32px 0;
            text-align: center; /* Center the button */
        }
        
        .verification-button {
            display: inline-block;
            background-color: #007a5a;
            color: #ffffff !important; /* Force white text */
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 4px;
            text-align: center;
        }
        
        .verification-button:hover {
            background-color: #006c4f;
            color: #ffffff !important;
        }
        
        .divider {
            height: 1px;
            background-color: #e1e4e8;
            margin: 40px 0;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #e1e4e8;
        }
        
        .footer p {
            font-size: 12px;
            color: #616061;
            margin: 0;
            line-height: 1.5;
        }
        
        @media only screen and (max-width: 600px) {
            .email-header, .email-body, .footer {
                padding: 24px;
            }
            
            h1 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="email-header">
                <div class="logo">MySlack</div>
            </div>
            
            <div class="email-body">
                <h1>Verify your email address</h1>
                
                <p>Hello,</p>
                
                <p>Thanks for creating an account with MySlack. We're happy to have you on board! To access your workspace, please verify your email address.</p>
                
                <div class="button-container">
                    <a href="${verificationLink}" class="verification-button">Verify Email Address</a>
                </div>
                
                <p style="font-size: 14px; color: #696969; margin-top: 24px;">
                    This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; 2026 MySlack. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}
