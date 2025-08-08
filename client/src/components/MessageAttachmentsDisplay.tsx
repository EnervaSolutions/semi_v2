import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  Eye,
  Paperclip
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MessageAttachment {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  documentType: string;
  filePath: string;
  createdAt: string;
}

interface MessageAttachmentsDisplayProps {
  messageId: number;
  compact?: boolean;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function MessageAttachmentsDisplay({ 
  messageId, 
  compact = false 
}: MessageAttachmentsDisplayProps) {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());

  const { data: attachments = [], isLoading, error, refetch } = useQuery({
    queryKey: [`/api/messages/${messageId}/attachments`],
    enabled: !!messageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleDownload = async (attachment: MessageAttachment) => {
    setDownloadingFiles(prev => new Set(prev).add(attachment.id));
    
    try {
      const response = await apiRequest(`/api/documents/${attachment.id}/download`, "GET");
      
      // Create a blob URL and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachment.id);
        return newSet;
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <Paperclip className="h-3 w-3" />
        <span>Loading attachments...</span>
      </div>
    );
  }

  // Show error with retry option
  if (error) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
        <Paperclip className="h-3 w-3" />
        <span>Failed to load attachments</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-5 px-2 text-xs text-red-600 hover:text-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  // No attachments found - don't show anything
  if (attachments.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Paperclip className="h-3 w-3" />
          <span>{attachments.length} attachment{attachments.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mimeType);
            const isDownloading = downloadingFiles.has(attachment.id);
            const canPreview = true; // Show preview for all file types
            
            return (
              <div key={attachment.id} className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  disabled={isDownloading}
                  className="h-6 px-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-r-none"
                  title="Download file"
                >
                  <FileIcon className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-16">{attachment.originalName}</span>
                  {isDownloading ? (
                    <div className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <Download className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/api/documents/${attachment.id}/download?preview=true`, '_blank')}
                  className="h-6 px-1 text-xs bg-gray-100 hover:bg-gray-200 border-l border-gray-300 rounded-l-none"
                  title="Preview file"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Paperclip className="h-4 w-4" />
        <span className="font-medium">Attachments ({attachments.length})</span>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const FileIcon = getFileIcon(attachment.mimeType);
          const isDownloading = downloadingFiles.has(attachment.id);
          
          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-md border"
            >
              <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(attachment.size)}</span>
                  <Badge variant="outline" className="text-xs">
                    {attachment.documentType}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Open file in new tab for preview
                    window.open(`/api/documents/${attachment.id}/download?preview=true`, '_blank');
                  }}
                  className="h-8 w-8 p-0"
                  title="Preview file"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  disabled={isDownloading}
                  className="h-8 w-8 p-0"
                  title="Download file"
                >
                  {isDownloading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}