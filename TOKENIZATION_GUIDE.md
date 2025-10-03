# 🎨 Tokenizing Hardcoded Values in TSX/HTML Files

This guide shows you **3 approaches** to replace hardcoded style values with design tokens in your React components.

## 🎯 **Approach 1: CSS Classes (Recommended)**

**Best for:** Most use cases, performance, maintainability

Replace inline styles with CSS classes that use design tokens.

### ✅ Before & After Example:
```tsx
// ❌ Before: Hardcoded inline styles  
<div style={{
  position: 'absolute',
  marginTop: 8,
  background: '#fbfbfb',
  borderRadius: 6,
  padding: 12,
  boxShadow: '0 4px 16px rgba(25, 30, 36, 0.2)'
}}>

// ✅ After: Token-based CSS classes
<div className="popover-base popover-data-quality">
```

### 🔧 Implementation:
1. **Add utility classes to `styles.css`:**
```css
.popover-base {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: var(--space-2);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow);
}

.popover-data-quality {
  background: var(--bg-primary);
  box-shadow: 0 4px 16px rgba(25, 30, 36, 0.2);
}
```

2. **Replace inline styles with classes:**
```tsx
<div className="popover-base popover-data-quality">
```

---

## ⚡ **Approach 2: JavaScript Token Utility**

**Best for:** Dynamic styles, complex calculations, conditional styling

Access design tokens from JavaScript using a utility library.

### 🔧 Implementation:
1. **Use the token utility (`lib/tokens.ts`):**
```tsx
import { tokens, stylePatterns } from '../lib/tokens';

// Access individual tokens
const styles = {
  backgroundColor: tokens.colors.background,
  padding: tokens.spacing.md,
  borderRadius: tokens.radius.lg,
  color: tokens.colors.text
};

// Use predefined patterns
const popoverStyle = stylePatterns.popover.dataQuality;
```

2. **Apply in components:**
```tsx
<div style={{ 
  color: tokens.colors.text, 
  marginBottom: tokens.spacing.sm 
}}>
  Content with tokenized styles
</div>
```

---

## 🎛️ **Approach 3: CSS Custom Properties in JSX**

**Best for:** When you need CSS custom properties directly in JavaScript

Access CSS custom properties using `getComputedStyle`.

### 🔧 Implementation:
```tsx
// Get token values directly
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary').trim();

// Use in styles
<div style={{ 
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  padding: 'var(--space-3)'
}}>
```

---

## 🚀 **Migration Strategy**

### **Phase 1: Utility Classes (High Impact, Low Effort)**
- Replace common patterns (popovers, buttons, spacing)
- Focus on repeated inline styles first
- Use the utility classes we created in `styles.css`

### **Phase 2: Token Utility (Medium Impact, Medium Effort)**
- Replace dynamic/calculated styles
- Use `tokens.colors.primary`, `tokens.spacing.md`, etc.
- Good for conditional styling

### **Phase 3: Component-Specific Classes (Low Impact, High Effort)**
- Create specific CSS classes for unique component styles
- Move complex inline styles to CSS files

---

## 📋 **Common Patterns to Replace**

### **Colors:**
```tsx
// ❌ Before
color: '#1e252f'
backgroundColor: '#fbfbfb'

// ✅ After  
color: tokens.colors.text
backgroundColor: tokens.colors.background
// OR
className="text-primary bg-secondary"
```

### **Spacing:**
```tsx
// ❌ Before
marginTop: 8
padding: 12
gap: 16

// ✅ After
marginTop: tokens.spacing.sm
padding: tokens.spacing.md  
gap: tokens.spacing.lg
// OR  
className="mt-2 p-3 gap-4"
```

### **Border Radius:**
```tsx
// ❌ Before
borderRadius: 6

// ✅ After
borderRadius: tokens.radius.lg
// OR
className="rounded"
```

### **Shadows:**
```tsx
// ❌ Before
boxShadow: '0 4px 16px rgba(25, 30, 36, 0.2)'

// ✅ After
boxShadow: tokens.shadows.md
// OR add to CSS class
```

---

## 🛠️ **Tools to Help**

### **Find Hardcoded Values:**
```bash
# Find hardcoded colors
grep -r "#[0-9a-fA-F]\{3,6\}" components/

# Find hardcoded pixel values  
grep -r "[0-9]\+px" components/

# Find inline styles
grep -r "style={{" components/
```

### **Audit Script:**
Use the `audit-tokens.sh` script to find values that should be tokenized.

---

## ✨ **Benefits**

1. **🎨 Design Consistency:** All components use the same design tokens
2. **🚀 Performance:** CSS classes are more performant than inline styles  
3. **🔧 Maintainability:** Change tokens once, update everywhere
4. **📱 Theming:** Easy to implement dark mode, themes, etc.
5. **🎯 Developer Experience:** Auto-completion, type safety with TypeScript

---

## 🎯 **Next Steps**

1. **Start with Approach 1** - Replace common inline styles with utility classes
2. **Use the token utility** for dynamic styles that can't be CSS classes
3. **Gradually migrate** existing components using the patterns above
4. **Create new components** using tokens from the start

**Priority Order:**
1. Popovers and tooltips (high visibility)
2. Button and interactive elements (frequently used)
3. Spacing and layout (wide impact)
4. Colors and typography (visual consistency)
