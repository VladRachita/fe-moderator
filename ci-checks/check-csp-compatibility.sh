#!/bin/bash
# CI guard: catch patterns that silently bypass the per-request CSP nonce.
#
# V2.5 introduced per-request nonce-based CSP via proxy.ts middleware. The
# Next.js framework auto-injects the nonce into its own scripts ONLY when
# middleware fires for that request. Static-prerendered pages do NOT invoke
# middleware, so any script tag rendered into a static prerender would not
# carry a nonce and would be blocked by the CSP — the page would fail to
# render in the browser.
#
# This script fails the build if anyone adds `export const dynamic = 'force-static'`
# (or `revalidate = false`-style patterns that would similarly cache HTML
# without re-running middleware) to any App Router page.
#
# Run from fe-moderator/:
#   ./ci-checks/check-csp-compatibility.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/src/app"

if [ ! -d "$APP_DIR" ]; then
    echo "ci-check: src/app directory not found; nothing to check"
    exit 0
fi

violations=0

# Pattern 1: explicit force-static
if grep -rn "dynamic[[:space:]]*=[[:space:]]*['\"]force-static['\"]" "$APP_DIR" 2>/dev/null; then
    echo ""
    echo "ERROR: \`dynamic = 'force-static'\` is incompatible with the V2.5 CSP nonce."
    echo "Static-prerendered pages do not invoke middleware, so the CSP nonce header"
    echo "is absent and the framework's script tags are blocked at runtime."
    echo ""
    echo "Either:"
    echo "  (a) Remove the force-static directive (page becomes dynamic)"
    echo "  (b) Move the page out of /src/app/ if it is intentionally static and"
    echo "      doesn't need session-aware rendering"
    echo "  (c) Update proxy.ts to skip these specific paths AND verify that no"
    echo "      script tags in the prerendered HTML reference 'self' (would still"
    echo "      need 'unsafe-inline' for those paths)"
    echo ""
    violations=$((violations + 1))
fi

# Pattern 2: page-level revalidate=false with no other dynamic directive (cached forever, bypasses middleware similarly)
# Note: this is a softer warning — `revalidate = false` PLUS `dynamic = 'force-static'` is the actual prerender path.
# Standalone `revalidate = false` may still be dynamically rendered. We don't fail on this alone, just print.
if grep -rn "export[[:space:]]\+const[[:space:]]\+revalidate[[:space:]]*=[[:space:]]*false" "$APP_DIR" 2>/dev/null; then
    echo ""
    echo "WARNING: \`export const revalidate = false\` found in src/app/."
    echo "By itself this is fine, but if combined with \`dynamic = 'force-static'\`"
    echo "the page becomes pre-rendered HTML and will fail the V2.5 CSP nonce check."
    echo ""
fi

if [ "$violations" -gt 0 ]; then
    echo "ci-check: $violations CSP-compatibility violation(s) found."
    exit 1
fi

echo "ci-check: CSP-compatibility check passed."
