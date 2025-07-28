#!/bin/bash

# SW25 Sanity Check Script
# Validates code quality before commit approval

set -e

# Get current timestamp
get_timestamp() {
    date '+%H:%M'
}

echo "🔍 SW25 Sanity Check Starting... ($(get_timestamp))"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ISSUES=0
WARNINGS=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ ISSUE: $1${NC}"
    ((ISSUES++))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if we're in project root
if [ ! -f "package.json" ]; then
    report_issue "Must run from project root (package.json not found)"
    exit 1
fi

echo "📁 Checking project structure..."

# 1. File Length Check (max 300 lines for scripts)
echo "📏 Checking file lengths..."
find scripts/ -name "*.js" -type f | while read file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 300 ]; then
        report_issue "$file has $lines lines (max 300)"
    else
        report_success "$file length OK ($lines lines)"
    fi
done

# Check AI workspace scripts
find .ai_workspace/ -name "*.sh" -type f | while read file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 300 ]; then
        report_issue "$file has $lines lines (max 300)"
    else
        report_success "$file length OK ($lines lines)"
    fi
done

# 2. ESLint Check
echo "🔧 Running ESLint..."
if [ -f "node_modules/.bin/eslint" ]; then
    if ./node_modules/.bin/eslint . --ext .js; then
        report_success "ESLint passed"
    else
        report_issue "ESLint found errors"
    fi
elif command -v eslint &> /dev/null; then
    if eslint . --ext .js; then
        report_success "ESLint passed"
    else
        report_issue "ESLint found errors"
    fi
else
    report_warning "ESLint not found - install with 'npm install eslint'"
fi

# 3. Function Complexity Check (basic heuristic)
echo "🧮 Checking function complexity..."
find . -name "*.js" -not -path "./node_modules/*" | while read file; do
    # Count functions with more than 20 lines (simple heuristic)
    complex_functions=$(awk '
        /function|=>/ { 
            start=NR; depth=0; lines=0 
        }
        /\{/ { depth++ }
        /\}/ { 
            depth--; 
            if (depth==0 && start>0) {
                lines = NR - start;
                if (lines > 20) print FILENAME":"start": function too complex ("lines" lines)"
                start=0
            }
        }
    ' "$file")
    
    if [ -n "$complex_functions" ]; then
        report_warning "Complex functions in $file"
        echo "$complex_functions"
    fi
done

# 4. Test Coverage Check
echo "🧪 Checking test coverage..."
if [ -d "tests" ] || [ -d "test" ]; then
    # Count test files
    test_files=$(find tests/ test/ -name "*.test.js" -o -name "*.spec.js" 2>/dev/null | wc -l)
    js_files=$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./tests/*" -not -path "./test/*" | wc -l)
    
    if [ "$js_files" -gt 0 ]; then
        coverage_percent=$((test_files * 100 / js_files))
        if [ "$coverage_percent" -ge 1 ]; then
            report_success "Test coverage: ${coverage_percent}% (≥1% required)"
        else
            report_issue "Test coverage: ${coverage_percent}% (1% minimum required)"
        fi
    fi
else
    report_warning "No test directory found"
fi

# 5. Run existing tests
echo "🏃 Running tests..."
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    if npm test; then
        report_success "All tests passed"
    else
        report_issue "Tests failed"
    fi
else
    report_warning "No test script found in package.json"
fi

# 6. Documentation checks
echo "📚 Checking documentation..."
required_docs=("README.md" "docs/data-model.md")
for doc in "${required_docs[@]}"; do
    if [ -f "$doc" ]; then
        report_success "$doc exists"
    else
        report_issue "Missing required documentation: $doc"
    fi
done

# 7. Git status check
echo "📝 Checking git status..."
if git status --porcelain | grep -q .; then
    report_warning "Uncommitted changes detected"
    git status --short
else
    report_success "Working directory clean"
fi

# Summary
echo ""
echo "🏁 Sanity Check Complete ($(get_timestamp))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ SANITY CHECK PASSED${NC}"
    echo "🚀 Ready to commit!"
    echo ""
    echo "📝 Add to activity log:"
    echo "### $(get_timestamp) - Sanity check passed, ready to commit"
    exit 0
else
    echo -e "${RED}❌ SANITY CHECK FAILED${NC}"
    echo "Issues found: $ISSUES"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "🔧 Fix issues before committing:"
    echo "   1. Address all reported issues"
    echo "   2. Run sanity check again"
    echo "   3. Commit when clean"
    echo ""
    echo "📝 Add to activity log:"
    echo "### $(get_timestamp) - Sanity check failed, $ISSUES issues found"
    exit 1
fi
