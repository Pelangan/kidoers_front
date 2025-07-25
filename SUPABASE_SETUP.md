# Supabase Authentication Setup Guide

## 🚀 Step-by-Step Implementation

### **Step 1: Create Supabase Project**

1. **Go to [supabase.com](https://supabase.com)** and sign up/login
2. **Create a new project**:
   - Click "New Project"
   - Choose your organization
   - Enter project name: `kidoers`
   - Set a database password (save this!)
   - Choose a region close to your users
   - Click "Create new project"

### **Step 2: Get Your Credentials**

1. **Go to Project Settings** → **API**
2. **Copy these values**:
   - **Project URL** (starts with `https://`)
   - **Anon/Public Key** (starts with `eyJ`)

### **Step 3: Set Environment Variables**

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### **Step 4: Configure Google OAuth**

1. **Go to Authentication** → **Providers** in your Supabase dashboard
2. **Enable Google provider**:
   - Toggle Google to "Enabled"
   - Add your Google OAuth credentials (see Google setup below)

### **Step 5: Google OAuth Setup**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to APIs & Services → Library
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for development)
5. **Copy Client ID and Client Secret** to Supabase Google provider settings

### **Step 6: Database Schema Setup**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create families table
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('parent', 'child')) NOT NULL,
  calm_mode BOOLEAN DEFAULT FALSE,
  text_to_speech BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chores table
CREATE TABLE chores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'weekends')) NOT NULL,
  assigned_to UUID REFERENCES family_members(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  depends_on_chores BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES family_members(id),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  threshold INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Families: Users can access families they created or are members of
CREATE POLICY "Users can view their families" ON families
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_id = families.id 
      AND family_members.id IN (
        SELECT id FROM family_members WHERE family_id = families.id
      )
    )
  );

CREATE POLICY "Users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their families" ON families
  FOR UPDATE USING (auth.uid() = created_by);

-- Family members: Users can access members of their families
CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_members.family_id 
      AND (families.created_by = auth.uid() OR families.id IN (
        SELECT family_id FROM family_members WHERE family_id = families.id
      ))
    )
  );

CREATE POLICY "Users can manage family members" ON family_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = family_members.family_id 
      AND families.created_by = auth.uid()
    )
  );

-- Chores: Users can access chores of their families
CREATE POLICY "Users can view family chores" ON chores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = chores.family_id 
      AND (families.created_by = auth.uid() OR families.id IN (
        SELECT family_id FROM family_members WHERE family_id = families.id
      ))
    )
  );

CREATE POLICY "Users can manage family chores" ON chores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = chores.family_id 
      AND families.created_by = auth.uid()
    )
  );

-- Activities: Users can access activities of their families
CREATE POLICY "Users can view family activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = activities.family_id 
      AND (families.created_by = auth.uid() OR families.id IN (
        SELECT family_id FROM family_members WHERE family_id = families.id
      ))
    )
  );

CREATE POLICY "Users can manage family activities" ON activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = activities.family_id 
      AND families.created_by = auth.uid()
    )
  );

-- Rewards: Users can access rewards of their families
CREATE POLICY "Users can view family rewards" ON rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = rewards.family_id 
      AND (families.created_by = auth.uid() OR families.id IN (
        SELECT family_id FROM family_members WHERE family_id = families.id
      ))
    )
  );

CREATE POLICY "Users can manage family rewards" ON rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM families 
      WHERE families.id = rewards.family_id 
      AND families.created_by = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### **Step 7: Update Your Application**

The following files have been updated to use Supabase:

1. **`app/lib/supabase.ts`** - Supabase client and auth functions
2. **`app/auth/callback/route.ts`** - OAuth callback handler
3. **`middleware.ts`** - Authentication middleware
4. **`app/components/auth/SignIn.tsx`** - Updated to use Supabase auth
5. **`app/components/auth/SignUp.tsx`** - Updated to use Supabase auth

### **Step 8: Test Your Setup**

1. **Start your development server**:
   ```bash
   pnpm dev
   ```

2. **Test email/password signup**:
   - Go to `/signup`
   - Create a new account
   - Check Supabase dashboard → Authentication → Users

3. **Test Google OAuth**:
   - Go to `/signin`
   - Click "Continue with Google"
   - Complete OAuth flow
   - Check Supabase dashboard → Authentication → Users

### **Step 9: Environment Variables for Production**

For production deployment, add these environment variables to your hosting platform:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
```

### **Step 10: Update Google OAuth for Production**

1. **Add production redirect URI** to Google Cloud Console:
   - `https://your-domain.com/auth/callback`

2. **Update Supabase Google provider** with production settings

## 🔧 Additional Configuration

### **Email Templates**

1. **Go to Authentication** → **Email Templates** in Supabase
2. **Customize**:
   - Confirm signup email
   - Magic link email
   - Change email address
   - Reset password email

### **Site URL Configuration**

1. **Go to Authentication** → **URL Configuration**
2. **Set**:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`

## 🚨 Security Notes

1. **Never commit** `.env.local` to version control
2. **Use Row Level Security (RLS)** for all tables
3. **Validate user permissions** in your application logic
4. **Use HTTPS** in production
5. **Regularly rotate** API keys

## 📚 Next Steps

After completing this setup:

1. **Update your data storage** to use Supabase instead of localStorage
2. **Implement real-time features** using Supabase subscriptions
3. **Add file uploads** using Supabase Storage
4. **Set up monitoring** and analytics

## 🆘 Troubleshooting

### **Common Issues**

1. **"Invalid API key"**: Check your environment variables
2. **OAuth redirect errors**: Verify redirect URIs in Google Console
3. **CORS errors**: Check your Supabase project settings
4. **RLS policy errors**: Verify your policies are correctly configured

### **Getting Help**

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues) 