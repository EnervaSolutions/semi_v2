import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Award, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Building2, 
  Trophy, 
  Image as ImageIcon,
  Save,
  X,
  ExternalLink,
  Eye
} from "lucide-react";

interface Company {
  id: number;
  name: string;
  shortName: string;
  isContractor: boolean;
}

interface BadgeData {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  imageFile?: string;
  createdAt: string;
  createdBy: string;
}

interface CompanyBadge {
  id: number;
  badgeId: number;
  companyId: number;
  awardedDate: string;
  awardNote?: string;
  displayOrder: number;
  badge: BadgeData;
}

interface ContentData {
  id: number;
  companyId: number;
  contentType: 'header' | 'content' | 'image';
  title?: string;
  content?: string;
  imageUrl?: string;
  imageFile?: string;
  imageSize?: 'small' | 'medium' | 'large';
  displayOrder: number;
  createdAt: string;
}

interface RecognitionPageSettings {
  id?: number;
  companyId: number;
  isEnabled: boolean;
  pageTitle?: string;
  welcomeMessage?: string;
  badgesSectionTitle?: string;
  contentSectionTitle?: string;
}

export default function AdminRecognitionPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("badges");
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);
  const [editingContent, setEditingContent] = useState<ContentData | null>(null);
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    isEnabled: false,
    pageTitle: '',
    welcomeMessage: '',
    badgesSectionTitle: '',
    contentSectionTitle: '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch companies (excluding contractors)
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/admin/companies"],
    select: (data: Company[]) => data.filter(company => !company.isContractor),
  });

  // Fetch all badges
  const { data: allBadges = [] } = useQuery({
    queryKey: ["/api/admin/recognition/badges"],
  });

  // Fetch company-specific data
  const { data: companyBadges = [], refetch: refetchCompanyBadges } = useQuery({
    queryKey: [`/api/admin/recognition/company-badges/${selectedCompanyId}`, selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  const { data: companyContent = [], refetch: refetchCompanyContent } = useQuery({
    queryKey: [`/api/admin/recognition/content/${selectedCompanyId}`, selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  const { data: recognitionSettings, refetch: refetchSettings } = useQuery({
    queryKey: [`/api/admin/recognition/settings/${selectedCompanyId}`, selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  // Fetch preview data for selected company
  const { data: previewData, refetch: refetchPreviewData } = useQuery({
    queryKey: [`/api/admin/recognition/page/${selectedCompanyId}`, selectedCompanyId],
    enabled: !!selectedCompanyId && previewDialogOpen,
  });

  // Create badge mutation
  const createBadgeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/admin/recognition/badges", "POST", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recognition/badges"] });
      setBadgeDialogOpen(false);
      setEditingBadge(null);
      toast({ title: "Badge created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create badge", variant: "destructive" });
    },
  });

  // Update badge mutation
  const updateBadgeMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      return apiRequest(`/api/admin/recognition/badges/${id}`, "PATCH", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recognition/badges"] });
      setBadgeDialogOpen(false);
      setEditingBadge(null);
      toast({ title: "Badge updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update badge", variant: "destructive" });
    },
  });

  // Delete badge mutation
  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/recognition/badges/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recognition/badges"] });
      toast({ title: "Badge deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete badge", variant: "destructive" });
    },
  });

  // Create content mutation
  const createContentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/admin/recognition/content", "POST", formData);
    },
    onSuccess: () => {
      refetchCompanyContent();
      setContentDialogOpen(false);
      setEditingContent(null);
      toast({ title: "Content created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create content", variant: "destructive" });
    },
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      return apiRequest(`/api/admin/recognition/content/${id}`, "PATCH", formData);
    },
    onSuccess: () => {
      refetchCompanyContent();
      setContentDialogOpen(false);
      setEditingContent(null);
      toast({ title: "Content updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update content", variant: "destructive" });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/recognition/content/${id}`, "DELETE");
    },
    onSuccess: () => {
      refetchCompanyContent();
      toast({ title: "Content deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete content", variant: "destructive" });
    },
  });

  // Assign badge to company mutation
  const assignBadgeMutation = useMutation({
    mutationFn: async (data: { companyId: number; badgeId: number; awardNote?: string; displayOrder?: number }) => {
      return apiRequest("/api/admin/recognition/company-badges", "POST", data);
    },
    onSuccess: () => {
      refetchCompanyBadges();
      toast({ title: "Badge assigned to company successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign badge", variant: "destructive" });
    },
  });

  // Remove badge from company mutation
  const removeBadgeMutation = useMutation({
    mutationFn: async ({ companyId, badgeId }: { companyId: number; badgeId: number }) => {
      return apiRequest(`/api/admin/recognition/company-badges/${companyId}/${badgeId}`, "DELETE");
    },
    onSuccess: () => {
      refetchCompanyBadges();
      toast({ title: "Badge removed from company successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove badge", variant: "destructive" });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: RecognitionPageSettings) => {
      return apiRequest("/api/admin/recognition/settings", "POST", data);
    },
    onSuccess: () => {
      refetchSettings();
      setSettingsDialogOpen(false);
      toast({ title: "Settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Sync settings form when recognition settings change
  useEffect(() => {
    if (recognitionSettings) {
      setSettingsForm({
        isEnabled: recognitionSettings.isEnabled || false,
        pageTitle: recognitionSettings.pageTitle || '',
        welcomeMessage: recognitionSettings.welcomeMessage || '',
        badgesSectionTitle: recognitionSettings.badgesSectionTitle || '',
        contentSectionTitle: recognitionSettings.contentSectionTitle || '',
      });
    }
  }, [recognitionSettings]);

  const handleBadgeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (editingBadge) {
      updateBadgeMutation.mutate({ id: editingBadge.id, formData });
    } else {
      createBadgeMutation.mutate(formData);
    }
  };

  const handleContentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (selectedCompanyId) {
      formData.append('companyId', selectedCompanyId.toString());
      formData.append('displayOrder', companyContent.length.toString());
    }
    
    if (editingContent) {
      updateContentMutation.mutate({ id: editingContent.id, formData });
    } else {
      createContentMutation.mutate(formData);
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const settings: RecognitionPageSettings = {
      companyId: selectedCompanyId!,
      isEnabled: settingsForm.isEnabled,
      pageTitle: settingsForm.pageTitle,
      welcomeMessage: settingsForm.welcomeMessage,
      badgesSectionTitle: settingsForm.badgesSectionTitle,
      contentSectionTitle: settingsForm.contentSectionTitle,
    };
    
    console.log("Settings submission - Form state:", settingsForm);
    console.log("Settings submission - Final settings:", settings);
    
    updateSettingsMutation.mutate(settings);
  };

  const handleAssignBadge = (badgeId: number, awardNote: string) => {
    if (selectedCompanyId) {
      assignBadgeMutation.mutate({
        companyId: selectedCompanyId,
        badgeId,
        awardNote,
        displayOrder: companyBadges.length,
      });
    }
  };

  const getImageUrl = (imageFile?: string, imageUrl?: string) => {
    if (imageFile) {
      return `/uploads/${imageFile}`;
    }
    return imageUrl || '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Recognition Management
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage company recognition pages with badges and content
            </p>
          </div>
          <div className="flex items-center gap-4">
            {selectedCompany && (
              <Button
                onClick={() => {
                  setPreviewDialogOpen(true);
                  // Refresh all data when preview is opened
                  refetchCompanyBadges();
                  refetchCompanyContent();
                  refetchSettings();
                  refetchPreviewData();
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview Page
              </Button>
            )}
          </div>
        </div>

        {/* Company Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Select Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select
                value={selectedCompanyId?.toString() || ""}
                onValueChange={(value) => setSelectedCompanyId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a company to manage recognition for..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} ({company.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {selectedCompanyId && selectedCompany && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  Recognition Page for {selectedCompany.name}
                </CardTitle>
                <Button
                  onClick={() => setSettingsDialogOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  Page Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="badges">Company Badges</TabsTrigger>
                  <TabsTrigger value="content">Page Content</TabsTrigger>
                  <TabsTrigger value="library">Badge Library</TabsTrigger>
                </TabsList>

                {/* Company Badges Tab */}
                <TabsContent value="badges" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Assigned Badges</h3>
                    <p className="text-sm text-gray-600">
                      {companyBadges.length} badge(s) assigned
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companyBadges.map((companyBadge) => (
                      <Card key={companyBadge.id} className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            {getImageUrl(companyBadge.badge.imageFile, companyBadge.badge.imageUrl) ? (
                              <img
                                src={getImageUrl(companyBadge.badge.imageFile, companyBadge.badge.imageUrl)}
                                alt={companyBadge.badge.name}
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <Award className="w-16 h-16 text-yellow-500" />
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeBadgeMutation.mutate({
                                companyId: selectedCompanyId,
                                badgeId: companyBadge.badgeId
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {companyBadge.badge.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {companyBadge.badge.description}
                          </p>
                          {companyBadge.awardNote && (
                            <p className="text-xs text-blue-600 italic">
                              "{companyBadge.awardNote}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Awarded: {new Date(companyBadge.awardedDate).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {companyBadges.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No badges assigned to this company yet.</p>
                      <p className="text-sm">Go to Badge Library to assign badges.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Page Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Page Content Sections</h3>
                    <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Content
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingContent ? "Edit Content" : "Add Content Section"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleContentSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="contentType">Content Type</Label>
                            <Select
                              name="contentType"
                              defaultValue={editingContent?.contentType || "header"}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="content">Text Content</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="title">Title (Optional)</Label>
                            <Input
                              id="title"
                              name="title"
                              defaultValue={editingContent?.title || ""}
                              placeholder="Section title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                              id="content"
                              name="content"
                              defaultValue={editingContent?.content || ""}
                              placeholder="Content text"
                              rows={4}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="image">Image</Label>
                            <Input
                              id="image"
                              name="image"
                              type="file"
                              accept="image/*"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imageUrl">Or Image URL</Label>
                            <Input
                              id="imageUrl"
                              name="imageUrl"
                              defaultValue={editingContent?.imageUrl || ""}
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imageSize">Image Size</Label>
                            <Select
                              name="imageSize"
                              defaultValue={editingContent?.imageSize || "medium"}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setContentDialogOpen(false);
                                setEditingContent(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createContentMutation.isPending || updateContentMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {editingContent ? "Update" : "Create"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-4">
                    {companyContent.map((content) => (
                      <Card key={content.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {content.contentType}
                                </Badge>
                                {content.title && (
                                  <h4 className="font-semibold">{content.title}</h4>
                                )}
                              </div>
                              {content.content && (
                                <p className="text-gray-600 text-sm mb-2">{content.content}</p>
                              )}
                              {getImageUrl(content.imageFile, content.imageUrl) && (
                                <img
                                  src={getImageUrl(content.imageFile, content.imageUrl)}
                                  alt={content.title || "Content image"}
                                  className={`rounded mb-2 ${
                                    content.imageSize === 'small' ? 'w-32' :
                                    content.imageSize === 'large' ? 'w-96' : 'w-64'
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingContent(content);
                                  setContentDialogOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteContentMutation.mutate(content.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {companyContent.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No content sections created yet.</p>
                      <p className="text-sm">Add headers, text, and images to build the recognition page.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Badge Library Tab */}
                <TabsContent value="library" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Badge Library</h3>
                    <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Badge
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingBadge ? "Edit Badge" : "Create Badge"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleBadgeSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Badge Name</Label>
                            <Input
                              id="name"
                              name="name"
                              defaultValue={editingBadge?.name || ""}
                              placeholder="Energy Efficiency Champion"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              name="description"
                              defaultValue={editingBadge?.description || ""}
                              placeholder="Description of the achievement"
                              rows={3}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="image">Badge Image</Label>
                            <Input
                              id="image"
                              name="image"
                              type="file"
                              accept="image/*"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="imageUrl">Or Image URL</Label>
                            <Input
                              id="imageUrl"
                              name="imageUrl"
                              defaultValue={editingBadge?.imageUrl || ""}
                              placeholder="https://example.com/badge.png"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setBadgeDialogOpen(false);
                                setEditingBadge(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createBadgeMutation.isPending || updateBadgeMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {editingBadge ? "Update" : "Create"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allBadges.map((badge: BadgeData) => (
                      <Card key={badge.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            {getImageUrl(badge.imageFile, badge.imageUrl) ? (
                              <img
                                src={getImageUrl(badge.imageFile, badge.imageUrl)}
                                alt={badge.name}
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <Award className="w-16 h-16 text-yellow-500" />
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingBadge(badge);
                                  setBadgeDialogOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteBadgeMutation.mutate(badge.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{badge.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{badge.description}</p>
                          
                          {selectedCompanyId && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Award note (optional)"
                                  className="flex-1 text-xs"
                                  id={`award-note-${badge.id}`}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const noteInput = document.getElementById(`award-note-${badge.id}`) as HTMLInputElement;
                                    handleAssignBadge(badge.id, noteInput.value);
                                    noteInput.value = '';
                                  }}
                                  disabled={companyBadges.some(cb => cb.badgeId === badge.id)}
                                >
                                  {companyBadges.some(cb => cb.badgeId === badge.id) ? 'Assigned' : 'Assign'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {allBadges.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No badges created yet.</p>
                      <p className="text-sm">Create your first badge to get started.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Page Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recognition Page Settings</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isEnabled"
                  name="isEnabled"
                  checked={settingsForm.isEnabled}
                  onCheckedChange={(checked) => 
                    setSettingsForm(prev => ({ ...prev, isEnabled: checked }))
                  }
                />
                <Label htmlFor="isEnabled">Enable Recognition Page</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageTitle">Page Title</Label>
                <Input
                  id="pageTitle"
                  name="pageTitle"
                  value={settingsForm.pageTitle}
                  onChange={(e) => 
                    setSettingsForm(prev => ({ ...prev, pageTitle: e.target.value }))
                  }
                  placeholder="Our Recognition & Achievements"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  name="welcomeMessage"
                  value={settingsForm.welcomeMessage}
                  onChange={(e) => 
                    setSettingsForm(prev => ({ ...prev, welcomeMessage: e.target.value }))
                  }
                  placeholder="We are proud to showcase our achievements..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badgesSectionTitle">Badges Section Title</Label>
                <Input
                  id="badgesSectionTitle"
                  name="badgesSectionTitle"
                  value={settingsForm.badgesSectionTitle}
                  onChange={(e) => 
                    setSettingsForm(prev => ({ ...prev, badgesSectionTitle: e.target.value }))
                  }
                  placeholder="Our Badges"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentSectionTitle">Content Section Title</Label>
                <Input
                  id="contentSectionTitle"
                  name="contentSectionTitle"
                  value={settingsForm.contentSectionTitle}
                  onChange={(e) => 
                    setSettingsForm(prev => ({ ...prev, contentSectionTitle: e.target.value }))
                  }
                  placeholder="Our Story"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Recognition Page Preview - {selectedCompany?.name}
              </DialogTitle>
            </DialogHeader>
            
            {previewData && (
              <div className="space-y-6 p-6 bg-white rounded-lg border">
                {/* Preview Header */}
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {previewData.settings?.pageTitle || "Our Recognition & Achievements"}
                  </h1>
                  {previewData.settings?.welcomeMessage && (
                    <p className="text-lg text-gray-600">
                      {previewData.settings.welcomeMessage}
                    </p>
                  )}
                </div>

                {/* Preview Badges */}
                {previewData.badges && previewData.badges.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                      {previewData.settings?.badgesSectionTitle || "Our Badges"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {previewData.badges.map((companyBadge: any) => (
                        <div key={companyBadge.id} className="text-center p-4 border rounded-lg">
                          {getImageUrl(companyBadge.badge?.imageFile, companyBadge.badge?.imageUrl) ? (
                            <img
                              src={getImageUrl(companyBadge.badge?.imageFile, companyBadge.badge?.imageUrl)}
                              alt={companyBadge.badge?.name}
                              className="w-20 h-20 mx-auto object-contain mb-3"
                            />
                          ) : (
                            <Award className="w-20 h-20 mx-auto text-yellow-500 mb-3" />
                          )}
                          <h3 className="font-semibold text-gray-900">{companyBadge.badge?.name || 'Badge Name'}</h3>
                          <p className="text-sm text-gray-600">{companyBadge.badge?.description || 'Badge Description'}</p>
                          {companyBadge.awardNote && (
                            <p className="text-xs text-blue-600 italic mt-2">"{companyBadge.awardNote}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Content */}
                {previewData.content && previewData.content.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                      {previewData.settings?.contentSectionTitle || "Our Story"}
                    </h2>
                    <div className="space-y-4">
                      {previewData.content.map((content: any) => (
                        <div key={content.id}>
                          {content.contentType === 'header' && (
                            <h3 className="text-xl font-semibold text-gray-900">
                              {content.title}
                            </h3>
                          )}
                          {content.content && (
                            <p className="text-gray-600">{content.content}</p>
                          )}
                          {getImageUrl(content.imageFile, content.imageUrl) && (
                            <img
                              src={getImageUrl(content.imageFile, content.imageUrl)}
                              alt={content.title || "Content image"}
                              className={`rounded ${
                                content.imageSize === 'small' ? 'w-48' :
                                content.imageSize === 'large' ? 'w-full' : 'w-80'
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}