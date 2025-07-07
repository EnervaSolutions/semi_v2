import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ChangePasswordModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function ChangePasswordModal({ open, onSuccess }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Password validation
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8 && password.length <= 64,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /\d/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
    };

    return {
      isValid: Object.values(requirements).every(Boolean),
      requirements
    };
  };

  const validation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Please ensure your password meets all requirements.",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiRequest('/api/auth/change-password', 'POST', { 
        newPassword 
      });
      
      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
        onSuccess();
      } else {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            Change Password Required
          </DialogTitle>
          <DialogDescription>
            You're using a temporary password. Please set a new password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
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
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
              <div className="space-y-1">
                <div className={`text-xs flex items-center gap-2 ${
                  validation.requirements.length ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validation.requirements.length ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  8-64 characters long
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  validation.requirements.uppercase ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validation.requirements.uppercase ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  At least one uppercase letter
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  validation.requirements.lowercase ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validation.requirements.lowercase ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  At least one lowercase letter
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  validation.requirements.digit ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validation.requirements.digit ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  At least one number
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  validation.requirements.symbol ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    validation.requirements.symbol ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  At least one special character
                </div>
              </div>
            </div>
          )}

          {/* Password Match Check */}
          {confirmPassword && (
            <div className={`text-xs flex items-center gap-2 ${
              passwordsMatch ? 'text-green-600' : 'text-red-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                passwordsMatch ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !validation.isValid || !passwordsMatch}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}