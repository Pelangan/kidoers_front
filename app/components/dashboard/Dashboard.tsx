"use client"

import { useState } from "react"
import ChoresView from "./views/ChoresView"
import CalendarView from "./views/CalendarView"
import { CheckSquare, Calendar, Gift, LogOut, Menu } from "lucide-react"

export type ViewType = "chores" | "calendar" | "rewards"

interface DashboardProps {
  onSignOut: () => void
}

export default function Dashboard({ onSignOut }: DashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>("chores")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await onSignOut()
    setLoading(false)
  }

  const menuItems = [
    {
      id: "chores" as ViewType,
      label: "Chores",
      icon: CheckSquare,
      description: "Daily tasks",
    },
    {
      id: "calendar" as ViewType,
      label: "Calendar",
      icon: Calendar,
      description: "Scheduled activities",
    },
    {
      id: "rewards" as ViewType,
      label: "Rewards",
      icon: Gift,
      description: "Family rewards",
    },
  ]

  const renderView = () => {
    switch (currentView) {
      case "chores":
        return <ChoresView />
      case "calendar":
        return <CalendarView />
      case "rewards":
        return (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Rewards View</h3>
            <p className="text-muted-foreground">Coming soon!</p>
          </div>
        )
      default:
        return <ChoresView />
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kidoers_noBgColor-lp4nzseFjByx9uxSzOyiqX4zqX77pn.png"
                    alt="Kidoers"
                    className="h-8"
                  />
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 rounded-lg transition-all duration-200 ${
                      sidebarOpen ? "px-3 py-3" : "pl-1 pr-1 py-3"
                    } ${
                      isActive
                        ? sidebarOpen 
                          ? "bg-gradient-warm text-white shadow-button"
                          : "text-primary"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`flex-shrink-0 transition-all duration-200 ${
                      isActive && !sidebarOpen ? "h-6 w-6" : "h-5 w-5"
                    }`} />
                    {sidebarOpen && (
                      <div className="text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className={`text-xs ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className={`w-full flex items-center gap-3 rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 ${
                sidebarOpen ? "px-3 py-3" : "pl-1 pr-1 py-3"
              }`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{loading ? "Signing out..." : "Sign Out"}</span>}
            </button>
          </div>
        </div>
      </div>

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
