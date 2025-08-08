import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class SupabaseStorageService {
  private bucketName = 'user-uploads';

  // Ensure bucket exists
  async ensureBucketExists() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false, // Files are private by default
          allowedMimeTypes: [
            'image/*',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'text/plain'
          ],
          fileSizeLimit: 10 * 1024 * 1024 // 10MB limit
        });
        
        if (error) {
          console.error('Error creating bucket:', error);
          throw error;
        }
        
        console.log(`[STORAGE] Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  }

  // Upload file to Supabase storage
  async uploadFile(file: Express.Multer.File, folderPath = ''): Promise<{ filePath: string; publicUrl: string }> {
    try {
      await this.ensureBucketExists();
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const uniqueFilename = `${file.fieldname}-${timestamp}-${random}${extension}`;
      
      // Construct full path within bucket
      const fullPath = folderPath ? `${folderPath}/${uniqueFilename}` : uniqueFilename;
      
      console.log(`[SUPABASE STORAGE] Uploading file: ${fullPath}`);
      
      // Upload file buffer to Supabase
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fullPath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('[SUPABASE STORAGE] Upload error:', error);
        throw error;
      }
      
      // Get public URL (signed URL for private buckets)
      const { data: urlData } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fullPath, 60 * 60 * 24 * 365); // 1 year expiry
      
      console.log(`[SUPABASE STORAGE] File uploaded successfully: ${fullPath}`);
      
      return {
        filePath: fullPath,
        publicUrl: urlData?.signedUrl || ''
      };
      
    } catch (error) {
      console.error('[SUPABASE STORAGE] Upload failed:', error);
      throw error;
    }
  }

  // Download file from Supabase storage
  async downloadFile(filePath: string): Promise<{ data: Blob; contentType?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);
      
      if (error) {
        console.error('[SUPABASE STORAGE] Download error:', error);
        throw error;
      }
      
      return { data };
      
    } catch (error) {
      console.error('[SUPABASE STORAGE] Download failed:', error);
      throw error;
    }
  }

  // Get signed URL for file (for previews and downloads)
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        console.error('[SUPABASE STORAGE] Signed URL error:', error);
        throw error;
      }
      
      return data.signedUrl;
      
    } catch (error) {
      console.error('[SUPABASE STORAGE] Failed to get signed URL:', error);
      throw error;
    }
  }

  // Delete file from Supabase storage
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
      
      if (error) {
        console.error('[SUPABASE STORAGE] Delete error:', error);
        throw error;
      }
      
      console.log(`[SUPABASE STORAGE] File deleted: ${filePath}`);
      
    } catch (error) {
      console.error('[SUPABASE STORAGE] Delete failed:', error);
      throw error;
    }
  }
}

export const storageService = new SupabaseStorageService();