# Design System Token Migration Guide

## Overview
This guide will help you systematically replace hardcoded values with design system tokens for better maintainability and consistency.

## ✅ Current Status
- **Design tokens are now integrated directly into styles.css** (avoiding CSS import issues)
- **Edges are working correctly** with proper token values
- **Ready for gradual migration** of remaining hardcoded values

## 🎯 Migration Strategy

### ✅ Phase 1: Setup & Foundation (COMPLETED)
- ✅ Design tokens integrated into main CSS file
- ✅ Legacy tokens preserved during transition
- ✅ Edge rendering fixed and working

### 🔄 Phase 2: CSS Migration (IN PROGRESS)
- ✅ Some colors replaced with semantic tokens
- ✅ Some spacing values replaced with space tokens
- 🔄 Continue replacing hardcoded values systematically
- 🔄 Replace border-radius with radius tokens
- 🔄 Replace shadows with shadow tokens

### 📋 Phase 3: Component Migration (NEXT)
- 🔄 Update inline styles in React components
- 🔄 Replace hardcoded values in styled components
- 🔄 Use CSS custom properties for dynamic values

## 📋 Current Hardcoded Values Found

### Colors to Replace:
```css
/* Current → Token */
#f8fafc → var(--bg-secondary)
#D6E6FF → var(--blue-100)
#fffbeb → var(--yellow-50)
#fcd34d → var(--yellow-300)
#f5f3ff → var(--purple-50) /* Need to add purple tokens */
#c4b5fd → var(--purple-300)
#fff1f2 → var(--red-50)
#fda4af → var(--red-300)
#f1f5f9 → var(--gray-100)
#cbd5e1 → var(--gray-300)
#1e252f → var(--text-primary)
#5d6a85 → var(--text-secondary)
#D3132F → var(--error-text)
#653E03 → var(--warning-text)
```

### Spacing to Replace:
```css
/* Current → Token */
4px → var(--space-1)
6px → var(--space-2) /* Update: 6px should be 8px for consistency */
8px → var(--space-2)
12px → var(--space-3)
16px → var(--space-4)
20px → var(--space-5)
24px → var(--space-6)
```

### Border Radius to Replace:
```css
/* Current → Token */
4px → var(--radius-md)
6px → var(--radius-lg)
8px → var(--radius-xl)
12px → var(--radius-2xl)
16px → var(--radius-3xl)
```

### Shadows to Replace:
```css
/* Current → Token */
0 2px 8px 0 rgba(25, 30, 36, 0.15) → var(--shadow-md)
0 4px 12px rgba(0, 0, 0, 0.15) → var(--shadow-lg)
0 4px 16px rgba(25, 30, 36, 0.2) → var(--shadow-lg)
```

## 🔧 Component Inline Styles to Update

### NodeCard.tsx:
```tsx
// Current
marginTop: 8 → marginTop: 'var(--space-2)'
borderRadius: 6 → borderRadius: 'var(--radius-lg)'
padding: 12 → padding: 'var(--space-3)'
gap: 8 → gap: 'var(--space-2)'

// Better approach: Use CSS classes instead of inline styles
```

## 📝 Implementation Steps

### Step 1: Import Tokens
```css
/* In styles.css, add at the top: */
@import './design-tokens.css';
```

### Step 2: Update CSS Classes
Replace hardcoded values systematically:

```css
/* Before */
.children-search-input {
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 8px;
}

/* After */
.children-search-input {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  margin-top: var(--space-2);
}
```

### Step 3: Create Component-Specific CSS Classes
Instead of inline styles, create CSS classes:

```css
/* Add to styles.css */
.popover {
  margin-top: var(--space-2);
  background: var(--popover-bg);
  border-radius: var(--popover-radius);
  padding: var(--popover-padding);
  box-shadow: var(--popover-shadow);
  min-width: var(--popover-min-width);
  max-width: var(--popover-max-width);
}

.error-popover {
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  color: var(--error-text);
}

.warning-popover {
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  color: var(--warning-text);
}
```

### Step 4: Update Components
```tsx
// Before
<div style={{
  marginTop: 8,
  background: 'white',
  borderRadius: 8,
  padding: 12,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
}}>

// After
<div className="popover">
```

## 🎨 Color System Usage

### Semantic Colors (Recommended)
```css
/* Use semantic tokens for meaning */
color: var(--text-primary);     /* Main text */
color: var(--text-secondary);   /* Secondary text */
background: var(--bg-primary);  /* Main backgrounds */
border: var(--border-primary);  /* Default borders */
```

### State Colors
```css
/* Error states */
color: var(--error-text);
background: var(--error-bg);
border-color: var(--error-border);

/* Warning states */
color: var(--warning-text);
background: var(--warning-bg);
border-color: var(--warning-border);
```

## 🚀 Benefits After Migration

1. **Consistency**: All spacing follows 4px grid
2. **Maintainability**: Change one token, update everywhere
3. **Theming**: Easy to create dark mode or brand themes
4. **Scalability**: New components automatically consistent
5. **Performance**: Fewer style recalculations
6. **Developer Experience**: Autocomplete for token names

## 📋 Migration Checklist

- [ ] Import design-tokens.css
- [ ] Update color values in CSS
- [ ] Update spacing values in CSS
- [ ] Update border-radius values in CSS
- [ ] Update shadow values in CSS
- [ ] Replace inline styles with CSS classes
- [ ] Update component props to use CSS classes
- [ ] Test all components for visual consistency
- [ ] Remove legacy token variables
- [ ] Document new token usage for team

## 🎯 Next Steps

1. Start with CSS file migration (lowest risk)
2. Create component CSS classes to replace inline styles
3. Update components to use new CSS classes
4. Add missing color tokens (purple, etc.)
5. Consider creating a Storybook for design system documentation
