import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  BarChart, 
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target
} from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import { SystemAnnouncement } from "@shared/schema";

interface AnnouncementFormData {
  title: string;
  message: string;
  type: string;
  severity: string;
  targetRoles: string[];
  requiresAcknowledgment: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
}

const ROLES = [
  'all',
  'system_admin', 
  'company_admin',
  'team_member',
  'contractor_individual',
  'contractor_team_member',
  'contractor_account_owner',
  'contractor_manager'
];

export default function SystemStatusManager() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [selectedAnnouncementStats, setSelectedAnnouncementStats] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    message: '',
    type: 'info',
    severity: 'medium',
    targetRoles: ['all'],
    requiresAcknowledgment: false,
    scheduledStart: '',
    scheduledEnd: ''
  });

  // Fetch all announcements for admin management
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["/api/admin/announcements"],
  });

  // Fetch announcement stats when selected
  const { data: announcementStats } = useQuery({
    queryKey: ["/api/admin/announcements", selectedAnnouncementStats, "stats"],
    enabled: !!selectedAnnouncementStats,
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementFormData) => apiRequest("/api/admin/announcements", "POST", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Announcement created successfully." });
      setShowCreateDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create announcement.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AnnouncementFormData> }) => 
      apiRequest(`/api/admin/announcements/${id}`, "PATCH", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Announcement updated successfully." });
      setEditingAnnouncement(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update announcement.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/announcements/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "Success", description: "Announcement deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete announcement.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      severity: 'medium',
      targetRoles: ['all'],
      requiresAcknowledgment: false,
      scheduledStart: '',
      scheduledEnd: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart).toISOString() : undefined,
      scheduledEnd: formData.scheduledEnd ? new Date(formData.scheduledEnd).toISOString() : undefined,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const startEdit = (announcement: SystemAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      severity: announcement.severity,
      targetRoles: announcement.targetRoles || ['all'],
      requiresAcknowledgment: announcement.requiresAcknowledgment,
      scheduledStart: announcement.scheduledStart ? new Date(announcement.scheduledStart).toISOString().slice(0, 16) : '',
      scheduledEnd: announcement.scheduledEnd ? new Date(announcement.scheduledEnd).toISOString().slice(0, 16) : '',
    });
    setShowCreateDialog(true);
  };

  const activeAnnouncements = announcements.filter((a: SystemAnnouncement) => a.isActive);
  const scheduledAnnouncements = announcements.filter((a: SystemAnnouncement) => 
    a.scheduledStart && new Date(a.scheduledStart) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Status & Announcements</h2>
          <p className="text-gray-600">Manage platform-wide notifications and monitor user acknowledgments</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingAnnouncement(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </DialogTitle>
              <DialogDescription>
                Create platform-wide announcements for maintenance, updates, or important information.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="targetRoles">Target Roles</Label>
                  <Select 
                    value={formData.targetRoles[0]} 
                    onValueChange={(value) => setFormData({ ...formData, targetRoles: [value] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {role === 'all' ? 'All Users' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Announcement message"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledStart">Scheduled Start (Optional)</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledEnd">Scheduled End (Optional)</Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    value={formData.scheduledEnd}
                    onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresAcknowledgment"
                  checked={formData.requiresAcknowledgment}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresAcknowledgment: checked })}
                />
                <Label htmlFor="requiresAcknowledgment">Requires user acknowledgment</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAnnouncements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{scheduledAnnouncements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {announcements.filter((a: SystemAnnouncement) => a.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Management */}
      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Announcements</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Announcements</CardTitle>
              <CardDescription>
                Manage all system announcements and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No announcements created yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement: SystemAnnouncement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{announcement.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            announcement.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            announcement.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            announcement.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {announcement.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={announcement.isActive ? "default" : "secondary"}>
                            {announcement.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {announcement.targetRoles?.includes('all') ? 'All Users' : announcement.targetRoles?.join(', ')}
                        </TableCell>
                        <TableCell>
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Analytics"
                              onClick={() => setSelectedAnnouncementStats(announcement.id)}
                              >
                              <BarChart className="h-4 w-4 cursor-pointer" />
                            </Button>
                            <Button
                              variant="outline"
                              title="Edit"
                              size="sm"
                              onClick={() => startEdit(announcement)}
                              >
                              <Edit2 className="h-4 w-4 cursor-pointer" />
                            </Button>
                            <Button
                              variant="outline"
                              title="Delete"
                              size="sm"
                              onClick={() => deleteMutation.mutate(announcement.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 cursor-pointer" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Preview how announcements appear to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeAnnouncements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active announcements to preview
                </div>
              ) : (
                activeAnnouncements.map((announcement: SystemAnnouncement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    showAcknowledgeButton={false}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {selectedAnnouncementStats && announcementStats ? (
            <Card>
              <CardHeader>
                <CardTitle>Announcement Analytics</CardTitle>
                <CardDescription>
                  Acknowledgment statistics and user engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{announcementStats?.totalUsers || 0}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{announcementStats?.acknowledgedCount || 0}</div>
                    <div className="text-sm text-gray-600">Acknowledged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{announcementStats?.acknowledgmentRate || 0}%</div>
                    <div className="text-sm text-gray-600">Acknowledgment Rate</div>
                  </div>
                </div>

                {announcementStats?.userBreakdown && announcementStats.userBreakdown.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Acknowledgment by Role</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Total Users</TableHead>
                          <TableHead>Acknowledged</TableHead>
                          <TableHead>Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {announcementStats.userBreakdown.map((breakdown) => (
                          <TableRow key={breakdown.role}>
                            <TableCell className="font-medium">{breakdown.role}</TableCell>
                            <TableCell>{breakdown.total}</TableCell>
                            <TableCell>{breakdown.acknowledged}</TableCell>
                            <TableCell>
                              {breakdown.total > 0 ? Math.round((breakdown.acknowledged / breakdown.total) * 100) : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                Select an announcement from the management tab to view analytics
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}