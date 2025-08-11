# Kidoers Frontend

A Next.js-based family task management application with proper architecture separation.

## 🏗️ **Architecture Overview**

This project follows a strict separation of concerns:

- **Supabase**: Authentication only (signup, signin, session management)
- **FastAPI Backend**: All business logic and data operations
- **Frontend**: UI components + API service calls

## 🚀 **Quick Start**

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase and API credentials
   ```

3. **Run the development server**:
   ```bash
   pnpm dev
   ```

## 🔐 **Authentication**

All authentication is handled through Supabase:
- User signup/signin
- JWT token management
- Session handling

## 📡 **API Communication**

All business logic goes through the FastAPI backend:
- Family management
- User profiles
- Onboarding status
- Routines & tasks

## 🧪 **Architecture Compliance**

Run the compliance check before committing:
```bash
./scripts/check-architecture.sh
```

This ensures:
- ✅ No direct Supabase database queries
- ✅ All data operations use the backend API
- ✅ Proper authentication flow

## 📁 **Project Structure**

```
app/
├── components/          # UI components
├── lib/
│   ├── supabase.ts     # Authentication only
│   ├── api.ts          # Backend API service
│   └── storage.ts      # API calls + local storage
├── onboarding/         # Onboarding flow
└── dashboard/          # Main application
```

## 🚫 **Important Rules**

1. **Never use `supabase.from()`** for business data
2. **Always use `apiService.methodName()`** for data operations
3. **Keep Supabase usage limited to authentication only**
4. **Run architecture checks before committing**

## 📚 **Documentation**

- [Architecture Guide](./ARCHITECTURE.md) - Detailed architecture rules
- [API Documentation](./docs/) - Backend API specifications

## 🆘 **Need Help?**

- Check the [Architecture Guide](./ARCHITECTURE.md)
- Run `./scripts/check-architecture.sh` to verify compliance
- Ensure all data operations go through the backend API

---

**Remember**: Supabase = Auth, FastAPI = Business Logic, Frontend = UI + API Calls
