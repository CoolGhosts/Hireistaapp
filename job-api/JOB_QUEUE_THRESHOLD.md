# Job Queue Threshold System

## Overview

The job queue system now implements a smart threshold mechanism to prevent unnecessary API calls when users already have sufficient jobs in their queue.

## Key Features

### 🎯 Minimum Job Threshold
- **Threshold**: 10 jobs per user
- **Configurable**: Set via `MIN_JOBS_THRESHOLD` constant in `job_queue_manager.py`
- **Purpose**: Prevent redundant job fetching for users who already have adequate job options

### 🚀 Smart Fetching Logic

#### When Jobs Are NOT Fetched
- User has >= 10 jobs in their available queue
- Prevents unnecessary API calls
- Improves response times
- Reduces API usage costs

#### When Jobs ARE Fetched
- User has < 10 jobs in their available queue
- New user with empty queue
- User has swiped through most of their jobs

### 📊 Queue Status Updates

The queue status calculation has been updated to reflect the new threshold:

- **EMPTY**: 0 jobs
- **CRITICAL**: < `min_queue_size` (typically 5)
- **LOW**: < 10 jobs (MIN_JOBS_THRESHOLD)
- **HEALTHY**: >= 10 jobs

## Implementation Details

### Modified Functions

1. **`get_jobs_for_user()`**
   - Checks job count before fetching
   - Skips fetch if >= 10 jobs available
   - Logs decision for monitoring

2. **`warm_user_queue()`**
   - Only warms queue if < 10 jobs
   - Prevents unnecessary warming for users with sufficient jobs

3. **`_calculate_queue_status()`**
   - Updated LOW threshold to 10 jobs
   - Better reflects when fetching is needed

### API Endpoint Changes

**`/jobs/for-user/{user_id}`**
- Now checks total available jobs before warming queue
- Only triggers warming if < 10 total jobs
- Improved logging for monitoring

## Benefits

### 🔧 Performance Improvements
- **Faster Response Times**: Skip API calls when unnecessary
- **Reduced Latency**: Return cached jobs immediately
- **Better User Experience**: Consistent job availability

### 💰 Cost Optimization
- **Lower API Usage**: Prevent redundant external API calls
- **Reduced Rate Limiting**: Less likely to hit API limits
- **Efficient Resource Usage**: Focus API calls on users who need them

### 📈 Scalability
- **Better Resource Management**: Distribute API calls more efficiently
- **Improved Throughput**: Handle more users with same API quota
- **Smart Caching**: Leverage existing job data effectively

## Configuration

### Adjusting the Threshold

To change the minimum job threshold, modify the constant in `job_queue_manager.py`:

```python
# Configuration constants
MIN_JOBS_THRESHOLD = 10  # Change this value as needed
```

### Monitoring

The system provides detailed logging to monitor the threshold behavior:

```
✅ User {user_id} has sufficient jobs (15 >= 10), skipping fetch to avoid unnecessary API calls
🔥 Pre-warming queue for user {user_id} (current: 5)
✅ Queue already has sufficient jobs for user {user_id} (12 jobs >= 10)
```

## Testing

### Automated Tests
- `test_api.py` includes tests for threshold behavior
- Verifies fetching is skipped when >= 10 jobs
- Confirms fetching occurs when < 10 jobs

### Manual Testing
- Use `test_queue_behavior.py` to test with real users
- Monitor logs for threshold decisions
- Check queue stats before/after requests

## Migration Notes

### Existing Users
- Users with existing job queues will benefit immediately
- No data migration required
- Existing jobs remain in queue

### Backward Compatibility
- All existing API endpoints work unchanged
- Queue stats include same information
- No breaking changes to client applications

## Troubleshooting

### Common Issues

1. **User Not Getting New Jobs**
   - Check if user has >= 10 jobs in queue
   - Verify jobs haven't been swiped
   - Check queue stats via API

2. **Unexpected API Calls**
   - Verify MIN_JOBS_THRESHOLD configuration
   - Check for users with < 10 jobs
   - Monitor queue status logs

3. **Performance Issues**
   - Ensure threshold is set appropriately
   - Monitor API usage patterns
   - Check for users with very large queues

### Monitoring Queries

Check users with low job counts:
```sql
SELECT user_id, available_jobs_count 
FROM user_queue_stats 
WHERE available_jobs_count < 10;
```

Monitor API usage reduction:
```sql
SELECT DATE(created_at), COUNT(*) as api_calls
FROM api_usage_logs 
WHERE endpoint LIKE '%jobs%'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
```
