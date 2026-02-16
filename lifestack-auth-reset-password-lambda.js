// =====================================================
// LIFESTACK - RESET PASSWORD (CONFIRM WITH CODE)
// Validates reset code and sets new password
// =====================================================

import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: "us-east-1" });

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

export const handler = async (event) => {
  console.log('=== RESET PASSWORD ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { email, code, newPassword } = JSON.parse(event.body || '{}');

    if (!email || !code || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email, code, and new password required' })
      };
    }

    console.log('Resetting password for:', email);

    // Confirm forgot password with code and set new password
    await cognitoClient.send(
      new ConfirmForgotPasswordCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
      })
    );

    console.log('Password reset successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset successfully'
      })
    };

  } catch (error) {
    console.error('Reset password error:', error);

    let errorMessage = error.message;
    if (error.name === 'CodeMismatchException') {
      errorMessage = 'Invalid reset code. Please check and try again.';
    } else if (error.name === 'ExpiredCodeException') {
      errorMessage = 'Reset code has expired. Please request a new one.';
    } else if (error.name === 'InvalidPasswordException') {
      errorMessage = 'Password does not meet requirements. Must be at least 8 characters with uppercase, number, and symbol.';
    } else if (error.name === 'LimitExceededException') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.name === 'UserNotFoundException') {
      errorMessage = 'No account found with this email';
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
