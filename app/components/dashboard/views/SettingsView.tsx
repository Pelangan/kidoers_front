"use client"

import { useState } from "react"
import { Settings, Lock, User, Shield, Bell, Palette } from "lucide-react"
import { auth } from "../../../lib/supabase"

export default function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match" })
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" })
      setLoading(false)
      return
    }

    try {
      const { error } = await auth.updatePassword(newPassword)
      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update password" })
    } finally {
      setLoading(false)
    }
  }

  const settingsSections = [
    {
      id: "account",
      title: "Account Settings",
      icon: User,
      items: [
        {
          title: "Change Password",
          description: "Update your account password",
          action: "Change",
          onClick: () => document.getElementById("password-modal")?.classList.remove("hidden")
        }
      ]
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      icon: Shield,
      items: [
        {
          title: "Data Privacy",
          description: "Manage your data and privacy settings",
          action: "Manage",
          onClick: () => {}
        }
      ]
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      items: [
        {
          title: "Push Notifications",
          description: "Configure notification preferences",
          action: "Configure",
          onClick: () => {}
        }
      ]
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: Palette,
      items: [
        {
          title: "Theme",
          description: "Choose light or dark mode",
          action: "Select",
          onClick: () => {}
        }
      ]
    }
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.id} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              </div>
              
              <div className="space-y-4">
                {section.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <button
                      onClick={item.onClick}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Change Password Modal */}
      <div id="password-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 hidden">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-foreground">Change Password</h2>
            <button
              onClick={() => document.getElementById("password-modal")?.classList.add("hidden")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === "success" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                required
                minLength={6}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => document.getElementById("password-modal")?.classList.add("hidden")}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 