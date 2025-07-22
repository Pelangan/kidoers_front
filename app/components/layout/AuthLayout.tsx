import type { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">{children}</div>
      </div>
    </div>
  )
}
