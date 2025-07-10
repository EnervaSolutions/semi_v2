import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUpload } from "@/components/DocumentUpload";
import { 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Globe, 
  Building,
  Search,
  Filter,
  X,
  CalendarDays,
  ArrowUpDown
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Documents() {
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const { toast } = useToast();

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/documents/templates'],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications'],
  });

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    
    let filtered = documents.filter((doc: any) => {
      // Search by filename (if no search query, include all)
      const matchesSearch = !searchQuery || doc.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by file type (based on mime type)
      const matchesFileType = fileTypeFilter === "all" || 
        (fileTypeFilter === "pdf" && doc.mimeType?.includes("pdf")) ||
        (fileTypeFilter === "excel" && (doc.mimeType?.includes("spreadsheet") || doc.mimeType?.includes("excel"))) ||
        (fileTypeFilter === "word" && (doc.mimeType?.includes("document") || doc.mimeType?.includes("word"))) ||
        (fileTypeFilter === "other" && !doc.mimeType?.includes("pdf") && !doc.mimeType?.includes("spreadsheet") && !doc.mimeType?.includes("excel") && !doc.mimeType?.includes("document") && !doc.mimeType?.includes("word"));
      
      // Filter by document type
      const matchesDocumentType = documentTypeFilter === "all" || doc.documentType === documentTypeFilter;
      
      return matchesSearch && matchesFileType && matchesDocumentType;
    });

    // Sort documents
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name_asc":
          return a.originalName?.localeCompare(b.originalName) || 0;
        case "name_desc":
          return b.originalName?.localeCompare(a.originalName) || 0;
        case "size_desc":
          return (b.size || 0) - (a.size || 0);
        case "size_asc":
          return (a.size || 0) - (b.size || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchQuery, fileTypeFilter, documentTypeFilter, sortBy]);

  // Get unique file types and document types for filter options
  const fileTypes = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    const types = new Set();
    documents.forEach((doc: any) => {
      if (doc.mimeType?.includes("pdf")) types.add("pdf");
      else if (doc.mimeType?.includes("spreadsheet") || doc.mimeType?.includes("excel")) types.add("excel");
      else if (doc.mimeType?.includes("document") || doc.mimeType?.includes("word")) types.add("word");
      else types.add("other");
    });
    return Array.from(types);
  }, [documents]);

  const documentTypes = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    const types = new Set(documents.map((doc: any) => doc.documentType).filter(Boolean));
    return Array.from(types);
  }, [documents]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFileTypeFilter("all");
    setDocumentTypeFilter("all");
    setSortBy("date_desc");
  };

  const hasActiveFilters = searchQuery || fileTypeFilter !== "all" || documentTypeFilter !== "all" || sortBy !== "date_desc";

  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download successful",
        description: `${filename} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the file.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await apiRequest(`/api/documents/${documentId}`, 'DELETE');
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      // Invalidate queries to refresh the documents list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    } catch (error) {
      console.error('Delete document error:', error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the document.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600">
            Upload, organize, and manage all your application documents.
          </p>
        </div>
        <Button 
          onClick={() => setShowDocumentUpload(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Quick Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => setShowDocumentUpload(true)}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Drop files here</p>
                <p className="text-xs text-gray-400">or click to browse</p>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>Supported formats:</p>
                <p>PDF, DOC, DOCX, XLS, XLSX, CSV</p>
                <p>Max size: 10MB per file</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Repository */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Repository ({filteredAndSortedDocuments.length} of {documents.length || 0})</CardTitle>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Search and Filter Controls */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search documents by filename..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* File Type Filter */}
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-full lg:w-[150px]">
                      <SelectValue placeholder="File Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="word">Word</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Document Type Filter */}
                  <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger className="w-full lg:w-[150px]">
                      <SelectValue placeholder="Doc Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {documentTypes.map((type: any) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort By */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full lg:w-[150px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Newest First</SelectItem>
                      <SelectItem value="date_asc">Oldest First</SelectItem>
                      <SelectItem value="name_asc">Name A-Z</SelectItem>
                      <SelectItem value="name_desc">Name Z-A</SelectItem>
                      <SelectItem value="size_desc">Largest First</SelectItem>
                      <SelectItem value="size_asc">Smallest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  {documentsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading documents...</p>
                    </div>
                  ) : filteredAndSortedDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAndSortedDocuments.map((document: any) => (
                        <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(document.mimeType)}
                            <div>
                              <p className="font-medium text-gray-900">{document.originalName}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{formatFileSize(document.size)}</span>
                                <span>•</span>
                                <Badge variant="outline">{document.documentType}</Badge>
                                {document.applicationId && (
                                  <>
                                    <span>•</span>
                                    <span>Application #{document.applicationId}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document.id, document.originalName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(document.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No documents uploaded yet</p>
                      <p className="text-sm text-gray-400">Upload your first document to get started</p>
                    </div>
                  )}
                </TabsContent>


              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <DocumentUpload onClose={() => setShowDocumentUpload(false)} />
      )}
    </div>
  );
}

// Component for displaying documents for each application
function ApplicationDocuments({ 
  application, 
  onDownload, 
  onDelete, 
  getFileIcon, 
  formatFileSize 
}: any) {
  const { data: documents = [] } = useQuery({
    queryKey: [`/api/documents/application/${application.id}`],
  });

  const preActivityDocs = documents.filter((doc: any) => doc.documentType === 'pre_activity');
  const postActivityDocs = documents.filter((doc: any) => doc.documentType === 'post_activity');
  const otherDocs = documents.filter((doc: any) => !['pre_activity', 'post_activity'].includes(doc.documentType));

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">{application.applicationId}</h4>
          <p className="text-sm text-gray-500">{application.title}</p>
        </div>
        <Badge 
          variant="outline"
          className={
            application.activityType === 'FRA' ? 'border-blue-200 text-blue-800' :
            application.activityType === 'SEM' ? 'border-purple-200 text-purple-800' :
            application.activityType === 'EMIS' ? 'border-indigo-200 text-indigo-800' :
            'border-green-200 text-green-800'
          }
        >
          {application.activityType}
        </Badge>
      </div>

      {documents.length > 0 ? (
        <Tabs defaultValue="pre-activity">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pre-activity">
              Pre-Activity ({preActivityDocs.length})
            </TabsTrigger>
            <TabsTrigger value="post-activity">
              Post-Activity ({postActivityDocs.length})
            </TabsTrigger>
            <TabsTrigger value="other">
              Other ({otherDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pre-activity" className="mt-4">
            <DocumentList 
              documents={preActivityDocs}
              onDownload={onDownload}
              onDelete={onDelete}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
            />
          </TabsContent>

          <TabsContent value="post-activity" className="mt-4">
            {application.status === 'approved' ? (
              <DocumentList 
                documents={postActivityDocs}
                onDownload={onDownload}
                onDelete={onDelete}
                getFileIcon={getFileIcon}
                formatFileSize={formatFileSize}
              />
            ) : (
              <div className="text-center py-8">
                <Building className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Available after pre-activity approval</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="other" className="mt-4">
            <DocumentList 
              documents={otherDocs}
              onDownload={onDownload}
              onDelete={onDelete}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No documents uploaded</p>
        </div>
      )}
    </div>
  );
}

// Component for displaying a list of documents
function DocumentList({ documents, onDownload, onDelete, getFileIcon, formatFileSize }: any) {
  return (
    <div className="space-y-2">
      {documents.map((document: any) => (
        <div 
          key={document.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(document.mimeType)}
            <div>
              <p className="font-medium text-gray-900">{document.originalName}</p>
              <p className="text-xs text-gray-500">
                {formatFileSize(document.size)} • Uploaded by {document.uploadedBy}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(document.id, document.originalName)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(document.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
