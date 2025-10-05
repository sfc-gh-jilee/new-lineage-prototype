# Compact Grid Node Feature

## Overview

The Compact Grid Node is a new node type designed to handle cases where a single node has many (10+) sibling connections. Instead of cluttering the graph with dozens of nodes, it displays them in a compact, interactive grid format.

## How It Works

### Automatic Activation

When expanding a node that has more than **10** connected nodes (upstream or downstream):
- The **first 3** nodes are displayed as normal full-size nodes
- The **remaining nodes** (7+) are displayed in a **Compact Grid Node**

### Compact Grid Node Features

1. **Visual Design**
   - Semi-transparent background with dashed border
   - Grid layout of tiny icon cards (32x32px each)
   - Header showing count (e.g., "+27 more")
   - Footer hint: "Click to expand"

2. **Tiny Card Display**
   - Shows only the object type icon (or brand icon for external sources)
   - 32x32px size for space efficiency
   - Hover effects: scales up slightly, changes border color

3. **Interactive Tooltips**
   - **Hover** over any tiny card to see:
     - Object name (label)
     - Full path (ID)
     - Object type
   - Tooltip follows cursor position
   - Non-intrusive, positioned above the card

4. **Click to Promote**
   - **Click** any tiny card to promote it to a full node
   - The node is added to the graph as a normal node
   - The tiny card is removed from the grid
   - Grid automatically updates the count
   - Grid node is removed when all cards are promoted

## Configuration

### Thresholds

Located in `GraphView.tsx`, `handleExpand` function:

```typescript
const THRESHOLD = 10;  // Minimum nodes to trigger compact grid
const SHOW_NORMAL = 3; // Number of normal nodes to show before grid
```

You can adjust these values to change the behavior:
- Increase `THRESHOLD` to allow more nodes before compacting
- Increase `SHOW_NORMAL` to show more full nodes initially

## Testing

### Test Case Included

A test case with 30 downstream nodes is available:

1. Click **"Test: 30 Downstream Nodes"** button (top-left)
2. Click the **downstream expand** button on the USER_BASE node
3. You'll see:
   - 3 normal nodes displayed
   - 1 compact grid node with 27 tiny cards

### Test Data Location

- Node: `TEST.CORE.USER_BASE` in `lib/mockData.ts`
- 30 downstream nodes across categories:
  - Analytics profiles (10)
  - Reports (5)
  - Dashboards (5)
  - ML models (5)
  - External exports (5)

## Component Files

### `components/CompactGridNode.tsx`
The main component that renders:
- Grid container
- Tiny cards with icons
- Hover tooltips
- Click handlers for promotion

### `GraphView.tsx`
Updated expand logic:
- Detects when node count exceeds threshold
- Splits nodes into normal + compact grid
- Handles promotion of nodes from grid to full nodes
- Manages grid node lifecycle (creation/update/removal)

### `styles.css`
Additional styles for:
- Tiny card hover effects
- Pointer events for ReactFlow integration
- Z-index management for tooltips

## User Experience Benefits

1. **Reduced Visual Clutter**: Prevents graph from becoming overwhelming with many nodes
2. **Progressive Disclosure**: Users can explore nodes on-demand
3. **Context Awareness**: Tooltips provide quick information without expanding
4. **Flexible Exploration**: Users choose which specific nodes to promote
5. **Space Efficiency**: Compact grid uses ~1/10th the space of full nodes

## Future Enhancements

Possible improvements:
- Search/filter within compact grid
- Bulk promote (select multiple cards)
- Group by object type in grid
- Configurable grid layout (rows/columns)
- Collapse promoted nodes back to grid
- Keyboard navigation through tiny cards
