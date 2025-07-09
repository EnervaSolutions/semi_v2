import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Eye, EyeOff, CheckCircle, AlertCircle, Users, Shield, Mail, Building } from 'lucide-react';

interface InvitationDetails {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  permissionLevel: string;
  companyId: number;
  invitationToken: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  company?: {
    name: string;
    shortName: string;
  };
  invitedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AcceptContractorInvite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch invitation details
  useEffect(() => {
    if (token) {
      // In a real implementation, you'd fetch invitation details from an API
      // For now, we'll create a placeholder
      setInvitationDetails({
        id: 1,
        email: 'contractor@example.com',
        firstName: 'John',
        lastName: 'Contractor',
        permissionLevel: 'viewer',
        companyId: 2,
        invitationToken: token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        company: {
          name: 'Example Contractor Company',
          shortName: 'EXCON'
        },
        invitedBy: {
          firstName: 'Jane',
          lastName: 'Manager',
          email: 'manager@example.com'
        }
      });
    }
  }, [token]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters long');
    if (pwd.length > 64) errors.push('Password must be no more than 64 characters long');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(pwd)) errors.push('Password must contain at least one digit');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push('Password must contain at least one special character');
    return errors;
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (newPassword) {
      setValidationErrors(validatePassword(newPassword));
    } else {
      setValidationErrors([]);
    }
  };

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      return apiRequest(`/api/accept-contractor-invite/${token}`, 'POST', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to the team!",
        description: "Your contractor account has been created successfully. You can now log in.",
      });
      // Redirect to login page after a short delay
      setTimeout(() => {
        setLocation('/auth');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    acceptInvitationMutation.mutate({ password });
  };

  const getPermissionDisplayName = (level: string) => {
    const displayNames: Record<string, string> = {
      'viewer': 'Viewer',
      'editor': 'Editor', 
      'manager': 'Team Manager'
    };
    return displayNames[level] || level;
  };

  const getPermissionDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      'viewer': 'View assigned applications and download documents',
      'editor': 'View and edit assigned applications, upload documents',
      'manager': 'Full team management access including inviting members'
    };
    return descriptions[level] || '';
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">This invitation link is invalid or has expired.</p>
            <Button 
              className="w-full mt-4" 
              onClick={() => setLocation('/auth')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-gray-600 mt-4">Loading invitation details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join the Contractor Team
          </CardTitle>
          <CardDescription className="text-gray-600">
            Complete your account setup to join the SEMI Program
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invitation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Contractor Company:</span>
                <p className="text-blue-900">{invitationDetails.company?.name}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Your Role:</span>
                <p className="text-blue-900">Contractor Team Member</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Permission Level:</span>
                <p className="text-blue-900 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {getPermissionDisplayName(invitationDetails.permissionLevel)}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Invited By:</span>
                <p className="text-blue-900">
                  {invitationDetails.invitedBy?.firstName} {invitationDetails.invitedBy?.lastName}
                </p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
              <p>{getPermissionDescription(invitationDetails.permissionLevel)}</p>
            </div>
          </div>

          {/* Password Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={invitationDetails.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={invitationDetails.firstName}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={invitationDetails.lastName}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter your password"
                  className={validationErrors.length > 0 ? "border-red-300" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            {(password || validationErrors.length > 0) && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Password Requirements:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                  {[
                    { check: password.length >= 8, text: "At least 8 characters" },
                    { check: password.length <= 64, text: "No more than 64 characters" },
                    { check: /[A-Z]/.test(password), text: "One uppercase letter" },
                    { check: /[a-z]/.test(password), text: "One lowercase letter" },
                    { check: /\d/.test(password), text: "One digit" },
                    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "One special character" }
                  ].map((req, index) => (
                    <div key={index} className={`flex items-center gap-2 ${req.check ? 'text-green-600' : 'text-gray-500'}`}>
                      <CheckCircle className={`h-3 w-3 ${req.check ? 'text-green-500' : 'text-gray-300'}`} />
                      {req.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                acceptInvitationMutation.isPending ||
                !password ||
                !confirmPassword ||
                password !== confirmPassword ||
                validationErrors.length > 0
              }
            >
              {acceptInvitationMutation.isPending ? (
                "Creating Account..."
              ) : (
                "Accept Invitation & Create Account"
              )}
            </Button>
          </form>

          {/* Success Message */}
          {acceptInvitationMutation.isSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Account created successfully! Redirecting to login page...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}