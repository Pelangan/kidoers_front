"use client"

import { useState, useEffect } from "react"
import { Plus, Check, CheckSquare } from "lucide-react"
import { storage } from "../../../lib/storage"

interface Chore {
  id: string
  title: string
  description?: string
  completed: boolean
  assignedTo: string
  frequency: "daily" | "weekly" | "weekends"
}

interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
}

export default function ChoresView() {
  const [chores, setChores] = useState<Chore[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    try {
      const membersData = storage.getMembers()
      const choresData = storage.getChores()

      setMembers(membersData || [])
      setChores(choresData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleChore = (choreId: string, completed: boolean) => {
    const updatedChores = chores.map((chore) => (chore.id === choreId ? { ...chore, completed: !completed } : chore))

    setChores(updatedChores)
    storage.setChores(updatedChores)
  }

  const getChoresByMember = (memberId: string) => {
    return chores.filter((chore) => chore.assignedTo === memberId)
  }

  const getMemberColor = (index: number) => {
    const colors = [
      "bg-blue-100 border-blue-200",
      "bg-green-100 border-green-200",
      "bg-yellow-100 border-yellow-200",
      "bg-purple-100 border-purple-200",
      "bg-pink-100 border-pink-200",
      "bg-indigo-100 border-indigo-200",
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Today's Chores</h2>
          <p className="text-muted-foreground">Track daily tasks for each family member</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Chore
        </button>
      </div>

      {/* Chores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((member, index) => (
          <div key={member.id} className={`card border-2 ${getMemberColor(index)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{member.name}</h3>
              <span className="text-sm text-muted-foreground capitalize">{member.role}</span>
            </div>

            <div className="space-y-3">
              {getChoresByMember(member.id).map((chore) => (
                <div
                  key={chore.id}
                  className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    chore.completed
                      ? "bg-green-50 border-green-200 opacity-75"
                      : "bg-white border-gray-200 hover:shadow-sm"
                  }`}
                  onClick={() => toggleChore(chore.id, chore.completed)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        chore.completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-primary"
                      }`}
                    >
                      {chore.completed && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${chore.completed ? "line-through text-muted-foreground" : ""}`}>
                        {chore.title}
                      </div>
                      {chore.description && <div className="text-sm text-muted-foreground">{chore.description}</div>}
                      <div className="text-xs text-muted-foreground capitalize mt-1">{chore.frequency}</div>
                    </div>
                  </div>
                </div>
              ))}

              {getChoresByMember(member.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chores assigned</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No family members found</h3>
          <p className="text-muted-foreground">Complete the onboarding process to add family members and chores.</p>
        </div>
      )}
    </div>
  )
}
