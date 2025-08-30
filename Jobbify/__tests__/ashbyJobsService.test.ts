import { fetchAshbyJobs, validateJobBoardName, getJobBoardConfigurations } from '../services/ashbyJobsService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('AshbyJobsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateJobBoardName', () => {
    it('should validate correct job board names', () => {
      expect(validateJobBoardName('Ashby')).toBe(true);
      expect(validateJobBoardName('my-company')).toBe(true);
      expect(validateJobBoardName('company_name')).toBe(true);
      expect(validateJobBoardName('Company123')).toBe(true);
    });

    it('should reject invalid job board names', () => {
      expect(validateJobBoardName('')).toBe(false);
      expect(validateJobBoardName('company name')).toBe(false); // spaces not allowed
      expect(validateJobBoardName('company@name')).toBe(false); // special chars not allowed
      expect(validateJobBoardName('company.name')).toBe(false); // dots not allowed
    });
  });

  describe('getJobBoardConfigurations', () => {
    it('should return available job board configurations', () => {
      const configs = getJobBoardConfigurations();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('name');
      expect(configs[0]).toHaveProperty('boardName');
      expect(configs[0]).toHaveProperty('description');
    });
  });

  describe('fetchAshbyJobs', () => {
    const mockAshbyResponse = {
      apiVersion: '1',
      jobs: [
        {
          title: 'Software Engineer',
          location: 'San Francisco, CA',
          department: 'Engineering',
          team: 'Backend',
          isListed: true,
          isRemote: false,
          descriptionHtml: '<p>We are looking for a software engineer...</p>',
          descriptionPlain: 'We are looking for a software engineer with experience in backend development. Requirements: Bachelor\'s degree in Computer Science, 3+ years of experience with Python.',
          publishedAt: '2024-01-15T10:00:00Z',
          employmentType: 'FullTime',
          address: {
            postalAddress: {
              addressLocality: 'San Francisco',
              addressRegion: 'California',
              addressCountry: 'USA'
            }
          },
          jobUrl: 'https://jobs.ashbyhq.com/testcompany/software-engineer',
          applyUrl: 'https://jobs.ashbyhq.com/testcompany/apply/software-engineer',
          compensation: {
            compensationTierSummary: '$120K – $150K • 0.1% – 0.5% equity',
            scrapeableCompensationSalarySummary: '$120K - $150K',
            compensationTiers: [],
            summaryComponents: [
              {
                id: '1',
                summary: '$120K - $150K',
                compensationType: 'Salary',
                interval: '1 YEAR',
                currencyCode: 'USD',
                minValue: 120000,
                maxValue: 150000
              }
            ]
          }
        }
      ]
    };

    it('should fetch and map jobs successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAshbyResponse,
      });

      const jobs = await fetchAshbyJobs('testcompany', true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.ashbyhq.com/posting-api/job-board/testcompany'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({
        title: 'Software Engineer',
        company: 'Testcompany',
        location: 'San Francisco, CA',
        pay: '$120K - $150K',
        description: expect.stringContaining('software engineer'),
        url: 'https://jobs.ashbyhq.com/testcompany/apply/software-engineer',
      });
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const jobs = await fetchAshbyJobs('nonexistent', true);

      expect(jobs).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const jobs = await fetchAshbyJobs('testcompany', true);

      expect(jobs).toEqual([]);
    });

    it('should filter out unlisted jobs', async () => {
      const responseWithUnlistedJob = {
        ...mockAshbyResponse,
        jobs: [
          ...mockAshbyResponse.jobs,
          {
            ...mockAshbyResponse.jobs[0],
            title: 'Unlisted Job',
            isListed: false,
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithUnlistedJob,
      });

      const jobs = await fetchAshbyJobs('testcompany', true);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Software Engineer');
    });

    it('should handle missing compensation data', async () => {
      const responseWithoutCompensation = {
        ...mockAshbyResponse,
        jobs: [
          {
            ...mockAshbyResponse.jobs[0],
            compensation: undefined,
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithoutCompensation,
      });

      const jobs = await fetchAshbyJobs('testcompany', true);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].pay).toBe('Competitive salary');
    });

    it('should include compensation query parameter when requested', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAshbyResponse,
      });

      await fetchAshbyJobs('testcompany', true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('includeCompensation=true'),
        expect.any(Object)
      );
    });

    it('should exclude compensation query parameter when not requested', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAshbyResponse,
      });

      await fetchAshbyJobs('testcompany', false);

      const fetchCall = (fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).not.toContain('includeCompensation=true');
    });
  });
});
