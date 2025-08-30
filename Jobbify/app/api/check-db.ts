import { supabase } from '../../lib/supabase';

/**
 * This API route checks database schema and provides a detailed report
 * It helps diagnose database connectivity and schema issues
 */

// Create a non-async wrapper function for the router
export default function CheckDbRoute(req: Request) {
  // This calls the async implementation
  return checkDbImplementation(req);
}

// Move the actual implementation to a separate async function
async function checkDbImplementation(req: Request) {
  try {
    const results: Record<string, any> = {};
    
    // Check connection first
    try {
      const { data, error } = await supabase.from('profiles').select('count(*)');
      results.connection = { 
        success: !error,
        error: error ? error.message : null
      };
    } catch (err: any) {
      results.connection = { 
        success: false,
        error: err.message || 'Unknown connection error'
      };
    }
    
    // Get all tables schema
    const tables = ['profiles', 'job_seeker_profiles', 'service_provider_profiles'];
    results.tables = {};
    
    for (const table of tables) {
      try {
        // Check if table exists
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          results.tables[table] = {
            exists: false,
            error: error.message
          };
          continue;
        }
        
        // Get schema details using system tables if possible
        const { data: schemaData, error: schemaError } = await supabase
          .rpc('get_table_definition', { table_name: table });
          
        // Fallback to sample data if RPC fails
        if (schemaError || !schemaData) {
          results.tables[table] = {
            exists: true,
            sample_columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            error: schemaError?.message
          };
        } else {
          results.tables[table] = {
            exists: true,
            schema: schemaData,
            sample_columns: data && data.length > 0 ? Object.keys(data[0]) : []
          };
        }
        
        // Get row count
        try {
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
          results.tables[table].count = countError ? null : count;
        } catch {
          results.tables[table].count = null;
        }
        
      } catch (err: any) {
        results.tables[table] = {
          exists: false,
          error: err.message
        };
      }
    }
    
    // Add needed SQL to fix issues
    results.fixes = {
      profiles: `
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  email TEXT, 
  user_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);`,
      job_seeker_profiles: `
CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  bio TEXT,
  title TEXT,
  resume_url TEXT
);`
    };
    
    // Return detailed report
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
} 