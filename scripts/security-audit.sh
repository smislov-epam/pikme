#!/bin/bash
# Security Audit Script for PIKME
# This script checks for common security issues

set -e

echo "=================================================="
echo "PIKME Security Audit"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track findings
ISSUES_FOUND=0

echo "1. Checking for committed .env files..."
if git ls-files | grep -E "^\.env$|^\.env\.[^e]" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAIL: .env files found in git${NC}"
    git ls-files | grep -E "^\.env$|^\.env\.[^e]"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ PASS: No .env files committed${NC}"
fi
echo ""

echo "2. Checking for service account keys..."
if git ls-files | grep -E "firebase-adminsdk|service-account.*\.json" > /dev/null 2>&1; then
    echo -e "${RED}❌ FAIL: Service account keys found${NC}"
    git ls-files | grep -E "firebase-adminsdk|service-account.*\.json"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ PASS: No service account keys found${NC}"
fi
echo ""

echo "3. Checking for private keys and certificates..."
if find . -type f \( -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "*.pfx" \) ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | grep -q .; then
    echo -e "${RED}❌ FAIL: Private keys or certificates found${NC}"
    find . -type f \( -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "*.pfx" \) ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ PASS: No private keys or certificates found${NC}"
fi
echo ""

echo "4. Checking for hardcoded passwords..."
if grep -r -E "(password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude="package-lock.json" . 2>/dev/null | grep -v "test\|mock\|example" | grep -q .; then
    echo -e "${YELLOW}⚠ WARNING: Potential hardcoded passwords found (review manually)${NC}"
    grep -r -E "(password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude="package-lock.json" . 2>/dev/null | grep -v "test\|mock\|example" | head -5
else
    echo -e "${GREEN}✓ PASS: No hardcoded passwords detected${NC}"
fi
echo ""

echo "5. Checking for potential API keys in code..."
if grep -r -E "(api[_-]?key|apikey)\s*[=:]\s*['\"][A-Za-z0-9]{20,}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude="*.test.*" . 2>/dev/null | grep -v "import.meta.env\|process.env\|example\|placeholder" | grep -q .; then
    echo -e "${RED}❌ FAIL: Potential hardcoded API keys found${NC}"
    grep -r -E "(api[_-]?key|apikey)\s*[=:]\s*['\"][A-Za-z0-9]{20,}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude="*.test.*" . 2>/dev/null | grep -v "import.meta.env\|process.env\|example\|placeholder" | head -5
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ PASS: No hardcoded API keys found${NC}"
fi
echo ""

echo "6. Checking npm dependencies (apps/web)..."
if [ -d "apps/web" ]; then
    cd apps/web
    AUDIT_OUTPUT=$(npm audit --audit-level=high --json 2>/dev/null || true)
    HIGH_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    CRITICAL_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    
    if [ "$HIGH_VULN" -gt 0 ] || [ "$CRITICAL_VULN" -gt 0 ]; then
        echo -e "${YELLOW}⚠ WARNING: High/Critical vulnerabilities found (dev dependencies may be acceptable)${NC}"
        echo "  Critical: $CRITICAL_VULN"
        echo "  High: $HIGH_VULN"
        echo "  Run 'npm audit' for details"
    else
        echo -e "${GREEN}✓ PASS: No high/critical vulnerabilities in dependencies${NC}"
    fi
    cd ../..
else
    echo -e "${YELLOW}⚠ SKIP: apps/web directory not found${NC}"
fi
echo ""

echo "7. Checking Firebase Functions dependencies..."
if [ -d "functions" ]; then
    cd functions
    AUDIT_OUTPUT=$(npm audit --audit-level=high --json 2>/dev/null || true)
    HIGH_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    CRITICAL_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    
    if [ "$HIGH_VULN" -gt 0 ] || [ "$CRITICAL_VULN" -gt 0 ]; then
        echo -e "${RED}❌ FAIL: High/Critical vulnerabilities in functions${NC}"
        echo "  Critical: $CRITICAL_VULN"
        echo "  High: $HIGH_VULN"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✓ PASS: No high/critical vulnerabilities in functions${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ SKIP: functions directory not found${NC}"
fi
echo ""

echo "8. Checking for console.log with sensitive data..."
if grep -r "console\.\(log\|debug\|info\)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude="*.test.*" . 2>/dev/null | grep -i "password\|secret\|token.*:" | grep -v "// " | grep -q .; then
    echo -e "${RED}❌ FAIL: console.log may be logging sensitive data${NC}"
    grep -r "console\.\(log\|debug\|info\)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude="*.test.*" . 2>/dev/null | grep -i "password\|secret\|token.*:" | grep -v "// " | head -3
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ PASS: No sensitive data in console logs${NC}"
fi
echo ""

echo "9. Verifying .gitignore coverage..."
MISSING_PATTERNS=()
if ! grep -q "\.env$" .gitignore 2>/dev/null; then
    MISSING_PATTERNS+=(".env")
fi
if ! grep -q "firebase-adminsdk" .gitignore 2>/dev/null; then
    MISSING_PATTERNS+=("firebase-adminsdk")
fi
if ! grep -q "service-account" .gitignore 2>/dev/null; then
    MISSING_PATTERNS+=("service-account")
fi

if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ WARNING: .gitignore missing patterns:${NC}"
    printf '  %s\n' "${MISSING_PATTERNS[@]}"
else
    echo -e "${GREEN}✓ PASS: .gitignore has security patterns${NC}"
fi
echo ""

echo "10. Checking git history for sensitive patterns..."
if git log --all --full-history --pretty=format:"%H" --name-only | grep -E "\.env$|\.pem$|\.key$|firebase-adminsdk" | grep -v ".env.example" | grep -q .; then
    echo -e "${YELLOW}⚠ WARNING: Sensitive files found in git history (review manually)${NC}"
    git log --all --full-history --pretty=format:"%H %s" --name-only | grep -E "\.env$|\.pem$|\.key$|firebase-adminsdk" | grep -v ".env.example" | head -5
else
    echo -e "${GREEN}✓ PASS: No sensitive files in git history${NC}"
fi
echo ""

echo "=================================================="
echo "Security Audit Complete"
echo "=================================================="
if [ $ISSUES_FOUND -gt 0 ]; then
    echo -e "${RED}Issues found: $ISSUES_FOUND${NC}"
    echo "Please address the issues above before deploying to production."
    exit 1
else
    echo -e "${GREEN}No critical issues found!${NC}"
    echo "Note: Review any warnings and keep dependencies up to date."
    exit 0
fi
