import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, AlertTriangle, Key, Eye, EyeOff, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const twoFactorSchema = z.object({
  token: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TwoFactorData = z.infer<typeof twoFactorSchema>;
type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

export default function SecuritySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string; manualEntryKey: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const twoFactorForm = useForm<TwoFactorData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      token: "",
    }
  });

  const passwordForm = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/auth/2fa/setup", "POST");
      return await res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
      setShowSetup(true);
      toast({
        title: "Setup initiated",
        description: "Scan the QR code with your authenticator app.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message || "Failed to setup 2FA",
      });
    },
  });

  // Verify 2FA mutation
  const verifyMutation = useMutation({
    mutationFn: async (data: TwoFactorData) => {
      const res = await apiRequest("/api/auth/2fa/verify", "POST", {
        token: data.token,
        secret: setupData?.secret,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowSetup(false);
      setSetupData(null);
      twoFactorForm.reset();
      toast({
        title: "Two-factor authentication enabled",
        description: "Your account is now secured with 2FA.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid verification code",
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async (data: TwoFactorData) => {
      const res = await apiRequest("/api/auth/2fa/disable", "POST", {
        token: data.token,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      twoFactorForm.reset();
      toast({
        title: "Two-factor authentication disabled",
        description: "2FA has been removed from your account.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Disable failed",
        description: error.message || "Failed to disable 2FA",
      });
    },
  });

  // ========================================
  // PASSWORD CHANGE MUTATION
  // ========================================
  // Calls the /api/auth/change-password endpoint which uses bcrypt hashing
  // This ensures passwords are properly hashed before storage
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      const res = await apiRequest("/api/auth/change-password", "POST", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onVerify = (data: TwoFactorData) => {
    verifyMutation.mutate(data);
  };

  const onDisable = (data: TwoFactorData) => {
    disableMutation.mutate(data);
  };

  const onPasswordChange = (data: PasswordChangeData) => {
    passwordChangeMutation.mutate(data);
  };

  // Password validation helper
  const getPasswordValidation = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
    };
  };

  const newPassword = passwordForm.watch("newPassword") || "";
  const passwordValidation = getPasswordValidation(newPassword);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h1>
        <p className="text-gray-600">Manage your account security, password, and two-factor authentication.</p>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>Password</span>
          </TabsTrigger>
          <TabsTrigger value="2fa" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Two-Factor Auth</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Key className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showCurrentPassword ? "text" : "password"} 
                              placeholder="Enter current password" 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showNewPassword ? "text" : "password"} 
                              placeholder="Enter new password" 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        {newPassword && (
                          <div className="mt-2 space-y-2">
                            <div className="text-sm text-gray-600 mb-2">Password requirements:</div>
                            <div className="space-y-1">
                              <div className={`flex items-center space-x-2 text-sm ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordValidation.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                <span>At least 8 characters</span>
                              </div>
                              <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordValidation.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                <span>Contains lowercase letter</span>
                              </div>
                              <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordValidation.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                <span>Contains uppercase letter</span>
                              </div>
                              <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordValidation.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                <span>Contains number</span>
                              </div>
                              <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordValidation.hasSpecialChar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                <span>Contains special character</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"} 
                              placeholder="Confirm new password" 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={passwordChangeMutation.isPending}
                    className="w-full"
                  >
                    {passwordChangeMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2fa">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Two-factor authentication is enabled</p>
                        <p className="text-sm text-green-700">Your account is secured with 2FA</p>
                      </div>
                    </div>
                  </div>

                  <Form {...twoFactorForm}>
                    <form onSubmit={twoFactorForm.handleSubmit(onDisable)} className="space-y-4">
                      <FormField
                        control={twoFactorForm.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verification Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter 6-digit code to disable 2FA" 
                                maxLength={6}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        variant="destructive" 
                        disabled={disableMutation.isPending}
                        className="w-full"
                      >
                        {disableMutation.isPending ? "Disabling..." : "Disable Two-Factor Authentication"}
                      </Button>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-900">Two-factor authentication is disabled</p>
                        <p className="text-sm text-yellow-700">Enable 2FA to secure your account</p>
                      </div>
                    </div>
                  </div>

                  {!showSetup ? (
                    <Button 
                      onClick={() => setupMutation.mutate()} 
                      disabled={setupMutation.isPending}
                      className="w-full"
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      {setupMutation.isPending ? "Setting up..." : "Enable Two-Factor Authentication"}
                    </Button>
                  ) : setupData && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2">Setup Two-Factor Authentication</h3>
                        <p className="text-sm text-blue-700 mb-4">
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div className="flex justify-center mb-4">
                          <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="border rounded" />
                        </div>
                        <p className="text-xs text-blue-600 text-center">
                          Manual entry key: <code className="bg-blue-100 px-1 py-0.5 rounded">{setupData.manualEntryKey}</code>
                        </p>
                      </div>

                      <Form {...twoFactorForm}>
                        <form onSubmit={twoFactorForm.handleSubmit(onVerify)} className="space-y-4">
                          <FormField
                            control={twoFactorForm.control}
                            name="token"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Verification Code</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter 6-digit code from your app" 
                                    maxLength={6}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button 
                              type="submit" 
                              disabled={verifyMutation.isPending}
                              className="flex-1"
                            >
                              {verifyMutation.isPending ? "Verifying..." : "Verify and Enable"}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                setShowSetup(false);
                                setSetupData(null);
                                twoFactorForm.reset();
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}