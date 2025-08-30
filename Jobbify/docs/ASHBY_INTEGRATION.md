# Ashby API Integration

This document explains how to use the Ashby API integration in the Jobbify app to fetch job postings from your organization's Ashby-hosted careers page.

## Overview

The Ashby integration allows you to:
- Fetch job postings directly from your Ashby job board
- Include detailed compensation data
- Automatically map Ashby job data to the app's job format
- Provide a seamless fallback system when Ashby API is unavailable

## Setup

### 1. Find Your Job Board Name

To use the Ashby API, you need to find your organization's job board name:

1. Go to your Ashby hosted job board (e.g., `https://jobs.ashbyhq.com/YourCompany`)
2. The job board name is the last part of the URL path
3. For example, if your URL is `https://jobs.ashbyhq.com/Ashby`, your job board name is `Ashby`

### 2. Configuration Options

You can configure the Ashby integration in two ways:

#### Option A: App Configuration (Static)
Edit `app.config.js` and set:
```javascript
extra: {
  // ... other config
  ASHBY_JOB_BOARD_NAME: "YourCompanyName",
  ASHBY_INCLUDE_COMPENSATION: "true",
}
```

#### Option B: Runtime Configuration (Dynamic)
Use the in-app configuration modal:
1. Navigate to the Ashby configuration screen
2. Enter your job board name
3. Choose whether to include compensation data
4. Save the configuration

The app will prioritize runtime configuration over static configuration.

### 3. Job Board Name Validation

Job board names must:
- Contain only letters, numbers, hyphens, and underscores
- Not contain spaces or special characters
- Match exactly with your Ashby job board URL

## Features

### Job Data Mapping

The integration automatically maps Ashby job data to the app's format:

| Ashby Field | App Field | Notes |
|-------------|-----------|-------|
| `title` | `title` | Direct mapping |
| `location` | `location` | Includes remote indicator |
| `descriptionPlain` | `description` | Plain text description |
| `applyUrl` | `url` | Application URL |
| `publishedAt` | `postedDate` | ISO date string |
| `compensation` | `pay` | Formatted compensation |
| `department` | `tags` | Added to tags array |
| `employmentType` | `tags` | Mapped and added to tags |

### Compensation Handling

The integration supports Ashby's detailed compensation data:
- Uses `scrapeableCompensationSalarySummary` when available
- Falls back to `compensationTierSummary`
- Builds from `summaryComponents` if needed
- Formats currency values (e.g., `$120K - $150K`)

### Qualifications and Requirements Extraction

The system automatically extracts qualifications and requirements from job descriptions using:
- Bullet point detection
- Keyword-based classification
- Fallback generation for missing data

## API Integration

### Job Fetching Priority

The app fetches jobs in this order:
1. **Database jobs** (highest priority)
2. **Ashby API jobs** 
3. **External API jobs**
4. **Mock data** (fallback)

### Error Handling

The integration includes robust error handling:
- Invalid job board names are rejected
- Network errors are caught and logged
- API failures fall back to other job sources
- Configuration errors are handled gracefully

### Caching

- No caching is implemented to ensure fresh job data
- Cache-busting parameters are added to API requests
- Each request includes a timestamp to prevent stale data

## Usage Examples

### Basic Usage
```typescript
import { fetchAshbyJobs } from '@/services/ashbyJobsService';

// Fetch jobs with compensation data
const jobs = await fetchAshbyJobs('YourCompany', true);

// Fetch jobs without compensation data
const jobs = await fetchAshbyJobs('YourCompany', false);
```

### Configuration Validation
```typescript
import { validateJobBoardName } from '@/services/ashbyJobsService';

const isValid = validateJobBoardName('my-company'); // true
const isInvalid = validateJobBoardName('my company'); // false (spaces not allowed)
```

### Getting Available Configurations
```typescript
import { getJobBoardConfigurations } from '@/services/ashbyJobsService';

const configs = getJobBoardConfigurations();
// Returns array of available job board configurations
```

## Testing

The integration includes comprehensive tests:
- Unit tests for validation functions
- API mocking for job fetching
- Error handling scenarios
- Data mapping verification

Run tests with:
```bash
npm test ashbyJobsService.test.ts
```

## Troubleshooting

### Common Issues

1. **No jobs returned**
   - Verify your job board name is correct
   - Check that jobs are published and listed in Ashby
   - Ensure your job board is publicly accessible

2. **Invalid job board name error**
   - Job board names can only contain letters, numbers, hyphens, and underscores
   - Remove spaces and special characters

3. **API errors**
   - Check network connectivity
   - Verify the job board exists and is public
   - Check Ashby service status

### Debug Logging

The integration includes detailed console logging:
- Configuration loading
- API requests and responses
- Error messages and fallbacks
- Job mapping results

Check the console for detailed information about the integration's behavior.

## Security Considerations

- The Ashby API is public and doesn't require authentication
- Job board names are validated to prevent injection attacks
- No sensitive data is stored in the configuration
- All API requests use HTTPS

## Limitations

- Only works with publicly accessible Ashby job boards
- Requires exact job board name match
- Limited to jobs marked as "listed" in Ashby
- Compensation data availability depends on Ashby configuration

## Support

For issues with the Ashby integration:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify your job board configuration
4. Test with the Ashby API directly if needed
