import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  messageId?: number;
  applicationId?: number;
}

interface SystemAnnouncement {
  id: number;
  title: string;
  message: string;
  type: string;
  severity: string;
  targetRoles: string[];
  isActive: boolean;
  requiresAcknowledgment: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdAt: string;
  createdBy: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch regular notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch active system announcements
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<SystemAnnouncement[]>({
    queryKey: ["/api/announcements/active"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const isLoading = notificationsLoading || announcementsLoading;

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/mark-all-read", "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Delete all notifications mutation
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/delete-all", "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // System announcements that require acknowledgment are treated as "unread"
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const unacknowledgedAnnouncementsCount = announcements.filter(a => a.requiresAcknowledgment).length;
  const unreadCount = unreadNotificationsCount + unacknowledgedAnnouncementsCount;

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
      case 'admin_reply':
        return '💬';
      case 'ticket_resolved':
        return '✅';
      case 'maintenance':
        return '🔧';
      case 'upgrade':
        return '⬆️';
      case 'issue':
        return '⚠️';
      case 'urgent':
        return '🚨';
      case 'info':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  // Acknowledge announcement mutation
  const acknowledgeAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: number) => {
      return await apiRequest(`/api/announcements/${announcementId}/acknowledge`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
    },
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : (notifications.length === 0 && announcements.length === 0) ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-1">
              {/* System Announcements First */}
              {announcements.map((announcement) => (
                <Card
                  key={`announcement-${announcement.id}`}
                  className="mx-2 my-1 border-0 shadow-none bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(announcement.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium leading-tight">
                            {announcement.title}
                          </h4>
                          <Badge 
                            className={
                              announcement.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              announcement.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              announcement.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }
                          >
                            {announcement.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {announcement.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <time className="text-xs text-muted-foreground">
                            {format(new Date(announcement.createdAt), "MMM d, HH:mm")}
                          </time>
                          {announcement.requiresAcknowledgment && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => acknowledgeAnnouncementMutation.mutate(announcement.id)}
                              disabled={acknowledgeAnnouncementMutation.isPending}
                            >
                              {acknowledgeAnnouncementMutation.isPending ? "..." : "Acknowledge"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Regular Notifications */}
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`mx-2 my-1 border-0 shadow-none ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium leading-tight">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <time className="text-xs text-muted-foreground">
                            {format(new Date(notification.createdAt), "MMM d, HH:mm")}
                          </time>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="h-4 text-xs px-1">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {(notifications.length > 0 || announcements.length > 0) && (
          <div className="border-t p-3 space-y-2">
            {unreadNotificationsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? "Marking..." : "Mark All Notifications as Read"}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => deleteAllNotificationsMutation.mutate()}
                disabled={deleteAllNotificationsMutation.isPending}
              >
                {deleteAllNotificationsMutation.isPending ? "Deleting..." : "Delete All Notifications"}
              </Button>
            )}
            <p className="text-xs text-center text-muted-foreground">
              {announcements.length > 0 && "System announcements appear highlighted. "}
              Click the X to mark individual notifications as read
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}