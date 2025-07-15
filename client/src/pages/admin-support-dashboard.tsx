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
import { 
  MessageCircle, Send, User, Clock, Building2, CheckCircle, AlertCircle,
  FileText, MapPin, Phone, Mail, Calendar, Activity, Search, Filter
} from "lucide-react";
import { format } from "date-fns";

interface EnhancedMessage {
  id: number;
  fromUserId: string;
  toUserId: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  isAdminMessage: boolean;
  isResolved: boolean;
  status: string;
  priority: string;
  ticketNumber: string;
  applicationId: number | null;
  createdAt: string;
  updatedAt: string;
  fromUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyId: number;
    role: string;
  };
  company: {
    id: number;
    name: string;
    shortName: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
  };
  application?: {
    id: number;
    applicationId: string;
    title: string;
    status: string;
    activityType: string;
    facilityName: string;
  };
}

interface TicketThread {
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  isResolved: boolean;
  messages: EnhancedMessage[];
  user: EnhancedMessage['fromUser'];
  company: EnhancedMessage['company'];
  application?: EnhancedMessage['application'];
  lastActivity: string;
  totalMessages: number;
}

export default function AdminSupportDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<TicketThread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch all messages for admin dashboard with real-time polling
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ["/api/admin/messages"],
    enabled: user?.role === 'system_admin',
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    staleTime: 0, // Consider data immediately stale to ensure fresh data
  });

  // Group messages into ticket threads
  const groupMessagesIntoTickets = (messages: EnhancedMessage[]): TicketThread[] => {
    const ticketMap = new Map<string, TicketThread>();

    messages.forEach(message => {
      const ticketNumber = message.ticketNumber;
      if (!ticketNumber) return;

      if (!ticketMap.has(ticketNumber)) {
        ticketMap.set(ticketNumber, {
          ticketNumber,
          subject: message.subject.replace(/^Re:\s*/, ''),
          status: message.status,
          priority: message.priority,
          isResolved: message.isResolved,
          messages: [message],
          user: message.fromUser,
          company: message.company,
          application: message.application,
          lastActivity: message.createdAt,
          totalMessages: 1
        });
      } else {
        const ticket = ticketMap.get(ticketNumber)!;
        ticket.messages.push(message);
        ticket.lastActivity = message.createdAt > ticket.lastActivity ? message.createdAt : ticket.lastActivity;
        ticket.totalMessages = ticket.messages.length;
        // Update resolved status
        ticket.isResolved = ticket.messages.some(msg => msg.isResolved);
      }
    });

    return Array.from(ticketMap.values()).sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  };

  // Reply to ticket
  const replyMutation = useMutation({
    mutationFn: async (replyData: { subject: string; message: string; toUserId: string; ticketNumber: string; applicationId?: number }) => {
      return await apiRequest("/api/messages", "POST", replyData);
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      // Force immediate refetch for real-time updates
      queryClient.refetchQueries({ queryKey: ["/api/admin/messages"] });
      toast({
        title: "Reply sent",
        description: "Your reply has been sent to the user.",
      });
    },
  });

  // Mark ticket as resolved
  const markResolvedMutation = useMutation({
    mutationFn: async (ticketNumber: string) => {
      return await apiRequest(`/api/admin/tickets/${ticketNumber}/resolve`, "PATCH", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      // Force refetch to update the UI immediately
      queryClient.refetchQueries({ queryKey: ["/api/admin/messages"] });
      toast({
        title: "Ticket resolved",
        description: "The ticket has been marked as resolved.",
      });
    },
  });

  // Update ticket priority
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ ticketNumber, priority }: { ticketNumber: string; priority: string }) => {
      return await apiRequest(`/api/admin/tickets/${ticketNumber}/priority`, "PATCH", { priority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      // Force refetch to update the UI immediately
      queryClient.refetchQueries({ queryKey: ["/api/admin/messages"] });
      toast({
        title: "Priority updated",
        description: "Ticket priority has been updated.",
      });
    },
  });

  const tickets = groupMessagesIntoTickets(allMessages as EnhancedMessage[]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "open" && !ticket.isResolved) ||
      (statusFilter === "resolved" && ticket.isResolved);
    
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    
    replyMutation.mutate({
      subject: `Re: ${selectedTicket.subject}`,
      message: replyText,
      toUserId: selectedTicket.user?.id,
      ticketNumber: selectedTicket.ticketNumber,
      applicationId: selectedTicket.application?.id,
    });
  };

  const handleMarkResolved = () => {
    if (!selectedTicket) return;
    markResolvedMutation.mutate(selectedTicket.ticketNumber);
  };

  if (user?.role !== 'system_admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground">This page is only accessible to system administrators.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Dashboard</h1>
          <p className="text-muted-foreground">Manage support tickets and user communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{tickets.length} Total Tickets</Badge>
          <Badge variant="destructive">{tickets.filter(t => !t.isResolved).length} Open</Badge>
          <Badge variant="secondary">{tickets.filter(t => t.isResolved).length} Resolved</Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[800px]">
        {/* Ticket List */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets, users, or companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Ticket List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No tickets found</div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <div
                      key={ticket.ticketNumber}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTicket?.ticketNumber === ticket.ticketNumber
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs font-mono">
                            {ticket.ticketNumber}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {ticket.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">High</Badge>
                            )}
                            {ticket.isResolved ? (
                              <Badge variant="secondary" className="text-xs">Resolved</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Open</Badge>
                            )}
                          </div>
                        </div>
                        <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{ticket.user?.firstName || 'Unknown'} {ticket.user?.lastName || 'User'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{ticket.company?.name || 'Unknown Company'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(ticket.lastActivity), "MMM d, HH:mm")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="col-span-8">
          {selectedTicket ? (
            <div className="grid grid-cols-3 gap-6 h-full">
              {/* User & Application Context */}
              <div className="col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">User Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{selectedTicket.user?.firstName || 'Unknown'} {selectedTicket.user?.lastName || 'User'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{selectedTicket.user?.email || 'Unknown Email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{selectedTicket.user?.role || 'Unknown Role'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Company</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{selectedTicket.company?.name || 'Unknown Company'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{selectedTicket.company?.shortName || 'N/A'}</Badge>
                      </div>
                      {selectedTicket.company?.contactPhone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{selectedTicket.company?.contactPhone}</span>
                        </div>
                      )}
                      {selectedTicket.company?.contactEmail && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{selectedTicket.company?.contactEmail}</span>
                        </div>
                      )}
                      {selectedTicket.company?.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-2">{selectedTicket.company?.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedTicket.application && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Related Application</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{selectedTicket.application.applicationId}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{selectedTicket.application.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{selectedTicket.application.activityType}</Badge>
                            <Badge variant="outline" className="text-xs">{selectedTicket.application.status}</Badge>
                          </div>
                          {selectedTicket.application.facilityName && (
                            <div className="mt-1 text-xs">
                              Facility: {selectedTicket.application.facilityName}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Conversation */}
              <div className="col-span-2">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {selectedTicket.ticketNumber}
                          </Badge>
                          <Select
                            value={selectedTicket.priority}
                            onValueChange={(priority) => updatePriorityMutation.mutate({
                              ticketNumber: selectedTicket.ticketNumber,
                              priority
                            })}
                          >
                            <SelectTrigger className="w-24 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!selectedTicket.isResolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleMarkResolved}
                            disabled={markResolvedMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3">
                      {selectedTicket.messages
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.isAdminMessage
                              ? "bg-blue-50 border-l-4 border-l-blue-500 ml-4"
                              : "bg-gray-50 border-l-4 border-l-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            <span className="font-medium">
                              {message.isAdminMessage ? "Admin" : `${message.fromUser.firstName} ${message.fromUser.lastName}`}
                            </span>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>{format(new Date(message.createdAt), "MMM d, yyyy 'at' HH:mm")}</span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Form */}
                    {!selectedTicket.isResolved && (
                      <div className="border-t pt-4 space-y-3">
                        <Label htmlFor="admin-reply">Reply to User</Label>
                        <Textarea
                          id="admin-reply"
                          placeholder="Type your reply here..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleReply}
                            disabled={!replyText.trim() || replyMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Ticket</h3>
                  <p className="text-muted-foreground">Choose a ticket from the list to view details and respond.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}