import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { extractTextFromFile, analyzeResumeWithGemini } from './fileTextExtractService';

export interface ResumeFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
  lastModified?: number;
}

export interface StoredResume {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  extracted_text?: string;
  analysis_result?: any;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Upload a resume file to Supabase Storage and save metadata to database
 */
export async function uploadResume(file: ResumeFile, isPrimary: boolean = false): Promise<StoredResume> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Read file content as base64
    const fileContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, Buffer.from(fileContent, 'base64'), {
        contentType: file.mimeType,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);

    // If this is set as primary, unset other primary resumes
    if (isPrimary) {
      await supabase
        .from('resumes')
        .update({ is_primary: false })
        .eq('user_id', user.id);
    }

    // Save resume metadata to database
    const { data: resumeData, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.mimeType,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return resumeData;
  } catch (error) {
    console.error('Error uploading resume:', error);
    throw error;
  }
}

/**
 * Extract text from a resume and update the database
 */
export async function extractResumeText(resumeId: string): Promise<string> {
  try {
    // Get resume data
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();

    if (fetchError || !resume) {
      throw new Error('Resume not found');
    }

    // If text already extracted, return it
    if (resume.extracted_text) {
      return resume.extracted_text;
    }

    // Download file and extract text
    const response = await fetch(resume.file_url);
    const blob = await response.blob();
    
    // Create a temporary file for text extraction
    const tempUri = FileSystem.documentDirectory + 'temp_resume.' + resume.filename.split('.').pop();
    await FileSystem.writeAsStringAsync(tempUri, await blob.text(), {
      encoding: FileSystem.EncodingType.Base64,
    });

    const extractedText = await extractTextFromFile({
      uri: tempUri,
      name: resume.filename,
      mimeType: resume.mime_type,
    });

    // Clean up temp file
    await FileSystem.deleteAsync(tempUri, { idempotent: true });

    // Update database with extracted text
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ extracted_text: extractedText })
      .eq('id', resumeId);

    if (updateError) throw updateError;

    return extractedText;
  } catch (error) {
    console.error('Error extracting resume text:', error);
    throw error;
  }
}

/**
 * Analyze a resume and save results to database
 */
export async function analyzeResume(resumeId: string): Promise<any> {
  try {
    // Get or extract text first
    const extractedText = await extractResumeText(resumeId);

    // Analyze with AI
    const analysisResult = await analyzeResumeWithGemini(extractedText);

    // Update database with analysis results
    const { error: updateError } = await supabase
      .from('resumes')
      .update({ analysis_result: analysisResult })
      .eq('id', resumeId);

    if (updateError) throw updateError;

    return analysisResult;
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw error;
  }
}

/**
 * Get all resumes for the current user
 */
export async function getUserResumes(): Promise<StoredResume[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return resumes || [];
  } catch (error) {
    console.error('Error fetching user resumes:', error);
    throw error;
  }
}

/**
 * Get the primary resume for the current user
 */
export async function getPrimaryResume(): Promise<StoredResume | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return resume || null;
  } catch (error) {
    console.error('Error fetching primary resume:', error);
    throw error;
  }
}

/**
 * Set a resume as primary
 */
export async function setPrimaryResume(resumeId: string): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Unset all primary resumes for user
    await supabase
      .from('resumes')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    // Set the specified resume as primary
    const { error } = await supabase
      .from('resumes')
      .update({ is_primary: true })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error setting primary resume:', error);
    throw error;
  }
}

/**
 * Delete a resume
 */
export async function deleteResume(resumeId: string): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get resume data to delete file from storage
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('file_url')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Extract file path from URL
    const filePath = resume.file_url.split('/').slice(-2).join('/'); // Get 'resumes/filename'

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('resumes')
      .remove([filePath]);

    if (storageError) {
      console.warn('Error deleting file from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting resume:', error);
    throw error;
  }
}

/**
 * Get resume by ID (with user verification)
 */
export async function getResumeById(resumeId: string): Promise<StoredResume | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return resume || null;
  } catch (error) {
    console.error('Error fetching resume by ID:', error);
    throw error;
  }
}
