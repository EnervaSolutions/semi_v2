import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Plus, Reply } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, Application } from "@shared/schema";

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  applicationId: z.string().optional(),
  parentMessageId: z.number().optional(),
  ticketNumber: z.string().optional(),
});

type MessageForm = z.infer<typeof messageSchema>;

export default function Messages() {
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    staleTime: 0, // Consider data immediately stale to ensure fresh data
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      message: "",
      applicationId: "",
    },
  });

  const replyForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      message: "",
      applicationId: "",
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageForm) => {
      const response = await apiRequest("/api/messages", "POST", {
        ...data,
        applicationId: data.applicationId && data.applicationId !== "none" ? parseInt(data.applicationId) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      // Force refetch to update the UI immediately
      queryClient.refetchQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the admin team.",
      });
      setIsNewMessageOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (data: MessageForm) => {
      const response = await apiRequest("/api/messages", "POST", {
        ...data,
        applicationId: data.applicationId && data.applicationId !== "none" ? parseInt(data.applicationId) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      // Force refetch to update the UI immediately
      queryClient.refetchQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the admin team.",
      });
      setIsReplyOpen(false);
      setReplyToMessage(null);
      replyForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageForm) => {
    createMessageMutation.mutate(data);
  };

  const onReply = (data: MessageForm) => {
    // Ensure we use the original ticket number for threading
    const replyData = {
      ...data,
      ticketNumber: replyToMessage?.ticketNumber || data.ticketNumber,
      parentMessageId: replyToMessage?.id || data.parentMessageId,
    };
    replyMutation.mutate(replyData);
  };

  const startReply = (message: Message) => {
    setReplyToMessage(message);
    replyForm.reset({
      subject: message.subject.startsWith("Re: ") ? message.subject : `Re: ${message.subject}`,
      message: "",
      applicationId: message.applicationId?.toString() || "",
      parentMessageId: message.id,
      ticketNumber: message.ticketNumber || "",
    });
    setIsReplyOpen(true);
  };

  // Group messages by ticket number for threading
  const groupedMessages = messages.reduce((acc, message) => {
    const ticket = message.ticketNumber || `msg-${message.id}`;
    if (!acc[ticket]) {
      acc[ticket] = [];
    }
    acc[ticket].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  // Sort each thread by creation date and sort threads by latest message
  Object.keys(groupedMessages).forEach(ticket => {
    groupedMessages[ticket].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  });

  const sortedThreads = Object.entries(groupedMessages).sort(([, a], [, b]) => {
    const latestA = a[a.length - 1];
    const latestB = b[b.length - 1];
    return new Date(latestB.createdAt).getTime() - new Date(latestA.createdAt).getTime();
  });

  if (messagesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Support</h1>
        </div>
        <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Message to Admin Team</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter message subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="applicationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Application (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an application" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific application</SelectItem>
                          {applications.map((app) => (
                            <SelectItem key={app.id} value={app.id.toString()}>
                              {app.applicationId} - {app.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your message"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewMessageOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {createMessageMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500 mb-4">
                Start a conversation with the admin team by sending your first message.
              </p>
              <Button onClick={() => setIsNewMessageOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedThreads.map(([ticketNumber, thread]) => {
            const latestMessage = thread[thread.length - 1];
            const originalMessage = thread[0];
            
            return (
              <Card key={ticketNumber} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{originalMessage.subject}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {thread.some(msg => !msg.isRead) && (
                        <Badge variant="secondary">Unread</Badge>
                      )}
                      <Badge variant="outline">
                        {thread.length > 1 ? `${thread.length} messages` : "1 message"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center flex-wrap gap-2">
                    <span className="font-mono">Ticket: {ticketNumber}</span>
                    <Badge 
                      variant={latestMessage.priority === 'high' ? 'destructive' : latestMessage.priority === 'normal' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {latestMessage.priority || 'normal'}
                    </Badge>
                    {latestMessage.isResolved && (
                      <Badge variant="secondary" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                    <span>
                      • Latest: {latestMessage.createdAt ? new Date(latestMessage.createdAt).toLocaleString() : 'Unknown date'}
                    </span>
                    {originalMessage.applicationId && (
                      <span>
                        • Related to application
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col">
                  {/* Scrollable message thread */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {thread.map((message, index) => (
                      <div key={message.id} className={`${index > 0 ? 'ml-4 border-l-2 border-gray-200 pl-4' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              {message.isAdminMessage ? "Admin" : "You"}
                            </span>
                            <span className="ml-2">
                              {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown date'}
                            </span>
                          </div>
                          {!message.isRead && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap text-gray-700">
                          {message.message}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Fixed reply button */}
                  <div className="flex items-center justify-between pt-4 border-t mt-4 bg-white sticky bottom-0">
                    <div className="text-sm text-gray-500">
                      {thread.length > 1 ? `${thread.length} messages in conversation` : 'Start of conversation'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startReply(latestMessage)}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
          </DialogHeader>
          <Form {...replyForm}>
            <form onSubmit={replyForm.handleSubmit(onReply)} className="space-y-4">
              <FormField
                control={replyForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={replyForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Type your reply..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReplyOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={replyMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}