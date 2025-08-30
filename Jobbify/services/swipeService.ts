/**
 * Swipe service for handling swipe operations
 */
import axios from 'axios';
import { API_URL } from './remoteOkService';
import { supabase } from '@/lib/supabase';

/**
 * Record a swipe (like or dislike)
 */
export const recordSwipe = async (jobId: string, userId: string, direction: 'like' | 'dislike'): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    console.log('Recording swipe:', direction, 'for job:', jobId);
    
    // Map the direction to 'right' or 'left' to match the schema constraint
    const dbDirection = direction === 'like' ? 'right' : 'left';
    
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/swipe`, {
        job_id: jobId,
        profile_id: userId,
        direction: dbDirection
      });
      
      if (response.status === 201) {
        console.log('Successfully recorded swipe via FastAPI:', response.data);
        
        // If it's a "like" swipe, also save to matches for backward compatibility
        if (direction === 'like') {
          await saveToMatches(jobId, userId);
        }
        
        return { success: true, data: response.data };
      }
    } catch (apiError) {
      console.error('Error recording swipe via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    
    // First check if this swipe already exists
    const { data: existingSwipe, error: checkError } = await supabase
      .from('swipes')
      .select('id, direction')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (existingSwipe) {
      console.log('User already swiped on this job:', existingSwipe);
      // If the direction is the same, just return success
      if (existingSwipe.direction === dbDirection) {
        return { success: true, data: existingSwipe };
      }
      
      // If direction changed, update the record
      const { data: updatedSwipe, error: updateError } = await supabase
        .from('swipes')
        .update({ direction: dbDirection })
        .eq('id', existingSwipe.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      console.log('Updated existing swipe:', updatedSwipe);
      
      // If it's a "like" swipe, also save to matches for backward compatibility
      if (direction === 'like') {
        await saveToMatches(jobId, userId);
      }
      
      return { success: true, data: updatedSwipe };
    }
    
    // If no existing swipe, insert a new one
    const { data, error } = await supabase
      .from('swipes')
      .insert({
        user_id: userId,
        job_id: jobId,
        direction: dbDirection
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // If it's a "like" swipe, also save to matches for backward compatibility
    if (direction === 'like') {
      await saveToMatches(jobId, userId);
    }
    
    console.log('Successfully recorded swipe via Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error recording swipe:', error);
    return { success: false, error };
  }
};

/**
 * Save a job to bookmarks
 */
export const saveJobToBookmarks = async (jobId: string, userId: string): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    console.log('Saving job to bookmarks:', jobId);
    
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/bookmarks`, {
        job_id: jobId,
        profile_id: userId
      });
      
      if (response.status === 201) {
        console.log('Successfully saved to bookmarks via FastAPI:', response.data);
        return { success: true, data: response.data };
      }
    } catch (apiError) {
      console.error('Error saving to bookmarks via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    
    // First check if bookmark already exists
    const { data: existingBookmark, error: checkError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (existingBookmark) {
      console.log('Job already bookmarked:', existingBookmark);
      return { success: true, data: existingBookmark };
    }
    
    // No existing bookmark, insert a new one
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        profile_id: userId,
        job_id: jobId
      })
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Successfully saved to bookmarks via Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving to bookmarks:', error);
    return { success: false, error };
  }
};

// Helper function to save to matches table for backward compatibility
const saveToMatches = async (jobId: string, userId: string) => {
  try {
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/matches`, {
        job_id: jobId,
        profile_id: userId
      });
      
      if (response.status === 201) {
        console.log('Successfully saved to matches via FastAPI:', response.data);
        return true;
      }
    } catch (apiError) {
      console.error('Error saving to matches via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    const { error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: jobId,
        status: 'applying'
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error saving to matches:', error);
    return false;
  }
}; 