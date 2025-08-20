"use client";

import { ReactNode } from "react";

export default function RoutineBuilderShell({
  header,
  center,
  right,
}: {
  header: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">{header}</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">{center}</div>
          <aside className="lg:col-span-1">
            <div className="bg-white border rounded-xl shadow-sm p-4">
              {right}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
