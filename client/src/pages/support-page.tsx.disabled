import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, User, Building, FileText, Send, Archive, Trash2, RotateCcw, FolderOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
  });

  const { data: archivedMessages = [] } = useQuery({
    queryKey: ["/api/admin/messages/archived"],
    enabled: user?.role === 'system_admin',
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setReplyText("");
      setNewTicketSubject("");
      setNewTicketMessage("");
      setShowNewTicketForm(false);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ messageId, status }: { messageId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/messages/${messageId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/archived"] });
      toast({
        title: "Success",
        description: "Ticket status updated",
      });
    },
  });

  // Admin ticket management mutations
  const archiveMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/admin/messages/${messageId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/archived"] });
      setSelectedTicket(null);
      toast({
        title: "Ticket archived",
        description: "The ticket has been moved to archive.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to archive ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unarchiveMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/admin/messages/${messageId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/archived"] });
      setSelectedTicket(null);
      toast({
        title: "Ticket restored",
        description: "The ticket has been restored from archive.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to restore ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/admin/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages/archived"] });
      setSelectedTicket(null);
      toast({
        title: "Ticket deleted",
        description: "The ticket has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;

    createMessageMutation.mutate({
      subject: `Re: ${selectedTicket.subject}`,
      message: replyText,
      parentMessageId: selectedTicket.id,
      applicationId: selectedTicket.applicationId,
    });
  };

  const handleCreateTicket = () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    createMessageMutation.mutate({
      subject: newTicketSubject,
      message: newTicketMessage,
      priority: "normal",
    });
  };

  const handleUpdateStatus = (messageId: number, status: string) => {
    updateStatusMutation.mutate({ messageId, status });
  };

  // Admin action mutations
  const archiveMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("PATCH", `/api/admin/messages/${messageId}/archive`);
    },
    onSuccess: () => {
      toast({ title: "Ticket archived successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedTicket(null);
    },
    onError: () => {
      toast({ title: "Failed to archive ticket", variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/admin/messages/${messageId}`);
    },
    onSuccess: () => {
      toast({ title: "Ticket deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedTicket(null);
    },
    onError: () => {
      toast({ title: "Failed to delete ticket", variant: "destructive" });
    },
  });

  const handleArchiveMessage = (messageId: number) => {
    archiveMessageMutation.mutate(messageId);
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteMessageMutation.mutate(messageId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Support Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {user?.role === 'system_admin' 
              ? 'Manage support tickets from all users'
              : 'Get help and support for your applications'
            }
          </p>
        </div>
        {user?.role !== 'system_admin' && (
          <Button onClick={() => setShowNewTicketForm(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          {user?.role === 'system_admin' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>
                  Manage all support tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Active ({messages.length})
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Archived ({archivedMessages.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active" className="m-0">
                    <div className="space-y-2 max-h-96 overflow-y-auto p-4">
                      {messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            selectedTicket?.id === message.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => setSelectedTicket(message)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(message.status)}
                              <Badge className={getStatusColor(message.status)}>
                                {message.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1 line-clamp-1">
                            {message.subject}
                          </h4>
                          
                          {message.fromUser && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <User className="h-3 w-3" />
                              {message.fromUser.firstName} {message.fromUser.lastName}
                              {message.fromUser.email && ` (${message.fromUser.email})`}
                            </div>
                          )}
                          
                          {message.applicationId && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                              <FileText className="h-3 w-3" />
                              App #{message.applicationId}
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                            {message.message}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{format(new Date(message.createdAt), 'MMM d, yyyy')}</span>
                            {!message.isRead && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {messages.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No active support tickets found</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="archived" className="m-0">
                    <div className="space-y-2 max-h-96 overflow-y-auto p-4">
                      {archivedMessages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            selectedTicket?.id === message.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => setSelectedTicket(message)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Archive className="h-4 w-4 text-gray-500" />
                              <Badge variant="secondary">Archived</Badge>
                            </div>
                          </div>
                          
                          <h4 className="font-medium text-sm mb-1 line-clamp-1">
                            {message.subject}
                          </h4>
                          
                          {message.fromUser && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <User className="h-3 w-3" />
                              {message.fromUser.firstName} {message.fromUser.lastName}
                              {message.fromUser.email && ` (${message.fromUser.email})`}
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                            {message.message}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{format(new Date(message.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      ))}
                      
                      {archivedMessages.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No archived tickets found</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>
                  Your support tickets
                </CardDescription>
              </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((message: any) => (
                  <div
                    key={message.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedTicket?.id === message.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedTicket(message)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(message.status)}
                        <Badge className={getStatusColor(message.status)}>
                          {message.status}
                        </Badge>
                        {message.priority && message.priority !== 'normal' && (
                          <Badge className={getPriorityColor(message.priority)}>
                            {message.priority}
                          </Badge>
                        )}
                      </div>
                      {message.ticketNumber && (
                        <span className="text-xs text-gray-500 font-mono">
                          {message.ticketNumber}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1 line-clamp-2">
                      {message.subject}
                    </h4>
                    
                    {user?.role === 'system_admin' && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        {message.fromUser && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {message.fromUser.firstName} {message.fromUser.lastName}
                          </div>
                        )}
                        {message.company && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {message.company.name}
                          </div>
                        )}
                        {message.application && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {message.application.applicationId}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                      {message.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{format(new Date(message.createdAt), 'MMM d, yyyy')}</span>
                      {!message.isRead && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No support tickets found</p>
                    {user?.role !== 'system_admin' && (
                      <p className="text-sm mt-2">Create your first ticket to get started</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details & Reply */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.subject}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span>Ticket: {selectedTicket.ticketNumber}</span>
                      <span>Created: {format(new Date(selectedTicket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </CardDescription>
                  </div>
                  {user?.role === 'system_admin' && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(status) => handleUpdateStatus(selectedTicket.id, status)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Admin Action Buttons */}
                    {selectedTicket.isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveMessageMutation.mutate(selectedTicket.id)}
                        disabled={unarchiveMessageMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveMessageMutation.mutate(selectedTicket.id)}
                        disabled={archiveMessageMutation.isPending}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the ticket and all its messages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMessageMutation.mutate(selectedTicket.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ticket Information */}
                {user?.role === 'system_admin' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedTicket.fromUser && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">User</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTicket.fromUser.firstName} {selectedTicket.fromUser.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{selectedTicket.fromUser.email}</p>
                      </div>
                    )}
                    {selectedTicket.company && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Company</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTicket.company.name}
                        </p>
                        <p className="text-xs text-gray-500">({selectedTicket.company.shortName})</p>
                      </div>
                    )}
                    {selectedTicket.application && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Application</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTicket.application.applicationId}
                        </p>
                        <p className="text-xs text-gray-500">{selectedTicket.application.title}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Original Message */}
                <div className="space-y-2">
                  <h4 className="font-medium">Original Message</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                <Separator />

                {/* Reply Form */}
                {(user?.role === 'system_admin' || selectedTicket.fromUserId === user?.id) && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Reply</h4>
                    <Textarea
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || createMessageMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Controls */}
                {user?.role === 'system_admin' && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 text-red-600 dark:text-red-400">Admin Actions</h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleArchiveMessage(selectedTicket.id)}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Ticket
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteMessage(selectedTicket.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Ticket
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : showNewTicketForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we'll help you resolve it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    placeholder="Provide detailed information about your issue..."
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewTicketForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTicket}
                    disabled={!newTicketSubject.trim() || !newTicketMessage.trim() || createMessageMutation.isPending}
                  >
                    Create Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Select a ticket to view details
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a support ticket from the list to view its details and reply
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}