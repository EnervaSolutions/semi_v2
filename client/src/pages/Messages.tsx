import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Plus } from "lucide-react";
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
});

type MessageForm = z.infer<typeof messageSchema>;

export default function Messages() {
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const { toast } = useToast();

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
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

  const onSubmit = (data: MessageForm) => {
    createMessageMutation.mutate(data);
  };

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
          messages.map((message) => (
            <Card key={message.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{message.subject}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {!message.isRead && (
                      <Badge variant="secondary">Unread</Badge>
                    )}
                    <Badge variant="outline">
                      {message.isAdminMessage ? "From Admin" : "To Admin"}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown date'}
                  {message.applicationId && (
                    <span className="ml-2">
                      • Related to application
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-gray-700">
                  {message.message}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}