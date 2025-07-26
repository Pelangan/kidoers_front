"use client"

import { useState } from "react"
import type { ViewType } from "./Dashboard"
import { CheckSquare, Calendar, Gift, ChevronLeft, ChevronRight, LogOut, Settings, Users } from "lucide-react"

interface SidebarProps {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSignOut: () => void
}

export default function Sidebar({ currentView, setCurrentView, isOpen, setIsOpen, onSignOut }: SidebarProps) {
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
      id: "family-members" as ViewType,
      label: "Family Members",
      icon: Users,
      description: "Manage members & avatars",
    },
    {
      id: "rewards" as ViewType,
      label: "Rewards",
      icon: Gift,
      description: "Family rewards",
    },
    {
      id: "settings" as ViewType,
      label: "Settings",
      icon: Settings,
      description: "Account & preferences",
    },
  ]

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {isOpen ? (
              <div className="flex items-center gap-2">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kidoers_noBgColor-lp4nzseFjByx9uxSzOyiqX4zqX77pn.png"
                  alt="Kidoers"
                  className="h-8"
                />
              </div>
            ) : (
              <div className="flex items-center">
                <img
                  src="/symbol_kidoers.png"
                  alt="Kidoers"
                  className="h-8 w-8 object-contain"
                  style={{ minWidth: '32px', minHeight: '32px' }}
                  onError={(e) => {
                    console.error('Failed to load symbol_kidoers.png, trying SVG fallback');
                    e.currentTarget.src = '/symbol.svg';
                  }}
                />
                <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-muted rounded-lg transition-colors -ml-1">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
            {isOpen && (
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
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
                    isOpen ? "px-3 py-3" : "pl-1 pr-1 py-3"
                  } ${
                    isActive
                      ? isOpen 
                        ? "bg-gradient-warm text-white shadow-button"
                        : "text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`flex-shrink-0 transition-all duration-200 ${
                    isActive && !isOpen ? "h-6 w-6" : "h-5 w-5"
                  }`} />
                  {isOpen && (
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
              isOpen ? "px-3 py-3" : "pl-1 pr-1 py-3"
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span className="font-medium">{loading ? "Signing out..." : "Sign Out"}</span>}
          </button>
        </div>
      </div>
    </div>
  )
} 