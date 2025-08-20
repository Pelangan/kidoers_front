"use client";

import { useState } from "react";

export default function RoutineHeader({
  initialName,
  onRename,
  onPublish,
  busy,
  onBack,
}: {
  initialName: string;
  onRename: (name: string) => Promise<void> | void;
  onPublish: () => Promise<void> | void;
  busy?: boolean;
  onBack?: () => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="flex items-center justify-between bg-white border rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        )}
        <input
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && onRename(name.trim())}
          placeholder="Untitled Routine"
        />
      </div>
      <button
        onClick={onPublish}
        disabled={busy}
        className={`px-4 py-2 rounded-lg text-white ${busy ? "bg-gray-400" : "bg-primary hover:bg-primary-dark"}`}
      >
        {busy ? "Publishing..." : "Publish"}
      </button>
    </div>
  );
}
