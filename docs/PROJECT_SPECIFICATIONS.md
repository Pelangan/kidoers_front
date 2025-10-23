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

## 🔧 Recent Fixes & Improvements

### Bulk Update Recurring Tasks Fix (January 2025)
**Issue**: When updating the name of a task scheduled for multiple days, the system was throwing a duplicate key constraint violation error: `duplicate key value violates unique constraint "uniq_rt_by_template_time"`.

**Problem**: The `bulk-update-recurring` endpoint was trying to create separate tasks for each day-member combination, but the unique constraint `(routine_id, name, time_of_day, recurring_template_id)` prevented this because it doesn't include member_id or specific day in the constraint.

**Root Cause**: The logic was flawed - it was attempting to create individual tasks for each day (e.g., separate tasks for Tuesday and Friday for the same member), but the unique constraint prevents having multiple tasks with the same `(routine_id, name, time_of_day, recurring_template_id)` combination.

**Solution**: Modified the logic to group assignments by member and create one task per member with all their assigned days in a single `days_of_week` array, rather than creating separate tasks for each day.

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (lines 1948-2055)

**Key Changes**:
1. **Grouped Assignment Logic**: Now groups assignments by member to create one task per member with all their days
2. **Single Task Creation**: Creates one `routine_tasks` row per member with `days_of_week: [tuesday, friday]` instead of separate rows
3. **Simplified Deletion**: Deletes tasks per member rather than per day-member combination
4. **Constraint Compliance**: Respects the unique constraint by ensuring only one task per `(routine_id, name, time_of_day, recurring_template_id)` combination

**Result**: Users can now successfully update task names for recurring tasks without encountering duplicate key violations.

**Frontend Fix**: Updated the frontend code to handle the new task structure where each task contains multiple days in the `days_of_week` array instead of separate tasks per day.

**Files Modified**:
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 420-445)

**Key Changes**:
1. **Multi-Day Task Handling**: Now iterates through all days in `updatedTask.days_of_week` instead of assuming single day
2. **Proper Assignment Iteration**: Fixed the iteration over `updatedTask.assignments` to handle the array structure correctly
3. **UI Task Distribution**: Tasks are now properly added to each day they're scheduled for in the calendar view

**Backend State Update Fix**: Fixed issue where tasks disappeared from calendar after saving because the backend wasn't returning updated tasks in the response when updating existing tasks (only when creating new ones).

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (lines 1965-1985)

**Key Changes**:
1. **Response Completeness**: Now includes updated tasks in the `updated_tasks` array for both create and update operations
2. **Frontend State Sync**: Ensures frontend receives the updated task data to maintain calendar state
3. **No Refresh Required**: Tasks now persist in the calendar immediately after saving without requiring browser refresh

**Critical Days Array Fix**: Fixed issue where `days_of_week` array was empty in the response, causing tasks to disappear from calendar.

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (line 2039)

**Root Cause**: The response was using `task_row[7]` (database field) which was returning `None` instead of using `days_list` (the actual assigned days).

**Key Changes**:
1. **Correct Days Data**: Now uses `days_list` instead of `task_row[7]` for the `days_of_week` field in the response
2. **Data Consistency**: Ensures the response contains the same days that were actually assigned to the task
3. **Frontend Compatibility**: Frontend can now properly iterate through the days and display tasks correctly

**Debugging Enhancement**: Added comprehensive logging to identify why tasks disappear after saving.

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (lines 1970-1995, 2035-2060)
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 414-425, 215-220)

**Key Changes**:
1. **Backend Assignment Debugging**: Added detailed logging of assignment data creation and response structure
2. **Frontend Response Analysis**: Added logging to analyze the actual structure of received data
3. **State Change Monitoring**: Added useEffect to monitor calendar tasks state changes
4. **Step-by-Step Tracking**: Added logging for each step of the task update process

**Root Cause Investigation**: Added comprehensive debugging to identify why assignments field is undefined in frontend response.

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (lines 2087-2106)
- `kidoers_front/app/lib/api.ts` (lines 185-193)
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 453-462)

**Key Changes**:
1. **Backend Field Verification**: Added logging to check if assignments field exists in response dictionary
2. **API Response Analysis**: Added debugging in API service to check assignments immediately after JSON parsing
3. **Frontend Defensive Programming**: Added handling for undefined assignments field
4. **Response Structure Validation**: Added checks to ensure assignments field is present in all tasks

### Critical Schema Fix - Assignments Field Missing (October 2025)
**Issue**: Tasks were disappearing from the calendar after saving because the `assignments` field was `undefined` in the frontend response, preventing tasks from being re-added to the calendar after removal.

**Root Cause**: The `TaskOut` Pydantic schema did not include an `assignments` field, causing FastAPI to strip out the assignments data when serializing the response, even though the backend code was correctly creating the assignments.

**Solution**: Added `assignments: Optional[List[dict]] = None` field to the `TaskOut` schema.

**Files Modified**:
- `kidoers_backend/app/schemas/routines.py` (line 122)

**Key Changes**:
1. **Schema Update**: Added `assignments` field to `TaskOut` model to allow assignments data to be included in API responses
2. **Field Type**: Used `Optional[List[dict]]` to maintain flexibility and backward compatibility
3. **Documentation**: Added inline comment explaining the field's purpose for recurring tasks

### Multi-Member Task Creation Fix (January 2025)
**Issue**: When creating tasks for multiple family members (e.g., Cristian and Cristina), the task was only being created for Cristian instead of creating individual tasks for each selected member.

**Root Cause**: The frontend was not properly using the individually selected members (`taskAssignmentMemberIds`) when determining which members should receive the task, and the database unique constraint prevented creating multiple tasks with the same template.

**Solution**: Fixed the frontend logic to properly use individual member selection and updated the backend to create separate tasks and recurring templates for each member.

**Files Modified**:
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 378-384, 605-660)
- `kidoers_backend/app/routers/routines_builder.py` (lines 1856-1896) - Updated `/routines/{routine_id}/tasks/create-separate` endpoint

**Key Changes**:
1. **Individual Member Selection**: Added logic to use `taskAssignmentMemberIds` when individual members are selected in the modal
2. **Separate Recurring Templates**: Backend now creates separate recurring templates for each member to avoid unique constraint violations
3. **Separate Tasks**: Each member gets their own individual task in the `routine_tasks` table
4. **Unique Template Names**: Template names are made unique per member using member ID suffix
5. **Proper Response Handling**: Frontend correctly handles the response to create separate UI entries for each member

**Result**: Tasks are now properly created as separate individual tasks for each selected family member. Each member gets their own task entry in the `routine_tasks` table, their own recurring template, and their own task entry in the calendar view.

### Template Update Fix - Missing Days Persistence (October 2025)
**Issue**: When adding new days to recurring tasks (e.g., adding Sunday to a Tuesday/Thursday task), the new days would appear in the UI temporarily but disappear after browser refresh, and the modal wouldn't highlight the new days when reopened.

**Root Cause**: The bulk update function was updating individual `routine_tasks` rows with new days but **not updating the `recurring_task_templates` table**. When the frontend refreshed, it loaded data from the template which still had the old days.

**Solution**: Added template update logic to the bulk update function to sync the template's `days_of_week` and `frequency_type` fields with the new days.

**Files Modified**:
- `kidoers_backend/app/routers/routines_builder.py` (lines 2064-2084)

**Key Changes**:
1. **Template Sync**: Added logic to update `recurring_task_templates.days_of_week` with all assigned days
2. **Frequency Type Logic**: Automatically determines frequency type based on day patterns (daily, weekdays, weekends, specific_days)
3. **Persistence**: Ensures new days persist across browser refreshes and are properly loaded in modals
4. **Debugging**: Added logging to track template updates

### Mini Modal State Sync Fix (October 2025)
**Issue**: After adding new days to recurring tasks (e.g., adding Wednesday), the mini modal (task detail popup) would not immediately show the new days in the "Repeats on..." text until the edit modal was opened.

**Root Cause**: The mini modal uses `getTaskDisplayFrequency` which reads from the `recurringTemplates` state. After bulk updates, this state was not being updated with the new template data, so the mini modal continued to show the old days.

**Solution**: Added state update logic to refresh the `recurringTemplates` state after bulk updates, ensuring the mini modal immediately reflects the new days.

**Files Modified**:
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 505-520)

**Key Changes**:
1. **State Sync**: Added `setRecurringTemplates` update after bulk update completion
2. **Template Update**: Updates the specific template's `days_of_week` with new days from API response
3. **Immediate Reflection**: Mini modal now immediately shows updated days without requiring edit modal interaction
4. **Debugging**: Added logging to track template state updates

### Avatar Ordering Fix (January 2025)
**Issue**: Avatar rows in the routine grid were displaying in the order that members were selected, rather than maintaining a consistent order.

**Problem**: The `transformCalendarTasksToWeekData` function was using `selectedMemberIds.forEach()` which preserved the selection order, causing inconsistent row ordering.

**Solution**: Changed the function to iterate through `familyMembers.forEach()` and filter by `selectedMemberIds.includes(member.id)`, ensuring consistent ordering based on family member order rather than selection order.

**Files Modified**:
- `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` (lines 225-234)
- `kidoers_front/tests/integration/avatarOrdering.test.tsx` (new test file)

**Test Coverage**: Added comprehensive tests to verify consistent avatar ordering regardless of selection order.

### Avatar Positioning Fix (January 2025)
**Issue**: When adding family members to the selection, the existing member's tasks would shift up slightly due to avatar positioning changes in the grid layout.

**Problem**: The avatar column was using `flex items-center justify-center` which centered avatars vertically within each row. When the grid structure changed (adding/removing members), the centering caused slight movement of task positions.

**Solution**: Modified the avatar column styling to use `flex items-start justify-center` with additional top padding (`pt-4`), providing consistent positioning that doesn't shift when the grid structure changes.

**Files Modified**:
- `kidoers_front/app/components/routines/builder/components/PlannerWeek.tsx` (line 147)

**Result**: Avatars now maintain consistent vertical positioning regardless of how many family members are selected, eliminating the task movement issue.

### Row Height Consistency Fix (January 2025)
**Issue**: When adding family members to the selection, Cristian's row would become "compacted" or compressed due to the grid having to fit multiple rows within a fixed container height.

**Problem**: The grid container had a fixed `min-h-[900px]` height, and when multiple rows were added, they had to share this space, causing compression of existing rows. Additionally, the minimum row height was too small (60px) for comfortable viewing.

**Solution**: 
1. Removed the fixed container height constraint (`min-h-[900px]`)
2. Increased the minimum row height from 60px to 120px for better spacing
3. Increased the padding from 20px to 40px for more comfortable task spacing

**Files Modified**:
- `kidoers_front/app/components/routines/builder/components/PlannerWeek.tsx` (lines 138, 141)

**Result**: Each row now maintains its proper height regardless of how many family members are selected, eliminating the "compaction" effect when adding additional members.

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

### Bulk Task Creation Feature
When creating tasks for multiple family members:
- **Independent Tasks**: Each member gets their own separate task (different database records)
- **No Relationships**: Tasks are completely independent with no special linking or series IDs
- **Same Properties**: All tasks share the same name, description, points, frequency, etc.
- **Individual Management**: Each task can be edited or deleted independently like any regular task
- **Visual Feedback**: Selected members show their assigned colors
- **Bulk Creation**: Single form submission creates multiple separate task instances

2. **Assignment Comparison**: Compares current assignments with new member selection
3. **Selective Updates**: Only modifies assignments that have changed (adds/removes members)
4. **Instance Management**: Creates/deletes task instances only for changed assignments
5. **UI Synchronization**: Updates the existing task in the UI instead of replacing it

#### Update API Endpoint
- **`PATCH /routines/{routine_id}/tasks/{task_id}/multi-member-update`**: Update existing multi-member task
  - **Request Body**: `MultiMemberTaskCreate` with updated member_ids and optional task properties
  - **Response**: `MultiMemberTaskResponse` with update statistics
  - **Features**: 
    - Updates task properties (name, description, points, duration, time_of_day)
    - Adds/removes member assignments as needed
    - Creates/deletes task instances for new assignments
    - Returns proper response format matching `MultiMemberTaskResponse` schema
    - Adds new member assignments and creates instances
    - Removes old member assignments and deletes instances
    - Preserves existing assignments that haven't changed

#### Frontend Integration
- **Edit Detection**: Automatically detects when editing existing multi-member tasks
- **Member Selection**: Pre-populates multi-member selector with current assignees
- **Update Flow**: Uses update API instead of delete/create pattern
- **UI Updates**: Modifies existing task in calendar view instead of replacing it

### Unified Recurring Task System
The system now treats ALL weekly tasks (including single-day weekly tasks) as recurring tasks that must have a `recurring_task_templates` row. Only true one-off tasks bypass templates.

#### Core Principle
- **Every weekly task** (including tasks that happen on only one day per week) → **MUST have a `recurring_task_templates` row**
- **True one-off tasks** (single specific date with no weekly repetition) → **Can bypass templates**
- **Source of truth** for weekly repetition is the template, not `routine_tasks.frequency/days_of_week`

#### Template Creation Logic
- **Daily Tasks**: Creates `recurring_task_templates` with `frequency_type = 'every_day'` and all 7 days of the week
- **Weekly Single Day**: Creates templates with `frequency_type = 'specific_days'` and single day (e.g., `['monday']`)
- **Weekly Multiple Days**: Creates templates with `frequency_type = 'specific_days'` and specified days
- **Template Linking**: Updates the `routine_tasks` record(s) to reference the created template via `recurring_template_id`

#### API Selection Logic
- **Single-Member Tasks**: Uses `bulkCreateIndividualTasks` API (`/tasks/bulk-assign`)
  - Creates **one `routine_tasks` row per day** (multiple rows for recurring tasks)
  - Each row has `days_of_week: [day]` (single day per row)
  - Creates recurring task template and links each daily row to it
  - Enables proper single-day deletion from recurring tasks
- **Multi-Member Tasks**: Uses `createMultiMemberTask` API (`/tasks/multi-member`)
  - Creates **one `routine_tasks` row for all days** (single row with `days_of_week` array)
  - Single row has `days_of_week: [monday, tuesday, wednesday, ...]` (all days in one row)
  - Creates recurring task template and links the single row to it
  - Optimized for multi-member task management

#### Database Schema Integration
- **`recurring_task_templates`**: Stores the recurring task definition with frequency and days
- **`routine_tasks.recurring_template_id`**: Links individual task instances to their template
- **Consistency**: Ensures all recurring tasks have proper template references for future management

#### Task Rendering & Editing Behavior
- **Template as Source of Truth**: Task rendering uses `recurring_task_templates.days_of_week` instead of `routine_tasks.days_of_week`
- **Enhanced Edit Modal**: 
  - **Dropdown Options**: "Just this day", "Every day", "Select specific days"
  - **Helper Labels**: Dynamic labels showing recurrence pattern ("Every day", "Every Monday", "Repeats: Mon, Wed, Fri")
  - **Template-Based Logic**: Modal opens with correct option based on template data
  - **Validation**: Requires ≥1 day when "Select specific days" is chosen
  - **Template Updates**: Editing updates `recurring_task_templates` instead of individual task records
  - **ID Handling**: Properly extracts clean UUIDs from task IDs that may contain day suffixes
  - **Improved Helper Labels**: Days are sorted chronologically and use readable formats ("Mon, Wed, Fri" instead of random order)
  - **Template State Sync**: Delete operations refresh recurring templates to ensure edit modal shows correct remaining days
  - **Task Card Updates**: Task cards now properly update their recurrence text after delete operations by forcing React re-renders
  - **Backend Template Updates**: Delete operations now properly update `recurring_task_templates` to reflect remaining days and correct `frequency_type`
  - **API Response Handling**: Fixed frontend to handle new `updateTaskTemplate` API response format (single template object instead of array)
  - **Template-Task Sync**: `updateTaskTemplate` now updates both template and individual task records to keep them synchronized
- **UI Refresh Fix**: After template updates, the frontend now reloads calendar tasks from the backend to ensure task names update immediately in the UI
- **Simplified Task Cards**: Removed recurrence text from task cards to show only task name and avatar for cleaner UI
- **Complete Template Deletion**: When removing the last day from a recurring task, the entire template and all associated tasks are automatically deleted without errors
- **This Event Deletion Fix**: "This event" deletion now properly deletes the individual task occurrence from the database instead of just modifying the template
- **Multi-Member Task Card Styling Rollback**: Reverted multi-member task card styling changes to maintain original behavior
- **React Key Duplication Fix**: Fixed duplicate React keys issue for multi-member tasks by including member ID and day in unique keys
- **Multi-Member Task Display Fix**: Fixed issue where multi-member tasks were not showing multiple avatars and count badges. The problem was that recurring tasks were not including `assignees` data when being loaded into the calendar. Now both one-off and recurring tasks properly include `member_count` and `assignees` data for correct multi-member visualization.
- **Multi-Member Task Color Scheme**: Multi-member tasks now use a neutral gray color scheme (white background with gray left border) to distinguish them from individual member tasks, which use the member's assigned color.
- **Mandatory Family Member Selection**: At least one family member must always be selected in the routine builder. Users cannot uncheck all members, and the first member is automatically selected by default when entering the routine builder.
- **Updated Onboarding Header**: Changed the onboarding title from "Create Your Own Routine" to "Create Your Planner" and removed the instruction text "Drag tasks from the library to build your custom routine" for a cleaner header.
- **Updated Field Labels**: Changed "Routine Name" to "Planner Name" and placeholder text from "My Family Routine" to "My Planner" throughout the routine builder interface. Also updated validation messages and save button text to use "planner" terminology.
- **View Mode Button Layout**: Moved the "Calendar View" and "Group View" buttons to the right side of the family member selector interface for better visual balance.
- **Recurring Task Deletion Fix**: Fixed issue where deleting days from recurring tasks was not properly updating the `recurring_task_templates` table and remaining `routine_tasks` entries. The backend now correctly updates both the template and individual task records to maintain consistency.
- **Edit Modal Data Freshness**: Fixed edit modal to fetch fresh template data from the API instead of using stale state data, ensuring that recurrence information is always current after deletion operations.
- **This Event Deletion Fix**: Fixed "This event" deletion scope to properly update the `recurring_task_templates` table when removing individual days from recurring tasks. Previously, only individual `routine_tasks` were deleted but the template remained unchanged, causing the edit modal to show incorrect recurrence information.
- **Frequency Labels**: 
  - 7 days → "Daily"
  - 1 day → "Every Monday" (or specific day)
  - 5 weekdays → "Weekdays"
  - 2 weekend days → "Weekends"
  - Custom days → "Repeats on Mon, Wed, Fri"
- **Task Moving**: Moving tasks between days updates the template's `days_of_week` array
- **Consistency**: All tasks with the same `recurring_template_id` share the same frequency and days

#### Data Migration & Normalization
- **Migration**: `20250101_normalize_weekly_tasks_to_templates.sql` ensures all existing weekly tasks have templates
- **Backfill**: Creates `recurring_task_templates` rows for all `routine_tasks` with `frequency IN ('daily', 'weekly')`
- **Normalization**: Converts `days_of_week` to lowercase and ensures proper array format
- **Consistency Fix**: `20250101_fix_inconsistent_frequency_type.sql` corrects templates where `frequency_type` doesn't match actual `days_of_week` array
- **Constraints**: Adds validation to ensure `days_of_week` contains valid weekday names
- **Idempotent**: Migration can be run multiple times safely without creating duplicates

#### Frontend UI Integration
- **Immediate UI Updates**: Frontend now properly displays recurring tasks on all specified days immediately after creation
- **Multi-Day Display**: For "every day" tasks, the UI shows the task on all 7 days of the week without requiring a browser refresh
- **Task Distribution**: Recurring tasks are added to the calendar view for each day in the `days_of_week` array
- **Consistent Behavior**: One-off tasks still appear only on the day they were dropped, while recurring tasks appear on all scheduled days

#### Task Deletion System
- **Smart API Selection**: Frontend automatically detects whether a task uses the new multi-member system or legacy bulk system
- **Multi-Member Task Deletion**: Uses `deleteMultiMemberTask` API for new recurring tasks (single `routine_tasks` row with `days_of_week` array)
- **Legacy Task Deletion**: Uses `bulkDeleteTasks` API for old recurring tasks (multiple `routine_tasks` rows, one per day)
- **Single-Day Deletion**: Properly handles "this event" deletion for recurring tasks by deleting only the specific task instance, not the entire recurring task
- **Scope Conversion**: Converts frontend deletion scopes (`this_day`, `this_and_following`, `all_days`) to appropriate API formats (`this_occurrence`, `this_and_following`, `all_occurrences`)

#### Toast Notification System with Undo Functionality
- **Toast Integration**: Uses Radix UI toast components for user feedback
- **Undo Capability**: All task deletions and updates show a toast with an "Undo" button
- **State Restoration**: Undo functionality restores the original calendar state before the operation
- **Auto-Dismiss**: Toasts automatically dismiss after 5 seconds if no action is taken
- **Error Handling**: Shows appropriate error messages if undo operation fails
- **Visual Feedback**: Toast notifications appear at the bottom of the screen with clear messaging
- **Technical Implementation**: 
  - **File Extension**: `useTaskOperations.tsx` (not `.ts`) to support JSX syntax for ToastAction components
  - **ToastAction Element**: Properly creates React elements using `<ToastAction>` component instead of plain objects
  - **Type Safety**: Uses `ToastActionElement` type for proper TypeScript validation

### Implementation Benefits
- **Efficiency**: Single API call creates multiple assignments and instances
- **Consistency**: All members get identical task configuration
- **Flexibility**: Support for both one-off and recurring multi-member tasks
- **User Experience**: Clear visual indicators and intuitive selection interface
- **Data Integrity**: Proper constraints prevent duplicate assignments
- **Scalability**: Database view optimizes querying of multi-member tasks
- **Edit Performance**: Updates existing tasks instead of creating new ones, preventing task duplication

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
- **Family Member Selection**: Interactive multi-member selector with avatar display
  - **Multi-Selection Support**: Users can select multiple family members simultaneously
  - **Avatar Display**: Shows family member avatars using DiceBear API or fallback colored circles
  - **Avatar Fallback**: Colored circles with first letter of name when avatars fail to load
  - **Member Colors**: Each family member has a unique color scheme for visual identification
  - **Selection State**: Visual feedback for selected family members with colored borders and checkmarks
  - **Avatar Borders**: Each member's avatar circle uses their specific color (Celtic Blue, Selective Yellow, Pigment Red, Sea Green, Dark Spring Green)
  - **Checkmark Colors**: Selection checkmarks use the member's specific color
  - **Hover Effects**: Avatar borders change to member's color on hover
  - **Toggle Selection**: Click to add/remove members from selection
  - **Calendar Display**: Shows calendars for all selected members side by side
- **Multi-Member Calendar Display**: Calendar grid showing tasks from all selected members
  - **Original Layout**: Maintains the same 7-column day layout as before
  - **Combined Tasks**: Shows tasks from all selected members in the same day columns
  - **Day Headers**: Clear day labels at the top of each column (Monday, Tuesday, etc.)
  - **Task Filtering**: Displays tasks belonging to any of the selected family members
  - **Multi-Member Tasks**: Shows multi-member tasks if any selected member is assigned
  - **Single-Member Tasks**: Shows individual tasks for selected members
  - **Unified View**: All selected members' tasks appear together in the same calendar
  - **Google Calendar-Style Colors**: Each family member has a unique color for their tasks
    - **Member-Specific Colors**: Tasks are colored based on the assigned family member
    - **Color Palette**: Uses specific Google Calendar colors assigned by member order:
      - **First Member**: Celtic Blue (#1967D2)
      - **Second Member**: Selective Yellow (#FBBC04)
      - **Third Member**: Pigment Red (#F72A25)
      - **Fourth Member**: Sea Green (#34A853)
      - **Fifth Member**: Dark Spring Green (#188038)
    - **Color Assignment**: Colors are automatically assigned based on family member order (not database color field)
    - **Visual Distinction**: Easy to identify which member each task belongs to at a glance
  - **Multi-Member Tasks**: Use the color of the first assignee
  - **Group Tasks**: Maintain purple color for tasks from groups
- **Smart Task Creation**: When creating new tasks, automatically pre-selects the same members that are currently selected in the calendar view
  - **Consistent Selection**: If Cristian, Guille, and Clàudia are selected in the calendar, they will be pre-selected in the task creation modal
  - **User Experience**: Eliminates the need to manually re-select members when creating tasks
  - **Workflow Efficiency**: Maintains context between calendar view and task creation
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
- **Cross-Column Drag Fix**: Fixed issue where tasks moved between columns weren't properly creating day order entries due to missing `routine_task_id` in placeholder tasks
- **Enhanced Drag & Drop UX** (Updated 2025-10-06):
  - **Large Drop Zones**: Drop zones between tasks are 24px (h-6) height for easier targeting
  - **Visual Feedback**: Drop zones highlight with blue background and dashed borders on hover
  - **Empty Column Support**: Full-height drop zone appears in empty day columns when dragging
  - **Clean Visual Design**: Drop zones use only color and border styling without text labels
  - **Column Highlighting**: Entire column highlights with blue border when dragging over it
  - **Bottom Drop Zone**: Additional 64px drop zone at the bottom of non-empty columns for easy task addition at the end
  - **Smooth Transitions**: All drop zones use smooth CSS transitions for better visual feedback
  - **Color Coding**: Active drop zones use blue-400 background, hover states use blue-100
  - **Database Persistence**: Moving tasks between days automatically updates the recurring template's `days_of_week` field
  - **Smart Day Updates**: 
    - Single-day tasks (1 day): Replace the day when dragged to new column
    - Multi-day tasks (2+ days): Add the new day to existing days
    - Every-day tasks (7 days): No update needed
  - **No Duplicates**: Tasks are moved, not copied - only appear in target column after drag
  - **Assignment Preservation**: Task assignments are preserved when moving between days (fixed CASCADE delete issue)
  - **Automatic Sync**: Task changes persist to database and survive browser refresh
  - **Test Coverage**: Backend integration tests and E2E Playwright tests verify drag-drop behavior
  - **Bug Fixes (2025-10-06)**: 
    - Fixed critical bug where task assignments were deleted during drag-drop due to incorrect operation order
    - Fixed duplicate task bug when deleting single day from multi-day task (routine_tasks now keep individual days)
    - Fixed undo functionality for task deletion - now properly restores tasks in backend database (not just UI state)
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
- **`PATCH /routines/{routine_id}/tasks/{task_id}/multi-member-update`**: Update existing multi-member task assignments
- **`POST /routines/{routine_id}/tasks/multi-member-delete`**: Delete task with scope options (time + member scope)

### Enhanced Task Editing API Endpoints
- **`GET /routines/{routine_id}/tasks/{task_id}/for-edit`**: Get task data with template information for editing modal
- **`PATCH /routines/{routine_id}/tasks/{task_id}/template`**: Update task template data (recurring_task_templates)
- **`PATCH /routines/{routine_id}/templates/{template_id}/days`**: Update template days_of_week and automatically adjust frequency_type

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

## 🧪 Testing Infrastructure

### Testing Strategy
- **Test Pyramid Approach**: Unit tests (many) → Integration tests (medium) → E2E tests (few)
- **Risk-Based Prioritization**: Critical data integrity bugs tested first
- **Local Supabase**: All integration tests run against local database with RLS policies

### Technology Stack
- **Backend Unit Tests**: pytest + pytest-asyncio
- **Frontend Unit Tests**: Vitest + React Testing Library  
- **Integration Tests**: pytest + Local Supabase
- **E2E Tests**: Playwright (planned)

### Test Infrastructure Status
- ✅ **pytest configured**: 10/10 smoke tests passing
- ✅ **Vitest configured**: 31/31 tests passing (4 component + 27 utility)
- ✅ **Local Supabase**: Full schema with all migrations
- ✅ **Test Fixtures**: 50+ reusable fixtures for test data
- ✅ **Backend Integration Tests**: Recurring templates ✅ PASSING
- ✅ **Frontend Unit Tests**: Recurrence utilities (100% function coverage) ✅ PASSING

### Test Coverage
- **Total Test Scenarios**: 15 critical scenarios identified
- **Backend Integration Tests**: 6 tests (recurring templates, deletion scopes)
- **Frontend Unit Tests**: 27 tests (recurrence logic, helper labels, validation)
- **All Tests Passing**: ✅ Backend + Frontend
- **Coverage Tracking**: `TEST_COVERAGE_MATRIX.md` and `TEST_SCENARIOS.md`

### Running Tests

```bash
# Backend tests
cd kidoers_backend
source venv/bin/activate
pytest tests/unit              # Unit tests (fast)
pytest tests/integration       # Integration tests (with local Supabase)
pytest --cov=app              # With coverage report

# Frontend tests  
cd kidoers_front
pnpm test                     # Unit tests
pnpm test:coverage            # With coverage
```

### Test Documentation
- **TESTING_PLAN.md**: Complete 4-week implementation roadmap
- **TEST_COVERAGE_MATRIX.md**: Functional coverage tracking
- **TEST_SCENARIOS.md**: Detailed test scenarios in Given-When-Then format
- **TESTING_CONVENTIONS.md**: Team coding standards and best practices

## 🔄 Template-Based Recurrence System (January 2025)

### Overview
Migrated from dual-storage recurrence model to template-only model where `recurring_task_templates.days_of_week` is the single source of truth for all weekly tasks.

### Key Changes

#### Database Schema
- **Migration**: `20250120_normalize_recurrence_to_templates.sql`
- **Constraint**: All `routine_tasks` must have `recurring_template_id` (NOT NULL)
- **Legacy Fields**: `routine_tasks.frequency` and `routine_tasks.days_of_week` are always NULL
- **Trigger**: Auto-nulls legacy fields when `recurring_template_id` is set
- **Validation**: Templates must have valid `days_of_week` array (1-7 lowercase weekdays)

#### Backend Changes
- **Pydantic Schemas**: Updated `RecurringTaskTemplateOut` to require `days_of_week`
- **Task Creation**: Always creates `recurring_task_templates` first, then links via `recurring_template_id`
- **Frequency Logic**: 
  - 7 days → `frequency_type='every_day'`, `frequency='daily'`
  - 1-6 days → `frequency_type='specific_days'`, `frequency='specific_days'`
- **API Endpoints**: Modified `bulk_create_individual_tasks` to enforce template-based model

#### Frontend Changes
- **TypeScript Types**: Updated `Task` interface to remove legacy fields
- **Task Creation**: Always sends `create_recurring_template: true`
- **Calendar Rendering**: Reads recurrence from templates, not `routine_tasks`
- **Utility Functions**: Updated `taskUtils.ts` to use template data exclusively

### Field Semantics

| Task Type | frequency_type | days_of_week | frequency (label) | routine_tasks.frequency | routine_tasks.days_of_week |
|-----------|---------------|--------------|-------------------|------------------------|---------------------------|
| Daily (7/7) | `every_day` | `['monday','tuesday',...,'sunday']` (7 items) | `daily` | NULL | NULL |
| Specific days (2-6) | `specific_days` | subset (e.g. `['monday','wednesday','friday']`) | `specific_days` | NULL | NULL |
| Single-day weekly | `specific_days` | `['wednesday']` (1 item) | `specific_days` | NULL | NULL |

### Implementation Benefits
- **Single Source of Truth**: Template `days_of_week` is authoritative
- **Data Integrity**: Constraints prevent inconsistent states
- **Simplified Logic**: No dual-storage complexity
- **Future-Proof**: Ready for one-off task support
- **Backward Compatibility**: Legacy fields preserved but unused