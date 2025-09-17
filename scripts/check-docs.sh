#!/bin/bash

# Kidoers Frontend Documentation Check Script
# This script helps ensure PROJECT_SPECIFICATIONS.md stays up to date

set -e

echo "📋 Checking Kidoers Frontend Documentation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend root directory"
    exit 1
fi

# Check if documentation files exist
echo "📚 Checking documentation files..."

files=(
    "docs/README.md"
    "docs/PROJECT_SPECIFICATIONS.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done

# Check for recent changes in frontend files
echo "🔍 Checking for recent frontend changes..."

frontend_files=(
    "app/"
    "components/"
    "lib/"
)

recent_changes=false
for pattern in "${frontend_files[@]}"; do
    if find . -path "./$pattern*" -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" | xargs -I {} test {} -nt docs/PROJECT_SPECIFICATIONS.md 2>/dev/null | grep -q .; then
        echo "⚠️  Recent changes detected in $pattern"
        recent_changes=true
    fi
done

if [ "$recent_changes" = true ]; then
    echo ""
    echo "🚨 ATTENTION: Recent changes detected in frontend files!"
    echo "Please manually update the following documentation:"
    echo "  - docs/PROJECT_SPECIFICATIONS.md"
    echo ""
    echo "Common sections to check:"
    echo "  - Component descriptions and props"
    echo "  - API integration endpoints"
    echo "  - Data models and TypeScript interfaces"
    echo "  - UI/UX patterns and design system"
    echo "  - Storage functions and data flow"
fi

# Check for specific patterns that might need documentation updates
echo "🔍 Checking for patterns that need documentation..."

# Check for new components
new_components=$(find app/components components -name "*.tsx" -newer docs/PROJECT_SPECIFICATIONS.md 2>/dev/null | wc -l)
if [ "$new_components" -gt 0 ]; then
    echo "⚠️  $new_components new component(s) detected - check component documentation"
fi

# Check for new API calls
api_changes=$(grep -r "apiService\." app/ components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$api_changes" -gt 0 ]; then
    echo "ℹ️  API calls detected - verify API integration documentation"
fi

# Check for new interfaces/types
interface_changes=$(find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface\|type" | xargs -I {} test {} -nt docs/PROJECT_SPECIFICATIONS.md 2>/dev/null | wc -l)
if [ "$interface_changes" -gt 0 ]; then
    echo "⚠️  TypeScript interface/type changes detected - update data models section"
fi

echo ""
echo "📚 Documentation check complete!"
echo ""
echo "Next steps:"
echo "1. Review the PROJECT_SPECIFICATIONS.md file"
echo "2. Update any sections that need changes"
echo "3. Verify all new functionality is documented"
echo "4. Test any code examples in the documentation"
echo ""
echo "💡 Tip: Use 'git diff docs/PROJECT_SPECIFICATIONS.md' to see what changed"
