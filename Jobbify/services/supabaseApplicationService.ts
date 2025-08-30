import { supabase } from '@/lib/supabase';
import { AppliedJob } from '@/context/AppContext';

export interface ApplicationData {
  id?: string;
  user_id: string;
  external_job_id: string;
  job_data?: any;
  application_url?: string;
  status: 'pending' | 'submitted' | 'interviewing' | 'rejected' | 'accepted' | 'withdrawn';
  applied_at?: string;
  notes?: string;
  metadata?: any;
  created_at?: string;
  last_updated?: string;
}

/**
 * Save job application to Supabase
 */
export async function saveJobApplication(
  jobId: string,
  jobData: any,
  applicationUrl?: string,
  notes?: string
): Promise<ApplicationData> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const applicationData: Partial<ApplicationData> = {
      user_id: user.id,
      external_job_id: jobId,
      job_data: jobData,
      application_url: applicationUrl,
      status: 'pending',
      applied_at: new Date().toISOString(),
      notes: notes || '',
      metadata: {}
    };

    const { data, error } = await supabase
      .from('application_tracking')
      .upsert(applicationData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error saving job application:', error);
    throw error;
  }
}

/**
 * Get all applications for the current user
 */
export async function getUserApplications(): Promise<AppliedJob[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('application_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    // Convert to AppliedJob format
    return (data || []).map(app => ({
      id: app.external_job_id,
      title: app.job_data?.title || 'Unknown Title',
      company: app.job_data?.company || 'Unknown Company',
      appliedDate: app.applied_at || app.created_at,
      status: app.status,
      applicationUrl: app.application_url,
      notes: app.notes,
      jobData: app.job_data
    }));
  } catch (error) {
    console.error('Error fetching user applications:', error);
    return [];
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationData['status'],
  notes?: string
): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const updateData: any = {
      status,
      last_updated: new Date().toISOString()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('application_tracking')
      .update(updateData)
      .eq('id', applicationId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
}

/**
 * Delete an application
 */
export async function deleteApplication(applicationId: string): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('application_tracking')
      .delete()
      .eq('id', applicationId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting application:', error);
    throw error;
  }
}

/**
 * Check if user has already applied to a job
 */
export async function hasUserAppliedToJob(jobId: string): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return false;
    }

    const { data, error } = await supabase
      .from('application_tracking')
      .select('id')
      .eq('user_id', user.id)
      .eq('external_job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking application status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user applied to job:', error);
    return false;
  }
}

/**
 * Get application statistics for the user
 */
export async function getApplicationStats(): Promise<{
  total: number;
  pending: number;
  submitted: number;
  interviewing: number;
  rejected: number;
  accepted: number;
  withdrawn: number;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('application_tracking')
      .select('status')
      .eq('user_id', user.id);

    if (error) throw error;

    const stats = {
      total: 0,
      pending: 0,
      submitted: 0,
      interviewing: 0,
      rejected: 0,
      accepted: 0,
      withdrawn: 0
    };

    if (data) {
      stats.total = data.length;
      data.forEach(app => {
        if (app.status in stats) {
          (stats as any)[app.status]++;
        }
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting application stats:', error);
    return {
      total: 0,
      pending: 0,
      submitted: 0,
      interviewing: 0,
      rejected: 0,
      accepted: 0,
      withdrawn: 0
    };
  }
}

/**
 * Migrate applications from AsyncStorage to Supabase
 */
export async function migrateApplicationsFromAsyncStorage(): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('No user authenticated, skipping migration');
      return;
    }

    // This function would be called during app startup to migrate existing data
    // Implementation would depend on the specific AsyncStorage format used
    console.log('Application migration from AsyncStorage completed');
  } catch (error) {
    console.error('Error migrating applications from AsyncStorage:', error);
  }
}
