import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createRoutineDraft, patchRoutine, createRoutineSchedule, generateTaskInstances } from '../../../../lib/api'
import type { RoutineScheduleData, RecurringTemplate } from '../types/routineBuilderTypes'

interface RoutineData {
  id: string
  family_id: string
  name: string
  status: "draft" | "active" | "archived"
}

export const useRoutineData = (familyId: string | null, isEditMode: boolean, onComplete?: () => void) => {
  const router = useRouter()
  
  // Routine state
  const [routine, setRoutine] = useState<RoutineData | null>(null)
  const [routineName, setRoutineName] = useState('My Routine')
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [routineScheduleData, setRoutineScheduleData] = useState<RoutineScheduleData | null>(null)
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null)
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([])
  
  // Promise-based routine creation to prevent race conditions
  const routineCreationPromise = useRef<Promise<RoutineData | null> | null>(null)

  // Lazy routine creation - only create when user actually starts building
  const ensureRoutineExists = async () => {
    // If routine already exists, return it immediately
    if (routine) {
      console.log('[KIDOERS-ROUTINE] Routine already exists, returning:', routine.id);
      return routine;
    }
    
    if (!familyId) {
      console.log('[KIDOERS-ROUTINE] No family ID, returning null');
      return null;
    }
    
    // If routine creation is already in progress, return the existing promise
    if (routineCreationPromise.current) {
      console.log('[KIDOERS-ROUTINE] Routine creation already in progress, waiting for existing promise...');
      return routineCreationPromise.current;
    }
    
    // Create new routine creation promise
    console.log('[KIDOERS-ROUTINE] Starting routine creation...');
    routineCreationPromise.current = (async () => {
      try {
        setIsCreatingRoutine(true);
        console.log('[KIDOERS-ROUTINE] Creating routine draft lazily...');
        const created = await createRoutineDraft(familyId, routineName);
        console.log('[KIDOERS-ROUTINE] Routine draft created:', created);
        const routineData: RoutineData = {
          id: created.id,
          family_id: created.family_id,
          name: created.name,
          status: created.status as "draft" | "active" | "archived"
        };
        setRoutine(routineData);
        setCurrentRoutineId(routineData.id);
        console.log('[KIDOERS-ROUTINE] Set currentRoutineId to:', routineData.id);
        return routineData;
      } catch (e: any) {
        console.error('[KIDOERS-ROUTINE] ','Error creating routine:', e);
        return null;
      } finally {
        setIsCreatingRoutine(false);
        // Clear the promise reference so future calls can create new routines if needed
        routineCreationPromise.current = null;
      }
    })();
    
    return routineCreationPromise.current;
  };

  const handleSaveRoutineDetails = async (scheduleData: RoutineScheduleData) => {
    try {
      // Ensure routine exists before saving schedule
      const routineData = await ensureRoutineExists()
      if (!routineData) {
        throw new Error('Failed to create routine. Please try again.')
      }
      
      // Save schedule data
      setRoutineScheduleData(scheduleData)
      
      // Create the schedule
      await createRoutineSchedule(routineData.id, scheduleData)
      console.log('[KIDOERS-ROUTINE] Routine schedule saved successfully:', scheduleData)
    } catch (err) {
      console.error('[KIDOERS-ROUTINE] ','Error saving routine details:', err)
      throw err
    }
  }

  const handleSaveRoutine = async () => {
    console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: handleSaveRoutine called, isEditMode:', isEditMode, 'onComplete:', !!onComplete);
    
    try {
      // Ensure routine exists (create if needed)
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        throw new Error('Failed to create routine. Please try again.');
      }
      
      // Update routine name if changed
      if (routineData.name !== routineName.trim()) {
        console.log('[KIDOERS-ROUTINE] 📝 Updating routine name:', routineName.trim());
        await patchRoutine(routineData.id, { name: routineName.trim() });
        console.log('[KIDOERS-ROUTINE] ✅ Routine name updated');
      }
      
      console.log('[KIDOERS-ROUTINE] ✅ Routine name updated, proceeding to finalize routine');
      
      // Publish the routine
      await patchRoutine(routineData.id, { status: "active" })
      
      // Create a basic routine schedule (required for task instance generation)
      try {
        const today = new Date()
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        const scheduleData: RoutineScheduleData = {
          scope: 'everyday',
          days_of_week: [],
          start_date: today,
          end_date: nextWeek,
          timezone: 'UTC',
          is_active: true
        }
        
        await createRoutineSchedule(routineData.id, scheduleData)
        console.log('[KIDOERS-ROUTINE] Routine schedule created successfully')
      } catch (scheduleError) {
        console.error('[KIDOERS-ROUTINE] ','Failed to create routine schedule:', scheduleError)
        // Don't fail the whole process if schedule creation fails
      }

      // Generate task instances (using task-level schedules)
      if (familyId) {
        try {
          const today = new Date()
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          
          // Generate task instances based on individual task schedules
          await generateTaskInstances(familyId, {
            start_date: today,
            end_date: nextWeek
          })
        } catch (error) {
          console.error('[KIDOERS-ROUTINE] ','Failed to generate task instances:', error)
          // Don't fail the whole process if instance generation fails
        }
      }
      
      // If we have an onComplete callback and we're not in edit mode (onboarding flow), mark onboarding as completed
      if (onComplete && !isEditMode) {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Calling onComplete (onboarding flow)');
        onComplete()
      } else if (!isEditMode) {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Navigating to dashboard (standalone mode)');
        // Otherwise, navigate to dashboard (standalone mode)
        router.push('/dashboard')
      } else {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: In edit mode, staying in routine builder');
      }
      // If isEditMode is true, stay in the routine builder (don't call onComplete or navigate)
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ','Failed to save routine:', error)
      throw error
    }
  }

  return {
    // State
    routine,
    routineName,
    isCreatingRoutine,
    hasUnsavedChanges,
    routineScheduleData,
    currentRoutineId,
    recurringTemplates,
    
    // Setters
    setRoutine,
    setRoutineName,
    setHasUnsavedChanges,
    setRoutineScheduleData,
    setCurrentRoutineId,
    setRecurringTemplates,
    
    // Functions
    ensureRoutineExists,
    handleSaveRoutineDetails,
    handleSaveRoutine
  }
}
