import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TwoFactorPromptProps {
  onDismiss: () => void;
}

export default function TwoFactorPrompt({ onDismiss }: TwoFactorPromptProps) {
  const { user } = useAuth();

  // Don't show if user already has 2FA enabled
  if (user?.twoFactorEnabled) {
    return null;
  }

  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-6">
      <Shield className="h-4 w-4 text-yellow-600" />
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          <AlertTitle className="text-yellow-800">Secure Your Account</AlertTitle>
          <AlertDescription className="text-yellow-700 mt-1">
            Enable two-factor authentication to add an extra layer of security to your SEMI program account.
          </AlertDescription>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button 
            size="sm" 
            onClick={() => window.location.href = "/security"}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Set up 2FA
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="text-yellow-600 hover:bg-yellow-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}