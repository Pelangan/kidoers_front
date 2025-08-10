"use client"

import { useState } from "react"
import { Settings, Lock, User, Shield, Bell, Palette, Users } from "lucide-react"
import { auth } from "../../../lib/supabase"
import { storage } from "../../../lib/storage"
import type { FamilyMember } from "../../../types"
import ColorPicker, { softColors } from "../../ui/ColorPicker"

export default function SettingsView() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Family management state
  const [showFamilyModal, setShowFamilyModal] = useState(false)
  const [familyName, setFamilyName] = useState("")
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"parent" | "child">("parent")
  const [newMemberColor, setNewMemberColor] = useState("blue")

  // Load existing family data
  const loadFamilyData = () => {
    try {
      const existingMembers = storage.getMembers()
      const existingFamily = storage.getFamily()
      const existingFamilyName = existingFamily?.name || "My Family"
      setMembers(existingMembers || [])
      setFamilyName(existingFamilyName)
    } catch (error) {
      console.error("Error loading family data:", error)
    }
  }





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
        setMessage({ type: "error", text: error })
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

  const handleFamilyModalOpen = () => {
    loadFamilyData()
    setShowFamilyModal(true)
  }

  const handleFamilyModalClose = () => {
    setShowFamilyModal(false)
    setNewMemberName("")
    setNewMemberRole("parent")
  }

  const addMember = () => {
    if (!newMemberName.trim()) return
    
    // Set age to null for parents, or use default child age (5)
    const memberAge = newMemberRole === "parent" ? null : 5
    
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      age: memberAge,
      calmMode: false,
      textToSpeech: false,
    }
    
    setMembers([...members, newMember])
    setNewMemberName("")
  }

  const removeMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id))
  }

  const saveFamilyChanges = () => {
    try {
      storage.setMembers(members)
      storage.setFamily({ name: familyName })
      setMessage({ type: "success", text: "Family updated successfully!" })
      handleFamilyModalClose()
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save family changes" })
    }
  }

  const settingsSections = [
    {
      id: "family",
      title: "Family Management",
      icon: Users,
      items: [
        {
          title: "Family Members",
          description: "Add, remove, or edit family members",
          action: "Manage",
          onClick: handleFamilyModalOpen
        }
      ]
    },
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
    },

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

      {/* Family Management Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-foreground">Manage Family</h2>
              <button
                onClick={handleFamilyModalClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.type === "success" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {message.text}
                </div>
              )}

              {/* Family Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Family Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="The Smith Family"
                  className="input w-full"
                />
              </div>

              {/* Current Members */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Family Members</h3>
                <div className="space-y-3">
                  {members.map((member) => {
                    const colorData = softColors.find(c => c.value === member.color) || softColors[0]
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colorData.bg} ${colorData.text}`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <span className="text-xl">&times;</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Add New Member */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Add New Member</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <ColorPicker
                      selectedColor={newMemberColor}
                      onColorChange={setNewMemberColor}
                      className="w-32"
                    />
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Member name"
                      className="input flex-1 min-w-0"
                      onKeyPress={(e) => e.key === "Enter" && addMember()}
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as "parent" | "child")}
                      className="input w-32"
                    >
                      <option value="parent">Parent</option>
                      <option value="child">Child</option>
                    </select>
                    <button
                      onClick={addMember}
                      disabled={!newMemberName.trim()}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleFamilyModalClose}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFamilyChanges}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 