/**
 * Authentication System
 * 
 * This file implements the mock authentication system for the Kidoers application.
 * All functions use localStorage for data persistence (demo/prototype mode).
 * 
 * For complete documentation, see: docs/PROJECT_SPECIFICATIONS.md
 * 
 * Implemented Functions:
 * - signUp(email, password) - User registration
 * - signIn(email, password) - User login  
 * - signInWithGoogle() - OAuth simulation
 * - signOut() - User logout
 * - resetPassword(email) - Password reset
 * - getCurrentUser() - Get current user
 */

import { storage } from "./storage"
import { shouldLoadDemoData } from "./demoData"

export interface User {
  id: string
  email: string
  name?: string
}

// Mock authentication functions
export const signUp = async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Simple validation
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  // Check if user already exists
  const existingUser = storage.getUser()
  if (existingUser && existingUser.email === email) {
    return { error: "User already exists" }
  }

  const user: User = {
    id: Date.now().toString(),
    email,
    name: email.split("@")[0],
  }

  storage.setUser(user)
  return { user }
}

export const signIn = async (email: string, password: string): Promise<{ user?: User; error?: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  // For demo purposes, accept any email/password combination
  // In a real app, you'd validate against a backend
  const user: User = {
    id: Date.now().toString(),
    email,
    name: email.split("@")[0],
  }

  storage.setUser(user)
  return { user }
}

export const signInWithGoogle = async (): Promise<{ user?: User; error?: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock Google sign-in
  const user: User = {
    id: Date.now().toString(),
    email: "demo@gmail.com",
    name: "Demo User",
  }

  storage.setUser(user)
  return { user }
}

export const signOut = async (): Promise<{ error?: string }> => {
  storage.removeUser()
  return {}
}

export const resetPassword = async (email: string): Promise<{ error?: string }> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (!email) {
    return { error: "Email is required" }
  }

  // Mock success
  return {}
}

export const getCurrentUser = (): User | null => {
  let user = storage.getUser()

  // Create demo user if none exists and demo data should be loaded
  if (!user && shouldLoadDemoData()) {
    user = {
      id: "demo-user-001",
      email: "demo@kidoers.app",
      name: "Demo User",
    }
    storage.setUser(user)
  }

  return user
}
