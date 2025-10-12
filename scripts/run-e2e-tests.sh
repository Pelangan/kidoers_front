#!/bin/bash

# E2E Test Runner for Kidoers Frontend
# This script runs Playwright E2E tests for the recurring task deletion functionality

echo "🧪 Starting E2E Tests for Recurring Task Deletion..."

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Install Playwright browsers if not already installed
echo "📦 Installing Playwright browsers..."
npx playwright install

# Run the E2E tests
echo "🚀 Running E2E tests..."
npx playwright test --config=playwright.config.e2e.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ All E2E tests passed!"
else
    echo "❌ Some E2E tests failed. Check the report for details."
    exit 1
fi
