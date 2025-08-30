/**
 * Enhanced cover letter service for managing job application cover letters
 * Supports both file attachments and custom text cover letters
 */
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Key used to store cover letter status in AsyncStorage
const COVER_LETTER_STATUS_KEY = 'cover_letter_status';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf'];
const STORAGE_BUCKET = 'cover-letters';

// Types
export interface CoverLetterFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export interface CoverLetterAttachment {
  id: number;
  applicationId: number;
  userId: string;
  type: 'file' | 'text';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  customText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterUploadResult {
  success: boolean;
  data?: CoverLetterAttachment;
  error?: string;
}

export interface CoverLetterValidationResult {
  isValid: boolean;
  error?: string;
}

// Validation Functions

/**
 * Validate a cover letter file before upload
 */
export const validateCoverLetterFile = (file: CoverLetterFile): CoverLetterValidationResult => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimeType)) {
    return {
      isValid: false,
      error: `Only PDF files are allowed. Current type: ${file.mimeType}`
    };
  }

  return { isValid: true };
};

// File Upload Functions

/**
 * Upload a cover letter file to Supabase Storage
 */
export const uploadCoverLetterFile = async (
  file: CoverLetterFile,
  userId: string,
  applicationId: number
): Promise<CoverLetterUploadResult> => {
  try {
    // Validate file first
    const validation = validateCoverLetterFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${userId}/${applicationId}_${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // Save cover letter record to database
    const { data: functionData, error: functionError } = await supabase
      .rpc('upsert_file_cover_letter', {
        p_application_id: applicationId,
        p_user_id: userId,
        p_file_url: urlData.publicUrl,
        p_file_name: file.name,
        p_file_size: file.size
      });

    if (functionError) {
      console.error('Error saving cover letter record:', functionError);
      // Clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      return { success: false, error: functionError.message };
    }

    console.log('Successfully uploaded cover letter file:', functionData);
    return {
      success: true,
      data: {
        id: functionData.id,
        applicationId,
        userId,
        type: 'file',
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error in uploadCoverLetterFile:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Save a custom text cover letter
 */
export const saveCustomCoverLetter = async (
  customText: string,
  userId: string,
  applicationId: number
): Promise<CoverLetterUploadResult> => {
  try {
    if (!customText.trim()) {
      return { success: false, error: 'Cover letter text cannot be empty' };
    }

    // Save cover letter record to database
    const { data: functionData, error: functionError } = await supabase
      .rpc('upsert_text_cover_letter', {
        p_application_id: applicationId,
        p_user_id: userId,
        p_custom_text: customText.trim()
      });

    if (functionError) {
      console.error('Error saving custom cover letter:', functionError);
      return { success: false, error: functionError.message };
    }

    console.log('Successfully saved custom cover letter:', functionData);
    return {
      success: true,
      data: {
        id: functionData.id,
        applicationId,
        userId,
        type: 'text',
        customText: customText.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error in saveCustomCoverLetter:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Retrieval Functions

/**
 * Get cover letter attachment for a specific application
 */
export const getCoverLetterAttachment = async (
  applicationId: number,
  userId: string
): Promise<{ success: boolean; data?: CoverLetterAttachment; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching cover letter attachment:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true, data: undefined };
    }

    return {
      success: true,
      data: {
        id: data.id,
        applicationId: data.application_id,
        userId: data.user_id,
        type: data.type,
        fileUrl: data.file_url,
        fileName: data.file_name,
        fileSize: data.file_size,
        customText: data.custom_text,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    };
  } catch (error) {
    console.error('Error in getCoverLetterAttachment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete a cover letter attachment
 */
export const deleteCoverLetterAttachment = async (
  applicationId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First get the cover letter to check if it has a file
    const { data: coverLetter, error: fetchError } = await supabase
      .from('cover_letters')
      .select('file_url, type')
      .eq('application_id', applicationId)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching cover letter for deletion:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // If it's a file type, delete from storage
    if (coverLetter?.type === 'file' && coverLetter.file_url) {
      const fileName = coverLetter.file_url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([`${userId}/${fileName}`]);

        if (storageError) {
          console.warn('Error deleting file from storage:', storageError);
          // Continue with database deletion even if file deletion fails
        }
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('cover_letters')
      .delete()
      .eq('application_id', applicationId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting cover letter from database:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log('Successfully deleted cover letter attachment');
    return { success: true };

  } catch (error) {
    console.error('Error in deleteCoverLetterAttachment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Download a cover letter file
 */
export const downloadCoverLetterFile = async (
  fileUrl: string,
  fileName: string
): Promise<{ success: boolean; localUri?: string; error?: string }> => {
  try {
    const downloadDir = `${FileSystem.documentDirectory}cover-letters/`;

    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }

    const localUri = `${downloadDir}${fileName}`;

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);

    if (downloadResult.status === 200) {
      console.log('Successfully downloaded cover letter file to:', localUri);
      return { success: true, localUri };
    } else {
      return { success: false, error: `Download failed with status: ${downloadResult.status}` };
    }

  } catch (error) {
    console.error('Error downloading cover letter file:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Update or add a cover letter to an existing job application
 * @param applicationId - The ID of the job application (match)
 * @param userId - The user's ID
 * @param coverLetter - The cover letter content
 */
export const updateCoverLetter = async (
  jobId: string,
  userId: string,
  coverLetter: string
) => {
  try {
    console.log(`Updating cover letter for job ${jobId} for user ${userId}`);

    // Find the application in the matches table
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .single();

    if (matchError) {
      console.error('Error finding job application:', matchError);
      return { success: false, error: 'Application not found' };
    }

    if (!matchData) {
      return { success: false, error: 'You have not applied to this job' };
    }

    // Update the cover letter
    const { data, error } = await supabase
      .from('matches')
      .update({
        cover_letter: coverLetter,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cover letter:', error);
      return { success: false, error };
    }

    console.log('Successfully updated cover letter:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating cover letter:', error);
    return { success: false, error };
  }
};

/**
 * Get the cover letter for a specific job application
 * @param jobId - The ID of the job
 * @param userId - The user's ID
 */
export const getCoverLetter = async (jobId: string, userId: string) => {
  try {
    console.log(`Getting cover letter for job ${jobId} for user ${userId}`);

    const { data, error } = await supabase
      .from('matches')
      .select('cover_letter, status, metadata')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .single();

    if (error) {
      console.error('Error fetching cover letter:', error);
      return { success: false, error, coverLetter: null, applicationData: null };
    }

    return {
      success: true,
      coverLetter: data?.cover_letter || null,
      applicationData: {
        status: data?.status || 'pending',
        metadata: data?.metadata || {}
      }
    };
  } catch (error) {
    console.error('Error in getCoverLetter:', error);
    return { success: false, error, coverLetter: null, applicationData: null };
  }
};

/**
 * Track cover letter status for a specific job application
 * @param userId - The user ID
 * @param jobId - The job ID
 * @param hasLetter - Whether the job has a cover letter
 * @returns Object with success flag and error if any
 */
export const trackCoverLetterStatus = async (
  userId: string,
  jobId: string,
  hasLetter: boolean
) => {
  try {
    // Get the current cover letter status map from AsyncStorage
    const statusMapString = await AsyncStorage.getItem(`${COVER_LETTER_STATUS_KEY}_${userId}`);
    const statusMap = statusMapString ? JSON.parse(statusMapString) : {};

    // Update the status for this job
    statusMap[jobId] = hasLetter;

    // Save the updated status map back to AsyncStorage
    await AsyncStorage.setItem(`${COVER_LETTER_STATUS_KEY}_${userId}`, JSON.stringify(statusMap));

    return { success: true };
  } catch (error) {
    console.error('Error tracking cover letter status:', error);
    return { success: false, error };
  }
}

/**
 * Get the status map of all cover letters for a user
 * @param userId - The user ID
 * @returns A promise that resolves to a map of job IDs to cover letter status
 */
export async function getCoverLetterStatusMap(userId: string): Promise<Record<string, boolean>> {
  try {
    const statusMapString = await AsyncStorage.getItem(`${COVER_LETTER_STATUS_KEY}_${userId}`);
    return statusMapString ? JSON.parse(statusMapString) : {};
  } catch (error) {
    console.error('Error getting cover letter status map:', error);
    return {};
  }
}

// Helper Functions

/**
 * Get application ID from job ID and user ID
 */
export const getApplicationId = async (
  jobId: string,
  userId: string
): Promise<{ success: boolean; applicationId?: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId)
      .eq('profile_id', userId)
      .single();

    if (error) {
      console.error('Error fetching application ID:', error);
      return { success: false, error: error.message };
    }

    return { success: true, applicationId: data.id };
  } catch (error) {
    console.error('Error in getApplicationId:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Enhanced function to check if cover letter exists (checks both new and legacy)
 */
export async function hasCoverLetter(userId: string, jobId: string): Promise<boolean> {
  try {
    // First check for new cover letter attachments
    const appIdResult = await getApplicationId(jobId, userId);
    if (appIdResult.success && appIdResult.applicationId) {
      const attachmentResult = await getCoverLetterAttachment(appIdResult.applicationId, userId);
      if (attachmentResult.success && attachmentResult.data) {
        return true;
      }
    }

    // Fall back to legacy cover letter check
    const result = await getCoverLetter(jobId, userId);
    return result.success && !!result.coverLetter;
  } catch (error) {
    console.error('Error checking cover letter existence:', error);
    return false;
  }
}

/**
 * Enhanced function to get cover letter status map including attachments
 */
export async function getEnhancedCoverLetterStatusMap(userId: string): Promise<Record<string, { hasLetter: boolean; type: 'file' | 'text' | 'legacy' | 'none' }>> {
  try {
    // Get all applications for the user with cover letter info
    const { data, error } = await supabase
      .from('applications_with_cover_letters')
      .select('job_id, has_cover_letter, cover_letter_status')
      .eq('profile_id', userId);

    if (error) {
      console.error('Error fetching enhanced cover letter status:', error);
      return {};
    }

    const statusMap: Record<string, { hasLetter: boolean; type: 'file' | 'text' | 'legacy' | 'none' }> = {};

    data?.forEach(app => {
      statusMap[app.job_id] = {
        hasLetter: app.has_cover_letter,
        type: app.cover_letter_status as 'file' | 'text' | 'legacy' | 'none'
      };
    });

    return statusMap;
  } catch (error) {
    console.error('Error getting enhanced cover letter status map:', error);
    return {};
  }
}
