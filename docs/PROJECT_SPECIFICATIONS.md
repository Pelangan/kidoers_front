# Kidoers - Family Task Management Application

## 📋 Project Overview

**Kidoers** is a Next.js-based family task management application designed to help families organize chores, track activities, and manage rewards for children. The application provides a complete family management system with user authentication, task assignment, calendar integration, and reward tracking.

## ⚠️ **IMPORTANT: TERMINOLOGY CLARIFICATION**

**🚨 CRITICAL: User Interface vs. Data Model Terminology**

To avoid confusion during development, it's essential to understand the distinction between what users see in the UI and what exists in the data model:

### **User Interface (UI) Terminology:**
- **"Planner"** = What users see and interact with in the UI
- **"Routines"** = What users see as task groups/categories within the planner

### **Data Model & Backend Terminology:**
- **"Routines"** = The main data structure (tables, files, API endpoints)
- **"Task Groups"** = Sub-components within routines

### **Why This Matters:**
- **Database tables** are named `routines` (not `planners`)
- **API endpoints** use `/routines/` (not `/planners/`)
- **File names** reference `routines` (e.g., `ManualRoutineBuilder.tsx`)
- **User-facing text** should say "Planner" and "Routines"

### **Development Guidelines:**
- ✅ **UI Labels**: Use "Planner" and "Routines" in user-facing text
- ✅ **Code Comments**: Use "Routines" when referring to data model
- ✅ **API Calls**: Use existing `/routines/` endpoints
- ✅ **File Names**: Keep existing `*routine*` naming convention
- ❌ **Don't Change**: Database schema, API endpoints, or file names
- ❌ **Don't Mix**: UI terminology in data model references

**This distinction is crucial for maintaining consistency and avoiding confusion during development.**

### **Example: Task Creation Modal**
- **UI Label**: "Assign to routine (optional)" ✅
- **Backend**: Uses `task_groups` table via `/routines/{id}/groups` endpoint ✅
- **Code**: References `routineGroups` state variable ✅
- **User Experience**: User sees "routine" but it maps to `task_groups` in the database ✅

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI + shadcn/ui
- **Package Manager**: pnpm
- **Authentication**: Supabase Authentication (JWT + Google OAuth)
- **Backend API**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Data Storage**: Backend API + localStorage (hybrid approach)

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

## 🚀 Onboarding Flow

### 2-Step Onboarding Process
1. **Step 1: Welcome & Family Creation**
   - Welcome message: "Welcome to Kidoers"
   - Subtitle: "Let's get your family set up in just a few steps"
   - Create family name and add family members with colors
   - Progress: Step 1 of 2 (50%)

2. **Step 2: Routine Creation**
   - Header: "Create Your Own Routine"
   - Subtitle: "Drag tasks from the library to build your custom routine"
   - **Full-width layout** expanding to occupy entire screen width
   - Family member columns with selected colors (responsive grid: 1-5 columns based on screen size)
   - API integration for real data loading
   - Progress: Step 2 of 2 (100%)

### Navigation
- **Back button** on step 2 for easy navigation
- **Progress bar** showing current step and completion percentage
- **Automatic progression** between steps based on user actions

### Component Architecture
- **`OnboardingWizard.tsx`**: Main orchestrator managing 2-step flow
- **`CreateFamilyStep.tsx`**: Step 1 - Family creation and member management
- **`CreateRoutineStep.tsx`**: Step 2 - Wrapper for ManualRoutineBuilder
- **`ManualRoutineBuilder.tsx`**: Core routine builder component (used in both onboarding and standalone)
  - **Dual Mode**: Works as onboarding step or standalone page
  - **Props**: Accepts `familyId` and `onComplete` for onboarding integration
  - **API Integration**: Loads family members and library data from backend
  - **Responsive Design**: Adapts layout based on usage context
  - **Layout Modes**: 
    - **Onboarding Mode**: Full-width expansion with absolute-positioned task library
    - **Standalone Mode**: Fixed-width with fixed-positioned task library

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

### Avatar System
- **DiceBear Integration**: Uses DiceBear API for generating consistent avatars
- **Avatar Customization**: Supports 20+ avatar styles with customizable options
- **Pro Avatars**: Premium custom avatars (e.g., Godzilla) with PRO badges
- **Fallback System**: Colored circles with first letter when avatars fail to load
- **API Integration**: Backend stores avatar_style, avatar_seed, and avatar_options
- **Real-time Preview**: Live avatar preview during customization

### Data Models

#### Family
```typescript
interface Family {
  id: string
  name: string
  created_by?: string
  created_at?: string
  onboarding_status?: 'not_started' | 'in_progress' | 'completed'
}
```

#### Family Member
```typescript
interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
  color: string
  age?: number | null
  avatar_url?: string
  calmMode: boolean
  textToSpeech: boolean
  avatarStyle?: string
  avatarOptions?: Record<string, string>
  avatarUrl?: string
}
```

### Implemented Functions

#### Family Operations
- **`apiService.getFamilies()`**: Retrieves all families for user
- **`apiService.createFamily(family)`**: Creates new family
- **`apiService.createFamilyWithMembers(family, members)`**: Creates family with members
- **`apiService.getFamily(familyId)`**: Retrieves specific family
- **`apiService.updateFamily(familyId, family)`**: Updates family data
- **`apiService.deleteFamily(familyId)`**: Deletes family
- **`apiService.getFamilyMembers(familyId)`**: Retrieves family members
- **`apiService.addFamilyMember(familyId, member)`**: Adds new family member
- **`apiService.updateFamilyMember(familyId, memberId, member)`**: Updates family member
- **`apiService.deleteFamilyMember(familyId, memberId)`**: Deletes family member

### User Interface
- **Onboarding Wizard**: Step-by-step family setup process
  - Create Family step
  - Add Members step
  - Add Chores step
  - Add Rewards step
- **Smart Form Validation**: 
  - Unsaved member data detection
  - Warning popup for incomplete member information
  - Visual indicators for unsaved data
  - Option to add member first or discard data

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

## 🎯 Task Instance System

### New Data Models

#### Task Instance
```typescript
interface TaskInstance {
  id: string
  routine_id: string
  routine_task_id: string
  task_assignment_id: string
  member_id: string
  due_date: string
  time_of_day: "morning" | "afternoon" | "evening" | "night" | "any"
  due_at?: string
  status: "pending" | "completed" | "overdue" | "skipped"
  completed_at?: string
  verified_by?: string
  points_awarded: number
  notes?: string
  created_at: string
}
```

#### Routine Schedule
```typescript
interface RoutineSchedule {
  id: string
  routine_id: string
  scope: "everyday" | "weekdays" | "weekends" | "custom"
  days_of_week: string[]
  start_date?: string
  end_date?: string
  timezone: string
  is_active: boolean
  created_at: string
}
```

#### Schedule Exception
```typescript
interface ScheduleException {
  id: string
  routine_schedule_id: string
  date: string
  is_skipped: boolean
  note?: string
}
```

### Task Instance Generation Rules
1. **Task Generation**: A task generates on a date if:
   - It has a non-empty `routine_tasks.days_of_week` that matches, OR
   - The routine has an active schedule (`routine_schedules`) that matches (and no skip exception that day)
2. **Idempotency**: Instances are unique per `(task_assignment_id, due_date)`
3. **Time of Day**: Used for UI grouping; `due_at` is optional exact datetime
4. **Status Flow**: `pending` → `completed` → `verified` (optional parent verification)

### Key Features
- **Automatic Generation**: Task instances are generated based on routine schedules and task assignments
- **Flexible Scheduling**: Support for daily, weekly, custom schedules with exceptions
- **Parent Verification**: Parents can verify child task completions
- **Points System**: Integrated with existing reward system
- **Timezone Support**: All operations respect family timezone settings
- **Bulk Operations**: Generate instances for date ranges efficiently

### Multiple Assignment Feature
When assigning chores to multiple family members:
- **Individual Instances**: Each member gets their own chore instance
- **Unique IDs**: Chores use timestamp + member ID for uniqueness
- **Independent Tracking**: Each member can complete their own chore independently
- **Visual Feedback**: Selected members show their assigned colors
- **Bulk Creation**: Single form submission creates multiple chore instances

## 🔄 Multi-Member Task Assignment System

### Overview
The multi-member task assignment system allows creating tasks that can be assigned to multiple family members simultaneously, with proper instance generation and management for both one-off and recurring tasks.

### Database Schema Updates
- **`task_assignments`**: Added `is_active` column for soft delete functionality
- **`routine_tasks`**: Added `is_active` column for soft delete functionality
- **Unique Constraint**: Added `task_assignments_unique_member` constraint to prevent duplicate assignments
- **View**: Created `v_routine_tasks_with_assignees` view for efficient querying of tasks with assignee information

### Backend API Endpoints

#### Multi-Member Task Creation
- **`POST /routines/{routine_id}/tasks/multi-member`**: Create a task and assign it to multiple members
  - **Request Body**: `MultiMemberTaskCreate` with name, description, points, duration, time_of_day, frequency, days_of_week, date, member_ids
  - **Response**: `MultiMemberTaskResponse` with task_id, member_count, assignments_created, instances_created
  - **Features**: Automatic instance generation based on frequency (one_off, daily, specific_days, weekly)

#### Task with Assignees Query
- **`GET /routines/{routine_id}/tasks/with-assignees`**: Get all tasks with assignee information
  - **Response**: Array of `TaskWithAssignees` with member_count and assignees array
  - **Features**: Uses database view for efficient querying

#### Multi-Member Task Deletion
- **`POST /routines/{routine_id}/tasks/multi-member-delete`**: Delete task with scope options
  - **Request Body**: `MultiMemberTaskDelete` with delete_scope and member_scope
  - **Scopes**: Time scope (this_occurrence, this_and_following, all_occurrences) and Member scope (this_member, all_members)
  - **Response**: `MultiMemberTaskDeleteResponse` with deletion statistics

### Frontend Components

#### MultiMemberSelector
- **Purpose**: Component for selecting multiple family members for task assignment
- **Features**:
  - Quick selection buttons (All Family, All Kids, All Parents)
  - Individual member selection with avatar display
  - Selected members preview with remove functionality
  - Multi-member indicator when multiple members selected
- **Location**: `app/components/routines/builder/components/MultiMemberSelector.tsx`

#### MultiMemberBadge
- **Purpose**: Visual indicator for multi-member tasks
- **Features**:
  - Shows member count with Users icon
  - Stacked avatars of assigned members (up to 3 visible)
  - "+N" indicator for additional members
  - Tooltip with member names and roles
- **Location**: `app/components/routines/builder/components/MultiMemberBadge.tsx`

#### MultiMemberDeleteModal
- **Purpose**: Two-step deletion modal for multi-member tasks
- **Features**:
  - Step 1: Time scope selection (this occurrence, this & following, all occurrences)
  - Step 2: Member scope selection (this member only, all assigned members)
  - Context-aware options based on task type (recurring vs one-off)
  - Clear descriptions of what will be deleted
- **Location**: `app/components/routines/builder/components/MultiMemberDeleteModal.tsx`

### Task Creation Flow
1. **Member Selection**: User selects one or more family members using MultiMemberSelector
2. **Task Configuration**: User sets task name, description, points, duration, time of day, and frequency
3. **API Call**: Frontend calls `createMultiMemberTask` with all configuration
4. **Backend Processing**: 
   - Creates single `routine_tasks` record
   - Creates multiple `task_assignments` records (one per member)
   - Generates `routine_task_instances` based on frequency and date range
5. **UI Update**: Frontend updates calendar view with new tasks showing multi-member indicators

### Visual Indicators
- **👥 Badge**: Shows member count for multi-member tasks
- **Stacked Avatars**: Displays up to 3 member avatars with "+N" for additional members
- **Task Cards**: Multi-member tasks show assignee information in task cards
- **Calendar View**: Each member sees their own instance of multi-member tasks

### Data Models

#### MultiMemberTaskCreate
```typescript
interface MultiMemberTaskCreate {
  name: string
  description?: string
  points: number
  duration_mins?: number
  time_of_day?: "morning" | "afternoon" | "evening" | "night" | "any"
  frequency: "one_off" | "daily" | "specific_days" | "weekly"
  days_of_week?: string[]
  date?: string
  member_ids: string[]
}
```

#### TaskWithAssignees
```typescript
interface TaskWithAssignees {
  id: string
  routine_id: string
  group_id?: string
  name: string
  description?: string
  points: number
  duration_mins?: number
  time_of_day?: string
  frequency: string
  days_of_week: string[]
  order_index: number
  recurring_template_id?: string
  member_count: number
  assignees: Array<{
    id: string
    name: string
    role: string
    avatar_url?: string
    color: string
  }>
}
```

### Deletion Scopes
- **Time Scope**:
  - `this_occurrence`: Delete only the specific date instance
  - `this_and_following`: Delete from specific date onwards (recurring tasks)
  - `all_occurrences`: Delete all instances (recurring tasks)
- **Member Scope**:
  - `this_member`: Remove task only for the current member
  - `all_members`: Remove task for all assigned members

### Implementation Benefits
- **Efficiency**: Single API call creates multiple assignments and instances
- **Consistency**: All members get identical task configuration
- **Flexibility**: Support for both one-off and recurring multi-member tasks
- **User Experience**: Clear visual indicators and intuitive selection interface
- **Data Integrity**: Proper constraints prevent duplicate assignments
- **Scalability**: Database view optimizes querying of multi-member tasks

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

- **Dashboard Integration**: Main dashboard with sidebar navigation
  - **Chores View**: Primary task management interface with routine builder integration
  - **Calendar View**: Monthly calendar for activity scheduling
  - **Family Members View**: Member management and avatar customization
  - **Rewards View**: Placeholder for future rewards system
  - **Settings View**: Account and preference management
  - **Routine Builder**: Integrated routine creation and editing

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
  description: string
  location?: string
  time?: string
  duration?: number
  frequency?: 'daily' | 'weekly' | 'monthly'
  daysOfWeek?: string[]
  icon?: string
  assignedTo?: string
  completed: boolean
  scheduled_date?: string
  depends_on_chores?: boolean
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
  type: 'complete_tasks' | 'complete_categories' | 'complete_time_slots' | 'specific_tasks' | 'streak' | 'mixed'
  conditions: any
  icon: string
  availableTo: string
  threshold?: number
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
- **Rewards View**: Rewards management interface (Currently shows "Coming soon!" placeholder)
  - Display all available rewards
  - Show progress towards each reward
  - Add new rewards
  - Visual progress indicators
  - Reward status (locked/unlocked)
  - **Note**: RewardsView component exists but is not fully implemented yet





## 🔧 API Implementation & Fixes

### API Response Handling
- **DELETE Operations**: All DELETE endpoints return 204 No Content status
- **Empty Response Handling**: Frontend properly handles responses with no content
- **JSON Parsing**: Prevents "Unexpected end of JSON input" errors on empty responses
- **Status Code Support**: Handles 204, 200, and other HTTP status codes appropriately

### Fixed Issues
- **Family Member Deletion**: Resolved JSON parsing error when deleting family members
- **Routine Deletion**: Fixed similar issues with routine groups and tasks deletion
- **Consistent Error Handling**: All DELETE operations now work without console errors

## 🎯 Routine Builder System

### Manual Routine Builder
- **Wireframe-Exact Implementation**: Complete recreation of the routine builder interface
- **Family Member Selection**: Interactive family member selector with avatar display
  - **Avatar Display**: Shows family member avatars using DiceBear API or fallback colored circles
  - **Avatar Fallback**: Colored circles with first letter of name when avatars fail to load
  - **Member Colors**: Each family member has a unique color scheme for visual identification
  - **Selection State**: Visual feedback for selected family member with blue border and shadow
- **Family Member Columns**: Individual columns for each family member with their selected colors
- **Collapsible Right Panel**: Task library panel that can be collapsed/expanded
- **Responsive Layout**: Main content expands to full width when right panel is collapsed
- **Task Library Features**: 
  - **Filter Options**: All, Groups Only, Tasks Only
  - **Task Groups**: Displayed with folder icon, showing task count, system badge (if applicable), and preview of first 3 tasks
  - **Individual Tasks**: Displayed with ListTodo icon, showing points, system badge (if applicable), and duration
  - **System Badge**: Purple "system" badge appears for tasks/groups provided by the system (based on `is_system` field from API)
  - **Library Creation**: Users can create custom task groups and individual tasks to add to their personal library
  - **API Integration**: Connected to real backend endpoints for routine management
- **Library Data**: Dynamic loading of task groups and individual tasks from API
- **Filter Options**: Show all, groups only, or tasks only
- **Drag & Drop**: Full drag and drop functionality for tasks and groups
- **Smart Assignment**: Choose who receives tasks (individual, all kids, all parents, all family)
- **Task Management**: Remove tasks/groups (task grouping functionality removed for simplicity)
- **Lazy Routine Creation**: Routine draft is created only when user starts building (types name or adds tasks)
- **Manual Save Progress**: Users can save their progress with a dedicated button (only enabled when routine name is provided)
- **Task Persistence**: Save Progress now persists tasks and groups to backend database with duplicate prevention
- **Routine Resume**: Users can resume their onboarding routine if they close the browser and return later
- **Automatic Loading**: Existing routines are automatically loaded when returning to the onboarding flow
- **Data Restoration**: Tasks and groups are restored into family member cards with proper task assignments
- **Silent 404 Handling**: Onboarding routine 404 errors are handled silently for first-time users
- **Optimized API Calls**: Single useEffect with concurrent data loading to minimize API requests
- **No Auto-Save**: Removed automatic backend calls during name editing to prevent errors
- **Smart Publishing**: Routine is published to active status when user completes onboarding
- **Onboarding Routine Loading**: Properly loads draft routines with `is_onboarding_routine = true` when navigating back to the screen
- **Dual Routine Loading**: First attempts to load onboarding routine, then falls back to active routine if not found
- **Task Order Persistence**: Saves task order within columns using `routine_task_day_orders` table and bulk update API
- **Drag & Drop Reordering**: Real-time task reordering with visual feedback and automatic order tracking
- **Visual Design**: Matches wireframe exactly with proper colors and layout

## 🔌 API Integration

### Library Management API Endpoints
- **`GET /library/groups`**: Retrieves available task group templates with `is_system` field
- **`POST /library/groups`**: Creates new task group templates
- **`GET /library/tasks`**: Retrieves available individual task templates with `is_system` field  
- **`POST /library/tasks`**: Creates new individual task templates

### Routine Builder API Endpoints
- **`POST /routines`**: Creates routine draft for family
- **`PATCH /routines/{routine_id}`**: Updates routine name and status
- **`GET /family-members`**: Fetches family members for routine assignment
- **`POST /routines/{routine_id}/groups`**: Adds task groups to routine
- **`POST /routines/{routine_id}/tasks`**: Adds individual tasks to routine
- **`DELETE /routines/{routine_id}/groups/{group_id}`**: Removes task groups
- **`DELETE /routines/{routine_id}/tasks/{task_id}`**: Removes individual tasks
- **`GET /routines/onboarding/{family_id}`**: Retrieves the onboarding routine for a family
- **`GET /routines/{routine_id}/groups`**: Retrieves all task groups for a routine
- **`GET /routines/{routine_id}/tasks`**: Retrieves all tasks for a routine
- **`POST /routines/{routine_id}/tasks/{task_id}/assignments`**: Creates a task assignment to a family member
- **`GET /routines/{routine_id}/assignments`**: Retrieves all task assignments for a routine
- **`DELETE /routines/{routine_id}/tasks/{task_id}/assignments/{assignment_id}`**: Deletes a task assignment

### Task Instance Management API Endpoints
- **`GET /families/{family_id}/task-instances`**: Get task instances with filtering (date, member, status, time_of_day)
- **`GET /families/{family_id}/task-instances/{instance_id}`**: Get specific task instance
- **`PATCH /families/{family_id}/task-instances/{instance_id}`**: Update task instance (status, notes, due_at)
- **`POST /families/{family_id}/task-instances/{instance_id}/complete`**: Mark task as completed
- **`POST /families/{family_id}/task-instances/{instance_id}/verify`**: Verify task completion (for parents)

### Routine Schedule Management API Endpoints
- **`POST /routines/{routine_id}/schedules`**: Create a new schedule for a routine
- **`GET /routines/{routine_id}/schedules`**: Get all schedules for a routine
- **`PATCH /routines/{routine_id}/schedules/{schedule_id}`**: Update a schedule
- **`DELETE /routines/{routine_id}/schedules/{schedule_id}`**: Delete a schedule
- **`POST /routines/{routine_id}/schedules/{schedule_id}/exceptions`**: Create a schedule exception
- **`GET /routines/{routine_id}/schedules/{schedule_id}/exceptions`**: Get schedule exceptions
- **`PATCH /routines/{routine_id}/schedules/{schedule_id}/exceptions/{exception_id}`**: Update exception
- **`DELETE /routines/{routine_id}/schedules/{schedule_id}/exceptions/{exception_id}`**: Delete exception

### Task Instance Generation API Endpoints
- **`POST /families/{family_id}/generate-instances`**: Generate task instances for a date range
- **`POST /families/{family_id}/generate-instances/{date}`**: Generate task instances for a specific date
- **`POST /families/{family_id}/reconcile-instances/{date}`**: Reconcile instances for a date

### Day-Specific Order Management API Endpoints
- **`GET /routines/{routine_id}/day-orders`**: Get day-specific task orders
- **`POST /routines/{routine_id}/day-orders`**: Create day-specific order
- **`PUT /routines/{routine_id}/day-orders/{order_id}`**: Update day-specific order
- **`DELETE /routines/{routine_id}/day-orders/{order_id}`**: Delete day-specific order
- **`POST /routines/{routine_id}/day-orders/bulk`**: Bulk update day orders
- **`POST /routines/{routine_id}/day-orders/copy`**: Copy day orders between days

### Group Assignment API Endpoints
- **`POST /routines/{routine_id}/groups/{group_template_id}/assign`**: Assign group template to members
- **`POST /routines/{routine_id}/groups/{group_id}/assign`**: Assign existing group to members

### Multi-Member Task Assignment API Endpoints
- **`POST /routines/{routine_id}/tasks/multi-member`**: Create a task and assign it to multiple members
- **`GET /routines/{routine_id}/tasks/with-assignees`**: Get all tasks with assignee information
- **`POST /routines/{routine_id}/tasks/multi-member-delete`**: Delete task with scope options (time + member scope)

### Full Routine Data API Endpoints
- **`GET /routines/{routine_id}/full-data`**: Get complete routine data with groups, tasks, assignments, and schedules

### Dashboard & Summary API Endpoints
- **`GET /families/{family_id}/dashboard`**: Get family dashboard data (pending tasks, completed today, etc.)
- **`GET /families/{family_id}/members/{member_id}/progress`**: Get member's task progress
- **`GET /families/{family_id}/calendar/{date}`**: Get tasks for a specific date

### Data Flow
1. **Lazy Routine Creation**: Creates draft routine only when user starts building (types name or adds tasks)
2. **Family Loading**: Fetches family members with their selected colors
3. **Library Loading**: Dynamically loads task groups and tasks from backend
4. **Onboarding Routine Loading**: First attempts to load existing onboarding routine (draft status with `is_onboarding_routine = true`)
5. **Fallback Loading**: If no onboarding routine found, loads active routine for edit mode
6. **Task Reordering**: Drag and drop updates local state and tracks day-specific order changes
7. **Manual Progress Saving**: Users explicitly save progress with dedicated button
8. **Day Order Persistence**: Saves task order within columns using bulk update API to `routine_task_day_orders` table
9. **Publishing**: Routine status changes from draft to active when onboarding is completed
10. **Task Instance Generation**: Automatically generates task instances based on routine schedules and task assignments
11. **Task Execution**: Family members complete tasks, parents verify completion, points are awarded

## 💾 Data Storage System

### Hybrid Storage Implementation

The application uses a hybrid approach combining backend API calls with localStorage for optimal performance and offline capability.

#### Backend API Storage (Primary)
- **Family Management**: All family and member data stored in Supabase database
- **Routine Management**: Complete routine system with groups, tasks, and assignments
- **Task Instances**: Real-time task tracking and completion status
- **User Profiles**: User data and preferences stored in backend

#### localStorage Storage (Secondary)
```javascript
"kidoers_user"           // Current user session data
"kidoers_family"         // Cached family information
"kidoers_members"        // Cached family members list
"kidoers_chores"         // Cached chores/tasks
"kidoers_activities"     // Cached calendar activities
"kidoers_rewards"        // Cached family rewards
"kidoers_routines"       // Cached routine data
"kidoers_routine_task_groups" // Cached routine groups
"kidoers_routine_tasks"  // Cached routine tasks
"kidoers_welcome_dismissed" // Welcome message state
```

#### Storage Functions (17 total)
- **User**: `getUser()`, `setUser()`, `removeUser()`
- **Family**: `getFamily()`, `setFamily()`
- **Members**: `getMembers()`, `setMembers()`
- **Chores**: `getChores()`, `setChores()`
- **Activities**: `getActivities()`, `setActivities()`
- **Rewards**: `getRewards()`, `setRewards()`
- **Routines**: `getRoutines()`, `setRoutines()`
- **Routine Task Groups**: `getRoutineTaskGroups()`, `setRoutineTaskGroups()`
- **Routine Tasks**: `getRoutineTasks()`, `setRoutineTasks()`
- **Utility**: `clearAll()`, `checkOnboardingStatus()`