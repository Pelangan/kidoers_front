"use client"

import type React from "react"

import { useState } from "react"
import { loadDemoData } from "../../lib/demoData"
import { Download, Upload, RotateCcw, Users } from "lucide-react"

interface DemoDataManagerProps {
  onDataLoaded?: () => void
}

export default function DemoDataManager({ onDataLoaded }: DemoDataManagerProps) {
  const [loading, setLoading] = useState(false)

  const handleLoadDemoData = async () => {
    setLoading(true)

    // Small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500))

    loadDemoData()

    if (onDataLoaded) {
      onDataLoaded()
    }

    setLoading(false)

    // Reload the page to reflect changes
    window.location.reload()
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all family data? This cannot be undone.")) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const handleExportData = () => {
    const data = {
      family: localStorage.getItem("kidoers_family"),
      members: localStorage.getItem("kidoers_members"),
      chores: localStorage.getItem("kidoers_chores"),
      activities: localStorage.getItem("kidoers_activities"),
      rewards: localStorage.getItem("kidoers_rewards"),
      user: localStorage.getItem("kidoers_user"),
    }

    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `kidoers-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        // Restore all data
        Object.entries(data).forEach(([key, value]) => {
          if ((value && key.startsWith("kidoers_")) || key === "user") {
            const storageKey = key.startsWith("kidoers_") ? key : `kidoers_${key}`
            localStorage.setItem(storageKey, value as string)
          }
        })

        alert("Data imported successfully!")
        window.location.reload()
      } catch (error) {
        alert("Error importing data. Please check the file format.")
        console.error("Import error:", error)
      }
    }

    reader.readAsText(file)
    event.target.value = "" // Reset input
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Demo Data Manager</h3>
      </div>

      <p className="text-sm text-blue-700 mb-4">
        Quickly test the app with pre-populated family data, or manage your existing data.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleLoadDemoData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <Users className="h-4 w-4" />
          {loading ? "Loading..." : "Load Demo Family"}
        </button>

        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          <Download className="h-4 w-4" />
          Export Data
        </button>

        <label className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer text-sm">
          <Upload className="h-4 w-4" />
          Import Data
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
        </label>

        <button
          onClick={handleClearData}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Clear All Data
        </button>
      </div>
    </div>
  )
} 