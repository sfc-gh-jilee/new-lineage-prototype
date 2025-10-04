# 🛠️ NodeToolbar Guide - ReactFlow (FREE)

NodeToolbar is a **free** feature in ReactFlow that displays a floating toolbar above or below nodes when they're selected.

## ✅ **What is NodeToolbar?**

A contextual toolbar that:
- Appears when a node is selected
- Floats above/below/beside the node
- Can contain buttons, actions, or any custom content
- Automatically positions itself
- Handles visibility based on node selection

## 📦 **Already Available!**

NodeToolbar is already imported in `components/NodeCard.tsx`:
```typescript
import { Handle, Position, NodeToolbar } from 'reactflow';
```

## 🎯 **How to Use NodeToolbar**

### **Basic Example:**

```typescript
export function NodeCard({ data }: { data: NodeCardData }) {
  return (
    <>
      {/* NodeToolbar - appears when node is selected */}
      <NodeToolbar
        isVisible={data.selected}
        position={Position.Top}
      >
        <div style={{ 
          background: 'white', 
          padding: '4px 8px', 
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          gap: '4px'
        }}>
          <button onClick={() => data.onToggleUpstream?.()}>
            ⬆️ Upstream
          </button>
          <button onClick={() => data.onToggleDownstream?.()}>
            ⬇️ Downstream
          </button>
          <button onClick={() => data.onToggleChildren?.()}>
            📋 Columns
          </button>
        </div>
      </NodeToolbar>

      {/* Regular node card content */}
      <div className="node-card-base">
        {/* ... your existing node content ... */}
      </div>
    </>
  );
}
```

## ⚙️ **NodeToolbar Props**

### **Position**
```typescript
position={Position.Top}    // Above the node (default)
position={Position.Bottom} // Below the node
position={Position.Left}   // Left of the node
position={Position.Right}  // Right of the node
```

### **Visibility**
```typescript
isVisible={data.selected}  // Show when selected
isVisible={true}           // Always visible
```

### **Offset**
```typescript
offset={10}  // Distance from node (default: 10px)
```

### **Alignment**
```typescript
align="center"  // Center align (default)
align="start"   // Align to start
align="end"     // Align to end
```

## 💡 **Use Cases for Your Prototype**

### **1. Quick Actions Toolbar**
Replace the expand/collapse buttons with a floating toolbar:
```typescript
<NodeToolbar isVisible={data.selected} position={Position.Top}>
  <div className="node-toolbar">
    <IconButton onClick={() => data.onToggleUpstream?.()}>
      {data.upstreamExpanded ? '⬆️ Collapse' : '⬆️ Expand'}
    </IconButton>
    <IconButton onClick={() => data.onToggleDownstream?.()}>
      {data.downstreamExpanded ? '⬇️ Collapse' : '⬇️ Expand'}
    </IconButton>
  </div>
</NodeToolbar>
```

### **2. Context Menu**
```typescript
<NodeToolbar isVisible={data.selected} position={Position.Top}>
  <div className="node-context-menu">
    <button>🔍 View Details</button>
    <button>📋 Copy Path</button>
    <button>🔗 Copy Link</button>
    <button>🗑️ Remove from View</button>
  </div>
</NodeToolbar>
```

### **3. Metadata Display**
```typescript
<NodeToolbar isVisible={data.selected} position={Position.Top} offset={15}>
  <div className="node-metadata-tooltip">
    <strong>{data.label}</strong>
    <div>Created: {data.createdTimestamp}</div>
    <div>Quality: {data.dataQualityScore}/5</div>
  </div>
</NodeToolbar>
```

### **4. Multi-Node Actions**
```typescript
<NodeToolbar 
  isVisible={data.multiSelected} 
  position={Position.Top}
>
  <div className="multi-node-toolbar">
    <button>Group Selected ({selectedCount})</button>
    <button>Align Horizontally</button>
    <button>Distribute Evenly</button>
  </div>
</NodeToolbar>
```

## 🎨 **Styling with Design Tokens**

Add these classes to `styles.css`:

```css
/* Node Toolbar Styles */
.node-toolbar {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-1);
  display: flex;
  gap: var(--space-1);
  box-shadow: var(--shadow);
  animation: fadeIn 0.2s ease;
}

.node-toolbar button {
  background: var(--bg-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.node-toolbar button:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## 🚀 **Benefits vs Current Implementation**

### **Current (Buttons on Node):**
- ✅ Always visible
- ✅ Part of node layout
- ❌ Takes up space
- ❌ Can clutter the UI

### **With NodeToolbar:**
- ✅ Only appears when selected
- ✅ Doesn't take up space
- ✅ Cleaner node appearance
- ✅ Professional feel
- ❌ Less discoverable (hidden until selection)

## 🎯 **Recommendation**

**Keep both!**
- Use **buttons on the node** for primary actions (expand/collapse)
- Use **NodeToolbar** for secondary actions (copy, delete, view details, etc.)

This gives you the best of both worlds - discoverability + clean UI.

## 📚 **Official Docs**

https://reactflow.dev/api-reference/components/node-toolbar

---

**Want me to implement NodeToolbar in your prototype?** Just let me know what actions you'd like in the toolbar!

