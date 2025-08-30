import { supabase } from '@/lib/supabase';
import { updateApplicationStatus, applyOnBehalfOfUser } from './jobApplicationService';

/**
 * Secure Admin Service for Jobbify
 * This service enforces admin-only access to sensitive operations
 */

// Verify if a user has admin privileges
export const verifyAdminAccess = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Get user profile to check user type
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();
      
    if (error || !profile) {
      console.error('Error verifying admin access:', error);
      return false;
    }
    
    // Check if user has admin user type
    return profile.user_type === 'admin';
  } catch (error) {
    console.error('Exception in verifyAdminAccess:', error);
    return false;
  }
};

// Get all job applications with detailed information
export const getAdminApplications = async (userId: string) => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess(userId);
    if (!isAdmin) {
      return { 
        error: 'Unauthorized: Admin access required',
        status: 403,
        data: null
      };
    }
    
    // Get applications from job_applications table
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return { 
        error: error.message,
        status: 500,
        data: null
      };
    }
    
    // Enhance applications with job seeker profiles
    const enhancedApplications = await Promise.all(
      data.map(async (app) => {
        if (app.profile_id && !app.job_seeker) {
          const { data: jobSeekerData } = await supabase
            .from('job_seeker_profiles')
            .select('resume_url, bio, title')
            .eq('profile_id', app.profile_id)
            .maybeSingle();
            
          if (jobSeekerData) {
            return {
              ...app,
              job_seeker: jobSeekerData
            };
          }
        }
        
        return app;
      })
    );
    
    return { 
      data: enhancedApplications,
      error: null,
      status: 200
    };
  } catch (error) {
    console.error('Error in getAdminApplications:', error);
    return { 
      error: 'Internal server error',
      status: 500,
      data: null
    };
  }
};

// Update application status with admin verification
export const adminUpdateApplicationStatus = async (
  adminUserId: string,  // The admin user's ID for permission check
  applicationId: string,
  newStatus: string
) => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminUserId);
    if (!isAdmin) {
      return { 
        error: 'Unauthorized: Admin access required',
        status: 403,
        success: false
      };
    }

    // First, get the job and user IDs for this application
    const { data: applicationData, error: fetchError } = await supabase
      .from('matches')
      .select('job_id, profile_id')
      .eq('id', applicationId)
      .single();

    if (fetchError || !applicationData) {
      return {
        error: fetchError?.message || 'Application not found',
        status: 404,
        success: false
      };
    }

    // Update application status using existing service with correct parameters
    // The function expects (jobId, userId, status)
    const result = await updateApplicationStatus(
      applicationData.job_id,
      applicationData.profile_id,
      newStatus
    );
    
    return { 
      success: result.success,
      error: result.success ? null : (result.error || 'Failed to update application status'),
      status: result.success ? 200 : 500
    };
  } catch (error) {
    console.error('Error in adminUpdateApplicationStatus:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { 
      error: `Internal server error: ${message}`,
      status: 500,
      success: false
    };
  }
};

// Admin function to apply on behalf of user
export const adminApplyOnBehalf = async (
  userId: string,
  profileId: string,
  jobId: string
) => {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess(userId);
    if (!isAdmin) {
      return { 
        error: 'Unauthorized: Admin access required',
        status: 403,
        success: false
      };
    }

    // Generate a cover letter for admin-created applications
    const coverLetterText = `Dear Hiring Team,

This is an automated application being submitted by Jobbify on behalf of the candidate. The candidate has expressed interest in this position and requested assistance with the application process.

Please review their profile and resume for qualification assessment. You can contact the candidate through the provided application email.

Thank you,
Jobbify Application System`;

    // Apply on behalf of user using existing service
    const result = await applyOnBehalfOfUser(jobId, profileId, coverLetterText);
    
    return {
      ...result,
      status: result.success ? 200 : 500
    };
  } catch (error) {
    console.error('Error in adminApplyOnBehalf:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { 
      error: `Internal server error: ${message}`,
      status: 500,
      success: false
    };
  }
};
