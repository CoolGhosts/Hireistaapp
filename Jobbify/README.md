# Jobbify Mobile App

A mobile application for connecting job seekers with employers.

## Setup

### Prerequisites
- Node.js
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Running the app
- Scan the QR code with Expo Go (Android) or the Camera app (iOS)
- Press 'a' to run on Android emulator
- Press 'i' to run on iOS simulator
- Press 'w' to run in web browser

## Project Structure

- `app/` - Contains all the screens and navigation setup (using Expo Router)
- `components/` - Reusable UI components
- `constants/` - App-wide constants like colors, dimensions
- `assets/` - Images, fonts, and other static resources

## Features

- User authentication (login/signup)
- Job listings from multiple sources
- Job search and filtering
- User profiles
- Job application tracking
- **Ashby API Integration** - Fetch jobs directly from Ashby-hosted job boards
- AI-powered job recommendations
- Resume analysis and optimization
- Interview coaching
- Skill assessment

## Ashby Integration

The app now supports fetching jobs directly from Ashby-hosted job boards. This integration allows companies using Ashby to display their job postings in the app.

### Setup Ashby Integration

1. **Find your job board name**: Go to your Ashby job board URL (e.g., `https://jobs.ashbyhq.com/YourCompany`) and note the company name in the URL.

2. **Configure in the app**:
   - Open the app and go to Profile → Ashby Job Board
   - Enter your job board name
   - Choose whether to include compensation data
   - Save the configuration

3. **Alternative configuration**: You can also set it statically in `app.config.js`:
   ```javascript
   extra: {
     ASHBY_JOB_BOARD_NAME: "YourCompanyName",
     ASHBY_INCLUDE_COMPENSATION: "true",
   }
   ```

### Features
- Fetches jobs with detailed compensation data
- Automatically maps Ashby job fields to app format
- Extracts qualifications and requirements from job descriptions
- Supports remote job indicators
- Graceful fallback when Ashby API is unavailable

For detailed documentation, see [docs/ASHBY_INTEGRATION.md](docs/ASHBY_INTEGRATION.md).

## Tech Stack

- React Native
- Expo
- Expo Router for navigation
- Supabase (Backend & Authentication)
- Ashby API (Job Postings)
