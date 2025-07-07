import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Info, 
  Settings, 
  AlertCircle, 
  Megaphone,
  X,
  Clock
} from "lucide-react";
import { SystemAnnouncement } from "@shared/schema";

interface AnnouncementCardProps {
  announcement: SystemAnnouncement;
  onAcknowledge?: () => void;
  showAcknowledgeButton?: boolean;
}

const typeIcons = {
  maintenance: Settings,
  upgrade: Settings,
  issue: AlertTriangle,
  info: Info,
  urgent: AlertCircle,
} as const;

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
} as const;

const typeColors = {
  maintenance: "bg-purple-100 text-purple-800",
  upgrade: "bg-green-100 text-green-800",
  issue: "bg-red-100 text-red-800", 
  info: "bg-blue-100 text-blue-800",
  urgent: "bg-red-100 text-red-800",
} as const;

export default function AnnouncementCard({ 
  announcement, 
  onAcknowledge, 
  showAcknowledgeButton = true 
}: AnnouncementCardProps) {
  const { toast } = useToast();
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const IconComponent = typeIcons[announcement.type as keyof typeof typeIcons] || Megaphone;

  const acknowledgeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/announcements/${announcement.id}/acknowledge`, "POST"),
    onSuccess: () => {
      setIsAcknowledged(true);
      toast({
        title: "Acknowledged",
        description: "You have acknowledged this announcement.",
      });
      onAcknowledge?.();
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to acknowledge announcement.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const isScheduled = announcement.scheduledStart && new Date(announcement.scheduledStart) > new Date();
  const isExpired = announcement.scheduledEnd && new Date(announcement.scheduledEnd) < new Date();

  return (
    <Card className={`relative ${
      announcement.severity === 'critical' ? 'border-red-500 bg-red-50' :
      announcement.severity === 'high' ? 'border-orange-500 bg-orange-50' :
      'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className={`h-5 w-5 ${
              announcement.severity === 'critical' ? 'text-red-600' :
              announcement.severity === 'high' ? 'text-orange-600' :
              'text-gray-600'
            }`} />
            <div>
              <CardTitle className="text-lg">{announcement.title}</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {formatDate(announcement.createdAt)}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Badge className={severityColors[announcement.severity as keyof typeof severityColors]}>
                {announcement.severity.toUpperCase()}
              </Badge>
              <Badge className={typeColors[announcement.type as keyof typeof typeColors]}>
                {announcement.type.toUpperCase()}
              </Badge>
            </div>
            {isScheduled && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Scheduled
              </Badge>
            )}
            {isExpired && (
              <Badge variant="secondary" className="text-xs">
                Expired
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
          
          {(announcement.scheduledStart || announcement.scheduledEnd) && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {announcement.scheduledStart && (
                <div>
                  <strong>Scheduled Start:</strong> {formatDate(announcement.scheduledStart)}
                </div>
              )}
              {announcement.scheduledEnd && (
                <div>
                  <strong>Scheduled End:</strong> {formatDate(announcement.scheduledEnd)}
                </div>
              )}
            </div>
          )}

          {announcement.targetRoles && announcement.targetRoles.length > 0 && !announcement.targetRoles.includes('all') && (
            <div className="text-sm text-gray-600">
              <strong>Target Roles:</strong> {announcement.targetRoles.join(', ')}
            </div>
          )}

          {showAcknowledgeButton && announcement.requiresAcknowledgment && !isAcknowledged && (
            <div className="flex justify-end pt-2">
              <Button 
                onClick={() => acknowledgeMutation.mutate()}
                disabled={acknowledgeMutation.isPending}
                className="w-full sm:w-auto"
              >
                {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge"}
              </Button>
            </div>
          )}

          {isAcknowledged && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <X className="h-4 w-4" />
              Acknowledged
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}