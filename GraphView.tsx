import { Button } from './components/Button';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel as RFPanel,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type XYPosition,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Drawer } from './components/Drawer';
import { ContextualActionBar } from './components/ContextualActionBar';
import { FilterPopover, type FilterOptions } from './components/FilterPopover';
import { customEdgeTypes } from './components/CustomEdge';
import { NodeCard, type NodeCardData } from './components/NodeCard';
import { GraphProvider, useGraphVisibility } from './context/GraphContext';
import { useExpand } from './hooks/useLineage';
import { useHistory, type HistoryState } from './hooks/useHistory';
import { elkLayout } from './lib/elkLayout';
import { ALL_EDGES, NODE_BY_ID, COLUMN_LINEAGE, ALL_NODES } from './lib/mockData';
import type { LineageNode } from './lib/types';
import { container } from './styles.stylex';

type EdgeData = { relation?: string; isColumnEdge?: boolean; isSelected?: boolean };
const nodeTypes = { 
  lineage: NodeCard,
} as const;
const edgeTypes = customEdgeTypes;

function makeRfNode(d: LineageNode & Partial<NodeCardData>): Node<NodeCardData> {
  return { id: d.id, type: 'lineage', data: { ...d }, position: { x: 0, y: 0 } };
}

// Create column lineage edges when a column is selected or hovered
function createColumnLineageEdges(
  selectedColumnLineage: { nodeId: string; columnName: string } | null,
  hoveredColumnLineage: { nodeId: string; columnName: string } | null
) {
  const columnEdges: Edge[] = [];
  
  // Create edges for selected column (if any)
  if (selectedColumnLineage) {
    const { nodeId, columnName } = selectedColumnLineage;
    const relatedEdges = COLUMN_LINEAGE.filter(
      edge => 
        (edge.sourceTable === nodeId && edge.sourceColumn === columnName) ||
        (edge.targetTable === nodeId && edge.targetColumn === columnName)
    );
    
    relatedEdges.forEach(edge => {
      const edgeId = `column-edge-selected-${edge.id}`;
      const sourceHandle = `${edge.sourceTable}-${edge.sourceColumn}-out`;
      const targetHandle = `${edge.targetTable}-${edge.targetColumn}-in`;
      
      columnEdges.push({
        id: edgeId,
        source: edge.sourceTable,
        target: edge.targetTable,
        sourceHandle,
        targetHandle,
        type: 'default',
        selected: true,
        style: {
          stroke: '#10b981', // Green for selected
          strokeWidth: 2,
          strokeDasharray: '5,5',
          opacity: 1
        },
        data: { 
          relation: edge.relation,
          isColumnEdge: true,
          isSelected: true
        }
      });
    });
  }
  
  // Create edges for hovered column (if any and different from selected)
  if (hoveredColumnLineage && 
      (!selectedColumnLineage || 
       hoveredColumnLineage.nodeId !== selectedColumnLineage.nodeId || 
       hoveredColumnLineage.columnName !== selectedColumnLineage.columnName)) {
    
    const { nodeId, columnName } = hoveredColumnLineage;
    const relatedEdges = COLUMN_LINEAGE.filter(
      edge => 
        (edge.sourceTable === nodeId && edge.sourceColumn === columnName) ||
        (edge.targetTable === nodeId && edge.targetColumn === columnName)
    );
    
    relatedEdges.forEach(edge => {
      const edgeId = `column-edge-hovered-${edge.id}`;
      const sourceHandle = `${edge.sourceTable}-${edge.sourceColumn}-out`;
      const targetHandle = `${edge.targetTable}-${edge.targetColumn}-in`;
      
      columnEdges.push({
        id: edgeId,
        source: edge.sourceTable,
        target: edge.targetTable,
        sourceHandle,
        targetHandle,
        type: 'default',
        selected: false,
        style: {
          stroke: '#94a3b8', // Gray for hovered
          strokeWidth: 1,
          strokeDasharray: '3,3',
          opacity: 0.7
        },
        data: { 
          relation: edge.relation,
          isColumnEdge: true,
          isHovered: true
        }
      });
    });
  }
  
  return columnEdges;
}

// Find related columns for column lineage
function findRelatedColumns(nodeId: string, columnName: string) {
  const relatedColumns = new Map<string, Set<string>>();
  
  // Find all column relationships involving this column
  const columnRelations = COLUMN_LINEAGE.filter(
    edge => 
      (edge.sourceTable === nodeId && edge.sourceColumn === columnName) ||
      (edge.targetTable === nodeId && edge.targetColumn === columnName)
  );
  
  // Build map of related columns by table
  columnRelations.forEach(edge => {
    if (edge.sourceTable === nodeId && edge.sourceColumn === columnName) {
      // This column is the source, highlight target
      if (!relatedColumns.has(edge.targetTable)) {
        relatedColumns.set(edge.targetTable, new Set());
      }
      relatedColumns.get(edge.targetTable)!.add(edge.targetColumn);
    } else if (edge.targetTable === nodeId && edge.targetColumn === columnName) {
      // This column is the target, highlight source
      if (!relatedColumns.has(edge.sourceTable)) {
        relatedColumns.set(edge.sourceTable, new Set());
      }
      relatedColumns.get(edge.sourceTable)!.add(edge.sourceColumn);
    }
  });
  
  return relatedColumns;
}

function LineageCanvasInner() {
  const {
    visibleNodeIds,
    setVisibleNodeIds,
    expandedUpstreamByNode,
    expandedDownstreamByNode,
    setExpandedUpstreamByNode,
    setExpandedDownstreamByNode,
  } = useGraphVisibility();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<NodeCardData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<EdgeData>([]);

  const [drawerEdge, setDrawerEdge] = useState<Edge<EdgeData> | null>(null);
  const [drawerNode, setDrawerNode] = useState<Node<NodeCardData> | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [showZoomTooltip, setShowZoomTooltip] = useState<boolean>(true);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    objectTypes: new Set(['TABLE', 'VIEW', 'STAGE', 'DATASET', 'MODEL']),
    edgeTypes: new Set(['DBT_MODEL', 'DBT_SNAPSHOT', 'DBT_SEED', 'AIRFLOW_PIPELINE', 'SPARK_JOB', 'FIVETRAN_SYNC', 'CTAS', 'MERGE', 'VIEW DEP']),
    direction: null,
  });
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  const [selectedChildrenByNode, setSelectedChildrenByNode] = useState<Record<string, Set<string>>>({});
  const [focusedColumn, setFocusedColumn] = useState<{
    nodeId: string;
    columnName: string;
  } | null>(null);
  const [selectedColumnLineage, setSelectedColumnLineage] = useState<{
    nodeId: string;
    columnName: string;
  } | null>(null);
  const [hoveredColumnLineage, setHoveredColumnLineage] = useState<{
    nodeId: string;
    columnName: string;
  } | null>(null);
  const [showAllChildren, setShowAllChildren] = useState<boolean>(false);

  const { fitView, getViewport, setViewport } = useReactFlow();
  const nodesRef = useRef<Node<NodeCardData>[]>([]);
  const edgesRef = useRef<Edge<EdgeData>[]>([]);
  useEffect(() => void (nodesRef.current = rfNodes), [rfNodes]);
  useEffect(() => void (edgesRef.current = rfEdges), [rfEdges]);

  // Undo/Redo history
  const { canUndo, canRedo, undo, redo, pushState, getCurrentState } = useHistory();
  const isRestoringStateRef = useRef(false);
  const lastHistoryStateRef = useRef<string>('');

  // Capture current state for history
  const captureState = useCallback((): HistoryState => {
    const nodePositions: Record<string, { x: number; y: number }> = {};
    rfNodes.forEach(node => {
      nodePositions[node.id] = { x: node.position.x, y: node.position.y };
    });

    return {
      nodePositions,
      visibleNodeIds: new Set(visibleNodeIds),
      expandedUpstreamByNode: Object.fromEntries(
        Object.entries(expandedUpstreamByNode).map(([k, v]) => [k, new Set(v)])
      ),
      expandedDownstreamByNode: Object.fromEntries(
        Object.entries(expandedDownstreamByNode).map(([k, v]) => [k, new Set(v)])
      ),
      viewport: getViewport()
    };
  }, [rfNodes, visibleNodeIds, expandedUpstreamByNode, expandedDownstreamByNode, getViewport]);

  // Restore state from history
  const restoreState = useCallback((state: HistoryState) => {
    isRestoringStateRef.current = true;

    // Restore visible nodes
    setVisibleNodeIds(state.visibleNodeIds);

    // Restore expansion states
    setExpandedUpstreamByNode(state.expandedUpstreamByNode);
    setExpandedDownstreamByNode(state.expandedDownstreamByNode);

    // Restore node positions
    setRfNodes(nodes => 
      nodes.map(node => ({
        ...node,
        position: state.nodePositions[node.id] || node.position
      }))
    );

    // Restore viewport
    setViewport(state.viewport, { duration: 200 });

    setTimeout(() => {
      isRestoringStateRef.current = false;
    }, 300);
  }, [setVisibleNodeIds, setExpandedUpstreamByNode, setExpandedDownstreamByNode, setRfNodes, setViewport]);

  // Custom nodes change handler to support group dragging
  const handleNodesChange = useCallback((changes: any[]) => {
    // Check if drag just ended (position change with dragging: false)
    const dragEndChanges = changes.filter(change => 
      change.type === 'position' && change.dragging === false
    );
    
    // Handle group dragging for multi-selected nodes
    const dragChanges = changes.filter(change => change.type === 'position' && change.dragging);
    
    if (dragChanges.length > 0 && selectedNodeIds.size > 1) {
      // Group dragging mode
      const enhancedChanges = [...changes];
      
      dragChanges.forEach(change => {
        if (selectedNodeIds.has(change.id)) {
          // This is a selected node being dragged
          const draggedNode = rfNodes.find(n => n.id === change.id);
          if (!draggedNode) return;
          
          const deltaX = change.position.x - draggedNode.position.x;
          const deltaY = change.position.y - draggedNode.position.y;
          
          // Apply the same delta to all other selected nodes
          const groupChanges = Array.from(selectedNodeIds)
            .filter(nodeId => nodeId !== change.id) // Exclude the node being dragged
            .map(nodeId => {
              const node = rfNodes.find(n => n.id === nodeId);
              if (!node) return null;
              
              return {
                id: nodeId,
                type: 'position',
                position: {
                  x: node.position.x + deltaX,
                  y: node.position.y + deltaY,
                },
                dragging: true,
              };
            })
            .filter(Boolean);
          
          // Add group changes to the changes array
          enhancedChanges.push(...groupChanges);
        }
      });
      
      onNodesChange(enhancedChanges);
    } else {
      // Normal single node dragging
      onNodesChange(changes);
    }

    // Capture state after drag ends
    if (dragEndChanges.length > 0 && !isRestoringStateRef.current) {
      setTimeout(() => {
        pushState(captureState());
      }, 100);
    }
  }, [onNodesChange, selectedNodeIds, rfNodes, captureState, pushState]);

  // Handle undo/redo - DISABLED auto-restore to prevent interference with expand/collapse
  // Undo/redo only triggered by keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
  useEffect(() => {
    const state = getCurrentState();
    if (!state) return;
    
    // Update last state ref but DON'T auto-restore
    // This was causing expand/collapse to immediately undo itself
    const currentHistoryState = JSON.stringify(state);
    lastHistoryStateRef.current = currentHistoryState;
  }, [canUndo, canRedo, getCurrentState]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z or Ctrl+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          // Restore state after undo
          setTimeout(() => {
            const state = getCurrentState();
            if (state) {
              console.log('🔄 Restoring state after undo');
              restoreState(state);
            }
          }, 10);
        }
      }
      // Cmd+Shift+Z or Ctrl+Shift+Z for redo
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          redo();
          // Restore state after redo
          setTimeout(() => {
            const state = getCurrentState();
            if (state) {
              console.log('🔄 Restoring state after redo');
              restoreState(state);
            }
          }, 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, getCurrentState, restoreState]);

  // Custom scroll-to-pan implementation with momentum
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  const momentumRef = useRef({ vx: 0, vy: 0, timestamp: Date.now() });
  const rafRef = useRef<number>();

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if the target is within a scrollable children-list
      const target = e.target as HTMLElement;
      const scrollableElement = target.closest('.children-list');
      
      if (scrollableElement && !scrollableElement.classList.contains('auto-expanded')) {
        const list = scrollableElement as HTMLElement;
        const isScrollable = list.scrollHeight > list.clientHeight;
        
        if (isScrollable) {
          // Always scroll the list when hovering over it (stable behavior)
          e.stopPropagation();
          e.preventDefault();
          
          // Manually update scroll position
          list.scrollTop += e.deltaY;
          return;
        }
      }
      
      // Pan the canvas
      e.preventDefault();
      e.stopPropagation();
      
      const viewport = getViewport();
      const panSpeed = 0.5; // Reduced for smoother feel
      
      // Calculate new position
      const deltaX = e.deltaX * panSpeed;
      const deltaY = e.deltaY * panSpeed;
      
      // Update viewport immediately for responsive feel
      setViewport({
        x: viewport.x - deltaX,
        y: viewport.y - deltaY,
        zoom: viewport.zoom
      }, { duration: 0 });
      
      // Update momentum for inertial scrolling
      const now = Date.now();
      const timeDelta = now - momentumRef.current.timestamp;
      
      if (timeDelta > 0) {
        // Calculate velocity (pixels per millisecond)
        momentumRef.current.vx = deltaX / timeDelta;
        momentumRef.current.vy = deltaY / timeDelta;
        momentumRef.current.timestamp = now;
      }
      
      // Cancel any ongoing momentum animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Start momentum animation after a short delay
      setTimeout(() => {
        applyMomentum();
      }, 100);
    };
    
    const applyMomentum = () => {
      const friction = 0.92; // Adjust for more/less momentum (lower = more friction)
      const minVelocity = 0.01; // Stop when velocity is very small
      
      const momentum = momentumRef.current;
      
      // Apply friction
      momentum.vx *= friction;
      momentum.vy *= friction;
      
      // Check if momentum is still significant
      if (Math.abs(momentum.vx) > minVelocity || Math.abs(momentum.vy) > minVelocity) {
        const viewport = getViewport();
        
        // Apply momentum
        setViewport({
          x: viewport.x - momentum.vx * 16, // Multiply by ~16ms (60fps frame time)
          y: viewport.y - momentum.vy * 16,
          zoom: viewport.zoom
        }, { duration: 0 });
        
        // Continue animation
        rafRef.current = requestAnimationFrame(applyMomentum);
      } else {
        // Stop animation
        momentum.vx = 0;
        momentum.vy = 0;
      }
    };
    
    const wrapper = reactFlowWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (wrapper) {
        wrapper.removeEventListener('wheel', handleWheel);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [getViewport, setViewport]);

  // Force ReactFlow to properly initialize event handlers and center the view
  useEffect(() => {
    const timer = setTimeout(() => {
      // Center the viewport on the center of the node at (0,0)
      const container = document.querySelector('.react-flow');
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        const containerCenterX = width / 2;
        const containerCenterY = height / 2;
        
        // Assuming node dimensions (adjust based on your node card size)
        const nodeWidth = 240; // Based on --card-width in CSS
        const nodeHeight = 120; // Approximate node height
        
        // Offset by half the node dimensions to center the node itself
        const viewportX = containerCenterX - (nodeWidth / 2);
        const viewportY = containerCenterY - (nodeHeight / 2);
        
        setViewport({ x: viewportX, y: viewportY, zoom: 1 });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [setViewport]);

  const expandMutation = useExpand();

  const placeNeighbors = (
    parent: Node,
    count: number,
    dir: 'up' | 'down',
    gapX = 440, // Increased by 200% from 360 to accommodate edge labels
    gapY = 200, // Doubled from 120 to 240 for better spacing
  ): XYPosition[] => {
    const startY = parent.position.y - ((count - 1) * gapY) / 2;
    const x = dir === 'down' ? parent.position.x + gapX : parent.position.x - gapX;
    return Array.from({ length: count }, (_, i) => ({ x, y: startY + i * gapY }));
  };

  // Helper function to position related nodes for column lineage
  const positionRelatedNodes = (
    sourceNode: Node<NodeCardData>, 
    relatedNodeIds: string[], 
    columnRelations: Map<string, Set<string>>
  ): { nodeId: string; position: XYPosition }[] => {
    const positions: { nodeId: string; position: XYPosition }[] = [];
    const gapX = 480; // Increased by 200% from 360 to accommodate edge labels
    const gapY = 360; // Increased by 200% from 160 for more vertical space
    
    // Separate upstream and downstream nodes based on column lineage direction
    const upstreamNodes: string[] = [];
    const downstreamNodes: string[] = [];
    
    relatedNodeIds.forEach(nodeId => {
      // Check if this node has columns that feed INTO the source node
      const isUpstream = COLUMN_LINEAGE.some(edge => 
        edge.sourceTable === nodeId && 
        edge.targetTable === sourceNode.id &&
        columnRelations.get(nodeId)?.has(edge.sourceColumn)
      );
      
      if (isUpstream) {
        upstreamNodes.push(nodeId);
      } else {
        downstreamNodes.push(nodeId);
      }
    });
    
    // Position upstream nodes to the left
    if (upstreamNodes.length > 0) {
      const upstreamPositions = placeNeighbors(sourceNode, upstreamNodes.length, 'up', gapX, gapY);
      upstreamNodes.forEach((nodeId, i) => {
        positions.push({ nodeId, position: upstreamPositions[i] });
      });
    }
    
    // Position downstream nodes to the right  
    if (downstreamNodes.length > 0) {
      const downstreamPositions = placeNeighbors(sourceNode, downstreamNodes.length, 'down', gapX, gapY);
      downstreamNodes.forEach((nodeId, i) => {
        positions.push({ nodeId, position: downstreamPositions[i] });
      });
    }
    
    return positions;
  };

  const buildRfEdges = useCallback((ids: Set<string>) => {
    const idSet = new Set(ids);
    const edges = ALL_EDGES.filter(({ source, target }) => idSet.has(source) && idSet.has(target)).map(
      (e) =>
        ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'custom',
          sourceHandle: `${e.source}-main-out`,
          targetHandle: `${e.target}-main-in`,
          data: { relation: e.relation },
          animated: true,
          // style: { cursor: 'default' },
        }) as Edge<EdgeData>,
    );
    
    // Add edges for group nodes
    // Group nodes have IDs like "nodeId-group-up" or "nodeId-group-down"
    const groupNodes = Array.from(ids).filter(id => id.includes('-group-'));
    groupNodes.forEach(groupId => {
      const match = groupId.match(/^(.+)-group-(up|down)$/);
      if (match) {
        const [, parentId, direction] = match;
        if (idSet.has(parentId)) {
          // Create edge from parent to group
          if (direction === 'down') {
            edges.push({
              id: `${parentId}->${groupId}`,
              source: parentId,
              target: groupId,
              type: 'custom',
              sourceHandle: `${parentId}-main-out`,
              targetHandle: `${groupId}-main-in`,
              data: { relation: 'GROUP' },
              animated: true,
            } as Edge<EdgeData>);
          } else {
            edges.push({
              id: `${groupId}->${parentId}`,
              source: groupId,
              target: parentId,
              type: 'custom',
              sourceHandle: `${groupId}-main-out`,
              targetHandle: `${parentId}-main-in`,
              data: { relation: 'GROUP' },
              animated: true,
            } as Edge<EdgeData>);
          }
        }
      }
    });
    
    return edges;
  }, []);

  const tidyUpNodes = useCallback(async () => {
    // Get all currently visible nodes
    const currentNodes = rfNodes.filter(node => visibleNodeIds.has(node.id));
    const currentEdges = rfEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    
    if (currentNodes.length === 0) return;
    
    try {
      // Apply ELK layout to reorganize current visible nodes with normal horizontal spacing but increased vertical spacing
      const laidOutNodes = await elkLayout(currentNodes as any, currentEdges as any, 'RIGHT', false, 3); // Use normal spacing but 3x vertical gap
      
      // Update positions of the laid out nodes while preserving other node data
      setRfNodes(prevNodes => 
        prevNodes.map(node => {
          const laidOutNode = laidOutNodes.find(ln => ln.id === node.id);
          return laidOutNode ? { ...node, position: laidOutNode.position } : node;
        })
      );
      
      // Don't change zoom level - just reorganize at current zoom
    } catch (error) {
      console.error('Failed to tidy up nodes:', error);
    }
  }, [rfNodes, rfEdges, visibleNodeIds, setRfNodes]);

  // Commented out - not currently used, but kept for future reference
  // const initializeAllNodes = useCallback(async () => {
  //   // Set all nodes as visible
  //   const allNodeIds = new Set(ALL_NODES.map(node => node.id));
  //   setVisibleNodeIds(allNodeIds);
  //   
  //   // Build expanded state tracking - since all nodes are visible, 
  //   // we need to track which nodes have their upstream/downstream "expanded"
  //   const newExpandedUpstream: Record<string, Set<string>> = {};
  //   const newExpandedDownstream: Record<string, Set<string>> = {};
  //   
  //   // For each edge, mark the source as having downstream expanded and target as having upstream expanded
  //   ALL_EDGES.forEach(edge => {
  //     // Source node has downstream expanded (showing its target)
  //     if (!newExpandedDownstream[edge.source]) {
  //       newExpandedDownstream[edge.source] = new Set();
  //     }
  //     newExpandedDownstream[edge.source].add(edge.target);
  //     
  //     // Target node has upstream expanded (showing its source)
  //     if (!newExpandedUpstream[edge.target]) {
  //       newExpandedUpstream[edge.target] = new Set();
  //     }
  //     newExpandedUpstream[edge.target].add(edge.source);
  //   });
  //   
  //   setExpandedUpstreamByNode(newExpandedUpstream);
  //   setExpandedDownstreamByNode(newExpandedDownstream);
  //   setShowAllChildren(false);
  //   
  //   // Create all nodes with correct expanded state
  //   const allRfNodes = ALL_NODES.map(node => {
  //     // Since all nodes are visible, set expanded flags based on tracking
  //     const hasUpstream = (newExpandedUpstream[node.id]?.size || 0) > 0;
  //     const hasDownstream = (newExpandedDownstream[node.id]?.size || 0) > 0;
  //     
  //     const rfNode = makeRfNode({ 
  //       ...node, 
  //       upstreamExpanded: hasUpstream,  // True if has upstream connections
  //       downstreamExpanded: hasDownstream  // True if has downstream connections
  //     });
  //     rfNode.position = { x: 0, y: 0 }; // ELK will position them
  //     return rfNode;
  //   });
  //   
  //   // Create all edges
  //   const allRfEdges = buildRfEdges(allNodeIds);
  //   
  //   // Set nodes and edges
  //   setRfNodes(allRfNodes as any);
  //   setRfEdges(allRfEdges as any);
  //   
  //   // Apply ELK layout to position all nodes properly
  //   try {
  //     const laidOutNodes = await elkLayout(allRfNodes as any, allRfEdges as any, 'RIGHT', false); // Use normal spacing, not expansion spacing
  //     setRfNodes(laidOutNodes as any);
  //     setTimeout(() => fitView({ padding: 0.1, includeHiddenNodes: false }), 150); // Fit all visible nodes with 10% padding
  //   } catch (error) {
  //     console.error('Failed to apply ELK layout:', error);
  //     setTimeout(() => fitView({ padding: 0.1, includeHiddenNodes: false }), 100);
  //   }
  // }, [
  //   setVisibleNodeIds,
  //   setExpandedUpstreamByNode,
  //   setExpandedDownstreamByNode,
  //   setRfNodes,
  //   setRfEdges,
  //   buildRfEdges,
  //   fitView,
  // ]);

  const toggleAllChildren = useCallback(() => {
    const newShowAllChildren = !showAllChildren;
    setShowAllChildren(newShowAllChildren);
    
    // Update all nodes to show/hide children
    setRfNodes(prev => prev.map(node => ({
      ...node,
      data: {
        ...node.data,
        childrenExpanded: newShowAllChildren
      }
    })));
    
    // Force ReactFlow to recalculate node dimensions after a brief delay
    setTimeout(() => {
      const currentViewport = getViewport();
      setViewport({ ...currentViewport });
    }, 100);
  }, [showAllChildren, setRfNodes, getViewport, setViewport]);

  // Commented out - using resetGraph instead for custom initial state
  // useEffect(() => {
  //   if (didInit.current) return;
  //   didInit.current = true;
  //   initializeAllNodes();
  // }, [initializeAllNodes]);

  const handleExpand = useCallback(
    (nodeId: string, dir: 'up' | 'down') => {
      // Capture state before expand (if not restoring)
      if (!isRestoringStateRef.current) {
        pushState(captureState());
      }
      
      console.log('🔓 handleExpand called', nodeId, dir);
      const parent = nodesRef.current.find((n) => n.id === nodeId);
      if (!parent) return;
      expandMutation.mutate(
        { nodeId, dir },
        {
          onSuccess: ({ ids }) => {
            console.log('🔓 handleExpand onSuccess START', {
              nodeId,
              dir,
              visibleNodeIds: Array.from(visibleNodeIds),
              idsFound: ids.length
            });
            const currentVisible = new Set(visibleNodeIds);
            // Always ensure the parent node is in the visible set
            currentVisible.add(nodeId);
            const toAdd = ids.filter((id) => !currentVisible.has(id));
            console.log('🔓 handleExpand onSuccess', nodeId, dir, 'found:', ids.length, 'toAdd:', toAdd.length);
            if (toAdd.length === 0) {
              console.log('⚠️ No new nodes to add - all already visible. Updating expanded flag and tracking.');
              // Still need to update tracking state even though nodes are already visible
              if (dir === 'up') {
                setExpandedUpstreamByNode((m) => ({
                  ...m,
                  [nodeId]: new Set(ids), // Track all found nodes
                }));
              } else {
                setExpandedDownstreamByNode((m) => ({
                  ...m,
                  [nodeId]: new Set(ids), // Track all found nodes
                }));
              }
              setRfNodes(
                (curr) =>
                  curr.map((cn) =>
                    cn.id === nodeId
                      ? {
                          ...cn,
                          data: {
                            ...cn.data,
                            upstreamExpanded:
                              dir === 'up' ? true : (cn.data as NodeCardData).upstreamExpanded,
                            downstreamExpanded:
                              dir === 'down' ? true : (cn.data as NodeCardData).downstreamExpanded,
                          },
                        }
                      : cn,
                  ) as any,
              );
              return;
            }
            console.log('✅ Adding nodes to visible:', toAdd);
            
            // NEW LOGIC: If more than 10 nodes, show first 3 as normal nodes and rest in compact grid
            const THRESHOLD = 10;
            const SHOW_NORMAL = 3;
            
            console.log('🔍 Checking compact grid threshold:', { 
              idsLength: ids.length,
              toAddLength: toAdd.length, 
              threshold: THRESHOLD,
              willUseCompactGrid: ids.length > THRESHOLD 
            });
            
            let newNodes: Node[] = [];
            
            // Use ids.length instead of toAdd.length to check total siblings
            if (ids.length > THRESHOLD) {
              console.log('🎨 Creating group node with many children!');
              // Split into normal nodes and group node
              const normalNodeIds = toAdd.slice(0, SHOW_NORMAL);
              const groupedNodeIds = toAdd.slice(SHOW_NORMAL);
              
              // Create normal nodes
              const positions = placeNeighbors(parent, SHOW_NORMAL + 1, dir); // +1 for group node
              normalNodeIds.forEach((id, i) => {
                const base = NODE_BY_ID.get(id)!;
                const rf = makeRfNode({
                  ...base,
                  upstreamExpanded: false,
                  downstreamExpanded: false,
                });
                rf.position = positions[i];
                newNodes.push(rf);
              });
              
              // Create group node as a special NodeCard
              const groupNodeId = `${nodeId}-group-${dir}`;
              const groupedNodes = groupedNodeIds.map(id => NODE_BY_ID.get(id)!);
              console.log('📦 Group node details:', {
                groupNodeId,
                groupedNodeCount: groupedNodes.length,
                normalNodeCount: normalNodeIds.length
              });
              
              // Create a group node that looks like a NodeCard but contains mini cards
              const groupNode: Node<NodeCardData> = {
                id: groupNodeId,
                type: 'lineage',
                data: {
                  id: groupNodeId,
                  name: groupNodeId,
                  label: `+${groupedNodeIds.length} more`,
                  objType: 'DATASET',
                  upstreamExpanded: false,
                  downstreamExpanded: false,
                  isGroupNode: true, // Special flag
                  groupedNodes: groupedNodes, // Store the grouped nodes
                  onPromoteNode: (promotedNodeId: string) => {
                    console.log('🎯 Promoting node from group:', promotedNodeId);
                    
                    // Add to visible nodes first
                    const updatedVisible = new Set(visibleNodeIds);
                    updatedVisible.add(promotedNodeId);
                    setVisibleNodeIds(updatedVisible);
                    
                    // Update tracking to include the promoted node
                    if (dir === 'up') {
                      setExpandedUpstreamByNode((m) => ({
                        ...m,
                        [nodeId]: new Set([...(m[nodeId] || []), promotedNodeId]),
                      }));
                    } else {
                      setExpandedDownstreamByNode((m) => ({
                        ...m,
                        [nodeId]: new Set([...(m[nodeId] || []), promotedNodeId]),
                      }));
                    }
                    
                    // Get all current sibling nodes (normal nodes + group node)
                    const currentSiblings = nodesRef.current.filter((n) => {
                      // Find nodes that are siblings (same level, connected to parent)
                      if (n.id === nodeId) return false; // Skip parent
                      if (n.id === groupNodeId) return true; // Include group node
                      // Check if this node is a sibling (has edge from parent)
                      return ALL_EDGES.some(e => 
                        (dir === 'down' && e.source === nodeId && e.target === n.id) ||
                        (dir === 'up' && e.target === nodeId && e.source === n.id)
                      );
                    });
                    
                    // Count how many nodes will be visible after promotion
                    const normalSiblingsCount = currentSiblings.filter(n => !n.id.includes('-group-')).length;
                    
                    // Check if group will still exist after promotion
                    const groupNode = currentSiblings.find(n => n.id === groupNodeId);
                    const willGroupRemain = groupNode && (groupNode.data as any).groupedNodes?.length > 1;
                    
                    // Total nodes after promotion = normal siblings + promoted node + (group if it remains)
                    const totalAfterPromotion = normalSiblingsCount + 1 + (willGroupRemain ? 1 : 0);
                    
                    // Recalculate positions for all siblings including group
                    const newPositions = placeNeighbors(parent, totalAfterPromotion, dir);
                    
                    // Create the promoted node
                    const promotedNode = NODE_BY_ID.get(promotedNodeId)!;
                    const rf = makeRfNode({
                      ...promotedNode,
                      upstreamExpanded: false,
                      downstreamExpanded: false,
                    });
                    
                    // Update all nodes with new positions
                    setRfNodes((curr) => {
                      let positionIndex = 0;
                      
                      const updatedNodes = curr.map((n) => {
                        // Clear focused state from all nodes
                        const clearedFocus = {
                          ...n,
                          data: {
                            ...n.data,
                            focused: false,
                          },
                        };
                        
                        // Update group node to remove the promoted node
                        if (n.id === groupNodeId && (n.data as any).isGroupNode) {
                          const nodeData = n.data as any;
                          const remainingNodes = nodeData.groupedNodes.filter((gn: any) => gn.id !== promotedNodeId);
                          
                          // If group still has nodes, keep it with updated position at the end
                          if (remainingNodes.length > 0) {
                            return {
                              ...clearedFocus,
                              position: newPositions[normalSiblingsCount + 1], // After all normal nodes + promoted node
                              data: {
                                ...clearedFocus.data,
                                groupedNodes: remainingNodes,
                                label: `+${remainingNodes.length} more`,
                              },
                            };
                          }
                          return null; // Mark for removal
                        }
                        
                        // Reposition existing sibling nodes
                        const isSibling = currentSiblings.some(s => s.id === n.id);
                        if (isSibling && !n.id.includes('-group-')) {
                          const newPos = newPositions[positionIndex++];
                          return {
                            ...clearedFocus,
                            position: newPos,
                          };
                        }
                        
                        return clearedFocus;
                      }).filter(n => n !== null); // Remove null entries (empty group)
                      
                      // Add the promoted node at its position (after existing normal siblings) with focused state
                      rf.position = newPositions[positionIndex];
                      rf.data = {
                        ...rf.data,
                        focused: true, // Set focused state on the promoted node
                      };
                      
                      return [...updatedNodes, rf] as any;
                    });
                    
                    // Update edges - preserve existing edges and add new ones
                    setRfEdges((currentEdges) => {
                      const newEdges = buildRfEdges(updatedVisible);
                      // Merge with existing edges, avoiding duplicates
                      const edgeMap = new Map(currentEdges.map(e => [e.id, e]));
                      newEdges.forEach(e => edgeMap.set(e.id, e));
                      return Array.from(edgeMap.values()) as any;
                    });
                  },
                } as any,
                position: positions[SHOW_NORMAL],
              };
              newNodes.push(groupNode);
              
              // Add normal nodes to visible set
              normalNodeIds.forEach((id) => currentVisible.add(id));
              // Also add group node to visible set so edges can connect to it
              currentVisible.add(groupNodeId);
            } else {
              // Original logic for <= 10 nodes
              const positions = placeNeighbors(parent, toAdd.length, dir);
              newNodes = toAdd.map((id, i) => {
                const base = NODE_BY_ID.get(id)!;
                const rf = makeRfNode({
                  ...base,
                  upstreamExpanded: false,
                  downstreamExpanded: false,
                });
                rf.position = positions[i];
                return rf;
              });
              toAdd.forEach((id) => currentVisible.add(id));
            }
            
            setVisibleNodeIds(currentVisible);
            
            // Track which nodes were actually added (visible nodes only, not grouped ones)
            const nodesToTrack = Array.from(currentVisible).filter(id => id !== nodeId);
            
            if (dir === 'up') {
              setExpandedUpstreamByNode((m) => ({
                ...m,
                [nodeId]: new Set([...(m[nodeId] || []), ...nodesToTrack]),
              }));
            } else {
              setExpandedDownstreamByNode((m) => ({
                ...m,
                [nodeId]: new Set([...(m[nodeId] || []), ...nodesToTrack]),
              }));
            }
            setRfNodes(
              (curr) =>
                [
                  ...curr.map((cn) =>
                    cn.id === nodeId
                      ? {
                          ...cn,
                          data: {
                            ...cn.data,
                            upstreamExpanded:
                              dir === 'up' ? true : (cn.data as NodeCardData).upstreamExpanded,
                            downstreamExpanded:
                              dir === 'down' ? true : (cn.data as NodeCardData).downstreamExpanded,
                          },
                        }
                      : cn,
                  ),
                  ...newNodes,
                ] as any,
            );
            const edges = buildRfEdges(currentVisible);
            console.log('🔗 Building edges:', {
              visibleNodeCount: currentVisible.size,
              visibleNodes: Array.from(currentVisible),
              edgeCount: edges.length,
              edges: edges.map(e => `${e.source} -> ${e.target}`)
            });
            // Merge with existing edges to preserve edges from promoted nodes
            setRfEdges((currentEdges) => {
              const edgeMap = new Map(currentEdges.map(e => [e.id, e]));
              edges.forEach(e => edgeMap.set(e.id, e));
              return Array.from(edgeMap.values()) as any;
            });
          },
        },
      );
    },
    [
      visibleNodeIds,
      setVisibleNodeIds,
      setExpandedUpstreamByNode,
      setExpandedDownstreamByNode,
      setRfNodes,
      setRfEdges,
      expandMutation,
      buildRfEdges,
      pushState,
      captureState,
    ],
  );

  const handleCollapse = useCallback(
    (nodeId: string, dir: 'up' | 'down') => {
      // Capture state before collapse (if not restoring)
      if (!isRestoringStateRef.current) {
        pushState(captureState());
      }
      
      console.log('🔒 handleCollapse called', nodeId, dir);
      const record =
        dir === 'up'
          ? expandedUpstreamByNode[nodeId] || new Set<string>()
          : expandedDownstreamByNode[nodeId] || new Set<string>();
      const toRemove = new Set(record);
      console.log('🔒 Nodes to remove:', Array.from(toRemove));
      if (toRemove.size === 0) {
        console.log('⚠️ No nodes in tracking to remove. Just updating collapsed flag.');
        setRfNodes(
          (curr) =>
            curr.map((cn) =>
              cn.id === nodeId
                ? {
                    ...cn,
                    data: {
                      ...cn.data,
                      upstreamExpanded:
                        dir === 'up' ? false : (cn.data as NodeCardData).upstreamExpanded,
                      downstreamExpanded:
                        dir === 'down' ? false : (cn.data as NodeCardData).downstreamExpanded,
                    },
                  }
                : cn,
            ) as Node<NodeCardData>[],
        );
        return;
      }
      const nextVisible = new Set(visibleNodeIds);
      for (const id of toRemove) nextVisible.delete(id);
      
      // Also remove group nodes associated with this collapse
      const groupNodeId = `${nodeId}-group-${dir}`;
      if (nextVisible.has(groupNodeId)) {
        nextVisible.delete(groupNodeId);
        console.log('🗑️ Removing group node:', groupNodeId);
      }
      
      console.log('✅ Removing from visible, new count:', nextVisible.size);
      setVisibleNodeIds(nextVisible);
      if (dir === 'up') {
        const copy = { ...expandedUpstreamByNode };
        delete copy[nodeId];
        console.log('✅ Deleting upstream tracking for', nodeId);
        setExpandedUpstreamByNode(copy);
      } else {
        const copy = { ...expandedDownstreamByNode };
        delete copy[nodeId];
        console.log('✅ Deleting downstream tracking for', nodeId);
        setExpandedDownstreamByNode(copy);
      }
      setRfNodes(
        (curr) =>
          curr
            .map((cn) =>
              cn.id === nodeId
                ? {
                    ...cn,
                    data: {
                      ...cn.data,
                      upstreamExpanded: dir === 'up' ? false : (cn.data as any).upstreamExpanded,
                      downstreamExpanded:
                        dir === 'down' ? false : (cn.data as any).downstreamExpanded,
                    },
                  }
                : cn,
            )
            .filter((cn) => !toRemove.has(cn.id) && cn.id !== groupNodeId) as any, // Also filter out group node
      );
      setRfEdges((curr) =>
        curr.filter((e) => {
          const sourceRemoved = toRemove.has(e.source as string) || e.source === groupNodeId;
          const targetRemoved = toRemove.has(e.target as string) || e.target === groupNodeId;
          const sourceIsCollapsedNode = e.source === nodeId;
          const targetIsCollapsedNode = e.target === nodeId;
          
          // Remove edge if:
          // 1. It connects to/from the collapsed node AND the other end is being removed
          // 2. Both ends are being removed
          // Keep edge if:
          // - Only one end is being removed but the other end is still visible (not the collapsed node)
          if (sourceIsCollapsedNode && targetRemoved) return false; // collapsed -> removed
          if (targetIsCollapsedNode && sourceRemoved) return false; // removed -> collapsed
          if (sourceRemoved && targetRemoved) return false; // both removed
          
          return true; // Keep all other edges
        }),
      );
    },
    [
      expandedUpstreamByNode,
      expandedDownstreamByNode,
      visibleNodeIds,
      setVisibleNodeIds,
      setExpandedUpstreamByNode,
      setExpandedDownstreamByNode,
      setRfNodes,
      setRfEdges,
      pushState,
      captureState,
    ],
  );

  const resetGraph = useCallback(() => {
    console.log('🔄 resetGraph called');
    
    // Show only FCT_ORDERS and USER_BASE initially
    const initialNodeIds = ['DW.PUBLIC.FCT_ORDERS', 'TEST.CORE.USER_BASE'];
    setVisibleNodeIds(new Set(initialNodeIds));
    setExpandedUpstreamByNode({});
    setExpandedDownstreamByNode({});
    setShowAllChildren(false);
    
    // Create both nodes
    const nodes = initialNodeIds.map((id, index) => {
      const node = NODE_BY_ID.get(id);
      if (!node) return null;
      const rfNode = makeRfNode({ ...node, upstreamExpanded: false, downstreamExpanded: false });
      // Position them horizontally
      rfNode.position = { x: index * 600, y: 0 };
      return rfNode;
    }).filter(Boolean);
    
    setRfNodes(nodes as any);
    setRfEdges([] as any);
    setTimeout(() => fitView({ padding: 0.2 }), 0);
  }, [
    setVisibleNodeIds,
    setExpandedUpstreamByNode,
    setExpandedDownstreamByNode,
    setRfNodes,
    setRfEdges,
    fitView,
  ]);

  // Initialize on mount
  useEffect(() => {
    console.log('🎬 Component mounted, calling resetGraph');
    resetGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const rfNodesWithHandlers = useMemo(() => {
    return (rfNodes as Node<NodeCardData>[]).map((n) => {
      // Skip processing for group nodes - they have their own handlers
      if ((n.data as any).isGroupNode) {
        return n;
      }
      
      // Use the expanded state already stored in node data (set by handleExpand/handleCollapse)
      // This is the source of truth for UI state
      const upstreamExpanded = (n.data as NodeCardData).upstreamExpanded || false;
      const downstreamExpanded = (n.data as NodeCardData).downstreamExpanded || false;
      const selectedChildren = selectedChildrenByNode[n.id] || new Set<string>();
      const focusedChild = focusedColumn?.nodeId === n.id ? focusedColumn.columnName : undefined;
      const isMultiSelected = selectedNodeIds.has(n.id);
      const isPrimarySelected = selectedNodeId === n.id;
      const isSelected = isPrimarySelected || isMultiSelected; // Show selected style for all multi-selected nodes
      
      return {
        ...n,
        data: {
          ...n.data,
          upstreamExpanded,
          downstreamExpanded,
          selected: isSelected,
          multiSelected: isMultiSelected,
          selectedChildren,
          focusedChild,
          onToggleUpstream: () => {
            // Use the node data as the source of truth for current state
            const isCurrentlyExpanded = upstreamExpanded;
            console.log('⬆️ Toggle upstream handler', n.id, 'currently expanded:', isCurrentlyExpanded);
            isCurrentlyExpanded ? handleCollapse(n.id, 'up') : handleExpand(n.id, 'up');
          },
          onToggleDownstream: () => {
            // Use the node data as the source of truth for current state
            const isCurrentlyExpanded = downstreamExpanded;
            console.log('⬇️ Toggle downstream handler', n.id, 'currently expanded:', isCurrentlyExpanded);
            isCurrentlyExpanded ? handleCollapse(n.id, 'down') : handleExpand(n.id, 'down');
          },
          onToggleChildren: () => {
            // Toggle children expansion state
            const newChildrenExpanded = !n.data.childrenExpanded;
            setRfNodes(prev => prev.map(node => 
              node.id === n.id 
                ? { ...node, data: { ...node.data, childrenExpanded: newChildrenExpanded } }
                : node
            ));
            
            // Update global state based on whether all nodes now have children expanded
            const allNodesExpanded = rfNodes.every(node => 
              node.id === n.id ? newChildrenExpanded : node.data.childrenExpanded
            );
            const anyNodeExpanded = rfNodes.some(node => 
              node.id === n.id ? newChildrenExpanded : node.data.childrenExpanded
            );
            
            // Only update global state if all nodes are in the same state
            if (allNodesExpanded) {
              setShowAllChildren(true);
            } else if (!anyNodeExpanded) {
              setShowAllChildren(false);
            }
            
            // Force ReactFlow to recalculate node dimensions after a brief delay
            setTimeout(() => {
              const currentViewport = getViewport();
              setViewport({ ...currentViewport });
            }, 100);
          },
          onClearColumnLineage: () => {
            // Clear column lineage selection when scrolling
            setSelectedColumnLineage(null);
            setHoveredColumnLineage(null);
            setSelectedChildrenByNode({});
          },
          onHoverChild: (childName: string) => {
            // Set hovered column lineage (but don't clear selected)
            setHoveredColumnLineage({ nodeId: n.id, columnName: childName });
          },
          onSelectNode: () => {
            // Select this node (clear multi-selection and set as primary)
            setSelectedNodeId(n.id);
            setSelectedNodeIds(new Set());
          },
          onUnhoverChild: () => {
            // Clear hovered column lineage
            setHoveredColumnLineage(null);
          },
          onLayoutChange: () => {
            // Trigger ReactFlow to recalculate edge positions when node layout changes
            setTimeout(() => {
              const currentViewport = getViewport();
              setViewport({ ...currentViewport });
            }, 50);
          },
          onSelectChild: (childName: string) => {
            setSelectedChildrenByNode(prev => {
              const currentSelected = prev[n.id] || new Set<string>();
              const isCurrentlySelected = currentSelected.has(childName);
              
              if (isCurrentlySelected) {
                // Deselect the child - clear column lineage
                setSelectedColumnLineage(null);
                const newSelected = new Set(currentSelected);
                newSelected.delete(childName);
                return {
                  ...prev,
                  [n.id]: newSelected
                };
              } else {
                // Select the child - show column lineage with auto-features:
                // 1. Auto-open related nodes that aren't visible
                // 2. Auto-select related columns in those nodes  
                // 3. Auto-select column edges
                setSelectedNodeId(null); // Clear selected node
                setDrawerNode(null); // Close drawer
                setSelectedColumnLineage({ nodeId: n.id, columnName: childName });
                
                // Find and highlight related columns
                const relatedColumns = findRelatedColumns(n.id, childName);
                const newSelectedChildren: Record<string, Set<string>> = {
                  [n.id]: new Set([childName]) // Selected column
                };
                
                // Add related columns to selection
                relatedColumns.forEach((columns, tableId) => {
                  newSelectedChildren[tableId] = columns;
                });
                
                // Auto-open related nodes that aren't already visible
                const relatedNodeIds = Array.from(relatedColumns.keys());
                const nodesToOpen = relatedNodeIds.filter(nodeId => !visibleNodeIds.has(nodeId));
                
                if (nodesToOpen.length > 0) {
                  // Get the current node for positioning
                  const currentNode = rfNodes.find(node => node.id === n.id);
                  if (!currentNode) return newSelectedChildren;
                  
                  // Calculate positions for related nodes and separate upstream/downstream
                  const nodePositions = positionRelatedNodes(currentNode, nodesToOpen, relatedColumns);
                  const positionMap = new Map(nodePositions.map(np => [np.nodeId, np.position]));
                  
                  // Separate upstream and downstream nodes for state tracking
                  const upstreamNodes: string[] = [];
                  const downstreamNodes: string[] = [];
                  
                  nodesToOpen.forEach(nodeId => {
                    // Check if this node has columns that feed INTO the current node (upstream)
                    const isUpstream = COLUMN_LINEAGE.some(edge => 
                      edge.sourceTable === nodeId && 
                      edge.targetTable === n.id &&
                      relatedColumns.get(nodeId)?.has(edge.sourceColumn)
                    );
                    
                    if (isUpstream) {
                      upstreamNodes.push(nodeId);
                    } else {
                      downstreamNodes.push(nodeId);
                    }
                  });
                  
                  // Update expanded state tracking for upstream nodes
                  if (upstreamNodes.length > 0) {
                    setExpandedUpstreamByNode(prev => ({
                      ...prev,
                      [n.id]: new Set([...(prev[n.id] || []), ...upstreamNodes])
                    }));
                  }
                  
                  // Update expanded state tracking for downstream nodes  
                  if (downstreamNodes.length > 0) {
                    setExpandedDownstreamByNode(prev => ({
                      ...prev,
                      [n.id]: new Set([...(prev[n.id] || []), ...downstreamNodes])
                    }));
                  }
                  
                  // Add related nodes to visible set
                  setVisibleNodeIds(prev => {
                    const newVisible = new Set(prev);
                    nodesToOpen.forEach(nodeId => newVisible.add(nodeId));
                    return newVisible;
                  });
                  
                  // Add nodes to React Flow with proper positions and children expanded
                  const newNodes = nodesToOpen
                    .map(nodeId => NODE_BY_ID.get(nodeId))
                    .filter((node): node is LineageNode => Boolean(node))
                    .map(node => {
                      const rfNode = {
                        ...makeRfNode(node),
                        data: {
                          ...makeRfNode(node).data,
                          childrenExpanded: true // Auto-expand children to show columns
                        }
                      };
                      // Set the calculated position
                      const position = positionMap.get(node.id);
                      if (position) {
                        rfNode.position = position;
                      }
                      return rfNode;
                    });
                  
                  if (newNodes.length > 0) {
                    setRfNodes(prev => [...prev, ...newNodes]);
                  }
                  
                  // Add edges connecting to the new nodes
                  const newEdges = ALL_EDGES
                    .filter(edge => 
                      (nodesToOpen.includes(edge.source) && visibleNodeIds.has(edge.target)) ||
                      (nodesToOpen.includes(edge.target) && visibleNodeIds.has(edge.source)) ||
                      (nodesToOpen.includes(edge.source) && nodesToOpen.includes(edge.target))
                    )
                    .map(edge => ({
                      id: edge.id,
                      source: edge.source,
                      target: edge.target,
                      type: 'custom',
                      sourceHandle: `${edge.source}-main-out`,
                      targetHandle: `${edge.target}-main-in`,
                      data: { relation: edge.relation },
                    }));
                  
                  if (newEdges.length > 0) {
                    setRfEdges(prev => [...prev, ...newEdges]);
                  }
                }
                
                return newSelectedChildren;
              }
            });
          },
          onFocusChild: (childName: string) => {
            // Set focused column for side panel
            setFocusedColumn({ nodeId: n.id, columnName: childName });
            // Also set the drawer to show column details
            setDrawerNode({
              ...n,
              data: {
                ...n.data,
                focusedChild: childName
              }
            });
          },
        },
      };
    });
  }, [rfNodes, expandedUpstreamByNode, expandedDownstreamByNode, selectedNodeId, selectedNodeIds, selectedChildrenByNode, focusedColumn, handleExpand, handleCollapse, visibleNodeIds, setVisibleNodeIds, setRfNodes, setRfEdges, positionRelatedNodes, setSelectedColumnLineage, setSelectedChildrenByNode]);

  // Add column lineage edges to the regular edges
  const allEdges = useMemo(() => {
    const columnEdges = createColumnLineageEdges(selectedColumnLineage, hoveredColumnLineage);
    return [...rfEdges, ...columnEdges];
  }, [rfEdges, selectedColumnLineage, hoveredColumnLineage]);

  // Force ReactFlow to recalculate edge positions when column lineage changes
  useEffect(() => {
    if (selectedColumnLineage) {
      // Small delay to ensure handles are rendered before edges are calculated
      const timer = setTimeout(() => {
        // Trigger a viewport update to recalculate edge positions
        const currentViewport = getViewport();
        setViewport({ ...currentViewport });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedColumnLineage, getViewport, setViewport]);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setDrawerEdge(null);
    
    // Clear edge selection
    setRfEdges(edges => 
      edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          isSelected: false
        }
      }))
    );
    
    const isCtrlOrCmdPressed = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmdPressed) {
      // Multi-select mode
      setSelectedNodeIds(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(node.id)) {
          // Deselect if already selected
          newSelected.delete(node.id);
          // If this was the primary selected node, clear it or pick another
          if (selectedNodeId === node.id) {
            const remainingNodes = Array.from(newSelected);
            if (remainingNodes.length > 0) {
              setSelectedNodeId(remainingNodes[0]);
              const newPrimaryNode = rfNodes.find(n => n.id === remainingNodes[0]);
              if (newPrimaryNode) {
                setDrawerNode(newPrimaryNode as Node<NodeCardData>);
              }
            } else {
              setSelectedNodeId(null);
              setDrawerNode(null);
            }
          }
        } else {
          // Add to selection
          newSelected.add(node.id);
          // Set as primary selection if none exists
          if (!selectedNodeId) {
            setSelectedNodeId(node.id);
            setDrawerNode(node as Node<NodeCardData>);
          }
        }
        return newSelected;
      });
    } else {
      // Single select mode
      if (selectedNodeId === node.id && selectedNodeIds.size <= 1) {
        // Deselect if clicking the same node and no multi-selection
        setSelectedNodeId(null);
        setDrawerNode(null);
        setSelectedNodeIds(new Set());
      } else {
        // Select new node
        setSelectedNodeId(node.id);
        setDrawerNode(node as Node<NodeCardData>);
        setSelectedNodeIds(new Set([node.id]));
      }
      
      // Clear column lineage and children selections
      setSelectedChildrenByNode({});
      setSelectedColumnLineage(null);
    }
  }, [selectedNodeId, selectedNodeIds, rfNodes, setRfEdges]);
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge<any>) => {
    setDrawerNode(null);
    setDrawerEdge(edge);
    setSelectedNodeId(null); // Deselect nodes when clicking edges
    setSelectedNodeIds(new Set()); // Clear multi-selection
    setSelectedChildrenByNode({}); // Clear all selected children
    setSelectedColumnLineage(null); // Clear column lineage
    setHoveredColumnLineage(null); // Clear hovered column lineage
    
    // Update edges to mark this one as selected
    setRfEdges(edges => 
      edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          isSelected: e.id === edge.id
        }
      }))
    );
  }, [setRfEdges]);
  
  const onPaneClick = useCallback(() => {
    setDrawerNode(null);
    setDrawerEdge(null);
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set()); // Clear multi-selection
    setSelectedChildrenByNode({}); // Clear all selected children
    setSelectedColumnLineage(null); // Clear column lineage
    setHoveredColumnLineage(null); // Clear hovered column lineage
    setFocusedColumn(null); // Clear focused column
    
    // Clear edge selection
    setRfEdges(edges => 
      edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          isSelected: false
        }
      }))
    );
    
    // Clear focused state from all nodes
    setRfNodes(nodes =>
      nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          focused: false
        }
      }))
    );
  }, [setRfEdges, setRfNodes]);
  const closeDrawer = useCallback(() => {
    setDrawerNode(null);
    setDrawerEdge(null);
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set()); // Clear multi-selection
    setSelectedChildrenByNode({}); // Clear all selected children
    setSelectedColumnLineage(null); // Clear column lineage
    setHoveredColumnLineage(null); // Clear hovered column lineage
    setFocusedColumn(null); // Clear focused column
  }, []);


  // Contextual action bar handlers
  const handleShowAllColumnsForSelected = useCallback(() => {
    const selectedNodes = Array.from(selectedNodeIds);
    
    // Toggle childrenExpanded for selected nodes
    setRfNodes(prevNodes => 
      prevNodes.map(node => {
        if (selectedNodes.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              childrenExpanded: true
            }
          };
        }
        return node;
      })
    );
  }, [selectedNodeIds, setRfNodes]);

  const handleHideAllColumnsForSelected = useCallback(() => {
    const selectedNodes = Array.from(selectedNodeIds);
    
    // Toggle childrenExpanded for selected nodes
    setRfNodes(prevNodes => 
      prevNodes.map(node => {
        if (selectedNodes.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              childrenExpanded: false
            }
          };
        }
        return node;
      })
    );
  }, [selectedNodeIds, setRfNodes]);

  const handleGroupNodes = useCallback(() => {
    // TODO: Implement node grouping functionality
    console.log('Grouping nodes:', Array.from(selectedNodeIds));
  }, [selectedNodeIds]);

  const handleDropNodes = useCallback(() => {
    // TODO: Implement node removal functionality
    console.log('Dropping nodes:', Array.from(selectedNodeIds));
    // For now, just clear the selection
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setSelectedChildrenByNode({});
  }, [selectedNodeIds]);

  // Check if any selected nodes have columns expanded
  const hasExpandedColumns = useMemo(() => {
    return Array.from(selectedNodeIds).some(nodeId => {
      const node = rfNodes.find(n => n.id === nodeId);
      return node?.data?.childrenExpanded === true;
    });
  }, [selectedNodeIds, rfNodes]);

  // Filter handlers
  const handleApplyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    
    console.log('Applying filters:', newFilters);
    console.log('Selected nodes for directional filtering:', Array.from(selectedNodeIds));
    
    // Apply filters to nodes and edges
    let filteredNodeIds = new Set<string>();
    
    if (newFilters.direction && selectedNodeIds.size === 1) {
      // Directional filtering when single node is selected
      const selectedNodeId = Array.from(selectedNodeIds)[0];
      filteredNodeIds.add(selectedNodeId); // Always include the selected node
      
      if (newFilters.direction === 'upstream') {
        // Show upstream nodes
        ALL_EDGES.forEach(edge => {
          if (edge.target === selectedNodeId && newFilters.edgeTypes.has(edge.relation || 'default')) {
            const sourceNode = ALL_NODES.find(n => n.id === edge.source);
            if (sourceNode && newFilters.objectTypes.has(sourceNode.objType)) {
              filteredNodeIds.add(edge.source);
            }
          }
        });
      } else if (newFilters.direction === 'downstream') {
        // Show downstream nodes
        ALL_EDGES.forEach(edge => {
          if (edge.source === selectedNodeId && newFilters.edgeTypes.has(edge.relation || 'default')) {
            const targetNode = ALL_NODES.find(n => n.id === edge.target);
            if (targetNode && newFilters.objectTypes.has(targetNode.objType)) {
              filteredNodeIds.add(edge.target);
            }
          }
        });
      }
    } else {
      // Global filtering - filter all nodes by object type
      ALL_NODES.forEach(node => {
        if (newFilters.objectTypes.has(node.objType)) {
          filteredNodeIds.add(node.id);
        }
      });
    }
    
    // Update visible nodes
    setVisibleNodeIds(filteredNodeIds);
    
    // Update expanded state tracking to only include visible nodes
    setExpandedUpstreamByNode(prev => {
      const newExpanded: Record<string, Set<string>> = {};
      Object.entries(prev).forEach(([nodeId, expandedSet]) => {
        if (filteredNodeIds.has(nodeId)) {
          // Only keep expanded nodes that are still visible
          const visibleExpanded = new Set(Array.from(expandedSet).filter(id => filteredNodeIds.has(id)));
          if (visibleExpanded.size > 0) {
            newExpanded[nodeId] = visibleExpanded;
          }
        }
      });
      return newExpanded;
    });
    
    setExpandedDownstreamByNode(prev => {
      const newExpanded: Record<string, Set<string>> = {};
      Object.entries(prev).forEach(([nodeId, expandedSet]) => {
        if (filteredNodeIds.has(nodeId)) {
          // Only keep expanded nodes that are still visible
          const visibleExpanded = new Set(Array.from(expandedSet).filter(id => filteredNodeIds.has(id)));
          if (visibleExpanded.size > 0) {
            newExpanded[nodeId] = visibleExpanded;
          }
        }
      });
      return newExpanded;
    });
    
    // Filter nodes and edges for ReactFlow
    const filteredRfNodes = rfNodes.filter(node => filteredNodeIds.has(node.id));
    const filteredRfEdges = buildRfEdges(filteredNodeIds).filter(edge => {
      const edgeRelation = ALL_EDGES.find(e => e.id === edge.id)?.relation || 'default';
      return newFilters.edgeTypes.has(edgeRelation);
    });
    
    setRfNodes(filteredRfNodes as any);
    setRfEdges(filteredRfEdges as any);
    
    // Clear selections that are no longer visible
    if (selectedNodeId && !filteredNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(null);
      closeDrawer();
    }
    
    const stillVisibleSelectedNodes = new Set(Array.from(selectedNodeIds).filter(id => filteredNodeIds.has(id)));
    setSelectedNodeIds(stillVisibleSelectedNodes);
  }, [selectedNodeIds, rfNodes, buildRfEdges, setVisibleNodeIds, setExpandedUpstreamByNode, setExpandedDownstreamByNode, setRfNodes, setRfEdges, selectedNodeId, setSelectedNodeId, closeDrawer, setSelectedNodeIds]);

  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Tab to focus nodes, Enter to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        
        // Get all visible nodes sorted by position (top-left to bottom-right)
        const sortedNodes = [...rfNodes].sort((a, b) => {
          // Sort by Y position first (top to bottom), then X position (left to right)
          if (Math.abs(a.position.y - b.position.y) < 50) {
            // If nodes are on roughly the same horizontal line, sort by X
            return a.position.x - b.position.x;
          }
          return a.position.y - b.position.y;
        });
        
        // Find currently focused node
        const currentFocusedIndex = sortedNodes.findIndex(n => (n.data as NodeCardData).focused);
        
        // Calculate next index (wrap around)
        const nextIndex = e.shiftKey
          ? (currentFocusedIndex <= 0 ? sortedNodes.length - 1 : currentFocusedIndex - 1)
          : (currentFocusedIndex < 0 || currentFocusedIndex >= sortedNodes.length - 1 ? 0 : currentFocusedIndex + 1);
        
        // Update nodes to set focused state
        setRfNodes(nodes =>
          nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              focused: sortedNodes[nextIndex]?.id === n.id
            }
          }))
        );
      } else if (e.key === 'Enter') {
        // Find focused node and select it
        const focusedNode = rfNodes.find(n => (n.data as NodeCardData).focused);
        if (focusedNode) {
          setSelectedNodeId(focusedNode.id);
          setDrawerNode(focusedNode as Node<NodeCardData>);
          setSelectedNodeIds(new Set([focusedNode.id]));
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rfNodes, setRfNodes, setSelectedNodeId, setDrawerNode, setSelectedNodeIds]);

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
        {/* Main ReactFlow Container */}
        <div ref={reactFlowWrapperRef} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={rfNodesWithHandlers as any}
            edges={allEdges as any}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(p: Edge<EdgeData> | Connection) =>
              setRfEdges((eds) => addEdge({ ...p, animated: true }, eds))
            }
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes as any}
            proOptions={{ hideAttribution: true }}
            // defaultEdgeOptions={{ animated: true, style: { cursor: 'pointer' } }}
            defaultEdgeOptions={{ animated: true }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
          >
            <Background />
            <MiniMap pannable zoomable />
            <Controls />
            
            {/* Zoom Tooltip */}
            {showZoomTooltip && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 152,
                  left: 72,
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  maxWidth: 200,
                }}
              >
                <span>
                  {navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'} + scroll to zoom
                </span>
                <button
                  onClick={() => setShowZoomTooltip(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                  aria-label="Dismiss tooltip"
                >
                  ×
                </button>
              </div>
            )}
            
            <RFPanel position="top-right">
              {selectedNodeIds.size > 0 ? (
                // Contextual Action Bar for selected nodes
                <ContextualActionBar
                  selectedCount={selectedNodeIds.size}
                  onShowAllColumns={handleShowAllColumnsForSelected}
                  onHideAllColumns={handleHideAllColumnsForSelected}
                  onGroupNodes={handleGroupNodes}
                  onDropNodes={handleDropNodes}
                  showAllColumns={hasExpandedColumns}
                  onApplyFilters={handleApplyFilters}
                  currentFilters={filters}
                />
              ) : (
            // Default controls when no nodes selected
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button 
                  ref={filterButtonRef}
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                >
                  Filter
                </Button>
                <Button 
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={toggleAllChildren}
                >
                  {showAllChildren ? 'Hide all columns' : 'Show all columns'}
                </Button>
                <Button 
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={tidyUpNodes}
                >
                  Tidy Up
                </Button>
                <Button 
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={resetGraph}
                >
                  Reset
                </Button>
              </div>
                  
                  {/* Filter Popover for default controls */}
                  <FilterPopover
                    isOpen={showFilterPopover}
                    onClose={() => setShowFilterPopover(false)}
                    onApplyFilters={handleApplyFilters}
                    currentFilters={filters}
                    showDirectionOptions={false} // No direction options when no nodes selected
                    anchorRef={filterButtonRef}
                  />
                </div>
              )}
            </RFPanel>
          </ReactFlow>
        </div>
        
        {/* Drawer - pushes content instead of overlaying */}
        <Drawer
          title={drawerNode ? (drawerNode.data.focusedChild ? 'Column Details' : 'Object') : drawerEdge ? 'Relationship' : ''}
          isOpen={!!(drawerNode || drawerEdge)}
          onClose={closeDrawer}
        >
          {drawerNode && drawerNode.data.focusedChild ? (
            // Show column details when a column is focused
            (() => {
              const columnMetadata = drawerNode.data.columnsMetadata?.find(
                (col: any) => col.name === drawerNode.data.focusedChild
              );
              
              if (!columnMetadata) {
                return (
                  <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {drawerNode.data.name}.{drawerNode.data.focusedChild}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {drawerNode.data.focusedChild}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Type:</span> {
                        drawerNode.data.children?.find(c => c.name === drawerNode.data.focusedChild)?.type || 'UNKNOWN'
                      }
                    </div>
                    <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                      No detailed metadata available for this column.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gap: 16, fontSize: 13 }}>
                  {/* Header */}
                  <div>
                    <div style={{ color: '#64748b', fontSize: 12, wordBreak: 'break-word' }}>
                      {drawerNode.data.name}.{columnMetadata.name}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16, wordBreak: 'break-word', marginTop: 4 }}>
                      {columnMetadata.name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>
                      {columnMetadata.type}
                    </div>
                  </div>

                  {/* Description */}
                  {columnMetadata.description && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Description</div>
                      <div style={{ color: '#475569', lineHeight: 1.4 }}>
                        {columnMetadata.description}
                      </div>
                    </div>
                  )}

                  {/* Properties */}
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Properties</div>
                    <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Nullable:</span>
                        <span style={{ color: columnMetadata.nullable ? '#059669' : '#dc2626' }}>
                          {columnMetadata.nullable ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {columnMetadata.primaryKey && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Primary Key:</span>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Yes</span>
                        </div>
                      )}
                      {columnMetadata.foreignKey && (
                        <div>
                          <span style={{ fontWeight: 500 }}>Foreign Key:</span>
                          <div style={{ 
                            marginTop: 2, 
                            padding: 6, 
                            backgroundColor: '#f8fafc', 
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 11
                          }}>
                            {columnMetadata.foreignKey}
                          </div>
                        </div>
                      )}
                      {columnMetadata.defaultValue && (
                        <div>
                          <span style={{ fontWeight: 500 }}>Default:</span>
                          <span style={{ 
                            marginLeft: 8,
                            padding: '2px 6px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: 3,
                            fontFamily: 'monospace',
                            fontSize: 11
                          }}>
                            {columnMetadata.defaultValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Data Quality */}
                  {columnMetadata.dataQualityScore !== undefined && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Data Quality Score</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ 
                          width: 40, 
                          height: 20, 
                          backgroundColor: '#f1f5f9', 
                          borderRadius: 10,
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(columnMetadata.dataQualityScore / 5) * 100}%`,
                            height: '100%',
                            backgroundColor: columnMetadata.dataQualityScore >= 4 ? '#10b981' : 
                                           columnMetadata.dataQualityScore >= 3 ? '#f59e0b' : '#ef4444',
                            borderRadius: 10
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {columnMetadata.dataQualityScore}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {columnMetadata.tags && columnMetadata.tags.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Tags</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {columnMetadata.tags.map((tag: string) => (
                          <span key={tag} style={{
                            padding: '2px 8px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: 12,
                            fontSize: 11,
                            color: '#475569'
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Values */}
                  {columnMetadata.sampleValues && columnMetadata.sampleValues.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Sample Values</div>
                      <div style={{ 
                        padding: 8, 
                        backgroundColor: '#f8fafc', 
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: 'monospace'
                      }}>
                        {columnMetadata.sampleValues.slice(0, 4).map((value: string, i: number) => (
                          <div key={i} style={{ marginBottom: i < 3 ? 2 : 0 }}>
                            {value}
                          </div>
                        ))}
                        {columnMetadata.sampleValues.length > 4 && (
                          <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                            ... and {columnMetadata.sampleValues.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {columnMetadata.statistics && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Statistics</div>
                      <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                        {columnMetadata.statistics.uniqueCount !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Unique Values:</span>
                            <span>{columnMetadata.statistics.uniqueCount.toLocaleString()}</span>
                          </div>
                        )}
                        {columnMetadata.statistics.nullCount !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Null Count:</span>
                            <span style={{ color: columnMetadata.statistics.nullCount > 0 ? '#f59e0b' : '#10b981' }}>
                              {columnMetadata.statistics.nullCount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {columnMetadata.statistics.avgLength !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Avg Length:</span>
                            <span>{columnMetadata.statistics.avgLength}</span>
                          </div>
                        )}
                        {columnMetadata.statistics.minValue !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Min Value:</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {columnMetadata.statistics.minValue}
                            </span>
                          </div>
                        )}
                        {columnMetadata.statistics.maxValue !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Max Value:</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {columnMetadata.statistics.maxValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {columnMetadata.constraints && columnMetadata.constraints.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Constraints</div>
                      <div style={{ 
                        padding: 8, 
                        backgroundColor: '#fef3c7', 
                        borderRadius: 6,
                        fontSize: 11
                      }}>
                        {columnMetadata.constraints.map((constraint: string, i: number) => (
                          <div key={i} style={{ 
                            marginBottom: i < columnMetadata.constraints!.length - 1 ? 4 : 0,
                            fontFamily: 'monospace'
                          }}>
                            {constraint}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Updated */}
                  {columnMetadata.lastUpdated && (
                    <div style={{ 
                      paddingTop: 8, 
                      borderTop: '1px solid #e2e8f0',
                      fontSize: 11,
                      color: '#64748b'
                    }}>
                      Last updated: {columnMetadata.lastUpdated}
                    </div>
                  )}
                </div>
              );
            })()
          ) : drawerNode ? (
            // Show node details when no column is focused
            <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12, wordBreak: 'break-word' }}>
                {drawerNode.data.name}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-word' }}>
                {drawerNode.data.label}
              </div>
              <div style={{ wordBreak: 'break-word' }}>
                <span style={{ fontWeight: 600 }}>Type:</span> {drawerNode.data.objType}
              </div>
              <div style={{ 
                color: '#475569', 
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4 
              }}>
                (Put object DDL / SQL definition here.)
              </div>
            </div>
          ) : null}
          {drawerEdge && (
            <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
              <div style={{ wordBreak: 'break-word' }}>
                <span style={{ fontWeight: 600 }}>Type:</span>{' '}
                {drawerEdge.data?.relation ?? 'UNKNOWN'}
              </div>
              <div style={{ wordBreak: 'break-word' }}>
                <span style={{ fontWeight: 600 }}>Source:</span>
                <div style={{ 
                  marginTop: 4, 
                  padding: 8, 
                  backgroundColor: '#f8fafc', 
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}>
                  {drawerEdge.source}
                </div>
              </div>
              <div style={{ wordBreak: 'break-word' }}>
                <span style={{ fontWeight: 600 }}>Target:</span>
                <div style={{ 
                  marginTop: 4, 
                  padding: 8, 
                  backgroundColor: '#f8fafc', 
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}>
                  {drawerEdge.target}
                </div>
              </div>
              <div style={{ 
                color: '#475569', 
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4 
              }}>
                (Place SQL / transformation metadata here.)
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </>
  );
}

export function GraphView() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className={container.root}>
        <ReactFlowProvider>
          <GraphProvider>
            <LineageCanvasInner />
          </GraphProvider>
        </ReactFlowProvider>
      </div>
    </div>
  );
}