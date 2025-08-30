import { supabase } from '@/lib/supabase';
import { Job } from '@/context/AppContext';

export interface CachedJob {
  id: number;
  external_job_id: string;
  source: string;
  job_data: any;
  expires_at: string;
  created_at: string;
}

/**
 * Cache jobs from external APIs in Supabase
 */
export async function cacheJobsInSupabase(
  jobs: Job[], 
  source: string, 
  expirationHours: number = 24
): Promise<void> {
  try {
    if (!jobs || jobs.length === 0) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const jobsToCache = jobs.map(job => ({
      external_job_id: job.id,
      source: source,
      job_data: job,
      expires_at: expiresAt.toISOString(),
    }));

    // Use upsert to handle duplicates
    const { error } = await supabase
      .from('job_cache')
      .upsert(jobsToCache, { 
        onConflict: 'external_job_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error caching jobs:', error);
    } else {
      console.log(`Successfully cached ${jobs.length} jobs from ${source}`);
    }
  } catch (error) {
    console.error('Error in cacheJobsInSupabase:', error);
  }
}

/**
 * Get cached jobs from Supabase
 */
export async function getCachedJobs(
  source?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Job[]> {
  try {
    let query = supabase
      .from('job_cache')
      .select('job_data')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cached jobs:', error);
      return [];
    }

    return (data || []).map(item => item.job_data as Job);
  } catch (error) {
    console.error('Error in getCachedJobs:', error);
    return [];
  }
}

/**
 * Get jobs for user recommendations (excluding already swiped jobs)
 * Works for both authenticated users and guests
 */
export async function getJobsForUser(
  userId?: string,
  limit: number = 20,
  excludeSwipedJobs: boolean = true
): Promise<Job[]> {
  try {
    console.log(`[SUPABASE] getJobsForUser called with userId: ${userId}, limit: ${limit}`);
    
    console.log('[SUPABASE] Querying job_cache table...');
    let query = supabase
      .from('job_cache')
      .select('job_data, external_job_id')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to account for filtering

    // Add a timeout to the Supabase query
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase query timeout')), 10000);
    });
    
    console.log('[SUPABASE] Starting query with 10s timeout...');
    const { data: cachedJobs, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    console.log(`[SUPABASE] job_cache query completed. Found ${cachedJobs?.length || 0} jobs, error: ${error?.message || 'none'}`);

    if (error) {
      console.error('[SUPABASE] Error fetching jobs for user:', error);
      return [];
    }

    if (!cachedJobs || cachedJobs.length === 0) {
      console.log('[SUPABASE] No cached jobs found');
      return [];
    }

    let jobs = cachedJobs.map(item => item.job_data as Job);
    console.log(`[SUPABASE] Mapped ${jobs.length} jobs from cache`);

    // Filter out already swiped jobs if requested and user is authenticated
    if (excludeSwipedJobs && userId) {
      console.log(`[SUPABASE] Filtering out swiped jobs for user ${userId}...`);
      const { data: swipedJobs, error: swipeError } = await supabase
        .from('swipes')
        .select('job_id')
        .eq('user_id', userId);
      
      console.log(`[SUPABASE] Swipes query completed. Found ${swipedJobs?.length || 0} swipes, error: ${swipeError?.message || 'none'}`);

      if (!swipeError && swipedJobs) {
        const swipedJobIds = new Set(swipedJobs.map(swipe => swipe.job_id));
        const beforeFilter = jobs.length;
        jobs = jobs.filter(job => !swipedJobIds.has(job.id));
        console.log(`[SUPABASE] Filtered out ${beforeFilter - jobs.length} swiped jobs, ${jobs.length} remaining`);
      }
    }

    const finalJobs = jobs.slice(0, limit);
    console.log(`[SUPABASE] Returning ${finalJobs.length} jobs`);
    return finalJobs;
  } catch (error) {
    console.error('[SUPABASE] Error in getJobsForUser:', error);
    return [];
  }
}

/**
 * Clean up expired job cache entries
 */
export async function cleanupExpiredJobs(): Promise<void> {
  try {
    const { error } = await supabase
      .from('job_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired jobs:', error);
    } else {
      console.log('Successfully cleaned up expired job cache entries');
    }
  } catch (error) {
    console.error('Error in cleanupExpiredJobs:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number;
  by_source: Record<string, number>;
  expired: number;
}> {
  try {
    const now = new Date().toISOString();

    // Get total count
    const { count: total, error: totalError } = await supabase
      .from('job_cache')
      .select('*', { count: 'exact', head: true });

    // Get count by source
    const { data: sourceData, error: sourceError } = await supabase
      .from('job_cache')
      .select('source')
      .gt('expires_at', now);

    // Get expired count
    const { count: expired, error: expiredError } = await supabase
      .from('job_cache')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);

    if (totalError || sourceError || expiredError) {
      console.error('Error getting cache stats:', { totalError, sourceError, expiredError });
      return { total: 0, by_source: {}, expired: 0 };
    }

    const by_source: Record<string, number> = {};
    if (sourceData) {
      sourceData.forEach(item => {
        by_source[item.source] = (by_source[item.source] || 0) + 1;
      });
    }

    return {
      total: total || 0,
      by_source,
      expired: expired || 0
    };
  } catch (error) {
    console.error('Error in getCacheStats:', error);
    return { total: 0, by_source: {}, expired: 0 };
  }
}

/**
 * Check if we have fresh jobs from a specific source
 */
export async function hasFreshJobs(
  source: string,
  maxAgeHours: number = 2
): Promise<boolean> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    const { count, error } = await supabase
      .from('job_cache')
      .select('*', { count: 'exact', head: true })
      .eq('source', source)
      .gt('created_at', cutoffTime.toISOString())
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error checking for fresh jobs:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in hasFreshJobs:', error);
    return false;
  }
}

/**
 * Record user interaction with a job
 */
export async function recordJobInteraction(
  userId: string,
  jobId: string,
  interactionType: 'view' | 'like' | 'dislike' | 'apply' | 'save' | 'share',
  metadata?: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_job_interactions')
      .upsert({
        user_id: userId,
        external_job_id: jobId,
        interaction_type: interactionType,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error recording job interaction:', error);
    }
  } catch (error) {
    console.error('Error in recordJobInteraction:', error);
  }
}

/**
 * Get user's job interaction history
 */
export async function getUserJobInteractions(
  userId: string,
  interactionType?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    let query = supabase
      .from('user_job_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (interactionType) {
      query = query.eq('interaction_type', interactionType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user job interactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserJobInteractions:', error);
    return [];
  }
}

/**
 * Save job to bookmarks
 */
export async function saveJobToBookmarks(
  userId: string,
  job: Job,
  notes?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .upsert({
        user_id: userId,
        external_job_id: job.id,
        job_data: job,
        notes: notes || '',
      });

    if (error) {
      console.error('Error saving job to bookmarks:', error);
    } else {
      console.log('Job saved to bookmarks successfully');
    }
  } catch (error) {
    console.error('Error in saveJobToBookmarks:', error);
  }
}

/**
 * Get user's bookmarked jobs
 */
export async function getUserBookmarks(userId: string): Promise<Job[]> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('job_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bookmarks:', error);
      return [];
    }

    return (data || []).map(item => item.job_data as Job);
  } catch (error) {
    console.error('Error in getUserBookmarks:', error);
    return [];
  }
}
