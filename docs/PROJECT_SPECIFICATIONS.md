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
- **Authentication**: Mock authentication system
- **Database**: Supabase (configured but not actively used)

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
- **`signUp(email, password)`**: Creates new user account
  - Validates email and password (min 6 characters)
  - Checks for existing users
  - Stores user data in localStorage
  - Returns user object or error

- **`signIn(email, password)`**: Authenticates existing user
  - Accepts any email/password combination (mock mode)
  - Stores user session in localStorage
  - Returns user object or error

- **`signInWithGoogle()`**: Google OAuth simulation
  - Mock Google authentication
  - Creates mock user account
  - Returns user object or error

- **`signOut()`**: Logs out current user
  - Removes user data from localStorage
  - Clears session

- **`resetPassword(email)`**: Password reset functionality
  - Validates email format
  - Mock password reset process
  - Returns success/error status

- **`getCurrentUser()`**: Retrieves current user
  - Gets user from localStorage
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
- **`storage.removeUser()`**: Remove user data
- **`storage.getFamily()`**: Retrieve family data
- **`storage.setFamily(family)`**: Store family data
- **`storage.getMembers()`**: Retrieve members data
- **`storage.setMembers(members)`**: Store members data
- **`storage.getChores()`**: Retrieve chores data
- **`storage.setChores(chores)`**: Store chores data
- **`storage.getActivities()`**: Retrieve activities data
- **`storage.setActivities(activities)`**: Store activities data
- **`storage.getRewards()`**: Retrieve rewards data
- **`storage.setRewards(rewards)`**: Store rewards data
- **`storage.clearAll()`**: Clear all application data

## 🎨 User Interface Components

### Authentication Components
- **`SignIn.tsx`**: Sign-in form with email/password and Google OAuth
- **`SignUp.tsx`**: Registration form with validation
- **`ForgotPassword.tsx`**: Password reset form

### Dashboard Components
- **`Dashboard.tsx`**: Main dashboard with navigation
- **`Sidebar.tsx`**: Navigation sidebar with menu items
- **`ChoresView.tsx`**: Chores management interface
- **`CalendarView.tsx`**: Calendar and activities view
- **`RewardsView.tsx`**: Rewards and progress tracking

### Onboarding Components
- **`OnboardingWizard.tsx`**: Multi-step onboarding flow
- **`CreateFamily.tsx`**: Family creation step
- **`AddMembers.tsx`**: Family members addition step
- **`AddChores.tsx`**: Initial chores setup step
- **`AddRewards.tsx`**: Rewards configuration step

### Layout Components
- **`AuthLayout.tsx`**: Layout wrapper for authentication pages



## 🚀 Application Flow

### 1. Initial Access
- User visits application
- System checks for existing user
- Redirects to sign-in if no user exists

### 2. Authentication
- User signs in or creates account
- System stores user session
- Redirects to onboarding or dashboard

### 3. Onboarding (First-time users)
- Create family profile
- Add family members
- Set up initial chores
- Configure rewards system

### 4. Dashboard Usage
- Manage chores and tasks
- Schedule activities
- Track reward progress
- View family calendar

### 5. Data Persistence
- All changes saved to localStorage
- Data persists between sessions

## 🔧 Technical Implementation

### Next.js App Router
- **File-based routing**: Automatic route generation
- **Client-side navigation**: `next/link` and `useRouter`
- **Layout system**: Nested layouts for consistent UI
- **Server-side rendering**: Optimized performance

### State Management
- **localStorage**: Primary data persistence
- **React hooks**: Local component state
- **Context API**: Global state management (if needed)

### Styling System
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Pre-built component library
- **Radix UI**: Accessible component primitives
- **Custom CSS**: Global styles and animations

### Type Safety
- **TypeScript**: Full type safety throughout
- **Interface definitions**: Clear data contracts
- **Type checking**: Compile-time error prevention

## 📱 Responsive Design

### Mobile Support
- **Responsive layouts**: Mobile-first design
- **Touch-friendly**: Optimized for touch interactions
- **Mobile navigation**: Collapsible sidebar
- **Adaptive components**: Responsive UI elements

### Accessibility
- **ARIA labels**: Screen reader support
- **Keyboard navigation**: Full keyboard accessibility
- **Color contrast**: WCAG compliant
- **Focus management**: Proper focus indicators

## 🔮 Future Enhancements

### Potential Features
- **Real backend integration**: Replace localStorage with database
- **User authentication**: Implement real auth system
- **Data synchronization**: Cross-device data sync
- **Push notifications**: Reminder notifications
- **Offline support**: Service worker implementation
- **Analytics**: Usage tracking and insights
- **Multi-language support**: Internationalization
- **Advanced reporting**: Detailed progress reports

### Technical Improvements
- **Database migration**: Supabase integration
- **API development**: RESTful API endpoints
- **Real-time updates**: WebSocket integration
- **Performance optimization**: Code splitting and lazy loading
- **Testing**: Unit and integration tests
- **CI/CD**: Automated deployment pipeline

## 📄 License

This project is a prototype/demo application for family task management. All code and documentation are provided for educational and demonstration purposes.

---

**Last Updated**: December 2024  
**Version**: 0.1.0  
**Status**: Prototype/Demo 