import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmail() {
  const [location] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('invalid');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, []);

  const handleGoToLogin = () => {
    window.location.href = '/auth';
  };

  const handleResendEmail = async () => {
    // This would require the user's email, which we don't have here
    // Could be implemented with additional state management
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        <Card>
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                <CardTitle>Verifying your email...</CardTitle>
                <CardDescription>Please wait while we verify your email address</CardDescription>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-green-600">Email Verified!</CardTitle>
                <CardDescription>Your email has been successfully verified</CardDescription>
              </>
            )}
            {(status === 'error' || status === 'invalid') && (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-red-600">Verification Failed</CardTitle>
                <CardDescription>There was a problem verifying your email</CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className={
              status === 'success' ? 'border-green-200 bg-green-50' :
              status === 'error' || status === 'invalid' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertDescription className={
                status === 'success' ? 'text-green-800' :
                status === 'error' || status === 'invalid' ? 'text-red-800' :
                'text-blue-800'
              }>
                {message}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {status === 'success' && (
                <Button onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
              )}
              
              {(status === 'error' || status === 'invalid') && (
                <div className="space-y-2">
                  <Button onClick={handleGoToLogin} className="w-full">
                    Back to Login
                  </Button>
                  <Button 
                    onClick={handleResendEmail} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Get New Verification Email
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            SEMI Program Portal - Strategic Energy Management Incentive Program
          </p>
        </div>
      </div>
    </div>
  );
}