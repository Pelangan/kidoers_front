#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def create_test_user():
    """Create a test user in Supabase auth."""
    
    # Get environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    try:
        # Create client
        client = create_client(supabase_url, supabase_service_key)
        print("✅ Supabase client created successfully")
        
        # Create a test user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "email_confirm": True
        }
        
        print("Creating test user...")
        response = client.auth.admin.create_user(user_data)
        
        if response.user:
            print(f"✅ Test user created with ID: {response.user.id}")
            print(f"Email: {response.user.email}")
            return response.user.id
        else:
            print("❌ Failed to create user")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    user_id = create_test_user()
    if user_id:
        print(f"\nUse this user ID in your backend: {user_id}")
