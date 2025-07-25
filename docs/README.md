# Kidoers Project Documentation

## 📚 Documentation Index

This folder contains comprehensive documentation for the Kidoers family task management application.

### 📋 Core Documentation

- **[PROJECT_SPECIFICATIONS.md](./PROJECT_SPECIFICATIONS.md)** - Complete project overview, architecture, and implemented functions
  - Authentication system (6 Supabase functions)
  - Family management
  - Task management (chores)
  - Activity management
  - Reward system
  
  - Data storage system (14 localStorage functions)
  - UI components (15+ components)
  - Technical implementation details

### 🏗️ Architecture Overview

**Technology Stack:**
- Next.js 15.2.4 (App Router)
- TypeScript 5
- Tailwind CSS 3.4.17
- Radix UI + shadcn/ui
- localStorage (Prototype)
- Supabase Authentication (JWT + Google OAuth)

### 🔧 Key Implementation Details

#### Authentication Functions
- `auth.signUp(email, password)` - User registration
- `auth.signIn(email, password)` - User login
- `auth.signInWithGoogle()` - OAuth authentication
- `auth.signOut()` - User logout
- `auth.resetPassword(email)` - Password reset
- `auth.getCurrentUser()` - Get current user

#### Storage Functions
- `storage.getUser()` / `storage.setUser()`
- `storage.getFamily()` / `storage.setFamily()`
- `storage.getMembers()` / `storage.setMembers()`
- `storage.getChores()` / `storage.setChores()`
- `storage.getActivities()` / `storage.setActivities()`
- `storage.getRewards()` / `storage.setRewards()`
- `storage.clearAll()` - Clear all data



### 📁 Project Structure

```
kidoers_front/
├── app/                          # Next.js App Router
│   ├── components/               # UI components
│   │   ├── auth/                # Authentication
│   │   ├── dashboard/           # Dashboard

│   │   ├── layout/              # Layout
│   │   └── onboarding/          # Onboarding
│   ├── dashboard/               # Dashboard pages
│   ├── signin/                  # Sign-in page
│   ├── signup/                  # Sign-up page
│   ├── forgot-password/         # Password reset
│   ├── onboarding/              # Onboarding flow
│   ├── lib/                     # Utilities
│   └── page.tsx                 # Home page
├── docs/                        # Project documentation
└── [config files]               # Configuration
```

### 🎯 Quick Reference

#### Data Models
- **User**: `{ id, email, name }`
- **Family**: `{ id, name, createdAt }`
- **FamilyMember**: `{ id, name, role, calmMode, textToSpeech }`
- **Chore**: `{ id, title, description, frequency, assignedTo, completed }`
- **Activity**: `{ id, title, description, scheduled_date, depends_on_chores }`
- **Reward**: `{ id, title, description, threshold }`

#### localStorage Keys
- `kidoers_user` - Current user data
- `kidoers_family` - Family information
- `kidoers_members` - Family members list
- `kidoers_chores` - Chores/tasks
- `kidoers_activities` - Calendar activities
- `kidoers_rewards` - Family rewards

### 🚀 Getting Started

1. **Read the full specifications**: [PROJECT_SPECIFICATIONS.md](./PROJECT_SPECIFICATIONS.md)
2. **Understand the architecture**: Review the technology stack and project structure
3. **Explore the functions**: Check the implemented authentication and storage functions
4. **Review UI components**: Understand the component hierarchy and relationships

### 📝 Development Guidelines

- **All data uses localStorage** (prototype mode)
- **Mock authentication** system (no real backend)

- **TypeScript** for type safety
- **Next.js App Router** for routing
- **Tailwind CSS** for styling

---

**Last Updated**: December 2024  
**Version**: 0.1.0  
**Status**: Prototype/Demo 