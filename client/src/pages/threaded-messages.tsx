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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Send, User, Clock, Building2, Loader2, Check, Reply, CheckCircle } from "lucide-react";
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
  id: string;
  subject: string;
  messages: Message[];
  lastActivity: string;
  isResolved: boolean;
  company?: {
    id: number;
    name: string;
    shortName: string;
  };
  totalMessages: number;
}

export default function ThreadedMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newMessage, setNewMessage] = useState({
    subject: "",
    message: "",
    applicationId: ""
  });

  // Fetch user's applications for the dropdown
  const { data: userApplications = [] } = useQuery({
    queryKey: ["/api/applications"],
    enabled: !!user && user.role !== 'system_admin',
  });

  // Fetch messages with optimized refresh strategy
  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 30000, // 30 seconds - reasonable freshness without excessive calls
    refetchOnWindowFocus: false, // Don't refetch on focus to reduce calls
    refetchOnMount: true,
    refetchOnReconnect: true,
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
        const company = message.company || (message.fromUser?.companyId ? {
          id: message.fromUser.companyId,
          name: "Unknown Company",
          shortName: "UNK"
        } : undefined);

        threadMap.set(threadKey, {
          id: threadKey,
          subject: message.subject,
          messages: [message],
          lastActivity: message.createdAt,
          isResolved: (message as any).isResolved || false,
          company: company,
          totalMessages: 1
        });
      } else {
        // Add to existing thread
        const thread = threadMap.get(threadKey)!;
        thread.messages.push(message);
        thread.lastActivity = message.createdAt;
        thread.totalMessages = thread.messages.length;
        // Update resolved status - thread is resolved if any message in the thread is resolved
        thread.isResolved = thread.messages.some(msg => (msg as any).isResolved) || false;
      }
    });

    // Sort threads by last activity
    return Array.from(threadMap.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: typeof newMessage) => {
      return await apiRequest("/api/messages", "POST", {
        ...messageData,
        applicationId: messageData.applicationId && messageData.applicationId !== "none" ? parseInt(messageData.applicationId) : null,
      });
    },
    onSuccess: (data: any) => {
      // Clear form immediately and show ticket number
      setNewMessage({ subject: "", message: "", applicationId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent successfully",
        description: `Ticket #${data.ticketNumber || 'N/A'} created. Reference this number when contacting support.`,
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

  // Reply to message mutation
  const replyMessageMutation = useMutation({
    mutationFn: async (replyData: { subject: string; message: string; toUserId?: string; applicationId?: number; ticketNumber?: string }) => {
      return await apiRequest("/api/messages", "POST", replyData);
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
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

  // Mark message as resolved mutation
  const markResolvedMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}`, { markResolved: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Thread marked as resolved",
        description: "The entire message thread has been marked as resolved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve thread",
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

  const handleReply = (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault(); // Prevent form submission/page refresh
    if (!replyText.trim() || !selectedThread) return;
    
    // Find the original user ID (first non-admin user in the thread)
    const originalUserId = selectedThread.messages.find(m => !m.isAdminMessage)?.fromUserId;
    // Get ticket number from the thread
    const ticketNumber = (selectedThread.messages[0] as any)?.ticketNumber;
    
    replyMessageMutation.mutate({
      subject: `Re: ${selectedThread.subject}`,
      message: replyText,
      toUserId: originalUserId,
      applicationId: selectedThread.messages[0]?.applicationId || undefined,
      ticketNumber: ticketNumber,
    });
  };

  const handleMarkResolved = () => {
    if (!selectedThread) return;
    const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
    markResolvedMutation.mutate(lastMessage.id);
  };

  // Get threaded messages
  const messageThreads = groupMessagesIntoThreads(messages as Message[]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
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
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <Badge variant="secondary">
          {messageThreads.length} {messageThreads.length === 1 ? "ticket" : "tickets"}
        </Badge>
      </div>

      <div className="flex h-[calc(100vh-180px)] gap-6">
        {/* Thread List */}
        <div className="w-1/3 border-r pr-6">
          <div className="space-y-3 max-h-full overflow-y-auto">
            {messageThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              messageThreads.map((thread) => (
                <div
                  key={thread.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedThread?.id === thread.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {thread.subject}
                    </h4>
                    <div className="flex items-center gap-1 ml-2">
                      {thread.totalMessages > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {thread.totalMessages}
                        </Badge>
                      )}
                      {thread.isResolved ? (
                        <Badge variant="secondary" className="text-xs">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Open
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {user?.role === 'system_admin' && thread.company && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Building2 className="h-3 w-3" />
                      <span className="font-medium">{thread.company.name}</span>
                      <span>({thread.company.shortName})</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>
                      {thread.messages[0].fromUser?.firstName} {thread.messages[0].fromUser?.lastName}
                    </span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{format(new Date(thread.lastActivity), "MMM d, HH:mm")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Thread Details */}
        <div className="flex-1">
          {selectedThread ? (
            <div className="space-y-4 h-full flex flex-col">
              {/* Thread Header */}
              <div className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium">{selectedThread.subject}</h3>
                      {(selectedThread.messages[0] as any)?.ticketNumber && (
                        <Badge variant="outline" className="text-xs font-mono">
                          Ticket #{(selectedThread.messages[0] as any).ticketNumber}
                        </Badge>
                      )}
                    </div>
                    {user?.role === 'system_admin' && selectedThread.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{selectedThread.company.name}</span>
                        <span>({selectedThread.company.shortName})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedThread.isResolved ? (
                      <Badge variant="secondary">Resolved</Badge>
                    ) : (
                      <Badge variant="destructive">Open</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {selectedThread.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.isAdminMessage
                        ? "bg-blue-50 border-l-4 border-l-blue-500 ml-8"
                        : "bg-gray-50 border-l-4 border-l-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {message.isAdminMessage ? "Admin" : `${message.fromUser?.firstName} ${message.fromUser?.lastName}`}
                      </span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{format(new Date(message.createdAt), "MMM d, yyyy 'at' HH:mm")}</span>
                      {index === 0 && message.application && (
                        <>
                          <Building2 className="h-4 w-4 ml-2" />
                          <span>App: {message.application.applicationId}</span>
                        </>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Section for both users and admins */}
              {selectedThread && (
                <div className="border-t pt-4 space-y-4">
                  {selectedThread.isResolved ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">This ticket has been resolved</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No further replies are allowed. Contact support if you need to reopen this ticket.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium">
                        {user?.role === 'system_admin' ? 'Reply to Ticket' : 'Reply to Conversation'}
                      </h4>
                      
                      <form onSubmit={handleReply} className="space-y-3">
                    <div>
                      <Label htmlFor="reply">Your Reply</Label>
                      <Textarea
                        id="reply"
                        placeholder="Type your reply here... (Press Ctrl+Enter to send)"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleReply(e);
                          }
                        }}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="submit"
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
                            <Reply className="h-4 w-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                      
                      {user?.role === 'system_admin' && !selectedThread.isResolved && (
                        <Button
                          type="button"
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
                  </form>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : user?.role !== 'system_admin' ? (
            // New message form for non-admin users
            <Card>
              <CardHeader>
                <CardTitle>Send New Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Brief description of your inquiry"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    placeholder="Describe your issue or question in detail"
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="applicationId">Application ID (optional)</Label>
                  <Select
                    value={newMessage.applicationId}
                    onValueChange={(value) => setNewMessage({ ...newMessage, applicationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an application (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No application selected</SelectItem>
                      {(userApplications as any[])?.map((app: any) => (
                        <SelectItem key={app.id} value={app.id.toString()}>
                          {app.applicationId} - {app.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-full"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}