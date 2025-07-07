import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export function generateTwoFactorSecret(userEmail: string, appName: string = 'SEMI Program'): TwoFactorSetup {
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: appName,
    length: 32,
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url!,
    manualEntryKey: secret.base32,
  };
}

export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2, // Allow some time drift
  });
}

export function generateTwoFactorToken(secret: string): string {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32',
  });
}