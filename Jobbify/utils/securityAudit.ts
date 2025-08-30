import { supabase } from '../lib/supabase';

/**
 * Security audit utilities to verify proper data isolation
 */
export const securityAudit = {
  /**
   * Test if user can only see their own data across all tables
   */
  async auditUserDataIsolation(userId: string) {
    console.log('🔒 Starting security audit for user:', userId);
    const results: any[] = [];

    try {
      // Test profiles access
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(10);

      results.push({
        table: 'profiles',
        success: !profilesError,
        recordCount: profiles?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: profiles?.filter(p => p.id === userId).length || 0,
        error: profilesError?.message
      });

      // Test job_seeker_profiles access
      const { data: jobSeekerProfiles, error: jsError } = await supabase
        .from('job_seeker_profiles')
        .select('profile_id')
        .limit(10);

      results.push({
        table: 'job_seeker_profiles',
        success: !jsError,
        recordCount: jobSeekerProfiles?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: jobSeekerProfiles?.filter(p => p.profile_id === userId).length || 0,
        error: jsError?.message
      });

      // Test applications/matches access
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('profile_id')
        .limit(10);

      results.push({
        table: 'matches',
        success: !matchesError,
        recordCount: matches?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: matches?.filter(m => m.profile_id === userId).length || 0,
        error: matchesError?.message
      });

      // Test swipes access
      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('user_id')
        .limit(10);

      results.push({
        table: 'swipes',
        success: !swipesError,
        recordCount: swipes?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: swipes?.filter(s => s.user_id === userId).length || 0,
        error: swipesError?.message
      });

      // Test notifications access
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('user_id')
        .limit(10);

      results.push({
        table: 'notifications',
        success: !notificationsError,
        recordCount: notifications?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: notifications?.filter(n => n.user_id === userId).length || 0,
        error: notificationsError?.message
      });

      // Test experiences access
      const { data: experiences, error: experiencesError } = await supabase
        .from('experiences')
        .select('profile_id')
        .limit(10);

      results.push({
        table: 'experiences',
        success: !experiencesError,
        recordCount: experiences?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: experiences?.filter(e => e.profile_id === userId).length || 0,
        error: experiencesError?.message
      });

      // Test user_skills access
      const { data: skills, error: skillsError } = await supabase
        .from('user_skills')
        .select('profile_id')
        .limit(10);

      results.push({
        table: 'user_skills',
        success: !skillsError,
        recordCount: skills?.length || 0,
        shouldOnlySeeOwn: true,
        actualUserRecords: skills?.filter(s => s.profile_id === userId).length || 0,
        error: skillsError?.message
      });

      // Analyze results
      console.log('🔍 Security Audit Results:');
      let securityIssues = 0;

      results.forEach(result => {
        const isSecure = result.recordCount === result.actualUserRecords;
        const status = isSecure ? '✅' : '❌';
        
        console.log(`${status} ${result.table}: ${result.recordCount} total records, ${result.actualUserRecords} user records`);
        
        if (!isSecure && result.recordCount > 0) {
          securityIssues++;
          console.log(`   🚨 SECURITY ISSUE: User can see ${result.recordCount - result.actualUserRecords} records from other users!`);
        }
        
        if (result.error) {
          console.log(`   ⚠️  Error: ${result.error}`);
        }
      });

      if (securityIssues === 0) {
        console.log('✅ Security audit passed! User can only see their own data.');
      } else {
        console.log(`❌ Security audit failed! Found ${securityIssues} tables with data leakage.`);
      }

      return {
        success: securityIssues === 0,
        issues: securityIssues,
        results
      };

    } catch (error) {
      console.error('❌ Security audit failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results
      };
    }
  },

  /**
   * Test if jobs are properly accessible (should be visible to all users)
   */
  async auditJobsAccess() {
    console.log('🔍 Testing jobs access...');
    
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, company')
        .limit(5);

      if (error) {
        console.log('❌ Jobs access failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Jobs access working: ${jobs?.length || 0} jobs visible`);
      return { success: true, jobCount: jobs?.length || 0 };

    } catch (error) {
      console.error('❌ Jobs access test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Comprehensive security test
   */
  async runFullSecurityAudit(userId: string) {
    console.log('🔒 Running comprehensive security audit...');
    
    const userDataAudit = await this.auditUserDataIsolation(userId);
    const jobsAudit = await this.auditJobsAccess();
    
    const overallSuccess = userDataAudit.success && jobsAudit.success;
    
    console.log('📊 Overall Security Status:', overallSuccess ? '✅ SECURE' : '❌ SECURITY ISSUES FOUND');
    
    return {
      success: overallSuccess,
      userDataIsolation: userDataAudit,
      jobsAccess: jobsAudit
    };
  }
};
