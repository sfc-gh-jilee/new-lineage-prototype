#!/bin/bash

# Design System Token Audit Script
# This script helps identify hardcoded values that should be replaced with design tokens

echo "🔍 Design System Token Audit"
echo "================================"

echo ""
echo "📏 Hardcoded Spacing Values (px):"
echo "--------------------------------"
grep -n -E '[^-][0-9]+px' styles.css components/NodeCard.tsx | head -10

echo ""
echo "🎨 Hardcoded Colors (#hex):"
echo "-------------------------"
grep -n -E '#[0-9a-fA-F]{3,6}' styles.css components/NodeCard.tsx | head -10

echo ""
echo "📐 Hardcoded Border Radius:"
echo "-------------------------"
grep -n -E 'border-radius:\s*[0-9]+px|borderRadius.*[0-9]+' styles.css components/NodeCard.tsx | head -5

echo ""
echo "🌫️ Hardcoded Shadows:"
echo "--------------------"
grep -n -E 'box-shadow:|boxShadow:' styles.css components/NodeCard.tsx | head -5

echo ""
echo "📊 Hardcoded Z-Index:"
echo "--------------------"
grep -n -E 'z-index:\s*[0-9]+|zIndex.*[0-9]+' styles.css components/NodeCard.tsx | head -5

echo ""
echo "✅ Token Usage:"
echo "-------------"
echo "CSS Custom Properties found:"
grep -c 'var(--' styles.css
echo "Inline styles in components:"
grep -c 'style={{' components/NodeCard.tsx

echo ""
echo "📋 Next Steps:"
echo "- Replace hardcoded values with design tokens"
echo "- Move inline styles to CSS classes"
echo "- Use semantic color tokens instead of direct colors"
echo "- Test all components after migration"
