#!/bin/bash

# SW25 Sanity Check Script
# Validates code quality before commit approval
# Usage: bash .ai_workspace/sanity-check.sh [context]
# 
# Context options:
#   v2        - Check only player/v2 files
#   scripts   - Check only scripts and tools  
#   player    - Check all player files
#   all       - Check entire workspace (default)

# set -e

# Get current timestamp
get_timestamp() {
    date '+%H:%M'
}

echo "SW25 Sanity Check Starting... ($(get_timestamp))"

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

# Parse context parameter
CONTEXT="${1:-all}"

# Define check directories based on context
case "$CONTEXT" in
    "v2")
        CHECK_DIRS=("player/v2")
        echo "🎯 Context: V2 Player Architecture"
        ;;
    "scripts")
        CHECK_DIRS=("scripts" ".ai_workspace")
        echo "🎯 Context: Scripts and Tools"
        ;;
    "player")
        CHECK_DIRS=("player")
        echo "🎯 Context: All Player Files"
        ;;
    "all"|*)
        CHECK_DIRS=("scripts" ".ai_workspace" "player/v2" "common" "dashboard")
        echo "🎯 Context: Full Workspace"
        ;;
esac

echo "Directories to check: ${CHECK_DIRS[*]}"

echo "Checking project structure..."

# 1. File Length Check
echo "Checking file lengths..."

# Function to check directory if it exists
check_directory() {
    local dir="$1"
    local max_lines="${2:-300}"
    
    if [ ! -d "$dir" ]; then
        report_warning "Directory $dir not found, skipping"
        return
    fi
    
    if [[ "$dir" == *.ai_workspace* ]]; then
        # Check shell scripts in .ai_workspace
        find "$dir" -name "*.sh" -type f | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt "$max_lines" ]; then
                report_issue "$file has $lines lines (max $max_lines)"
            else
                report_success "$file length OK ($lines lines)"
            fi
        done
    else
        # Check JavaScript files in other directories
        find "$dir" -name "*.js" -type f | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt "$max_lines" ]; then
                report_issue "$file has $lines lines (max $max_lines)"
            else
                report_success "$file length OK ($lines lines)"
            fi
        done
    fi
}

# Check each directory based on context
for dir in "${CHECK_DIRS[@]}"; do
    case "$dir" in
        "player/v2")
            echo "Checking V2 Player files..."
            check_directory "$dir" 400  # V2 files can be slightly larger due to architecture
            ;;
        ".ai_workspace")
            echo "Checking AI workspace scripts..."
            check_directory "$dir" 300
            ;;
        *)
            echo "Checking $dir files..."
            check_directory "$dir" 300
            ;;
    esac
done

# 2. ESLint Check with Complexity Summary
echo "Running ESLint..."
ESLINT_OUTPUT=""
COMPLEXITY_WARNINGS=0

# Build ESLint patterns based on context
ESLINT_PATTERNS=()
for dir in "${CHECK_DIRS[@]}"; do
    if [ -d "$dir" ] && [[ "$dir" != *.ai_workspace* ]]; then
        ESLINT_PATTERNS+=("$dir/**/*.js")
    fi
done

if [ ${#ESLINT_PATTERNS[@]} -eq 0 ]; then
    report_warning "No JavaScript directories found for ESLint check"
elif [ -f "node_modules/.bin/eslint" ]; then
    ESLINT_OUTPUT=$(./node_modules/.bin/eslint "${ESLINT_PATTERNS[@]}" 2>&1)
    ESLINT_EXIT_CODE=$?
elif command -v eslint &> /dev/null; then
    ESLINT_OUTPUT=$(eslint "${ESLINT_PATTERNS[@]}" 2>&1)
    ESLINT_EXIT_CODE=$?
else
    report_warning "ESLint not found - install with 'npm install eslint'"
    ESLINT_EXIT_CODE=1
fi

# Display ESLint output
if [ -n "$ESLINT_OUTPUT" ]; then
    echo "$ESLINT_OUTPUT"
    
    # Count complexity warnings
    COMPLEXITY_WARNINGS=$(echo "$ESLINT_OUTPUT" | grep -c "complexity" || true)
fi

if [ "$ESLINT_EXIT_CODE" -eq 0 ]; then
    if [ "$COMPLEXITY_WARNINGS" -gt 0 ]; then
        report_warning "ESLint passed with $COMPLEXITY_WARNINGS complexity warnings"
    else
        report_success "ESLint passed with no warnings"
    fi
else
    report_issue "ESLint found errors"
fi

# 3. Function Complexity Check (via ESLint)
echo "Checking function complexity..."
# Complexity warnings are now handled by ESLint complexity rule
# No separate complexity check needed - ESLint handles it in step 2

# 4. Test Coverage Check
echo "Checking test coverage..."
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
echo "Running tests..."
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
echo "Checking documentation..."
required_docs=("README.md" "docs/data-model.md")
for doc in "${required_docs[@]}"; do
    if [ -f "$doc" ]; then
        report_success "$doc exists"
    else
        report_issue "Missing required documentation: $doc"
    fi
done

# 7. Git status check
echo "Checking git status..."
if git status --porcelain | grep -q .; then
    report_warning "Uncommitted changes detected"
    git status --short
else
    report_success "Working directory clean"
fi

# Summary
echo ""
echo "Sanity Check Complete ($(get_timestamp))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

# Display complexity summary if there are warnings
if [ "$COMPLEXITY_WARNINGS" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}📊 COMPLEXITY SUMMARY${NC}"
    echo "Total complexity warnings: $COMPLEXITY_WARNINGS"
    echo ""
    echo "High priority targets (complexity >15):"
    echo "$ESLINT_OUTPUT" | grep "complexity" | grep -E "complexity of (1[6-9]|[2-9][0-9])\." | head -3 || echo "  None found"
    echo ""
    echo "Medium priority targets (complexity 9-15):"
    echo "$ESLINT_OUTPUT" | grep "complexity" | grep -E "complexity of (9|1[0-5])\." | head -5 || echo "  None found"
    echo ""
    echo "Note: All functions should target complexity ≤8"
    echo ""
fi

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ SANITY CHECK PASSED${NC}"
    if [ "$COMPLEXITY_WARNINGS" -gt 0 ]; then
        echo "Ready to commit! ($COMPLEXITY_WARNINGS complexity warnings remaining)"
    else
        echo "Ready to commit! No complexity warnings!"
    fi
    echo ""
    echo "Add to activity log:"
    if [ "$COMPLEXITY_WARNINGS" -gt 0 ]; then
        echo "### $(get_timestamp) - Sanity check passed, $COMPLEXITY_WARNINGS complexity warnings remain"
    else
        echo "### $(get_timestamp) - Sanity check passed, all complexity issues resolved"
    fi
    exit 0
else
    echo -e "${RED}❌ SANITY CHECK FAILED${NC}"
    echo "Issues found: $ISSUES"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Fix issues before committing:"
    echo "   1. Address all reported issues"
    echo "   2. Run sanity check again"
    echo "   3. Commit when clean"
    echo ""
    echo "Add to activity log:"
    echo "### $(get_timestamp) - Sanity check failed, $ISSUES issues found"
    exit 1
fi
