import { supabase } from '@/lib/supabase';
import { Job } from '@/context/AppContext';

export interface SwipeData {
  id?: number;
  user_id: string;
  job_id?: number;
  external_job_id?: string;
  direction: 'left' | 'right';
  job_title?: string;
  job_company?: string;
  job_location?: string;
  job_salary_min?: number;
  job_salary_max?: number;
  job_type?: string;
  job_remote?: boolean;
  job_tags?: string[];
  match_score?: number;
  created_at?: string;
}

/**
 * Record a swipe action in Supabase
 */
export async function recordSwipeInSupabase(
  job: Job,
  direction: 'left' | 'right',
  matchScore?: number
): Promise<SwipeData> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Extract salary information
    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    
    if (job.pay && typeof job.pay === 'string') {
      const salaryMatch = job.pay.match(/\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/);
      if (salaryMatch) {
        salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
        if (salaryMatch[2]) {
          salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
        }
      }
    }

    const swipeData: Partial<SwipeData> = {
      user_id: user.id,
      external_job_id: job.id,
      direction,
      job_title: job.title,
      job_company: job.company,
      job_location: job.location,
      job_salary_min: salaryMin,
      job_salary_max: salaryMax,
      job_type: job.type,
      job_remote: job.remote || job.location?.toLowerCase().includes('remote'),
      job_tags: job.tags || [],
      match_score: matchScore
    };

    const { data, error } = await supabase
      .from('swipes')
      .upsert(swipeData, { onConflict: 'user_id,external_job_id' })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error recording swipe:', error);
    throw error;
  }
}

/**
 * Get all swipes for the current user
 */
export async function getUserSwipes(
  direction?: 'left' | 'right',
  limit: number = 100
): Promise<SwipeData[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('swipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (direction) {
      query = query.eq('direction', direction);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching user swipes:', error);
    return [];
  }
}

/**
 * Get swiped job IDs for the current user
 */
export async function getSwipedJobIds(): Promise<string[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from('swipes')
      .select('external_job_id')
      .eq('user_id', user.id);

    if (error) throw error;

    return (data || [])
      .map(swipe => swipe.external_job_id)
      .filter(Boolean) as string[];
  } catch (error) {
    console.error('Error fetching swiped job IDs:', error);
    return [];
  }
}

/**
 * Check if user has swiped on a specific job
 */
export async function hasUserSwipedJob(jobId: string): Promise<SwipeData | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('swipes')
      .select('*')
      .eq('user_id', user.id)
      .eq('external_job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking swipe status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error checking if user swiped job:', error);
    return null;
  }
}

/**
 * Get swipe statistics for the user
 */
export async function getSwipeStats(): Promise<{
  total: number;
  likes: number;
  dislikes: number;
  likeRate: number;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('swipes')
      .select('direction')
      .eq('user_id', user.id);

    if (error) throw error;

    const stats = {
      total: 0,
      likes: 0,
      dislikes: 0,
      likeRate: 0
    };

    if (data) {
      stats.total = data.length;
      stats.likes = data.filter(swipe => swipe.direction === 'right').length;
      stats.dislikes = data.filter(swipe => swipe.direction === 'left').length;
      stats.likeRate = stats.total > 0 ? (stats.likes / stats.total) * 100 : 0;
    }

    return stats;
  } catch (error) {
    console.error('Error getting swipe stats:', error);
    return {
      total: 0,
      likes: 0,
      dislikes: 0,
      likeRate: 0
    };
  }
}

/**
 * Get liked jobs (right swipes) for the user
 */
export async function getLikedJobs(limit: number = 50): Promise<Job[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from('swipes')
      .select('*')
      .eq('user_id', user.id)
      .eq('direction', 'right')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Convert swipe data back to Job format
    return (data || []).map(swipe => ({
      id: swipe.external_job_id || swipe.job_id?.toString() || '',
      title: swipe.job_title || 'Unknown Title',
      company: swipe.job_company || 'Unknown Company',
      location: swipe.job_location || 'Unknown Location',
      description: '', // Not stored in swipes
      requirements: [],
      qualifications: [],
      salary: swipe.job_salary_min && swipe.job_salary_max 
        ? `$${swipe.job_salary_min.toLocaleString()} - $${swipe.job_salary_max.toLocaleString()}`
        : swipe.job_salary_min 
        ? `$${swipe.job_salary_min.toLocaleString()}+`
        : 'Competitive',
      type: swipe.job_type || 'Full-time',
      remote: swipe.job_remote || false,
      logo: '',
      postedDate: swipe.created_at || new Date().toISOString(),
      applyUrl: '',
      tags: swipe.job_tags || []
    }));
  } catch (error) {
    console.error('Error fetching liked jobs:', error);
    return [];
  }
}

/**
 * Delete a swipe record
 */
export async function deleteSwipe(swipeId: number): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('id', swipeId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting swipe:', error);
    throw error;
  }
}

/**
 * Clear all swipes for the current user
 */
export async function clearAllSwipes(): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('swipes')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing all swipes:', error);
    throw error;
  }
}
