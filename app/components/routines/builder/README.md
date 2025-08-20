# Routine Builder Components

This directory contains the components for building custom routines from scratch during the onboarding process.

## Components

### RoutineBuilderShell
A 3-column responsive layout shell that provides the overall structure for the routine builder:
- **Header**: Top section for routine actions (rename, publish, back)
- **Center**: Main area for building the routine (groups and tasks)
- **Right**: Library panel for adding pre-defined groups and tasks

### RoutineHeader
Handles routine naming and publishing actions:
- Editable routine name input
- Publish button (changes status from draft to active)
- Optional back button for navigation

### RoutineCanvas
Displays and manages routine groups and tasks:
- Shows all groups with their tasks
- Add/remove groups and tasks
- Add tasks from library templates
- Create custom tasks
- Sort by order_index

### LibraryPanel
Provides access to pre-defined task and group templates:
- Tabs for Groups vs Tasks
- Search functionality
- Click-to-add buttons for each template
- Debounced API calls to avoid excessive requests

## Usage

The components are assembled in `/app/onboarding/custom/page.tsx` which:

1. Creates a draft routine on mount
2. Manages routine state (groups, tasks, errors)
3. Handles all CRUD operations for groups and tasks
4. Integrates with the backend API endpoints
5. Provides navigation back to onboarding or to dashboard

## API Integration

The components use these API endpoints:
- `createRoutineDraft()` - Creates new routine
- `patchRoutine()` - Updates routine name/status
- `addRoutineGroup()` - Adds groups (empty or from template)
- `addRoutineTask()` - Adds tasks (custom or from template)
- `deleteRoutineGroup()` - Removes groups
- `deleteRoutineTask()` - Removes tasks
- `listLibraryGroups()` - Fetches available group templates
- `listLibraryTasks()` - Fetches available task templates

## State Management

- **Routine**: Current routine data (id, name, status)
- **Groups**: Array of UiGroup objects with nested tasks
- **Busy**: Loading state for async operations
- **Error**: Error messages for failed operations

## Future Enhancements

- Replace `prompt()` calls with proper modal dialogs
- Add drag-and-drop functionality between groups
- Implement task reordering within groups
- Add time-of-day and frequency controls
- Support for task dependencies and scheduling
