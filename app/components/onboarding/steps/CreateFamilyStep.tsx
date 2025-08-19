"use client"

import { useState, useEffect } from "react"
import { Users, Plus, X, ChevronDown } from "lucide-react"
import type { FamilyMember } from "../../../types"
import ColorPicker, { softColors } from "../../ui/ColorPicker"
import { getFamily, listMembers, patchFamilyName, createMember, deleteMember, apiService } from "../../../lib/api"

interface CreateFamilyStepProps {
  familyId?: string | null;     // new
  onComplete: (familyId: string) => void
}

export default function CreateFamilyStep({ familyId, onComplete }: CreateFamilyStepProps) {
  const [familyName, setFamilyName] = useState("")
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberAge, setNewMemberAge] = useState("5")
  const [newMemberRole, setNewMemberRole] = useState<"parent" | "child">("child")
  const [newMemberColor, setNewMemberColor] = useState("blue")
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  // Load existing family data when familyId is provided (edit mode)
  useEffect(() => {
    (async () => {
      if (!familyId) return; // create mode
      setIsSubmitting(true);
      try {
        const fam = await getFamily(familyId);
        setFamilyName(fam.name || "");
        const existing = await listMembers(familyId);
        setMembers(existing.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          color: m.color || "blue",
          age: m.role === "child" ? (m.age ?? null) : null,
          avatar_url: m.avatar_url || undefined,
        })));
      } catch (e) {
        console.error("Failed to load family for edit", e);
        setError("Failed to load existing family. You can retry or continue.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  // Update age when role changes - hide age field for parents
  const handleRoleChange = (role: "parent" | "child") => {
    setNewMemberRole(role)
    if (role === "child") {
      setNewMemberAge("5") // Reset to default child age
    }
    setShowRoleDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) return setError("Please enter a family name");
    if (members.length === 0) return setError("Please add at least one family member");

    setIsSubmitting(true);
    setError("");

    try {
      if (familyId) {
        // EDIT MODE: patch name if changed
        try {
          const fam = await getFamily(familyId);
          if ((fam.name || "") !== familyName.trim()) {
            await patchFamilyName(familyId, familyName.trim());
          }
        } catch {}
        onComplete(familyId);
      } else {
        // CREATE MODE: create family + members at once
        const apiMembers = members.map((m) => ({
          name: m.name,
          role: m.role,
          age: m.role === "child" ? m.age ?? 5 : null,
          color: m.color ?? "blue",
          avatar_url: m.avatar_url ?? null,
        }));

        const created = await apiService.startOnboarding({
          family_name: familyName.trim(),
          members: apiMembers,
        });

        // created.id is the new family id returned by the backend
        onComplete(created.id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to save family. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = async () => {
    if (!newMemberName.trim()) return
    
    // Set age to null for parents, or use selected age for children
    const memberAge = newMemberRole === "parent" ? null : parseInt(newMemberAge)
    
    const local = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      age: memberAge,
      calmMode: false,
      textToSpeech: false,
    } as FamilyMember;

    try {
      if (familyId) {
        const created = await createMember({
          family_id: familyId,
          name: local.name,
          role: local.role,
          age: local.role === "child" ? (local.age ?? 5) : null,
          color: local.color as any,
        });
        // `created` returns the full row including `id`
        setMembers(prev => [...prev, { ...local, id: created.id }]);
      } else {
        setMembers(prev => [...prev, local]); // create mode (local only)
      }
    } catch (e) {
      console.error(e);
      setError("Failed to add member.");
    } finally {
      setNewMemberName("");
      setNewMemberAge("5");
      setNewMemberRole("child");
      setNewMemberColor("blue");
    }
  }

  const removeMember = async (id: string) => {
    try {
      if (familyId) {
        // Only delete if this looks like a real UUID from backend
        if (id && id.length > 20) {
          await deleteMember(id);
        }
      }
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
      setError("Failed to remove member.");
    }
  }

  const ageOptions = Array.from({ length: 18 }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Family</h2>
        <p className="text-gray-600">Let's start by setting up your family profile</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Family Name */}
        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-2">
            Family Name
          </label>
          <input
            id="familyName"
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="The Smith Family"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            autoFocus
          />
        </div>

        {/* Add Family Members Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Add Family Members</h3>
          
          {/* Input Fields */}
          <div className="flex items-center gap-3 mb-4">
            {/* Name Input */}
            <div className="flex-1">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
            </div>

            {/* Age Dropdown - Only show for children */}
            {newMemberRole === "child" && (
              <div className="relative">
                <select
                  value={newMemberAge}
                  onChange={(e) => setNewMemberAge(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors appearance-none pr-8"
                >
                  {ageOptions.map(age => (
                    <option key={age} value={age.toString()}>
                      {age}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Role Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors flex items-center justify-between min-w-[100px]"
              >
                <span className="capitalize">{newMemberRole}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {showRoleDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[100px]">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("parent")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-t-lg"
                  >
                    Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("child")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-b-lg"
                  >
                    Child
                  </button>
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="relative">
              <ColorPicker
                selectedColor={newMemberColor}
                onColorChange={setNewMemberColor}
                className="w-32"
              />
            </div>
          </div>

          {/* Add Member Button */}
          <button
            type="button"
            onClick={addMember}
            disabled={!newMemberName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Users className="h-4 w-4" />
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        {/* Family Members List */}
        {members.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Family Members</h3>
            
            <div className="space-y-3">
              {members.map((member) => {
                const colorData = softColors.find(c => c.value === member.color) || softColors[0]
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 ${colorData.bg} rounded-full flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${colorData.text}`}>
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">
                        {member.role === "parent" ? "Parent" : `Age ${member.age || 5}`}
                      </div>
                    </div>
                                          <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          member.role === "parent" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-green-100 text-green-800"
                        }`}>
                          {member.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="p-1 hover:bg-gray-200 rounded text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 text-sm">No family members added yet</p>
            <p className="text-gray-500 text-sm">Add at least one child to continue</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting || !familyName.trim() || members.length === 0}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              isSubmitting || !familyName.trim() || members.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {familyId ? "Saving…" : "Creating Family..."}
              </div>
            ) : (
              familyId ? "Save & Continue" : "Create Family & Continue"
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          This will create your family profile and add you as the owner
        </p>
      </div>
    </div>
  )
}
