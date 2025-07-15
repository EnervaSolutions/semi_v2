import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Shield } from "lucide-react";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TeamInviteModal({ isOpen, onClose }: TeamInviteModalProps) {
  const { toast } = useToast();
  const [inviteData, setInviteData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    message: ""
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteData) => {
      const res = await apiRequest("/api/team/invite", "POST", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Team member invitation has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setInviteData({
        email: "",
        firstName: "",
        lastName: "",
        message: ""
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData.email || !inviteData.firstName || !inviteData.lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate(inviteData);
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization in the SEMI program portal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={inviteData.firstName}
                onChange={(e) => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Enter first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={inviteData.lastName}
                onChange={(e) => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={inviteData.email}
              onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              required
            />
          </div>



          <div className="space-y-2">
            <Label htmlFor="message">Welcome Message (Optional)</Label>
            <Textarea
              id="message"
              value={inviteData.message}
              onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a personal welcome message..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next:</p>
                <ul className="space-y-1">
                  <li>• An invitation email will be sent to {inviteData.email || "the provided email"}</li>
                  <li>• They'll receive instructions to create their account as a team member</li>
                  <li>• You can adjust their permission levels after they join</li>
                  <li>• Manage all team member permissions from the team dashboard</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">Invitation expires in 7 days</span>
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}