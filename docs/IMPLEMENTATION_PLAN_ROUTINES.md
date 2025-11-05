# Implementation Plan: Routines (Task Groups) Feature

## Step 0: Repo Reconnaissance - Inventory

### ✅ **Existing Endpoints & Hooks (REUSE)**

#### Backend (`kidoers_backend/app/routers/routines_builder.py`):
1. **GET** `/routines/{routine_id}/groups` - Lists groups (line 412-437)
   - ✅ Exists, returns: `id, routine_id, name, time_of_day, order_index`
   - ❌ Missing: `color`, `task_count`

2. **POST** `/routines/{routine_id}/groups` - Creates group (line 199-265)
   - ✅ Exists, accepts: `name, time_of_day, from_group_template_id, days_of_week`
   - ❌ Missing: `color` parameter

3. **GET** `/routines/{routine_id}/tasks` - Lists tasks (line 440-472)
   - ✅ Exists, returns: `id, routine_id, group_id, name, description, points, ...`
   - ✅ Already includes `group_id`!
   - ❌ Missing: Group filter parameter, join with `routine_task_groups` for color/name

4. **POST** `/routines/{routine_id}/day-orders/bulk` - Bulk update day orders (line 2808-2890)
   - ✅ Exists, handles bucket system
   - ❌ Missing: `group_id` in scope (uses only `routine_id, day_of_week, bucket_type, bucket_member_id`)

#### Frontend (`kidoers_front/app/lib/api.ts`):
1. **`getRoutineGroups(routineId)`** - Line 605-615
   - ✅ Exists
   - ❌ Missing: `color`, `task_count` in return type

2. **`getRoutineTasks(routineId)`** - Line 617-633
   - ✅ Exists, returns `group_id`
   - ❌ Missing: Group filter parameter, join with group color/name

### ❌ **Missing Endpoints & Hooks (CREATE)**

#### Backend:
1. **PATCH** `/routines/{routine_id}/tasks/{task_id}` - Update task's `group_id`
   - ❌ Need to check if exists or create
   - Required for "Assign to routine" functionality

2. **GET** `/routines/{routine_id}/groups` - Enhanced with `task_count` and `color`
   - Need to modify existing endpoint

3. **POST** `/routines/{routine_id}/groups` - Enhanced with `color` parameter
   - Need to modify existing endpoint

#### Frontend:
1. **Hook for routine filtering state** - Store selected routine filter
2. **Computed task counts by group** - Calculate counts from tasks
3. **Routine chip component** - Display routine name with color

---

## Step 1: Database Migration

### 1.1 Add `color` column to `routine_task_groups`

```sql
-- Migration: Add color to routine_task_groups
-- File: supabase/migrations/YYYYMMDD_add_color_to_routine_task_groups.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'routine_task_groups'
      AND column_name = 'color'
  ) THEN
    ALTER TABLE public.routine_task_groups
      ADD COLUMN color text DEFAULT 'blue' CHECK (color = ANY (ARRAY['blue'::text, 'orange'::text, 'green'::text, 'red'::text, 'purple'::text, 'pink'::text, 'teal'::text, 'indigo'::text]));
  END IF;
END$$;
```

### 1.2 Add `group_id` column to `routine_task_day_orders`

```sql
-- Migration: Add group_id to routine_task_day_orders for scoped ordering
-- File: supabase/migrations/YYYYMMDD_add_group_id_to_day_orders.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'routine_task_day_orders'
      AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.routine_task_day_orders
      ADD COLUMN group_id uuid NULL;
    
    ALTER TABLE public.routine_task_day_orders
      ADD CONSTRAINT routine_task_day_orders_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.routine_task_groups(id);
  END IF;
END$$;

-- Create index for efficient group-scoped queries
CREATE INDEX IF NOT EXISTS ix_rtdo_scope_order
  ON public.routine_task_day_orders (routine_id, group_id, day_of_week, bucket_type, COALESCE(bucket_member_id, '00000000-0000-0000-0000-000000000000'::uuid), order_index);

-- Prevent duplicates inside the scope (including group_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rtdo_scope_task
  ON public.routine_task_day_orders (routine_id, group_id, day_of_week, bucket_type, COALESCE(bucket_member_id, '00000000-0000-0000-0000-000000000000'::uuid), routine_task_id);

-- Backfill group_id from routine_tasks
UPDATE public.routine_task_day_orders rtdo
SET group_id = rt.group_id
FROM public.routine_tasks rt
WHERE rtdo.routine_task_id = rt.id
  AND rtdo.group_id IS NULL;
```

---

## Step 2: Backend Endpoints

### 2.1 Update `GET /routines/{routine_id}/groups` to include `color` and `task_count`

**File**: `kidoers_backend/app/routers/routines_builder.py` (line 412-437)

**Changes**:
- Add `color` to SELECT
- Add `task_count` via LEFT JOIN with `routine_tasks`
- Update response model to include `color` and `task_count`

```python
@router.get("/{routine_id}/groups", response_model=list[GroupOut])
async def get_routine_groups(routine_id: str, user=Depends(get_current_user)):
    try:
        with get_conn(user["claims"]) as conn:
            rows = conn.execute(
                """
                SELECT 
                    g.id, 
                    g.routine_id, 
                    g.name, 
                    g.time_of_day, 
                    g.order_index,
                    g.color,
                    COUNT(rt.id) FILTER (WHERE rt.is_active = true) as task_count
                FROM public.routine_task_groups g
                LEFT JOIN public.routine_tasks rt ON rt.group_id = g.id AND rt.is_active = true
                WHERE g.routine_id = %s
                GROUP BY g.id, g.routine_id, g.name, g.time_of_day, g.order_index, g.color
                ORDER BY g.order_index
                """,
                (routine_id,)
            ).fetchall()
            
            return [
                {
                    "id": str(row[0]),
                    "routine_id": str(row[1]),
                    "name": row[2],
                    "time_of_day": row[3],
                    "order_index": row[4],
                    "color": row[5] or "blue",  # Default to blue if NULL
                    "task_count": row[6] or 0,
                }
                for row in rows
            ]
    except psycopg.errors.InsufficientPrivilege:
        raise HTTPException(status_code=403, detail="Not allowed to access this routine")
```

### 2.2 Update `POST /routines/{routine_id}/groups` to accept `color`

**File**: `kidoers_backend/app/routers/routines_builder.py` (line 199-265)

**Changes**:
- Add `color` to request body schema
- Include `color` in INSERT statement
- Return `color` in response

### 2.3 Update `PATCH /routines/{routine_id}/tasks/{task_id}` to support `group_id` update

**File**: `kidoers_backend/app/routers/routines_builder.py`

**Check if exists**, if not, create:

```python
@router.patch("/{routine_id}/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    routine_id: str, 
    task_id: str, 
    body: TaskPatch,  # Should include optional group_id
    user=Depends(get_current_user)
):
    """Update a task, including assigning/removing from group"""
    try:
        with get_conn(user["claims"]) as conn:
            # Build dynamic UPDATE query
            updates = []
            params = []
            
            if body.group_id is not None:
                updates.append("group_id = %s")
                params.append(body.group_id)
            
            # ... other fields ...
            
            if updates:
                conn.execute(
                    f"""
                    UPDATE public.routine_tasks
                    SET {', '.join(updates)}, updated_at = now()
                    WHERE id = %s AND routine_id = %s
                    RETURNING id, routine_id, group_id, name, ...
                    """,
                    tuple(params) + (task_id, routine_id)
                )
                
            # If group_id changed, ensure day orders exist for new scope
            # ... handle day order updates ...
```

### 2.4 Update `POST /routines/{routine_id}/day-orders/bulk` to include `group_id` in scope

**File**: `kidoers_backend/app/routers/routines_builder.py` (line 2808-2890)

**Changes**:
- Fetch `group_id` from `routine_tasks` for each task
- Include `group_id` in INSERT/UPDATE
- Include `group_id` in UNIQUE constraint

```python
# In bulk_update_day_orders function, around line 2832:
task_info = conn.execute("""
    SELECT rt.id, rt.group_id, COUNT(DISTINCT ta.member_id) as member_count
    FROM public.routine_tasks rt
    LEFT JOIN public.task_assignments ta ON rt.id = ta.routine_task_id AND ta.is_active = true
    WHERE rt.id = %s AND rt.routine_id = %s
    GROUP BY rt.id, rt.group_id
""", (task_order["routine_task_id"], routine_id)).fetchone()

group_id = str(task_info[1]) if task_info[1] else None

# Include group_id in INSERT
row = conn.execute("""
    insert into public.routine_task_day_orders (
        routine_id, group_id, member_id, day_of_week, routine_task_id, order_index,
        bucket_type, bucket_member_id
    )
    values (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (routine_id, group_id, day_of_week, bucket_type, COALESCE(bucket_member_id, '00000000-0000-0000-0000-000000000000'::uuid), routine_task_id)
    DO UPDATE SET order_index = EXCLUDED.order_index, member_id = EXCLUDED.member_id
    returning id, routine_id, group_id, member_id, day_of_week, routine_task_id, order_index, created_at, bucket_type, bucket_member_id
""", (routine_id, group_id, member_id_for_insert, body.day_of_week, task_order["routine_task_id"], task_order["order_index"], bucket_type, bucket_member_id)).fetchone()
```

---

## Step 3: Frontend API Functions

### 3.1 Update `getRoutineGroups` to include `color` and `task_count`

**File**: `kidoers_front/app/lib/api.ts` (line 605-615)

```typescript
export async function getRoutineGroups(routineId: string) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    name: string;
    time_of_day: string | null;
    order_index: number;
    color: string;  // NEW
    task_count: number;  // NEW
  }[]>(`/routines/${routineId}/groups`, {
    method: "GET",
  });
}
```

### 3.2 Create `createRoutineGroup` function

**File**: `kidoers_front/app/lib/api.ts`

```typescript
export async function createRoutineGroup(
  routineId: string,
  group: {
    name: string;
    time_of_day?: "morning" | "afternoon" | "evening" | "night" | "any";
    color?: string;
  }
) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    name: string;
    time_of_day: string | null;
    order_index: number;
    color: string;
    task_count: number;
  }>(`/routines/${routineId}/groups`, {
    method: "POST",
    body: JSON.stringify(group),
  });
}
```

### 3.3 Update `patchRoutineTask` to support `group_id`

**File**: `kidoers_front/app/lib/api.ts`

Check if `patchRoutineTask` exists, if not create:

```typescript
export async function patchRoutineTask(
  routineId: string,
  taskId: string,
  updates: {
    group_id?: string | null;
    name?: string;
    points?: number;
    // ... other fields
  }
) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    group_id: string | null;
    name: string;
    // ... other fields
  }>(`/routines/${routineId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
```

---

## Step 4: UI - Routine Filter Dropdown Component

### 4.1 Create `RoutineFilter.tsx` component

**File**: `kidoers_front/app/components/routines/builder/components/RoutineFilter.tsx`

**Features**:
- Dropdown with "All routines", "Unassigned", then each group
- Each option shows colored dot + name + count: `Bedtime (1)`
- Selected filter shows chip: "Filtered by: Bedtime · 1 task"
- Clear button (X) to reset to "All"

**Props**:
```typescript
interface RoutineFilterProps {
  groups: Array<{
    id: string;
    name: string;
    color: string;
    task_count: number;
  }>;
  selectedGroupId: 'ALL' | 'UNASSIGNED' | string;
  onSelectGroup: (groupId: 'ALL' | 'UNASSIGNED' | string) => void;
  unassignedCount: number;  // Count of tasks with group_id === null
}
```

### 4.2 Integrate into `ManualRoutineBuilder.tsx` header

**File**: `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx`

**Location**: Header section (around line 200-300)

**Add**:
- Import `RoutineFilter`
- State: `selectedRoutineFilter: 'ALL' | 'UNASSIGNED' | string`
- Compute `unassignedCount` from tasks
- Render `RoutineFilter` next to existing controls

---

## Step 5: UI - Create Routine Dialog

### 5.1 Create `CreateRoutineDialog.tsx` component

**File**: `kidoers_front/app/components/routines/builder/components/CreateRoutineDialog.tsx`

**Features**:
- Modal dialog
- Fields:
  - Name (required, text input)
  - Time of day (dropdown: Any/Morning/Afternoon/Evening/Night)
  - Color (swatches: blue, orange, green, red, purple, pink, teal)
- Actions: Cancel, Create
- On create: calls `createRoutineGroup`, closes dialog, auto-selects in filter

**Props**:
```typescript
interface CreateRoutineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  onCreated: (group: { id: string; name: string; color: string }) => void;
}
```

### 5.2 Integrate "+ New Routine" button

**File**: `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx`

**Location**: Next to `RoutineFilter` in header

**Add**:
- Button: "+ New Routine"
- State: `showCreateRoutineDialog: boolean`
- Opens `CreateRoutineDialog`
- On create: refreshes groups list, sets filter to new group

---

## Step 6: UI - Task Cards with Routine Chips

### 6.1 Update `TaskItem.tsx` to show routine chip

**File**: `kidoers_front/app/components/routines/builder/components/TaskItem.tsx` (line 239-244)

**Changes**:
- Replace `from_group` logic with `group_id` from task
- Fetch group name/color from `routineGroups` state
- Display chip below task name with group color
- Chip shows group name (e.g., "Bedtime")

**Current code** (line 239-244):
```tsx
{task.from_group && (
  <div className="text-xs flex items-center space-x-1 text-purple-600">
    <Folder className="w-3 h-3" />
    <span>from {task.from_group.name}</span>
  </div>
)}
```

**New code**:
```tsx
{task.group_id && (() => {
  const group = routineGroups.find(g => g.id === task.group_id);
  if (!group) return null;
  
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    red: 'bg-red-100 text-red-700 border-red-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    pink: 'bg-pink-100 text-pink-700 border-pink-300',
    teal: 'bg-teal-100 text-teal-700 border-teal-300',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  };
  
  const chipColor = colorMap[group.color as keyof typeof colorMap] || colorMap.blue;
  
  return (
    <div className={`text-xs px-2 py-0.5 rounded border ${chipColor} mt-1 inline-block`}>
      {group.name}
    </div>
  );
})()}
```

**Also update left border color** (line 115-153):
- Use group color for left border instead of purple hardcode

### 6.2 Update task card left border color

**File**: `kidoers_front/app/components/routines/builder/components/TaskItem.tsx` (line 115-153)

**Change**: Use group color for left border when task has `group_id`

```tsx
const getTaskColor = () => {
  // If task has group_id, use group color
  if (task.group_id) {
    const group = routineGroups.find(g => g.id === task.group_id);
    if (group) {
      const colorMap = {
        blue: { bg: 'bg-blue-50', borderColor: '#3B82F6' },
        orange: { bg: 'bg-orange-50', borderColor: '#F97316' },
        green: { bg: 'bg-green-50', borderColor: '#10B981' },
        red: { bg: 'bg-red-50', borderColor: '#EF4444' },
        purple: { bg: 'bg-purple-50', borderColor: '#A855F7' },
        pink: { bg: 'bg-pink-50', borderColor: '#EC4899' },
        teal: { bg: 'bg-teal-50', borderColor: '#14B8A6' },
        indigo: { bg: 'bg-indigo-50', borderColor: '#6366F1' },
      };
      const colors = colorMap[group.color as keyof typeof colorMap] || colorMap.blue;
      return {
        bg: colors.bg,
        border: `border-l-4`,
        borderColor: colors.borderColor,
        text: 'text-gray-900'
      };
    }
  }
  
  // ... rest of existing logic
}
```

---

## Step 7: UI - Edit Task Modal with Assign to Routine

### 7.1 Update `TaskCreationModal.tsx` or create `TaskEditModal.tsx`

**Check**: Does `TaskCreationModal` handle editing? Or is there a separate edit modal?

**File**: `kidoers_front/app/components/routines/builder/components/TaskCreationModal.tsx` (line 74-77)

**Current props** include `selectedRoutineGroup` and `routineGroups` - this is good!

**Changes needed**:
1. **Update combobox to show colored dots + task counts**
   - Each option: `[colored dot] Bedtime (1)`
   - Add "No routine" option at top
   - Add "+ Create new routine" row at bottom

2. **Add inline create routine**
   - When "+ Create new routine" clicked, expand inline form
   - Fields: name (text), color (swatches)
   - On create: call `createRoutineGroup`, select it, close inline form

3. **Empty state**
   - If no groups exist: "No routines yet. Create your first routine."

**Component structure**:
```tsx
// In TaskCreationModal.tsx, around the routine selection section:

<Label>Assign to routine (optional)</Label>
<Combobox
  value={selectedRoutineGroup}
  onValueChange={onSelectedRoutineGroupChange}
  options={[
    { value: 'NONE', label: 'No routine', color: null },
    ...routineGroups.map(g => ({
      value: g.id,
      label: `${g.name} (${g.task_count})`,
      color: g.color,
    })),
    { value: 'CREATE', label: '+ Create new routine', color: null },
  ]}
  renderOption={(opt) => (
    <div className="flex items-center space-x-2">
      {opt.color && <div className={`w-3 h-3 rounded-full bg-${opt.color}-500`} />}
      <span>{opt.label}</span>
    </div>
  )}
/>
```

---

## Step 8: Update Reorder Logic

### 8.1 Update `bulkUpdateDayOrders` to include `group_id`

**Backend**: Already covered in Step 2.4

**Frontend**: `kidoers_front/app/components/routines/builder/hooks/useTaskOrdering.ts` (line 19-63)

**Changes**:
- When building `taskOrders`, include `group_id` from task
- Pass `group_id` to backend (if backend requires it in payload)

**Check**: Does backend fetch `group_id` from `routine_tasks` or require it in payload?

Based on Step 2.4, backend fetches it, so **no frontend changes needed** for bulk update.

### 8.2 Update day order queries to filter by `group_id`

**Frontend**: `kidoers_front/app/components/routines/builder/hooks/useTaskOrdering.ts` (line 19-63)

**When filtering tasks by routine**, ensure day orders respect the filter:

```typescript
// When selectedRoutineFilter !== 'ALL', filter tasks AND day orders by group_id
const saveDaySpecificOrder = async (
  day: string,
  memberId: string,
  tasks: Task[],  // Already filtered by routine
  currentRoutineId: string,
  selectedGroupId?: 'ALL' | 'UNASSIGNED' | string,
) => {
  // Backend will handle group_id scoping
  // Frontend just needs to ensure tasks passed are already filtered
}
```

---

## Step 9: Update Drag & Drop

### 9.1 Filter tasks by selected routine

**File**: `kidoers_front/app/components/routines/builder/hooks/useDndKitDragAndDrop.ts`

**Changes**:
- Before rendering tasks, filter by `selectedRoutineFilter`
- Logic:
  - `'ALL'`: Show all tasks
  - `'UNASSIGNED'`: Show only `task.group_id === null`
  - `string`: Show only `task.group_id === selectedRoutineFilter`

**Location**: Where tasks are mapped to calendar (find where `calendarTasks` is used)

### 9.2 Scope reordering by group

**File**: `kidoers_front/app/components/routines/builder/hooks/useDndKitDragAndDrop.ts`

**Changes**:
- When dragging within filtered view, only allow dropping in same group
- When dragging across groups in "All" view:
  - Option A: Block with tooltip "Cannot move task between routines"
  - Option B: Prompt "Move task to <RoutineName>?" → call `patchRoutineTask` to update `group_id`

**Recommendation**: Start with Option A (block), add Option B later if needed.

### 9.3 Update `getTasksWithDayOrder` to respect group scope

**File**: `kidoers_front/app/components/routines/builder/hooks/useDndKitDragAndDrop.ts` (line 779-807)

**Changes**:
- Filter `dayOrders` by `group_id` when routine filter is active
- Ensure ordering only applies within the same group

---

## Step 10: Documentation

### 10.1 Create `docs/planner-routines.md`

**File**: `kidoers_front/docs/planner-routines.md`

**Content**:
1. **Terminology Mapping**
   - UI "Routine" = `routine_task_groups`
   - Planner = `routines`
   - Task = `routine_tasks`

2. **Ordering Scope**
   - Why we added `group_id` to `routine_task_day_orders`
   - Scope: `(routine_id, group_id, day_of_week, bucket_type, member_id|bucket_member_id)`

3. **Endpoint Inventory**
   - Which endpoints were reused vs. created
   - New/modified endpoints

4. **Reorder Payload Examples**
   - Example payloads for reordering within a group
   - Example for assigning task to group

5. **UI Components**
   - List of new components created
   - Where they're used

---

## Testing Checklist

### Manual Testing:
1. ✅ Routine filter dropdown shows All, Unassigned, each group with dot+count
2. ✅ Selecting a routine filters tasks and shows chip with name + count
3. ✅ Create Routine dialog creates group and auto-selects it
4. ✅ Edit Task modal's Assign to routine:
   - Lists routines with colored dots + counts
   - Supports inline create, selects it after creation
5. ✅ Reordering:
   - In filtered view, moving a task only changes order inside that routine's scope
   - In All view, reordering does not disturb other groups' orders
6. ✅ Unassigned filter shows only `group_id === null`
7. ✅ Task cards show routine chips with correct colors
8. ✅ Task card left borders use group colors

### Empty States:
1. ✅ No routines: Header CTA shows "+ New Routine"
2. ✅ No tasks in filtered routine: Friendly "Add a task" ghost button

---

## File Changes Summary

### Backend:
1. `kidoers_backend/app/routers/routines_builder.py` - Update endpoints
2. `supabase/migrations/YYYYMMDD_add_color_to_routine_task_groups.sql` - NEW
3. `supabase/migrations/YYYYMMDD_add_group_id_to_day_orders.sql` - NEW

### Frontend:
1. `kidoers_front/app/lib/api.ts` - Update API functions
2. `kidoers_front/app/components/routines/builder/components/RoutineFilter.tsx` - NEW
3. `kidoers_front/app/components/routines/builder/components/CreateRoutineDialog.tsx` - NEW
4. `kidoers_front/app/components/routines/builder/components/TaskItem.tsx` - Update routine chips
5. `kidoers_front/app/components/routines/builder/components/TaskCreationModal.tsx` - Update Assign to routine
6. `kidoers_front/app/components/routines/builder/ManualRoutineBuilder.tsx` - Integrate filter + dialog
7. `kidoers_front/app/components/routines/builder/hooks/useDndKitDragAndDrop.ts` - Update filtering + scoping
8. `kidoers_front/docs/planner-routines.md` - NEW

---

## Next Steps

1. **Review this plan** with the team
2. **Create database migrations** (Step 1)
3. **Implement backend endpoints** (Step 2)
4. **Update frontend API** (Step 3)
5. **Build UI components** (Steps 4-7)
6. **Update drag & drop** (Step 9)
7. **Test end-to-end** (Testing Checklist)
8. **Write documentation** (Step 10)

