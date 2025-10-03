# Multi-Select Node Functionality

This document describes the multi-select and group dragging functionality for nodes in the data lineage visualization.

## Features

✅ **Ctrl/Cmd+Click Multi-Selection**: Hold Ctrl (Windows/Linux) or Cmd (Mac) and click nodes to add them to selection
✅ **Group Dragging**: Drag any selected node to move all selected nodes together
✅ **Visual Consistency**: Uses existing selected styling without additional visual indicators
✅ **Smart Selection Management**: Maintains primary selection for drawer display

## How It Works

### Multi-Selection
- **Single Click**: Selects a node (deselects others)
- **Ctrl/Cmd+Click**: Adds/removes nodes from multi-selection
- **Primary Selection**: First selected node becomes primary (shown in drawer)
- **Deselection**: Ctrl/Cmd+Click on selected node removes it from selection

### Group Dragging
- When multiple nodes are selected, dragging any selected node moves all selected nodes
- Movement delta is calculated and applied to all selected nodes simultaneously
- Non-selected nodes can still be dragged individually

### Selection States
- **selectedNodeId**: Primary selected node (for drawer display)
- **selectedNodeIds**: Set of all selected node IDs (for multi-selection)
- **multiSelected**: Boolean flag on each node indicating multi-selection membership

## Usage Examples

### Basic Multi-Selection
1. Click a node to select it
2. Hold Ctrl/Cmd and click another node to add it to selection
3. Continue holding Ctrl/Cmd and clicking to add more nodes
4. Ctrl/Cmd+click a selected node to remove it from selection

### Group Movement
1. Select multiple nodes using Ctrl/Cmd+click
2. Drag any of the selected nodes
3. All selected nodes move together maintaining their relative positions

### Clear Selection
- Click on empty space to clear all selections
- Click on an edge to clear all selections
- Regular click (without Ctrl/Cmd) on a node replaces current selection

## Implementation Details

### State Management
```typescript
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
```

### Group Dragging Logic
- Custom `handleNodesChange` function intercepts node position changes
- When multiple nodes are selected and one is dragged:
  1. Calculate movement delta (new position - old position)
  2. Apply same delta to all other selected nodes
  3. Send all position changes to React Flow simultaneously

### Node Click Handler
- Detects Ctrl/Cmd key state using `event.ctrlKey || event.metaKey`
- Multi-select mode: Toggles node in selection set
- Single-select mode: Replaces current selection

## Integration Points

### GraphView Component
- Manages multi-selection state
- Handles group dragging logic
- Updates node data with selection flags

### NodeCard Component
- Receives `multiSelected` property for logic (no visual changes)
- Maintains existing selected styling for primary selection

### Clearing Selections
All selection clearing actions clear both single and multi-selection:
- Pane clicks
- Edge clicks
- Drawer close actions
- Column lineage interactions

## Performance Considerations

- Group dragging processes multiple position changes simultaneously
- Selection state uses Set for efficient membership checks
- Node handlers are memoized with proper dependencies
- No additional visual rendering overhead (reuses existing styles)

## Keyboard Shortcuts

- **Ctrl+Click** (Windows/Linux) or **Cmd+Click** (Mac): Add/remove from selection
- **Regular Click**: Single select (clear multi-selection)
- **Drag**: Move selected node(s)

This implementation provides intuitive multi-selection behavior similar to file managers and other desktop applications, while maintaining the existing visual design and performance characteristics of the lineage visualization.
