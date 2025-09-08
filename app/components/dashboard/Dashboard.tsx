"use client"

import { useState, useEffect } from "react"
import ChoresView from "./views/ChoresView"
import CalendarView from "./views/CalendarView"
import SettingsView from "./views/SettingsView"
import FamilyMembersView from "./views/FamilyMembersView"
import Sidebar from "./Sidebar"
import ManualRoutineBuilder from "../routines/builder/ManualRoutineBuilder"
import { apiService } from "../../lib/api"

export type ViewType = "chores" | "calendar" | "rewards" | "settings" | "family-members" | "routine-builder"

interface DashboardProps {
  onSignOut: () => void
}

export default function Dashboard({ onSignOut }: DashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>("chores")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [familyId, setFamilyId] = useState<string | null>(null)
  
  // Debug view changes
  useEffect(() => {
    console.log('Dashboard: currentView changed to:', currentView)
  }, [currentView])
  
  // Load family ID when component mounts
  useEffect(() => {
    const loadFamilyId = async () => {
      try {
        const status = await apiService.getOnboardingStatus()
        if (status.current_family) {
          console.log('Dashboard: Loaded family ID:', status.current_family.id)
          setFamilyId(status.current_family.id)
        }
      } catch (error) {
        console.error('Failed to load family ID:', error)
      }
    }
    loadFamilyId()
  }, [])

  const handleNavigateToRoutineBuilder = () => {
    console.log('Dashboard: handleNavigateToRoutineBuilder called, setting view to routine-builder')
    setCurrentView("routine-builder")
  }

  const renderView = () => {
    console.log('Dashboard: renderView called with currentView:', currentView)
    switch (currentView) {
      case "chores":
        return <ChoresView onNavigateToRoutineBuilder={handleNavigateToRoutineBuilder} />
      case "calendar":
        return <CalendarView />
      case "rewards":
        return (
          <div className="text-center py-12">
            <svg className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <h3 className="text-lg font-medium mb-2">Rewards View</h3>
            <p className="text-muted-foreground">Coming soon!</p>
          </div>
        )
      case "settings":
        return <SettingsView />
      case "family-members":
        return <FamilyMembersView familyName="Family" />
      case "routine-builder":
        return <ManualRoutineBuilder 
          familyId={familyId || undefined}
          isEditMode={true} 
          onComplete={() => setCurrentView("chores")} 
          onBack={() => setCurrentView("chores")} 
        />
      default:
        return <ChoresView />
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onSignOut={onSignOut}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        {/* Content */}
        <main className="p-6">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
