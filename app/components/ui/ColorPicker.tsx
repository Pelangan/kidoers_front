"use client"

import { useState } from "react"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
  className?: string
}

const softColors = [
  { name: "Blue", value: "blue", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" },
  { name: "Green", value: "green", bg: "bg-green-100", border: "border-green-300", text: "text-green-700" },
  { name: "Yellow", value: "yellow", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-700" },
  { name: "Orange", value: "orange", bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-700" },
  { name: "Purple", value: "purple", bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700" },
  { name: "Pink", value: "pink", bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-700" },
  { name: "Teal", value: "teal", bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-700" },
  { name: "Indigo", value: "indigo", bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-700" }
]

export default function ColorPicker({ selectedColor, onColorChange, className = "" }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedColorData = softColors.find(color => color.value === selectedColor) || softColors[0]

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${selectedColorData.border} ${selectedColorData.bg} ${selectedColorData.text} hover:opacity-80 transition-opacity`}
      >
        <div className={`w-4 h-4 rounded-full ${selectedColorData.bg} border-2 ${selectedColorData.border}`}></div>
        <span className="text-sm font-medium">{selectedColorData.name}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 min-w-48">
          <div className="grid grid-cols-2 gap-2">
            {softColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  onColorChange(color.value)
                  setIsOpen(false)
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                  selectedColor === color.value
                    ? `${color.border} ${color.bg} ${color.text}`
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${color.bg} border-2 ${color.border}`}></div>
                <span className="text-sm font-medium">{color.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { softColors } 