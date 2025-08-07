import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kidoers - Family Task Management",
  description:
    "Help your kids build healthy routines with visual task lists, positive reinforcement, and collaborative family rewards.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Development utilities for Kidoers
              if (typeof window !== 'undefined') {
                window.kidoersDev = {
                  forceOnboarding: () => {
                    const storage = {
                      getForceOnboarding: () => {
                        const force = localStorage.getItem("kidoers_force_onboarding")
                        return force ? JSON.parse(force) : false
                      },
                      setForceOnboarding: (force) => {
                        localStorage.setItem("kidoers_force_onboarding", JSON.stringify(force))
                      }
                    }
                    const current = storage.getForceOnboarding()
                    storage.setForceOnboarding(!current)
                    console.log(\`Force onboarding \${!current ? 'enabled' : 'disabled'}\`)
                    console.log('Refresh the page to see the effect')
                    return !current
                  },
                  resetData: () => {
                    localStorage.removeItem("kidoers_user")
                    localStorage.removeItem("kidoers_family")
                    localStorage.removeItem("kidoers_members")
                    localStorage.removeItem("kidoers_chores")
                    localStorage.removeItem("kidoers_activities")
                    localStorage.removeItem("kidoers_rewards")
                    localStorage.removeItem("kidoers_force_onboarding")
                    console.log('All data cleared')
                    window.location.href = '/onboarding'
                  },
                  goToOnboarding: () => {
                    localStorage.setItem("kidoers_force_onboarding", "true")
                    console.log('Force onboarding enabled, redirecting...')
                    window.location.href = '/onboarding'
                  },
                  showStatus: () => {
                    const storage = {
                      getForceOnboarding: () => {
                        const force = localStorage.getItem("kidoers_force_onboarding")
                        return force ? JSON.parse(force) : false
                      },
                      getFamily: () => {
                        const family = localStorage.getItem("kidoers_family")
                        return family ? JSON.parse(family) : null
                      },
                      getUser: () => {
                        const user = localStorage.getItem("kidoers_user")
                        return user ? JSON.parse(user) : null
                      }
                    }
                    console.log('Kidoers Development Status:')
                    console.log('- Force onboarding:', storage.getForceOnboarding())
                    console.log('- Family exists:', !!storage.getFamily())
                    console.log('- User exists:', !!storage.getUser())
                    console.log('- Current URL:', window.location.pathname)
                    console.log('- Available commands:')
                    console.log('  • kidoersDev.forceOnboarding() - Toggle force onboarding')
                    console.log('  • kidoersDev.goToOnboarding() - Force redirect to onboarding')
                    console.log('  • kidoersDev.resetData() - Clear all data')
                    console.log('  • kidoersDev.showStatus() - Show current status')
                  }
                }
                console.log('Kidoers dev utilities loaded. Type kidoersDev.showStatus() for help.')
              }
            `
          }}
        />
      </body>
    </html>
  )
}
