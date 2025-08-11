#!/bin/bash

# Architecture Compliance Check Script
# This script checks for violations of the Kidoers architecture

echo "🔍 Checking Kidoers architecture compliance..."

# Check for direct database queries (supabase.from)
echo "Checking for direct database queries..."
VIOLATIONS=$(grep -r "supabase\.from(" app/ 2>/dev/null | wc -l)

if [ $VIOLATIONS -gt 0 ]; then
    echo "❌ Found $VIOLATIONS direct database query violations:"
    grep -r "supabase\.from(" app/ 2>/dev/null
    echo ""
    echo "🚨 VIOLATION: Direct database queries are forbidden!"
    echo "   Use the backend API instead: apiService.methodName()"
    exit 1
else
    echo "✅ No direct database query violations found"
fi

# Check for direct table access (supabase.table)
echo "Checking for direct table access..."
VIOLATIONS=$(grep -r "supabase\." app/ 2>/dev/null | grep -v "auth\." | grep -v "supabase\.auth" | wc -l)

if [ $VIOLATIONS -gt 0 ]; then
    echo "❌ Found $VIOLATIONS potential direct table access violations:"
    grep -r "supabase\." app/ 2>/dev/null | grep -v "auth\." | grep -v "supabase\.auth"
    echo ""
    echo "🚨 VIOLATION: Direct Supabase access outside auth is forbidden!"
    echo "   Use the backend API instead: apiService.methodName()"
    exit 1
else
    echo "✅ No direct table access violations found"
fi

# Check for missing API service usage (more specific pattern)
echo "Checking for missing API service usage..."
VIOLATIONS=$(grep -r "\.from(" app/ 2>/dev/null | grep -v "Array.from" | wc -l)

if [ $VIOLATIONS -gt 0 ]; then
    echo "❌ Found $VIOLATIONS potential missing API service usage:"
    grep -r "\.from(" app/ 2>/dev/null | grep -v "Array.from"
    echo ""
    echo "🚨 VIOLATION: Direct database queries detected!"
    echo "   Use the backend API instead: apiService.methodName()"
    exit 1
else
    echo "✅ No missing API service usage violations found"
fi

echo ""
echo "🎉 All architecture checks passed!"
echo "✅ Supabase = Authentication only"
echo "✅ FastAPI = Business Logic"
echo "✅ Frontend = UI + API Calls"
exit 0
