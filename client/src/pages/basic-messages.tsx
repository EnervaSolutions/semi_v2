import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Send, User, Clock, Building2, Loader2, Check } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  fromUserId: string;
  toUserId: string | null;
  subject: string;
  message: string;
  isRead: boolean | null;
  isAdminMessage: boolean | null;
  applicationId: number | null;
  createdAt: string;
  fromUser?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyId: number | null;
  };
  company?: {
    id: number;
    name: string;
    shortName: string;
  };
  application?: {
    id: number;
    applicationId: string;
    title: string;
  };
}

interface MessageThread {
  id: string; // unique thread identifier
  subject: string;
  originalMessage: Message;
  replies: Message[];
  lastActivity: string;
  isResolved: boolean;
  company?: {
    id: number;
    name: string;
    shortName: string;
  };
}

export default function BasicMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newMessage, setNewMessage] = useState({
    subject: "",
    message: "",
    applicationId: ""
  });

  // Function to group messages into threads
  const groupMessagesIntoThreads = (messages: Message[]): MessageThread[] => {
    const threadMap = new Map<string, MessageThread>();

    // Sort messages by creation date
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedMessages.forEach(message => {
      // Use ticket number if available, otherwise use message ID to ensure separate threads
      const threadKey = (message as any).ticketNumber || `msg-${message.id}`;

      if (!threadMap.has(threadKey)) {
        // Create new thread
        threadMap.set(threadKey, {
          id: threadKey,
          subject: message.subject,
          originalMessage: message,
          replies: [],
          lastActivity: message.createdAt,
          isResolved: message.isRead || false,
          company: message.company || message.fromUser?.companyId ? {
            id: message.company?.id || message.fromUser?.companyId || 0,
            name: message.company?.name || "Unknown Company",
            shortName: message.company?.shortName || "UNK"
          } : undefined
        });
      } else {
        // Add to existing thread as reply
        const thread = threadMap.get(threadKey)!;
        thread.replies.push(message);
        thread.lastActivity = message.createdAt;
        // Update resolved status - thread is resolved only if all messages are read
        thread.isResolved = thread.isResolved && (message.isRead || false);
      }
    });

    // Sort threads by last activity
    return Array.from(threadMap.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  };

  // Fetch messages
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: typeof newMessage) => {
      return await apiRequest("POST", "/api/messages", {
        ...messageData,
        applicationId: messageData.applicationId ? parseInt(messageData.applicationId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage({ subject: "", message: "", applicationId: "" });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reply to message mutation (for admins)
  const replyMessageMutation = useMutation({
    mutationFn: async (replyData: { subject: string; message: string; toUserId: string; applicationId?: number }) => {
      return await apiRequest("POST", "/api/messages", replyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setReplyText("");
      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark message as resolved mutation (for admins)
  const markResolvedMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}`, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message marked as resolved",
        description: "The message has been marked as resolved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.subject.trim() || !newMessage.message.trim()) {
      toast({
        title: "Please fill in all required fields",
        description: "Subject and message are required.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate(newMessage);
  };

  const handleReply = () => {
    if (!replyText.trim() || !selectedThread) return;
    
    // Find the original user ID (non-admin user from the thread)
    const originalUserId = selectedThread.originalMessage.isAdminMessage 
      ? selectedThread.replies.find(r => !r.isAdminMessage)?.fromUserId 
      : selectedThread.originalMessage.fromUserId;
    
    replyMessageMutation.mutate({
      subject: `Re: ${selectedThread.subject}`,
      message: replyText,
      toUserId: originalUserId,
      applicationId: selectedThread.originalMessage.applicationId || undefined,
    });
  };

  const handleMarkResolved = () => {
    if (!selectedThread) return;
    markResolvedMutation.mutate(selectedThread.originalMessage.id);
  };

  // Get threaded messages
  const messageThreads = groupMessagesIntoThreads(messages as Message[]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
          <p className="text-red-600">Failed to load messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support Messages</h1>
        <Badge variant="secondary">
          {messageThreads.length} {messageThreads.length === 1 ? "ticket" : "tickets"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Send your first message below</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {message.subject}
                      </h4>
                      {!message.isRead && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>
                        {message.fromUser?.firstName} {message.fromUser?.lastName}
                      </span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{format(new Date(message.createdAt), "MMM d, HH:mm")}</span>
                      {message.isRead && (
                        <Badge variant="outline" className="text-xs ml-2">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    {message.application && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        <span>{message.application.applicationId}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Details or New Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedMessage ? "Message Details" : "Send New Message"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedMessage.subject}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>
                        {selectedMessage.fromUser?.firstName}{" "}
                        {selectedMessage.fromUser?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(selectedMessage.createdAt), "MMM d, yyyy 'at' HH:mm")}
                      </span>
                    </div>
                  </div>
                  {selectedMessage.company && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Building2 className="h-4 w-4" />
                      <span>{selectedMessage.company.name}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
                {selectedMessage.application && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Related Application:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMessage.application.applicationId} - {selectedMessage.application.title}
                    </p>
                  </div>
                )}

                {user?.role === 'system_admin' && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Admin Actions</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reply">Reply to Message</Label>
                        <Textarea
                          id="reply"
                          placeholder="Type your reply here..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleReply}
                          disabled={!replyText.trim() || replyMessageMutation.isPending}
                          size="sm"
                        >
                          {replyMessageMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Reply
                            </>
                          )}
                        </Button>
                        
                        {!selectedMessage.isRead && (
                          <Button
                            onClick={handleMarkResolved}
                            disabled={markResolvedMutation.isPending}
                            variant="outline"
                            size="sm"
                          >
                            {markResolvedMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Mark Resolved
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1">
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    value={newMessage.subject}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, subject: e.target.value })
                    }
                    placeholder="Brief description of your inquiry"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    value={newMessage.message}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, message: e.target.value })
                    }
                    placeholder="Describe your question or issue in detail..."
                    rows={6}
                  />
                </div>
                <div>
                  <label htmlFor="applicationId" className="block text-sm font-medium mb-1">
                    Application ID (optional)
                  </label>
                  <Input
                    id="applicationId"
                    value={newMessage.applicationId}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, applicationId: e.target.value })
                    }
                    placeholder="Link to specific application"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}