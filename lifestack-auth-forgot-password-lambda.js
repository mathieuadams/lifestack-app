// =====================================================
// LIFESTACK - FORGOT PASSWORD (INITIATE RESET)
// Sends password reset code to user's email
// =====================================================

import { CognitoIdentityProviderClient, ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log('=== FORGOT PASSWORD ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    console.log('Initiating forgot password for:', email);

    // Trigger forgot password flow - Cognito will send reset code via email
    await cognitoClient.send(
      new ForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email
      })
    );

    console.log('Password reset code sent successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset code sent to your email',
        email
      })
    };

  } catch (error) {
    console.error('Forgot password error:', error);

    let errorMessage = error.message;
    if (error.name === 'UserNotFoundException') {
      errorMessage = 'No account found with this email';
    } else if (error.name === 'InvalidParameterException') {
      errorMessage = 'Invalid email address';
    } else if (error.name === 'LimitExceededException') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.name === 'NotAuthorizedException') {
      errorMessage = 'Account not verified. Please verify your email first.';
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
