# 🐳 Unified Docker Testing Setup

This setup provides a complete local development environment with Supabase + Backend API running in Docker containers, perfect for e2e testing without affecting your production data.

## 🚀 Quick Start

### 1. Start Supabase Services
```bash
./docker-test.sh start
```

### 2. Setup Test Environment
```bash
./docker-test.sh setup
```

### 3. Start Your App
```bash
npm run dev
```

### 4. Run Tests
```bash
./docker-test.sh test
```

### 5. Cleanup
```bash
./docker-test.sh cleanup
```

## 📊 Services

| Service | Port | Description |
|---------|------|-------------|
| Database | 54322 | PostgreSQL database |
| Auth API | 54321 | Authentication service |
| REST API | 54320 | PostgREST API |
| Studio | 54323 | Supabase Studio UI |
| Email Testing | 54324 | Inbucket email testing |
| **Backend API** | **8001** | **Kidoers FastAPI backend (Docker)** |
| **Local Backend** | **8000** | **Your local development backend** |

## 🛠️ Available Commands

```bash
# Basic Docker management
./docker-test.sh start      # Start Docker services (Supabase + Backend)
./docker-test.sh stop       # Stop Docker services
./docker-test.sh setup      # Setup test environment (.env.local)
./docker-test.sh restore    # Restore original environment
./docker-test.sh logs       # Show service logs
./docker-test.sh cleanup    # Stop services and restore environment

# Automated testing
./run-e2e-tests.sh          # Frontend E2E tests only
./run-backend-tests.sh      # Backend unit + integration tests only
./run-all-tests.sh          # Complete test suite (backend + frontend)
./backend-switcher.sh       # Interactive environment switcher
./verify-test-user.sh       # Verify test user exists
```

## 🎯 Development Workflows

### **Workflow 1: Local Development**
```bash
# Terminal 1: Start your local backend
cd ../kidoers_backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start frontend
npm run dev

# Your app uses:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - Supabase: Your existing setup
```

### **Workflow 2: E2E Testing**
```bash
# Option A: Frontend E2E tests only
./run-e2e-tests.sh

# Option B: Backend tests only
./run-backend-tests.sh

# Option C: Complete test suite (recommended)
./run-all-tests.sh

# Option D: Manual
./docker-test.sh start      # Start Docker environment
npm run dev                 # Start frontend (in another terminal)
./docker-test.sh test       # Run E2E tests
./docker-test.sh cleanup    # Cleanup when done
```

### **Workflow 3: Mixed Development**
```bash
# Start Docker environment for testing
./docker-test.sh start

# Keep your local backend running for development
# Frontend can switch between:
# - Local backend: http://localhost:8000 (for development)
# - Docker backend: http://localhost:8001 (for testing)
```

## 🎯 Testing Workflow

1. **Full Setup**: `./docker-test.sh full-test`
2. **Start App**: `npm run dev` (in another terminal)
3. **Run Tests**: `./docker-test.sh test`
4. **Cleanup**: `./docker-test.sh cleanup`

## 🔧 Configuration

### Environment Variables (Test Mode)
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAwMDAwMDAwMH0.example
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Database Schema
The setup includes a complete database schema with:
- User profiles
- Families and family members
- Tasks and routines
- Row Level Security (RLS) policies
- **Pre-created test user** (`testuser@example.com` / `testpassword123`)
- Automatic profile creation on signup

## 🧪 Testing Benefits

✅ **Isolated Environment**: No impact on production data  
✅ **Consistent Setup**: Same environment every time  
✅ **Easy Cleanup**: Just stop containers and restore env  
✅ **No Email Sending**: Email sending completely disabled for testing  
✅ **Pre-created Test User**: Uses existing test user to avoid signup emails  
✅ **Unified Stack**: Supabase + Backend API in one environment  
✅ **Studio Access**: Full Supabase Studio for debugging  

### Test User
A pre-created test user is available for E2E testing:
- **Email**: `testuser@example.com`
- **Password**: `testpassword123`
- **Status**: Email confirmed, onboarding completed
- **No email sending required** for login

## 🐛 Troubleshooting

### Services Not Starting
```bash
# Check Docker is running
docker info

# Check service logs
./docker-test.sh logs

# Restart services
./docker-test.sh stop
./docker-test.sh start
```

### Database Connection Issues
```bash
# Check if database is healthy
docker ps | grep kidoers-test-db

# Check database logs
docker logs kidoers-test-db
```

### Port Conflicts
If you have port conflicts, modify the ports in `docker-compose.test.yml`:
```yaml
ports:
  - "54322:5432"  # Change 54322 to another port
```

## 🔄 Reset Everything

To completely reset the testing environment:
```bash
./docker-test.sh cleanup
docker system prune -f
docker volume rm kidoers_front_supabase_test_db_data
```

## 📝 Notes

- The database schema is automatically created on first startup
- Test users are created in the local database only
- Email confirmation is disabled for testing (`GOTRUE_MAILER_AUTOCONFIRM: true`)
- All data is stored in Docker volumes and persists between restarts
