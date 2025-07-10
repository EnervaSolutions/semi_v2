import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  File, 
  FileText, 
  FileSpreadsheet, 
  X, 
  Check,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { queryClient } from "@/lib/queryClient";
import { FILE_UPLOAD_CONFIG, DOCUMENT_TYPES } from "@/lib/constants";

interface DocumentUploadProps {
  onClose: () => void;
  applicationId?: number;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function DocumentUpload({ onClose, applicationId }: DocumentUploadProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState("other");
  const [selectedApplication, setSelectedApplication] = useState(applicationId?.toString() || "");

  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications'],
    enabled: !applicationId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "All documents have been uploaded successfully.",
      });
      // Force refresh the documents list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.refetchQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload documents.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file: file,
      progress: 0,
      status: 'pending',
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: FILE_UPLOAD_CONFIG.maxFileSize,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(rejection => {
        toast({
          title: "File rejected",
          description: `${rejection.file.name}: ${rejection.errors[0]?.message}`,
          variant: "destructive",
        });
      });
    },
  });

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (file: File) => {
    const fileType = file.type || '';
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!documentType) {
      toast({
        title: "Document type required",
        description: "Please select a document type.",
        variant: "destructive",
      });
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    selectedFiles.forEach((uploadFile, index) => {
      // Extract the original File object from our UploadFile wrapper
      const file = uploadFile.file || uploadFile;
      if (file && typeof file === 'object' && file.constructor && file.constructor.name === 'File') {
        formData.append('files', file);
      }
    });
    
    // Only include applicationId if it's a valid number (not "general")
    if (selectedApplication && selectedApplication !== "general") {
      formData.append('applicationId', selectedApplication);
    }
    formData.append('documentType', documentType);

    uploadMutation.mutate(formData);
  };

  const canUpload = selectedFiles.length > 0 && documentType && !uploadMutation.isPending;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Upload</DialogTitle>
          <DialogDescription>
            Upload documents for your applications. Supported formats: PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG (Max 10MB each).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop files here' : 'Upload Documents'}
                </h3>
                <p className="text-gray-500">
                  {isDragActive 
                    ? 'Release to upload files' 
                    : 'Drag and drop files here, or click to browse'
                  }
                </p>
              </div>
              <Button variant="outline" type="button">
                Browse Files
              </Button>
            </div>
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Selected Files ({selectedFiles.length})</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                  disabled={uploadMutation.isPending}
                >
                  Clear All
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.file)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{file.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {file.status === 'success' && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {file.status === 'uploading' && (
                        <div className="w-8">
                          <Progress value={file.progress} className="h-2" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={uploadMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Type */}
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Application (if not pre-selected) */}
            {!applicationId && (
              <div>
                <Label htmlFor="application">Application (Optional)</Label>
                <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Upload</SelectItem>
                    {applications.map((app: any) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        {app.applicationId} - {app.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Upload Summary */}
          {selectedFiles.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <File className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Upload Summary</h4>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <p>{selectedFiles.length} file(s) selected</p>
                <p>Document type: {DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES]?.label}</p>
                {selectedApplication && (
                  <p>Application: {applications.find((app: any) => app.id.toString() === selectedApplication)?.applicationId}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!canUpload}
              className="flex-1"
            >
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentUpload;
