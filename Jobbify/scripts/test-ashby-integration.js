/**
 * Test script for Ashby API integration
 * This script tests the Ashby API integration without running the full app
 */

const fetch = require('node-fetch');

// Configuration
const JOB_BOARD_NAME = 'Ashby'; // Change this to test with your job board
const INCLUDE_COMPENSATION = true;
const API_BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

/**
 * Test the Ashby API directly
 */
async function testAshbyAPI() {
  console.log('🧪 Testing Ashby API Integration');
  console.log('================================');
  console.log(`Job Board: ${JOB_BOARD_NAME}`);
  console.log(`Include Compensation: ${INCLUDE_COMPENSATION}`);
  console.log('');

  try {
    // Construct API URL
    const url = `${API_BASE_URL}/${JOB_BOARD_NAME}${INCLUDE_COMPENSATION ? '?includeCompensation=true' : ''}`;
    console.log(`📡 Making request to: ${url}`);

    // Make the API request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Jobbify-Test-Script/1.0'
      },
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ API request failed with status ${response.status}`);
      if (response.status === 404) {
        console.log('💡 This might mean:');
        console.log('   - The job board name is incorrect');
        console.log('   - The job board is not publicly accessible');
        console.log('   - The job board does not exist');
      }
      return;
    }

    const data = await response.json();
    console.log(`✅ API request successful!`);
    console.log('');

    // Analyze the response
    console.log('📋 Response Analysis:');
    console.log(`   API Version: ${data.apiVersion || 'Not specified'}`);
    console.log(`   Total Jobs: ${data.jobs ? data.jobs.length : 0}`);
    console.log('');

    if (data.jobs && data.jobs.length > 0) {
      console.log('🔍 Sample Job Analysis:');
      const sampleJob = data.jobs[0];
      
      console.log(`   Title: ${sampleJob.title || 'N/A'}`);
      console.log(`   Location: ${sampleJob.location || 'N/A'}`);
      console.log(`   Department: ${sampleJob.department || 'N/A'}`);
      console.log(`   Team: ${sampleJob.team || 'N/A'}`);
      console.log(`   Remote: ${sampleJob.isRemote ? 'Yes' : 'No'}`);
      console.log(`   Listed: ${sampleJob.isListed ? 'Yes' : 'No'}`);
      console.log(`   Employment Type: ${sampleJob.employmentType || 'N/A'}`);
      console.log(`   Published: ${sampleJob.publishedAt || 'N/A'}`);
      console.log(`   Apply URL: ${sampleJob.applyUrl ? 'Available' : 'Missing'}`);
      console.log(`   Description Length: ${sampleJob.descriptionPlain ? sampleJob.descriptionPlain.length : 0} characters`);
      
      if (sampleJob.compensation) {
        console.log('   💰 Compensation Data:');
        console.log(`      Summary: ${sampleJob.compensation.compensationTierSummary || 'N/A'}`);
        console.log(`      Salary Summary: ${sampleJob.compensation.scrapeableCompensationSalarySummary || 'N/A'}`);
        console.log(`      Components: ${sampleJob.compensation.summaryComponents ? sampleJob.compensation.summaryComponents.length : 0}`);
      } else {
        console.log('   💰 Compensation Data: Not available');
      }
      console.log('');

      // Test data mapping
      console.log('🔄 Testing Data Mapping:');
      const mappedJob = mapJobForApp(sampleJob);
      console.log(`   Mapped ID: ${mappedJob.id}`);
      console.log(`   Mapped Company: ${mappedJob.company}`);
      console.log(`   Mapped Pay: ${mappedJob.pay}`);
      console.log(`   Mapped Tags: ${mappedJob.tags.join(', ')}`);
      console.log(`   Qualifications: ${mappedJob.qualifications.length} items`);
      console.log(`   Requirements: ${mappedJob.requirements.length} items`);
      console.log('');

      // Show job statistics
      console.log('📊 Job Statistics:');
      const listedJobs = data.jobs.filter(job => job.isListed);
      const remoteJobs = data.jobs.filter(job => job.isRemote);
      const jobsWithCompensation = data.jobs.filter(job => job.compensation);
      
      console.log(`   Listed Jobs: ${listedJobs.length}/${data.jobs.length}`);
      console.log(`   Remote Jobs: ${remoteJobs.length}/${data.jobs.length}`);
      console.log(`   Jobs with Compensation: ${jobsWithCompensation.length}/${data.jobs.length}`);
      
      const employmentTypes = [...new Set(data.jobs.map(job => job.employmentType))];
      console.log(`   Employment Types: ${employmentTypes.join(', ')}`);
      
      const departments = [...new Set(data.jobs.map(job => job.department).filter(Boolean))];
      console.log(`   Departments: ${departments.slice(0, 5).join(', ')}${departments.length > 5 ? '...' : ''}`);
    } else {
      console.log('⚠️  No jobs found in the response');
      console.log('💡 This might mean:');
      console.log('   - No jobs are currently published');
      console.log('   - All jobs are marked as unlisted');
      console.log('   - The job board is empty');
    }

  } catch (error) {
    console.error('❌ Error testing Ashby API:', error.message);
    console.log('💡 This might be due to:');
    console.log('   - Network connectivity issues');
    console.log('   - Invalid job board name');
    console.log('   - Ashby service unavailability');
  }
}

/**
 * Simple job mapping function for testing
 */
function mapJobForApp(ashbyJob) {
  const jobId = `ashby-${ashbyJob.jobUrl ? ashbyJob.jobUrl.split('/').pop() : Date.now()}`;
  const company = extractCompanyFromUrl(ashbyJob.jobUrl) || 'Company';
  const pay = formatCompensation(ashbyJob.compensation);
  const tags = generateTags(ashbyJob);
  const { qualifications, requirements } = extractBasicQualificationsAndRequirements(ashbyJob.descriptionPlain);

  return {
    id: jobId,
    title: ashbyJob.title,
    company,
    location: ashbyJob.isRemote ? `${ashbyJob.location} (Remote)` : ashbyJob.location,
    pay,
    tags,
    qualifications,
    requirements,
    url: ashbyJob.applyUrl,
    postedDate: ashbyJob.publishedAt,
  };
}

function extractCompanyFromUrl(jobUrl) {
  if (!jobUrl) return null;
  try {
    const url = new URL(jobUrl);
    if (url.hostname.includes('ashbyhq.com')) {
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        return pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function formatCompensation(compensation) {
  if (!compensation) return 'Competitive salary';
  if (compensation.scrapeableCompensationSalarySummary) {
    return compensation.scrapeableCompensationSalarySummary;
  }
  if (compensation.compensationTierSummary) {
    return compensation.compensationTierSummary;
  }
  return 'Competitive salary';
}

function generateTags(ashbyJob) {
  const tags = [];
  if (ashbyJob.employmentType) {
    const typeMap = {
      'FullTime': 'Full-time',
      'PartTime': 'Part-time',
      'Intern': 'Internship',
      'Contract': 'Contract',
      'Temporary': 'Temporary'
    };
    tags.push(typeMap[ashbyJob.employmentType] || ashbyJob.employmentType);
  }
  if (ashbyJob.isRemote) tags.push('Remote');
  if (ashbyJob.department) tags.push(ashbyJob.department);
  return tags;
}

function extractBasicQualificationsAndRequirements(description) {
  if (!description) {
    return {
      qualifications: ['Excellent communication skills', 'Team collaboration'],
      requirements: ['Bachelor\'s degree preferred', 'Relevant experience']
    };
  }

  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const qualifications = [];
  const requirements = [];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (lower.includes('skill') || lower.includes('experience') || lower.includes('ability')) {
      if (qualifications.length < 3) qualifications.push(sentence.trim());
    }
    if (lower.includes('degree') || lower.includes('required') || lower.includes('must have')) {
      if (requirements.length < 2) requirements.push(sentence.trim());
    }
  });

  return {
    qualifications: qualifications.length > 0 ? qualifications : ['Excellent communication skills', 'Team collaboration'],
    requirements: requirements.length > 0 ? requirements : ['Bachelor\'s degree preferred', 'Relevant experience']
  };
}

// Run the test
if (require.main === module) {
  testAshbyAPI().then(() => {
    console.log('🏁 Test completed');
  });
}

module.exports = { testAshbyAPI };
