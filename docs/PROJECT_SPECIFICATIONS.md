# Kidoers - Family Task Management Application

## 📋 Project Overview

**Kidoers** is a Next.js-based family task management application designed to help families organize chores, track activities, and manage rewards for children. The application provides a complete family management system with user authentication, task assignment, calendar integration, and reward tracking.

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI + shadcn/ui
- **Package Manager**: pnpm
- **Data Storage**: Browser localStorage (Prototype)
- **Authentication**: Supabase Authentication (JWT + Google OAuth)
- **Database**: Supabase (configured and actively used)

### Project Structure
```
kidoers_front/
├── app/                          # Next.js App Router
│   ├── components/               # Reusable UI components
│   │   ├── auth/                # Authentication components
│   │   ├── dashboard/           # Dashboard components

│   │   ├── layout/              # Layout components
│   │   └── onboarding/          # Onboarding components
│   ├── dashboard/               # Dashboard pages
│   ├── signin/                  # Sign-in page
│   ├── signup/                  # Sign-up page
│   ├── forgot-password/         # Password reset page
│   ├── onboarding/              # Onboarding flow
│   ├── lib/                     # Utility libraries
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Shared UI components
├── public/                      # Static assets
├── docs/                        # Project documentation
└── [config files]               # Configuration files
```

## 🔐 Authentication System

### Implemented Functions

#### User Management
- **`auth.signUp(email, password)`**: Creates new user account
  - Validates email and password
  - Creates user in Supabase auth.users table
  - Automatically creates profile via database trigger
  - Returns user object or error

- **`auth.signIn(email, password)`**: Authenticates existing user
  - Validates credentials against Supabase
  - Creates JWT session
  - Returns user object or error

- **`auth.signInWithGoogle()`**: Google OAuth authentication
  - Redirects to Google OAuth flow
  - Creates user account if new
  - Returns redirect URL or error

- **`auth.signOut()`**: Logs out current user
  - Clears JWT session
  - Removes user data from localStorage

- **`auth.resetPassword(email)`**: Password reset functionality
  - Sends reset email via Supabase
  - Returns success/error status

- **`auth.getCurrentUser()`**: Retrieves current user
  - Gets user from Supabase session
  - Returns user object or null

### User Interface
- **Sign In Page** (`/signin`): Email/password login form
- **Sign Up Page** (`/signup`): New user registration form
- **Forgot Password Page** (`/forgot-password`): Password reset form
- **Google Sign-In**: Integrated button for OAuth authentication

## 🏠 Family Management

### Data Models

#### Family
```typescript
interface Family {
  id: string
  name: string
  createdAt: string
}
```

#### Family Member
```typescript
interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
  calmMode: boolean
  textToSpeech: boolean
}
```

### Implemented Functions

#### Family Operations
- **`storage.getFamily()`**: Retrieves family data from localStorage
- **`storage.setFamily(family)`**: Stores family data in localStorage
- **`storage.getMembers()`**: Retrieves family members list
- **`storage.setMembers(members)`**: Stores family members data

### User Interface
- **Onboarding Wizard**: Step-by-step family setup process
  - Create Family step
  - Add Members step
  - Add Chores step
  - Add Rewards step

## 📝 Task Management (Chores)

### Data Model
```typescript
interface Chore {
  id: string
  title: string
  description: string
  frequency: "daily" | "weekly" | "weekends"
  assignedTo: string
  completed: boolean
}
```

### Implemented Functions

#### Chore Operations
- **`storage.getChores()`**: Retrieves all chores from localStorage
- **`storage.setChores(chores)`**: Stores chores data in localStorage
- **Chore Creation**: Add new chores with title, description, frequency, and assignment
- **Chore Completion**: Mark chores as completed/incomplete
- **Chore Assignment**: Assign chores to specific family members
- **Chore Filtering**: Filter by frequency, assignment, and completion status

### User Interface
- **Chores View**: Main chores management interface
  - List all chores with completion status
  - Add new chores
  - Mark chores as complete/incomplete
  - Filter and sort chores
  - Assign chores to family members

## 📅 Activity Management

### Data Model
```typescript
interface Activity {
  id: string
  title: string
  description?: string
  scheduled_date: string
  depends_on_chores: boolean
}
```

### Implemented Functions

#### Activity Operations
- **`storage.getActivities()`**: Retrieves all activities from localStorage
- **`storage.setActivities(activities)`**: Stores activities data in localStorage
- **Activity Creation**: Add new calendar events
- **Activity Scheduling**: Schedule activities with dates and times
- **Chore Dependencies**: Link activities to chore completion
- **Calendar Integration**: Display activities in calendar view

### User Interface
- **Calendar View**: Monthly calendar interface
  - Display scheduled activities
  - Add new activities
  - View activity details
  - Filter by date range
  - Visual indicators for chore-dependent activities

## 🎁 Reward System

### Data Model
```typescript
interface Reward {
  id: string
  title: string
  description: string
  threshold: number
}
```

### Implemented Functions

#### Reward Operations
- **`storage.getRewards()`**: Retrieves all rewards from localStorage
- **`storage.setRewards(rewards)`**: Stores rewards data in localStorage
- **Reward Creation**: Add new rewards with titles and descriptions
- **Threshold Management**: Set completion thresholds for rewards
- **Progress Tracking**: Track progress towards reward thresholds
- **Reward Unlocking**: Automatically unlock rewards when thresholds are met

### User Interface
- **Rewards View**: Rewards management interface
  - Display all available rewards
  - Show progress towards each reward
  - Add new rewards
  - Visual progress indicators
  - Reward status (locked/unlocked)



## 💾 Data Storage System

### localStorage Implementation

#### Storage Keys
```javascript
"kidoers_user"           // Current user data
"kidoers_family"         // Family information
"kidoers_members"        // Family members list
"kidoers_chores"         // Chores/tasks
"kidoers_activities"     // Calendar activities
"kidoers_rewards"        // Family rewards
"kidoers_welcome_dismissed" // Welcome message state
```

#### Storage Functions
- **`storage.getUser()`**: Retrieve user data
- **`storage.setUser(user)`**: Store user data
- **`