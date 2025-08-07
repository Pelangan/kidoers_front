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

## 🎨 Design System & Color Palette

### **Color Palette (HSL Format)**

#### **Light Mode Colors:**
- **Background**: `20 30% 98%` (warm off-white)
- **Foreground**: `15 25% 15%` (dark brown)
- **Primary**: `12 85% 65%` (warm coral)
- **Primary Foreground**: `0 0% 100%` (white)
- **Secondary**: `260 30% 92%` (soft lavender)
- **Secondary Foreground**: `260 30% 25%` (dark lavender)
- **Accent**: `140 30% 90%` (soft mint)
- **Accent Foreground**: `140 40% 25%` (dark mint)
- **Muted**: `30 40% 95%` (gentle cream)
- **Muted Foreground**: `30 15% 45%` (medium brown)
- **Card**: `25 40% 97%` (warm card background)
- **Card Foreground**: `15 25% 15%` (dark text)
- **Border/Input**: `25 20% 88%` (soft border)

#### **Custom Design Tokens:**
- **Gradients**:
  - `-gradient-warm`: `linear-gradient(135deg, hsl(12 85% 65%), hsl(25 85% 70%))`
  - `-gradient-soft`: `linear-gradient(180deg, hsl(260 30% 98%), hsl(140 30% 96%))`
  - `-gradient-card`: `linear-gradient(145deg, hsl(25 40% 98%), hsl(30 40% 96%))`
- **Shadows**:
  - `-shadow-soft`: `0 4px 20px hsla(12, 35%, 70%, 0.15)`
  - `-shadow-card`: `0 2px 12px hsla(12, 25%, 60%, 0.1)`
  - `-shadow-button`: `0 3px 15px hsla(12, 65%, 65%, 0.25)`
- **Transitions**:
  - `-transition-smooth`: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
  - `-transition-bounce`: `all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)`
- **Border Radius**: `--radius: 0.5rem`

#### **Dark Mode Support:**
Complete dark mode variants are defined with cooler tones and proper contrast ratios.

#### **Usage in Tailwind:**
Use semantic class names like `bg-primary`, `text-foreground`, `bg-gradient-warm`, `shadow-soft`, etc. All colors are HSL-based for consistent theming.

### **Family Member Colors:**
For family member personalization, use these soft colors:
- **Blue**: `bg-blue-100`, `border-blue-300`, `text-blue-700`
- **Green**: `bg-green-100`, `border-green-300`, `text-green-700`
- **Yellow**: `bg-yellow-100`, `border-yellow-300`, `text-yellow-700`
- **Orange**: `bg-orange-100`, `border-orange-300`, `text-orange-700`
- **Purple**: `bg-purple-100`, `border-purple-300`, `text-purple-700`
- **Pink**: `bg-pink-100`, `border-pink-300`, `text-pink-700`
- **Teal**: `bg-teal-100`, `border-teal-300`, `text-teal-700`
- **Indigo**: `bg-indigo-100`, `border-indigo-300`, `text-indigo-700`

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
  color: string
  avatarStyle?: string
  avatarOptions?: Record<string, string>
  avatarUrl?: string
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
  timeOfDay: "morning" | "afternoon" | "evening"
  category?: string
  assignedTo: string
  points: number
  completed: boolean
}
```

### Multiple Assignment Feature
When assigning chores to multiple family members:
- **Individual Instances**: Each member gets their own chore instance
- **Unique IDs**: Chores use timestamp + member ID for uniqueness
- **Independent Tracking**: Each member can complete their own chore independently
- **Visual Feedback**: Selected members show their assigned colors
- **Bulk Creation**: Single form submission creates multiple chore instances

### Implemented Functions

#### Chore Operations
- **`storage.getChores()`**: Retrieves all chores from localStorage
- **`storage.setChores(chores)`**: Stores chores data in localStorage
- **Chore Creation**: Add new chores with title, description, frequency, and assignment
- **Multiple Assignment**: Assign the same chore to multiple family members simultaneously
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
  - Multiple member assignment with individual chore instances
  - Edit mode with bulk delete functionality
  - Passcode-protected edit access
  - Frequency badges (Daily, Weekly, Weekends) for each chore
  - Batch chore creation with preview and "Add Another" functionality

- **Family Members View**: Centralized family member management and avatar customization
  - Individual member cards with progress statistics
  - **Dual Avatar System**: Standard DiceBear avatars (20+ styles) + Pro custom avatars
  - **Pro Avatar Collection**: Premium custom avatars (e.g., Godzilla) with PRO badges
  - Real-time avatar customization and preview
  - Member statistics dashboard (completed chores, pending tasks, points earned, overdue priorities)
  - Completion rate progress bars
  - Avatar style selection with search and category filtering
  - Sample data generation for testing
  - Empty state with navigation to Settings

### Edit Mode & Security
- **iPhone-Style Edit Mode**: Toggle edit mode to select and delete multiple chores
- **Passcode Protection**: 4-digit PIN required to enter edit mode (only parents know the code)
- **Bulk Operations**: Select multiple chores and delete them simultaneously
- **Individual Editing**: Click pencil icon to edit individual chore details
- **Drag & Drop**: Move or duplicate uncompleted chores between family members
- **Action Popup**: Choose between "Move" or "Duplicate" when dropping chores
- **Visual Feedback**: Selected chores show red X markers, drop zones highlight
- **Family-Shared Access**: All family members use the same user account, passcode controls access

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

## 🚧 TEMPORARY DEVELOPMENT FEATURES

### ⚠️ IMPORTANT: These features are for development/testing only and MUST be removed before production

#### Force Onboarding System
**Purpose**: Allow developers to force the onboarding flow to appear for testing purposes, even when a user has already completed onboarding.

**Implementation**:
- **Storage Key**: `kidoers_force_onboarding` (boolean)
- **Storage Functions**: 
  - `storage.getForceOnboarding()`: Check if force onboarding is enabled
  - `storage.setForceOnboarding(force)`: Enable/disable force onboarding
- **Dashboard Logic**: Modified to redirect to onboarding if force flag is enabled
- **Onboarding Logic**: Modified to allow onboarding if force flag is enabled
- **Auto-Clear**: Force flag is automatically cleared when onboarding completes

**Access Methods**:
1. **Browser Console**:
   ```javascript
   kidoersDev.forceOnboarding()  // Toggle force onboarding
   kidoersDev.showStatus()        // Show current status
   kidoersDev.resetData()         // Clear all data and go to onboarding
   ```

2. **Settings Page**: Settings → Developer Tools → Force Onboarding toggle

3. **Direct localStorage**:
   ```javascript
   localStorage.setItem("kidoers_force_onboarding", "true")  // Enable
   localStorage.setItem("kidoers_force_onboarding", "false") // Disable
   ```

**Files Modified**:
- `app/lib/storage.ts` - Added force onboarding functions
- `app/dashboard/page.tsx` - Modified routing logic
- `app/onboarding/page.tsx` - Modified routing logic  
- `app/components/onboarding/OnboardingWizard.tsx` - Auto-clear flag on completion
- `app/components/dashboard/views/SettingsView.tsx` - Added developer tools section
- `app/layout.tsx` - Added console utilities

**REMOVAL CHECKLIST**:
- [ ] Remove `getForceOnboarding()` and `setForceOnboarding()` from storage.ts
- [ ] Remove force onboarding logic from dashboard/page.tsx
- [ ] Remove force onboarding logic from onboarding/page.tsx
- [ ] Remove auto-clear logic from OnboardingWizard.tsx
- [ ] Remove developer tools section from SettingsView.tsx
- [ ] Remove console utilities from layout.tsx
- [ ] Remove `kidoers_force_onboarding` from storage keys documentation
- [ ] Remove this entire "TEMPORARY DEVELOPMENT FEATURES" section

**Notes**: This feature was added on [DATE] to facilitate onboarding flow development and testing. It should be removed once the onboarding flow is finalized and tested.



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
"kidoers_force_onboarding" // TEMPORARY: Force onboarding flag (DEV ONLY)
```

#### Storage Functions
- **`storage.getUser()`**: Retrieve user data
- **`storage.setUser(user)`**: Store user data
- **`