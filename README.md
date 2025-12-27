# Pledge

A private, group-based daily accountability system designed for speed and consistency.

## Overview

Pledge is a web application that helps individuals and groups track daily resolutions, maintain consistency, and compete on discipline. Users can create personal goals, join accountability groups, track daily check-ins, and see their progress through leaderboards and reports.

## Features

- **Personal Resolutions**: Create and track daily resolutions with different types (binary, streak, frequency)
- **Group Accountability**: Join or create groups with invite codes for shared accountability
- **Daily Check-ins**: Quick daily check-in system to mark resolution completion
- **Leaderboards**: Track rankings within your group (all-time and monthly)
- **Social Feed**: See group activity, streaks, and achievements
- **Reports**: Weekly and monthly progress reports
- **Year in Review**: Annual summary of your consistency and achievements
- **Graveyard**: Archive resolutions that didn't work out
- **Badges & Achievements**: Earn badges for milestones like 7-day streaks, 30-day streaks, and more
- **Daily Hero**: Recognition system for group members who complete all resolutions
- **Difficulty Voting**: Peer validation of resolution difficulty
- **Credibility System**: Vote on whether members completed their resolutions

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Lucide React** - Icon library
- **Tailwind CSS** - Styling (via CDN)
- **LocalStorage** - Data persistence (mock service)

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pledge
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Project Structure

```
pledge/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Layout.tsx
│   └── Logo.tsx
├── pages/              # Page components
│   ├── Auth.tsx
│   ├── DailyCheckIn.tsx
│   ├── Resolutions.tsx
│   ├── ResolutionDetail.tsx
│   ├── GroupResolutions.tsx
│   ├── Leaderboard.tsx
│   ├── GroupFeed.tsx
│   ├── Profile.tsx
│   ├── GroupEntry.tsx
│   ├── YearInReview.tsx
│   ├── PeriodicReport.tsx
│   └── Graveyard.tsx
├── services/           # API/service layer
│   └── mockService.ts  # LocalStorage-based mock API
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main app component with routing
├── index.tsx           # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Usage

### Getting Started

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Join or Create a Group**: Enter an invite code or create a new group
3. **Create Resolutions**: Add your daily goals/resolutions
4. **Daily Check-ins**: Mark your resolutions as complete each day
5. **Track Progress**: View your stats, streaks, and rankings

### Resolution Types

- **Binary**: Simple yes/no daily completion
- **Streak**: Track consecutive days completed
- **Frequency**: Complete a certain number of times per period

### Group Features

- **Invite Codes**: Share a code to invite others to your group
- **Daily Hero**: Member who completes all resolutions gets recognized
- **Group Feed**: See all group activity in one place
- **Leaderboard**: Compete on consistency and points

## Development

The app uses a mock service (`services/mockService.ts`) that stores all data in browser localStorage. This means:
- Data persists across sessions in the same browser
- No backend server required for development
- Data is cleared when browser storage is cleared

## Building for Production

```bash
npm run build
```

The production build will be output to the `dist/` directory.

