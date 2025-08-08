import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  X,
  Paperclip,
  AlertCircle,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FILE_UPLOAD_CONFIG } from "@/lib/constants";

interface AttachmentFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

interface MessageAttachmentsProps {
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  compact?: boolean;
  existingTicketAttachments?: number; // Count of attachments already in the ticket
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return FileImage;
  if (file.type.includes('pdf')) return FileText;
  if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) return FileSpreadsheet;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function MessageAttachments({ 
  onFilesChange, 
  disabled = false, 
  maxFiles = 3,
  compact = false,
  existingTicketAttachments = 0
}: MessageAttachmentsProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const reasons = rejectedFiles.map(f => f.errors.map((e: any) => e.message).join(', ')).join('; ');
      toast({
        title: "Some files were rejected",
        description: reasons,
        variant: "destructive",
      });
    }

    // Check total file count per ticket (existing + current + new)
    const totalTicketAttachments = existingTicketAttachments + attachments.length + acceptedFiles.length;
    if (totalTicketAttachments > maxFiles) {
      const remaining = maxFiles - existingTicketAttachments - attachments.length;
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} attachments allowed per ticket. You have ${existingTicketAttachments} existing attachment(s) and can add ${Math.max(0, remaining)} more.`,
        variant: "destructive",
      });
      return;
    }

    // Process accepted files
    const newAttachments: AttachmentFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    const updatedAttachments = [...attachments, ...newAttachments];
    setAttachments(updatedAttachments);
    
    // Pass valid files to parent
    const validFiles = updatedAttachments
      .filter(att => att.status !== 'error')
      .map(att => att.file);
    onFilesChange(validFiles);
  }, [attachments, maxFiles, onFilesChange, toast]);

  const removeAttachment = (id: string) => {
    const updatedAttachments = attachments.filter(att => att.id !== id);
    setAttachments(updatedAttachments);
    
    const validFiles = updatedAttachments
      .filter(att => att.status !== 'error')
      .map(att => att.file);
    onFilesChange(validFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: FILE_UPLOAD_CONFIG.maxFileSize,
    multiple: true,
  });

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Compact Upload Button */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed border-gray-200 rounded-md p-2 
            transition-colors cursor-pointer hover:border-gray-300
            ${isDragActive ? 'border-blue-400 bg-blue-50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Paperclip className="h-4 w-4" />
            <span>
              {isDragActive ? 'Drop files here...' : 'Attach files (optional)'}
            </span>
            <Badge variant="outline" className="text-xs">
              {existingTicketAttachments + attachments.length}/{maxFiles}
            </Badge>
          </div>
        </div>

        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="space-y-1">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.file);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-md text-sm"
                >
                  <FileIcon className="h-4 w-4 text-gray-500" />
                  <span className="flex-1 truncate">{attachment.file.name}</span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(attachment.file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed border-gray-200 rounded-lg p-6 
          transition-colors cursor-pointer hover:border-gray-300
          ${isDragActive ? 'border-blue-400 bg-blue-50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOC, XLS, CSV, JPG, PNG (max {formatFileSize(FILE_UPLOAD_CONFIG.maxFileSize)})
          </p>
          <Badge variant="outline" className="mt-2">
            {existingTicketAttachments + attachments.length}/{maxFiles} files attached to ticket
          </Badge>
        </div>
      </div>

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Attached Files:</p>
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file);
            return (
              <Card key={attachment.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {attachment.status === 'success' && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {attachment.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {attachment.status === 'uploading' && (
                    <Progress value={attachment.progress} className="mt-2" />
                  )}
                  {attachment.error && (
                    <p className="text-xs text-red-500 mt-1">{attachment.error}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}