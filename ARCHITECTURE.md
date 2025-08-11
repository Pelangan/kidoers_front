# Kidoers Frontend Architecture

## 🏗️ **Architecture Overview**

This document defines the correct architecture for the Kidoers frontend application, ensuring proper separation of concerns and security.

## 🔐 **Authentication Layer (Supabase)**

**Frontend → Supabase: Authentication ONLY**

### ✅ **Allowed Operations:**
- User signup (`supabase.auth.signUp`)
- User signin (`supabase.auth.signInWithPassword`)
- Google OAuth (`supabase.auth.signInWithOAuth`)
- User signout (`supabase.auth.signOut`)
- Get current session (`supabase.auth.getSession`)
- Get current user (`supabase.auth.getUser`)
- Password reset (`supabase.auth.resetPasswordForEmail`)
- Update password (`supabase.auth.updateUser`)

### ❌ **Forbidden Operations:**
- Direct database queries (`supabase.from()`)
- Direct table access
- Direct data manipulation

## 🚀 **Business Logic Layer (FastAPI Backend)**

**Frontend → FastAPI: All Business Operations**

### ✅ **Required Operations:**
- Family management (`/api/v1/families`)
- User profiles (`/api/v1/users`)
- Onboarding status (`/api/v1/onboarding`)
- Routines & tasks (`/api/v1/routines`)
- Any other business data

### 🔑 **Authentication:**
- All API calls must include JWT token from Supabase
- Token passed in `Authorization: Bearer <token>` header
- Backend validates token and handles permissions

## 📁 **File Structure & Responsibilities**

### **`/app/lib/supabase.ts`**
- ✅ Authentication functions only
- ❌ No database queries
- ❌ No business logic

### **`/app/lib/api.ts`**
- ✅ Backend API communication
- ✅ JWT token handling
- ✅ Business logic requests

### **`/app/lib/storage.ts`**
- ✅ Backend API calls (not direct Supabase)
- ✅ Local storage for UI state only
- ❌ No direct database access

## 🚫 **Common Anti-Patterns to Avoid**

### **❌ Don't Do This:**
```typescript
// WRONG: Direct database query
const { data } = await supabase
  .from('families')
  .select('*')
  .eq('user_id', userId)

// WRONG: Direct table access
const profile = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### **✅ Do This Instead:**
```typescript
// CORRECT: Use backend API
const families = await apiService.getFamilies()

// CORRECT: Use backend API
const profile = await apiService.getUserProfile()
```

## 🔄 **Data Flow**

```
1. User Action (e.g., create family)
   ↓
2. Frontend → Supabase (get JWT token)
   ↓
3. Frontend → FastAPI (send request + JWT)
   ↓
4. FastAPI → Supabase (validate JWT + query data)
   ↓
5. FastAPI → Frontend (return data)
   ↓
6. Frontend → Update UI
```

## 🧪 **Testing Architecture Compliance**

### **Check for Violations:**
```bash
# Search for direct database queries
grep -r "supabase\.from(" app/

# Search for direct table access
grep -r "supabase\." app/ | grep -v "auth\."

# Search for missing API calls
grep -r "\.from(" app/
```

### **Expected Results:**
- ✅ Only authentication calls to Supabase
- ✅ All business logic goes through API service
- ✅ No direct database queries in components

## 📋 **Implementation Checklist**

### **When Adding New Features:**
- [ ] **Authentication**: Use Supabase auth functions
- [ ] **Data Access**: Create backend API endpoint
- [ ] **Frontend**: Use API service, not direct Supabase
- [ ] **Security**: Ensure JWT validation in backend
- [ ] **Error Handling**: Proper error handling in both layers

### **When Reviewing Code:**
- [ ] No `supabase.from()` calls outside auth
- [ ] All data operations use API service
- [ ] JWT tokens properly passed to backend
- [ ] Proper error handling and user feedback

## 🎯 **Benefits of This Architecture**

1. **Security**: Centralized authentication and authorization
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Backend can optimize and cache
4. **Flexibility**: Easy to switch auth providers
5. **Testing**: Clear boundaries for unit tests
6. **Performance**: Backend can optimize database queries

## 🚨 **Emergency Override**

**Only in extreme cases** where backend is unavailable:
- Document the violation clearly
- Create ticket to fix architecture
- Remove the override as soon as possible

---

**Remember**: Supabase = Authentication, FastAPI = Business Logic, Frontend = UI + API Calls
