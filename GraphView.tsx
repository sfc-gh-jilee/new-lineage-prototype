import { Button } from './components/Button';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel as RFPanel,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
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
import { CatalogPanel } from './components/CatalogPanel';
import { customEdgeTypes } from './components/CustomEdge';
import { NodeCard, type NodeCardData } from './components/NodeCard';
import { GroupNodeCard } from './components/GroupNode';
import { SourceGroupNode, type SourceGroupNodeData } from './components/SourceGroupNode';
import { DocumentationNodeCard } from './components/DocumentationNode';
import { StickyNoteNodeCard } from './components/StickyNoteNode';
import { EmptyCardNodeCard } from './components/EmptyCardNode';
import { GraphProvider, useGraphVisibility } from './context/GraphContext';
import { useExpand } from './hooks/useLineage';
import { useHistory, type HistoryState } from './hooks/useHistory';
import { useDynamicExpansion } from './hooks/useDynamicExpansion';
import { elkLayout } from './lib/elkLayout';
import { ALL_EDGES, NODE_BY_ID, COLUMN_LINEAGE, ALL_NODES } from './lib/mockData';
import { ALL_CATALOG_NODES } from './lib/catalogData';
import { ALL_CATALOG_EDGES } from './lib/catalogData';
import type { LineageNode, DataSource } from './lib/types';
import { container } from './styles.stylex';

type EdgeData = { relation?: string; isColumnEdge?: boolean; isSelected?: boolean };
const nodeTypes = { 
  lineage: NodeCard,
  group: GroupNodeCard,
  sourceGroup: SourceGroupNode,
  documentation: DocumentationNodeCard,
  stickyNote: StickyNoteNodeCard,
  emptyCard: EmptyCardNodeCard,
} as const;
const edgeTypes = customEdgeTypes;

function makeRfNode(d: LineageNode & Partial<NodeCardData>, options?: { hidden?: boolean }): Node<NodeCardData> {
  return { 
    id: d.id, 
    type: 'lineage', 
    data: { ...d }, 
    position: { x: 0, y: 0 },
    // If hidden flag is set, start with opacity 0 for fade-in animation
    ...(options?.hidden ? { style: { opacity: 0 } } : {}),
  };
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
        animated: true, // Enable flow animation for column lineage edges
        className: 'focused', // Use focused style (1px dashed animated)
        style: {
          stroke: '#1A6CE7', // Blue for focused column lineage
          strokeWidth: 1,
          strokeDasharray: '5,5',
          opacity: 1
        },
        data: { 
          relation: edge.relation,
          isColumnEdge: true,
          isFocused: true
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
          stroke: '#D5DAE4', // Light gray for hovered
          strokeWidth: 1,
          strokeDasharray: '3,3',
          opacity: 1
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

function LineageCanvasInner({ onDemoModeChange }: { onDemoModeChange?: (mode: 'basic' | 'advanced' | 'dynamic') => void } = {}) {
  const {
    visibleNodeIds,
    setVisibleNodeIds,
    expandedUpstreamByNode,
    expandedDownstreamByNode,
    setExpandedUpstreamByNode,
    setExpandedDownstreamByNode,
  } = useGraphVisibility();


  // Create combined node lookup that includes both original and catalog nodes
  const ALL_NODE_BY_ID = useMemo(() => {
    const combined = new Map(NODE_BY_ID);
    ALL_CATALOG_NODES.forEach(node => {
      combined.set(node.id, node);
    });
    return combined;
  }, []);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<NodeCardData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<EdgeData>([]);

  const [drawerEdge, setDrawerEdge] = useState<Edge<EdgeData> | null>(null);
  const [drawerNode, setDrawerNode] = useState<Node<NodeCardData> | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [showZoomTooltip, setShowZoomTooltip] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState<number>(1);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    objectTypes: new Set(['TABLE', 'VIEW', 'STAGE', 'DATASET', 'MODEL']),
    edgeTypes: new Set(['DBT_MODEL', 'DBT_SNAPSHOT', 'DBT_SEED', 'AIRFLOW_PIPELINE', 'SPARK_JOB', 'FIVETRAN_SYNC', 'CTAS', 'MERGE', 'VIEW DEP']),
    direction: null,
  });
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const [selectedChildrenByNode, setSelectedChildrenByNode] = useState<Record<string, Set<string>>>({});
  // Pinned columns by node - each node can have one pinned column shown above the scrollable list
  const [pinnedColumnsByNode, setPinnedColumnsByNode] = useState<Record<string, string>>({});
  
  // Source grouping - tracks which source groups are active
  const [sourceGroupsEnabled, setSourceGroupsEnabled] = useState<boolean>(true);
  const sourceGroupsRef = useRef<Map<string, { nodeIds: Set<string> }>>(new Map());
  // Legacy single focused column for drawer (the primary selected column)
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
  const [autoLayoutEnabled, setAutoLayoutEnabled] = useState<boolean>(true);

  const [showCatalog, setShowCatalog] = useState(false);

  const { fitView, getViewport, setViewport, screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodesRef = useRef<Node<NodeCardData>[]>([]);
  const edgesRef = useRef<Edge<EdgeData>[]>([]);
  
  // Ref to track pending centering timeout - ensures only one centering call at a time
  const pendingCenteringRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag to indicate centering is scheduled - viewport refresh calls should skip
  const isCenteringScheduledRef = useRef(false);

  // Helper to get node bounds (position + dimensions)
  const getNodeBounds = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return null;
    
    const nodeAny = node as any;
    const width = nodeAny.measured?.width || node.width || 280;
    const height = nodeAny.measured?.height || node.height || 160;
    
    return {
      x: node.position.x,
      y: node.position.y,
      width,
      height,
      right: node.position.x + width,
      bottom: node.position.y + height,
    };
  }, []);

  // Center viewport on a bounding box of selected and focused elements
  // - selectedNodeIds: nodes directly clicked/selected by user
  // - focusedNodeIds: nodes indirectly highlighted (e.g., connected to selected columns)
  // - focusedEdges: edges that connect selected/focused elements
  const centerOnSelection = useCallback((
    selectedNodeIds: string[],
    focusedNodeIds: string[] = [],
    focusedEdges: Edge<any>[] = [],
    duration: number = 300
  ) => {
    const container = reactFlowWrapperRef.current?.querySelector('.react-flow');
    if (!container) {
      console.warn('🎯 centerOnSelection: No container found');
      return;
    }

    // Collect all node IDs to include in bounding box
    const allNodeIds = new Set<string>([...selectedNodeIds, ...focusedNodeIds]);
    
    // Add nodes from focused edges
    focusedEdges.forEach(edge => {
      allNodeIds.add(edge.source);
      allNodeIds.add(edge.target);
    });

    if (allNodeIds.size === 0) {
      console.warn('🎯 centerOnSelection: No node IDs provided');
      return;
    }

    // Calculate bounding box of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    allNodeIds.forEach(nodeId => {
      const bounds = getNodeBounds(nodeId);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.right);
        maxY = Math.max(maxY, bounds.bottom);
      }
    });

    if (minX === Infinity) {
      console.warn('🎯 centerOnSelection: No valid node bounds found for', Array.from(allNodeIds));
      return;
    }

    // Calculate center of bounding box
    const boundsCenterX = (minX + maxX) / 2;
    const boundsCenterY = (minY + maxY) / 2;

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const viewport = getViewport();
    
    // Calculate viewport position to center the bounding box
    const newX = containerWidth / 2 - boundsCenterX * viewport.zoom;
    const newY = containerHeight / 2 - boundsCenterY * viewport.zoom;
    
    console.log('🎯 centerOnSelection:', {
      nodeIds: Array.from(allNodeIds),
      bounds: { minX, minY, maxX, maxY },
      boundsCenter: { x: boundsCenterX, y: boundsCenterY },
      container: { width: containerWidth, height: containerHeight },
      viewport,
      newViewport: { x: newX, y: newY, zoom: viewport.zoom }
    });
    
    setViewport({ x: newX, y: newY, zoom: viewport.zoom }, { duration });
  }, [getViewport, setViewport, getNodeBounds]);

  // Scheduled centering - cancels any pending centering and schedules a new one
  // This ensures only the latest centering request is executed
  const scheduleCentering = useCallback((
    selectedNodeIds: string[],
    focusedNodeIds: string[] = [],
    focusedEdges: Edge<any>[] = [],
    delay: number = 300,
    duration: number = 300
  ) => {
    // Cancel any pending centering
    if (pendingCenteringRef.current) {
      clearTimeout(pendingCenteringRef.current);
      pendingCenteringRef.current = null;
    }
    
    // Mark centering as scheduled - viewport refresh calls should skip
    isCenteringScheduledRef.current = true;
    
    // Schedule new centering
    pendingCenteringRef.current = setTimeout(() => {
      centerOnSelection(selectedNodeIds, focusedNodeIds, focusedEdges, duration);
      pendingCenteringRef.current = null;
      // Clear the flag after animation completes
      setTimeout(() => {
        isCenteringScheduledRef.current = false;
      }, duration);
    }, delay);
  }, [centerOnSelection]);

  // Group node management functions
  const handleGroupResize = useCallback((nodeId: string, width: number, height: number) => {
    setRfNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, width, height, data: { ...node.data, width, height } }
          : node
      )
    );
  }, []);

  const handleGroupToggleCollapse = useCallback((nodeId: string) => {
    setRfNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, isCollapsed: !(node.data as any).isCollapsed } }
          : node
      )
    );
  }, []);

  const handleRemoveGroup = useCallback((nodeId: string) => {
    setRfNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  useEffect(() => void (nodesRef.current = rfNodes), [rfNodes]);
  useEffect(() => void (edgesRef.current = rfEdges), [rfEdges]);

  // Source grouping - creates parent group nodes for nodes with same source
  // Uses React Flow's parent-child relationship for proper layout
  const updateSourceGroupsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingSourceGroupsRef = useRef(false);
  
  // Calculate source groups and update nodes with parent-child relationships
  const updateSourceGroups = useCallback(() => {
    if (!sourceGroupsEnabled || isUpdatingSourceGroupsRef.current) return;
    
    // Clear any pending timeout
    if (updateSourceGroupsTimeoutRef.current) {
      clearTimeout(updateSourceGroupsTimeoutRef.current);
    }
    
    updateSourceGroupsTimeoutRef.current = setTimeout(() => {
      isUpdatingSourceGroupsRef.current = true;
      
      const currentNodes = nodesRef.current;
      
      // Get all lineage nodes that have a source property and are NOT already children
      const ungroupedSourceNodes = currentNodes.filter(n => 
        n.type === 'lineage' && 
        (n.data as any)?.source &&
        !n.parentId // Not already a child of a group
      );
      
      if (ungroupedSourceNodes.length === 0) {
        // Check if we need to remove any orphaned groups
        const hasSourceGroups = currentNodes.some(n => n.id.startsWith('source-group-'));
        if (hasSourceGroups) {
          const groupsWithoutChildren = currentNodes.filter(n => 
            n.id.startsWith('source-group-') &&
            !currentNodes.some(c => c.parentId === n.id)
          );
          if (groupsWithoutChildren.length > 0) {
            setRfNodes(prev => prev.filter(n => 
              !groupsWithoutChildren.some(g => g.id === n.id)
            ));
          }
        }
        isUpdatingSourceGroupsRef.current = false;
        return;
      }
      
      // Group ungrouped nodes by source ID
      const nodesBySource = new Map<string, Node<any>[]>();
      ungroupedSourceNodes.forEach(node => {
        const source = (node.data as any).source as DataSource;
        if (!source?.id) return;
        
        if (!nodesBySource.has(source.id)) {
          nodesBySource.set(source.id, []);
        }
        nodesBySource.get(source.id)!.push(node);
      });
      
      const sourcesToProcess = Array.from(nodesBySource.entries())
        .filter(([_, nodes]) => nodes.length >= 1);
      
      if (sourcesToProcess.length === 0) {
        isUpdatingSourceGroupsRef.current = false;
        return;
      }
      
      // Process each source - create new groups or add to existing ones
      const newGroups: Node<SourceGroupNodeData>[] = [];
      const childUpdates: Map<string, { parentId: string; relativePosition: XYPosition }> = new Map();
      const groupUpdates: Map<string, { width: number; height: number; position: XYPosition }> = new Map();
      
      // Get all edges for depth calculation
      const allEdges = edgesRef.current;
      
      sourcesToProcess.forEach(([sourceId, newNodes]) => {
        const source = (newNodes[0].data as any).source as DataSource;
        const groupId = `source-group-${sourceId}`;
        
        // Check if group already exists
        const existingGroup = currentNodes.find(n => n.id === groupId);
        
        // Get ALL nodes for this source (both existing children and new ungrouped nodes)
        const existingChildren = currentNodes.filter(n => n.parentId === groupId);
        const allSourceNodes = [...existingChildren, ...newNodes];
        const nodeIds = new Set(allSourceNodes.map(n => n.id));
        
        // Layout constants for internal group layout
        const paddingH = 48; // Horizontal padding (left/right)
        const paddingTop = 56; // Top padding (after header, includes space for node type badge)
        const paddingBottom = 24; // Bottom padding
        const headerHeight = 40; // Group header height
        const nodeWidth = 280;
        const nodeHeight = 110; // Collapsed node card height (actual rendered ~100-110px)
        const nodeHeightExpanded = 400; // Expanded node card height with columns
        const nodeSpacingV = 24; // Vertical spacing between nodes in same layer
        const layerSpacing = 100; // Horizontal spacing between layers
        
        // Calculate relative depth for each node within the group
        // based on edges connecting to/from nodes in this group
        const calculateInternalDepths = () => {
          const depths = new Map<string, number>();
          
          // Find edges where both source and target are in this group (internal edges)
          // OR edges where one end is in this group (external connections determine base depth)
          const internalEdges = allEdges.filter(e => 
            nodeIds.has(e.source) && nodeIds.has(e.target)
          );
          
          // Also consider external edges to determine relative positioning
          const incomingExternalEdges = allEdges.filter(e => 
            !nodeIds.has(e.source) && nodeIds.has(e.target)
          );
          // Nodes with incoming external edges are at depth 0 (leftmost)
          const nodesWithIncomingExternal = new Set(incomingExternalEdges.map(e => e.target));
          
          // Build adjacency list for internal edges
          const successors = new Map<string, Set<string>>();
          const predecessors = new Map<string, Set<string>>();
          allSourceNodes.forEach(n => {
            successors.set(n.id, new Set());
            predecessors.set(n.id, new Set());
          });
          
          internalEdges.forEach(edge => {
            successors.get(edge.source)?.add(edge.target);
            predecessors.get(edge.target)?.add(edge.source);
          });
          
          // Calculate depths using topological ordering
          // Start with nodes that have incoming external edges or no predecessors
          const startNodes = allSourceNodes.filter(n => 
            nodesWithIncomingExternal.has(n.id) || predecessors.get(n.id)?.size === 0
          );
          
          // BFS to assign depths
          const queue: string[] = startNodes.map(n => n.id);
          startNodes.forEach(n => depths.set(n.id, 0));
          
          while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const currentDepth = depths.get(nodeId) ?? 0;
            
            successors.get(nodeId)?.forEach(successorId => {
              const existingDepth = depths.get(successorId);
              const newDepth = currentDepth + 1;
              
              if (existingDepth === undefined || newDepth > existingDepth) {
                depths.set(successorId, newDepth);
                queue.push(successorId);
              }
            });
          }
          
          // Assign depth 0 to any nodes not yet assigned (isolated nodes)
          allSourceNodes.forEach(n => {
            if (!depths.has(n.id)) {
              depths.set(n.id, 0);
            }
          });
          
          return depths;
        };
        
        const depths = calculateInternalDepths();
        
        // Group nodes by depth (layer)
        const nodesByLayer = new Map<number, typeof allSourceNodes>();
        allSourceNodes.forEach(node => {
          const depth = depths.get(node.id) ?? 0;
          if (!nodesByLayer.has(depth)) {
            nodesByLayer.set(depth, []);
          }
          nodesByLayer.get(depth)!.push(node);
        });
        
        // Sort layers and calculate positions
        const sortedLayers = Array.from(nodesByLayer.entries()).sort((a, b) => a[0] - b[0]);
        const numLayers = sortedLayers.length;
        
        // Calculate dimensions for each layer and total dimensions
        let totalWidth = 0;
        let maxLayerHeight = 0;
        
        const layerDimensions: { width: number; height: number; nodes: typeof allSourceNodes }[] = [];
        
        sortedLayers.forEach(([_, layerNodes]) => {
          const layerHeight = layerNodes.reduce((sum, node) => {
            const height = (node.data as any)?.childrenExpanded ? nodeHeightExpanded : nodeHeight;
            return sum + height;
          }, 0) + (layerNodes.length - 1) * nodeSpacingV;
          
          layerDimensions.push({
            width: nodeWidth,
            height: layerHeight,
            nodes: layerNodes,
          });
          
          maxLayerHeight = Math.max(maxLayerHeight, layerHeight);
        });
        
        totalWidth = numLayers * nodeWidth + (numLayers - 1) * layerSpacing;
        
        // Calculate group dimensions
        const groupWidth = totalWidth + paddingH * 2;
        const groupHeight = maxLayerHeight + headerHeight + paddingTop + paddingBottom;
        
        // Calculate positions for each node
        let currentX = paddingH;
        layerDimensions.forEach((layer) => {
          // Center this layer vertically within the max height
          let currentY = headerHeight + paddingTop + (maxLayerHeight - layer.height) / 2;
          
          layer.nodes.forEach(node => {
            const height = (node.data as any)?.childrenExpanded ? nodeHeightExpanded : nodeHeight;
            childUpdates.set(node.id, {
              parentId: groupId,
              relativePosition: {
                x: currentX,
                y: currentY,
              },
            });
            currentY += height + nodeSpacingV;
          });
          
          currentX += nodeWidth + layerSpacing;
        });
        
        if (existingGroup) {
          // Group exists - keep position, update size
          groupUpdates.set(groupId, {
            width: groupWidth,
            height: groupHeight,
            position: existingGroup.position,
          });
        } else {
          // Create new group - position at average of nodes
          // Start hidden for smooth reveal after layout
          const avgX = newNodes.reduce((sum, n) => sum + n.position.x, 0) / newNodes.length;
          const avgY = newNodes.reduce((sum, n) => sum + n.position.y, 0) / newNodes.length;
          const groupX = avgX - groupWidth / 2;
          const groupY = avgY - groupHeight / 2;
          
          const groupNode: Node<SourceGroupNodeData> = {
            id: groupId,
            type: 'sourceGroup',
            position: { x: groupX, y: groupY },
            style: {
              width: groupWidth,
              height: groupHeight,
              opacity: 0, // Start hidden for smooth transition
            },
            data: {
              id: groupId,
              source,
              width: groupWidth,
              height: groupHeight,
            },
            zIndex: -1,
            draggable: true,
            selectable: true,
          };
          
          newGroups.push(groupNode);
        }
        
        sourceGroupsRef.current.set(sourceId, { nodeIds: new Set(allSourceNodes.map(n => n.id)) });
      });
      
      if (newGroups.length === 0 && childUpdates.size === 0 && groupUpdates.size === 0) {
        isUpdatingSourceGroupsRef.current = false;
        return;
      }
      
      // Track nodes that need to fade in (child nodes with opacity: 0 AND new groups)
      const nodesToFadeIn = new Set<string>();
      currentNodes.forEach(node => {
        if ((node.style as any)?.opacity === 0 && childUpdates.has(node.id)) {
          nodesToFadeIn.add(node.id);
        }
      });
      // Also track new groups (they start with opacity: 0)
      newGroups.forEach(group => {
        nodesToFadeIn.add(group.id);
      });
      
      // Apply updates - position nodes and update group sizes
      setRfNodes(prevNodes => {
        let updatedNodes = prevNodes.map(node => {
          // Update existing groups
          const groupUpdate = groupUpdates.get(node.id);
          if (groupUpdate) {
            return {
              ...node,
              position: groupUpdate.position,
              style: {
                ...node.style,
                width: groupUpdate.width,
                height: groupUpdate.height,
              },
              data: {
                ...node.data,
                width: groupUpdate.width,
                height: groupUpdate.height,
              },
            };
          }
          
          // Update children (both existing and new) - keep opacity: 0 for now
          const childUpdate = childUpdates.get(node.id);
          if (childUpdate) {
            return {
              ...node,
              position: childUpdate.relativePosition,
              parentId: childUpdate.parentId,
              extent: 'parent' as const,
              expandParent: true,
              zIndex: 1,
              // Keep the node hidden if it was hidden
              style: (node.style as any)?.opacity === 0 ? { opacity: 0 } : node.style,
            };
          }
          
          return node;
        });
        
        // Add new groups at the beginning (they already have opacity: 0)
        return [...newGroups, ...updatedNodes] as any;
      });
      
      // Hide edges connected to nodes that will fade in
      if (nodesToFadeIn.size > 0) {
        setRfEdges(prevEdges => 
          prevEdges.map(edge => {
            if (nodesToFadeIn.has(edge.source) || nodesToFadeIn.has(edge.target)) {
              return {
                ...edge,
                style: {
                  ...edge.style,
                  opacity: 0,
                },
              };
            }
            return edge;
          })
        );
      }
      
      // After a delay to let the layout settle, fade in the nodes, groups, and edges
      setTimeout(() => {
        if (nodesToFadeIn.size > 0) {
          // Fade in all hidden nodes (child nodes and new groups)
          setRfNodes(prevNodes => 
            prevNodes.map(node => {
              // Fade in if node is in our tracking set OR if it has opacity: 0
              const shouldFadeIn = nodesToFadeIn.has(node.id) || (node.style as any)?.opacity === 0;
              if (shouldFadeIn) {
                // For source groups, preserve width/height in style
                const isSourceGroup = node.id.startsWith('source-group-');
                const baseStyle = isSourceGroup ? {
                  width: (node.style as any)?.width,
                  height: (node.style as any)?.height,
                } : {};
                
                return {
                  ...node,
                  style: {
                    ...baseStyle,
                    opacity: 1,
                    transition: 'opacity 0.15s ease-out',
                  },
                };
              }
              return node;
            }) as any
          );
          
          // Fade in ALL edges that have opacity: 0
          setRfEdges(prevEdges => 
            prevEdges.map(edge => {
              const isHidden = (edge.style as any)?.opacity === 0;
              const connectsToFadingNode = nodesToFadeIn.has(edge.source) || nodesToFadeIn.has(edge.target);
              if (isHidden || connectsToFadingNode) {
                return {
                  ...edge,
                  style: {
                    ...edge.style,
                    opacity: 1,
                    transition: 'opacity 0.15s ease-out',
                  },
                };
              }
              return edge;
            })
          );
          
          // Clean up transition styles after animation
          setTimeout(() => {
            setRfNodes(prevNodes => 
              prevNodes.map(node => {
                if ((node.style as any)?.transition) {
                  const { transition, opacity, ...restStyle } = node.style as any;
                  return {
                    ...node,
                    style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                  };
                }
                return node;
              }) as any
            );
            
            setRfEdges(prevEdges => 
              prevEdges.map(edge => {
                if ((edge.style as any)?.transition) {
                  const { transition, opacity, ...restStyle } = edge.style as any;
                  return {
                    ...edge,
                    style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                  };
                }
                return edge;
              })
            );
            
            isUpdatingSourceGroupsRef.current = false;
          }, 200);
        } else {
          isUpdatingSourceGroupsRef.current = false;
        }
      }, 350); // Longer delay to let positioning fully complete before reveal
    }, 100);
  }, [sourceGroupsEnabled, setRfNodes, setRfEdges]);

  // Trigger source grouping when new source nodes appear (ungrouped)
  const ungroupedSourceNodeCount = useMemo(() => {
    return rfNodes.filter(n => 
      n.type === 'lineage' && 
      (n.data as any)?.source &&
      !n.parentId
    ).length;
  }, [rfNodes]);

  useEffect(() => {
    if (ungroupedSourceNodeCount > 0 && sourceGroupsEnabled) {
      updateSourceGroups();
    }
  }, [ungroupedSourceNodeCount, sourceGroupsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update group dimensions and re-layout children when sizes change
  // Preserves the columnar (depth-based) layout established during group creation
  const updateGroupDimensions = useCallback(() => {
    if (!sourceGroupsEnabled) return;
    
    const currentNodes = nodesRef.current;
    const groups = currentNodes.filter(n => n.id.startsWith('source-group-'));
    
    if (groups.length === 0) return;
    
    // Layout constants - must match updateSourceGroups
    const paddingH = 48; // Horizontal padding (left/right)
    const paddingTop = 56; // Top padding (after header, includes space for node type badge)
    const paddingBottom = 24; // Bottom padding
    const headerHeight = 40; // Group header height
    const nodeWidth = 280;
    const nodeHeight = 110; // Collapsed node card height
    const nodeHeightExpanded = 400; // Expanded node card height with columns
    const nodeSpacingV = 24; // Vertical spacing between nodes in same layer
    const layerSpacing = 100; // Horizontal spacing between layers
    
    let needsUpdate = false;
    const groupUpdates: Map<string, { width: number; height: number }> = new Map();
    const childPositionUpdates: Map<string, { x: number; y: number }> = new Map();
    
    groups.forEach(group => {
      const children = currentNodes.filter(n => n.parentId === group.id);
      if (children.length === 0) return;
      
      // Group children by their current x position (column/layer)
      // Use a tolerance to group nodes in the same column
      const columnTolerance = 50;
      const columns = new Map<number, typeof children>();
      
      children.forEach(child => {
        // Find existing column or create new one
        let foundColumn = false;
        for (const [colX, colNodes] of columns.entries()) {
          if (Math.abs(child.position.x - colX) < columnTolerance) {
            colNodes.push(child);
            foundColumn = true;
            break;
          }
        }
        if (!foundColumn) {
          columns.set(child.position.x, [child]);
        }
      });
      
      // Sort columns by x position
      const sortedColumns = Array.from(columns.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, nodes]) => nodes);
      
      // Calculate dimensions and positions for each column
      let maxColumnHeight = 0;
      const columnLayouts: { nodes: typeof children; height: number }[] = [];
      
      sortedColumns.forEach(colNodes => {
        const colHeight = colNodes.reduce((sum, node) => {
          const h = (node.data as any)?.childrenExpanded ? nodeHeightExpanded : nodeHeight;
          return sum + h;
        }, 0) + (colNodes.length - 1) * nodeSpacingV;
        
        columnLayouts.push({ nodes: colNodes, height: colHeight });
        maxColumnHeight = Math.max(maxColumnHeight, colHeight);
      });
      
      // Calculate group dimensions
      const numColumns = sortedColumns.length;
      const newWidth = numColumns * nodeWidth + (numColumns - 1) * layerSpacing + paddingH * 2;
      const newHeight = maxColumnHeight + headerHeight + paddingTop + paddingBottom;
      
      const currentWidth = (group.style as any)?.width || 0;
      const currentHeight = (group.style as any)?.height || 0;
      
      // Check if group size needs update
      if (Math.abs(newWidth - currentWidth) > 5 || Math.abs(newHeight - currentHeight) > 5) {
        needsUpdate = true;
        groupUpdates.set(group.id, { width: newWidth, height: newHeight });
      }
      
      // Re-calculate child positions within each column
      let currentX = paddingH;
      columnLayouts.forEach(col => {
        // Center this column vertically within the max height
        let currentY = headerHeight + paddingTop + (maxColumnHeight - col.height) / 2;
        
        col.nodes.forEach(node => {
          const h = (node.data as any)?.childrenExpanded ? nodeHeightExpanded : nodeHeight;
          
          // Check if position needs update
          if (Math.abs(node.position.x - currentX) > 1 || Math.abs(node.position.y - currentY) > 1) {
            needsUpdate = true;
            childPositionUpdates.set(node.id, { x: currentX, y: currentY });
          }
          
          currentY += h + nodeSpacingV;
        });
        
        currentX += nodeWidth + layerSpacing;
      });
    });
    
    if (needsUpdate) {
      setRfNodes(prevNodes => 
        prevNodes.map(node => {
          // Update group dimensions
          const groupUpdate = groupUpdates.get(node.id);
          if (groupUpdate) {
            return {
              ...node,
              style: {
                ...node.style,
                width: groupUpdate.width,
                height: groupUpdate.height,
              },
              data: {
                ...node.data,
                width: groupUpdate.width,
                height: groupUpdate.height,
              },
            };
          }
          
          // Update child positions
          const positionUpdate = childPositionUpdates.get(node.id);
          if (positionUpdate) {
            return {
              ...node,
              position: positionUpdate,
            };
          }
          
          return node;
        }) as any
      );
    }
  }, [sourceGroupsEnabled, setRfNodes]);

  // Update group dimensions when child nodes change size (e.g., columns expanded)
  const childNodesHash = useMemo(() => {
    const childNodes = rfNodes.filter(n => n.parentId?.startsWith('source-group-'));
    return childNodes.map(n => 
      `${n.id}:${(n.data as any)?.childrenExpanded ? 'exp' : 'col'}`
    ).join('|');
  }, [rfNodes]);

  useEffect(() => {
    if (childNodesHash && sourceGroupsEnabled) {
      updateGroupDimensions();
    }
  }, [childNodesHash, sourceGroupsEnabled, updateGroupDimensions]);
  
  // Refs for column lineage state (used in applyAutoLayout)
  const selectedColumnLineageRef = useRef(selectedColumnLineage);
  const hoveredColumnLineageRef = useRef(hoveredColumnLineage);
  useEffect(() => void (selectedColumnLineageRef.current = selectedColumnLineage), [selectedColumnLineage]);
  useEffect(() => void (hoveredColumnLineageRef.current = hoveredColumnLineage), [hoveredColumnLineage]);

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

  // Custom nodes change handler to support group dragging and dimension changes
  const handleNodesChange = useCallback((changes: any[]) => {
    // Check if drag just ended (position change with dragging: false)
    const dragEndChanges = changes.filter(change => 
      change.type === 'position' && change.dragging === false
    );
    
    // Check for dimension changes (node resize due to content change)
    const dimensionChanges = changes.filter(change => change.type === 'dimensions');
    
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
          
          // Skip if this node has a parent - React Flow handles parent-child dragging
          if ((draggedNode as any).parentId) return;
          
          const deltaX = change.position.x - draggedNode.position.x;
          const deltaY = change.position.y - draggedNode.position.y;
          
          // Apply the same delta to all other selected nodes that don't have a parent
          // Nodes with parentId are moved automatically by React Flow when their parent moves
          const groupChanges = Array.from(selectedNodeIds)
            .filter(nodeId => nodeId !== change.id) // Exclude the node being dragged
            .map(nodeId => {
              const node = rfNodes.find(n => n.id === nodeId);
              if (!node) return null;
              
              // Skip child nodes - React Flow handles their position relative to parent
              if ((node as any).parentId) return null;
              
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
    
    // Trigger auto-layout when node dimensions change (e.g., column expand/collapse)
    // Pass false to skip fitView - we don't want to re-center the view on dimension changes
    if (dimensionChanges.length > 0 && autoLayoutEnabledRef.current) {
      // Debounce to avoid too many layout calls during rapid dimension changes
      applyAutoLayoutRef.current(false);
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
  const dynamicExpansion = useDynamicExpansion();

  // Initialize dynamic expansion with all available nodes and edges
  useEffect(() => {
    const allNodes = [...ALL_NODES, ...ALL_CATALOG_NODES];
    const allEdges = [...ALL_EDGES, ...ALL_CATALOG_EDGES];
    dynamicExpansion.initializeRelationships(allNodes, allEdges);
  }, [dynamicExpansion]);

  // Update visible nodes in dynamic expansion when visible nodes change
  useEffect(() => {
    dynamicExpansion.updateVisibleNodes(visibleNodeIds);
  }, [visibleNodeIds, dynamicExpansion]);

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
    // Combine both original and catalog edges
    const allEdges = [...ALL_EDGES, ...ALL_CATALOG_EDGES];
    const edges = allEdges.filter(({ source, target }) => idSet.has(source) && idSet.has(target)).map(
      (e) =>
        ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'custom',
          sourceHandle: `${e.source}-main-out`,
          targetHandle: `${e.target}-main-in`,
          data: { relation: e.relation },
          animated: false,
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
              animated: false,
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
              animated: false,
            } as Edge<EdgeData>);
          }
        }
      }
    });
    
    return edges;
  }, []);

  const tidyUpNodes = useCallback(async () => {
    // Include source groups in layout, exclude child nodes (they stay with parents)
    const childNodeIds = new Set(rfNodes.filter(n => n.parentId).map(n => n.id));
    
    const currentNodes = rfNodes.filter(node => {
      // Include source groups
      if (node.id.startsWith('source-group-')) return true;
      // Include non-child visible nodes
      return visibleNodeIds.has(node.id) && !childNodeIds.has(node.id);
    });
    
    // Remap edges from children to their parent groups
    const currentEdges = rfEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    ).map(edge => {
      const sourceNode = rfNodes.find(n => n.id === edge.source);
      const targetNode = rfNodes.find(n => n.id === edge.target);
      return {
        ...edge,
        source: sourceNode?.parentId || edge.source,
        target: targetNode?.parentId || edge.target,
      };
    }).filter(edge => edge.source !== edge.target);
    
    if (currentNodes.length === 0) return;
    
    // Add dimensions to nodes
    const nodesWithDimensions = currentNodes.map(node => {
      if (node.id.startsWith('source-group-')) {
        return {
          ...node,
          width: (node.style as any)?.width || 400,
          height: (node.style as any)?.height || 300,
        };
      }
      return {
        ...node,
        width: 280,
        height: (node.data as any)?.childrenExpanded ? 440 : 160,
      };
    });
    
    try {
      const laidOutNodes = await elkLayout(nodesWithDimensions as any, currentEdges as any, 'RIGHT');
      
      setRfNodes(prevNodes => 
        prevNodes.map(node => {
          const laidOutNode = laidOutNodes.find(ln => ln.id === node.id);
          return laidOutNode ? { ...node, position: laidOutNode.position } : node;
        })
      );
      
      setTimeout(() => fitView({ padding: 0.15, duration: 300, minZoom: 1, maxZoom: 1 }), 100);
    } catch (error) {
      console.error('Failed to tidy up nodes:', error);
    }
  }, [rfNodes, rfEdges, visibleNodeIds, setRfNodes, fitView]);

  // Auto-layout refs for debouncing
  const autoLayoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLayoutEnabledRef = useRef(true);
  const applyAutoLayoutRef = useRef<(shouldFitView?: boolean) => void>(() => {});
  const skipAutoLayoutRef = useRef(false); // Skip auto-layout when predictive layout was just applied
  
  // Keep ref in sync with state
  useEffect(() => {
    autoLayoutEnabledRef.current = autoLayoutEnabled;
  }, [autoLayoutEnabled]);

  // Ref to prevent re-triggering during layout
  const isLayoutInProgressRef = useRef(false);
  
  // Auto-layout function - applies ELK layout when enabled
  // shouldFitView: controls whether to center the view after layout (default: false to keep viewport stable)
  const applyAutoLayout = useCallback(async (shouldFitView: boolean = false) => {
    // Prevent re-entry during layout
    if (isLayoutInProgressRef.current) {
      return;
    }
    
    // Clear any pending timeout
    if (autoLayoutTimeoutRef.current) {
      clearTimeout(autoLayoutTimeoutRef.current);
    }
    
    // Short debounce to batch rapid changes
    autoLayoutTimeoutRef.current = setTimeout(async () => {
      if (!autoLayoutEnabledRef.current || isLayoutInProgressRef.current) {
        return;
      }
      
      isLayoutInProgressRef.current = true;
      
      const allNodes = nodesRef.current;
      
      // Get child node IDs (nodes that have a parent)
      const childNodeIds = new Set(allNodes.filter(n => n.parentId).map(n => n.id));
      
      // For layout: include source groups (as large nodes) and non-child regular nodes
      // Children stay inside their groups with relative positions
      const currentNodes = allNodes.filter(node => {
        // Include source groups
        if (node.id.startsWith('source-group-')) return true;
        // Include regular nodes that are not children of groups
        if ((visibleNodeIds.has(node.id) || (node.data as any).isGroupNode) && !childNodeIds.has(node.id)) {
          return true;
        }
        return false;
      });
      
      // Get base edges - remap edges from/to child nodes to their parent groups
      const baseEdges = edgesRef.current.filter(edge => {
        const sourceInLayout = currentNodes.some(n => n.id === edge.source);
        const targetInLayout = currentNodes.some(n => n.id === edge.target);
        
        // Also check if source/target are children - find their parent group
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetNode = allNodes.find(n => n.id === edge.target);
        const sourceParent = sourceNode?.parentId;
        const targetParent = targetNode?.parentId;
        
        // If both are in layout directly, or have parent groups
        return (sourceInLayout || sourceParent) && (targetInLayout || targetParent);
      }).map(edge => {
        // Remap edges from children to their parent groups for layout purposes
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetNode = allNodes.find(n => n.id === edge.target);
        
        return {
          ...edge,
          source: sourceNode?.parentId || edge.source,
          target: targetNode?.parentId || edge.target,
        };
      }).filter(edge => edge.source !== edge.target); // Remove self-loops (edges within same group)
      
      // Include column lineage edges for layout
      const columnLineageEdges = createColumnLineageEdges(
        selectedColumnLineageRef.current, 
        hoveredColumnLineageRef.current
      ).filter(edge => 
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      );
      
      // Combine and deduplicate edges
      const edgePairs = new Set(baseEdges.map(e => `${e.source}->${e.target}`));
      const uniqueColumnEdges = columnLineageEdges.filter(e => !edgePairs.has(`${e.source}->${e.target}`));
      const currentEdges = [...baseEdges, ...uniqueColumnEdges];
      
      if (currentNodes.length === 0) {
        isLayoutInProgressRef.current = false;
        return;
      }
      
      // Calculate node dimensions for layout
      const nodesWithDimensions = currentNodes.map(node => {
        // Source groups use their actual dimensions
        if (node.id.startsWith('source-group-')) {
          const width = (node.style as any)?.width || 400;
          const height = (node.style as any)?.height || 300;
          return { ...node, width, height };
        }
        
        const hasExpandedColumns = (node.data as any)?.childrenExpanded === true;
        const height = hasExpandedColumns ? 440 : 160;
        const width = 280;
        
        return { ...node, width, height };
      });
      
      try {
        const laidOutNodes = await elkLayout(nodesWithDimensions as any, currentEdges as any, 'RIGHT');
        
        setRfNodes(prevNodes => 
          prevNodes.map(node => {
            const laidOutNode = laidOutNodes.find(ln => ln.id === node.id);
            return laidOutNode ? { ...node, position: laidOutNode.position } : node;
          })
        );
        
        // Only center the view if shouldFitView is true (e.g., when nodes are added/removed)
        // Skip fitView for dimension changes to avoid re-centering during panning
        setTimeout(() => {
          if (shouldFitView) {
            fitView({ padding: 0.15, duration: 0, minZoom: 1, maxZoom: 1 });
          }
          isLayoutInProgressRef.current = false;
        }, 50);
      } catch (error) {
        console.error('Auto-layout failed:', error);
        isLayoutInProgressRef.current = false;
      }
    }, 100); // Short delay to batch changes
  }, [visibleNodeIds, setRfNodes, fitView]);

  // Keep ref in sync with the latest applyAutoLayout function
  useEffect(() => {
    applyAutoLayoutRef.current = applyAutoLayout;
  }, [applyAutoLayout]);

  // Predictive layout: calculate layout BEFORE visual change, then apply both together
  const applyPredictiveLayout = useCallback(async (
    nodeId: string, 
    changes: { childrenExpanded?: boolean }
  ) => {
    if (!autoLayoutEnabledRef.current) return null;
    
    // Get current nodes and predict their new dimensions
    const currentNodes = nodesRef.current.filter(node => 
      visibleNodeIds.has(node.id) || (node.data as any).isGroupNode
    );
    const currentEdges = edgesRef.current.filter(edge => 
      (visibleNodeIds.has(edge.source) || edge.source.includes('-group-')) && 
      (visibleNodeIds.has(edge.target) || edge.target.includes('-group-'))
    );
    
    if (currentNodes.length === 0) return null;
    
    // Calculate predicted dimensions for all nodes
    const nodesWithPredictedDimensions = currentNodes.map(node => {
      // For the node being changed, use the NEW state
      const willBeExpanded = node.id === nodeId 
        ? changes.childrenExpanded ?? (node.data as any)?.childrenExpanded
        : (node.data as any)?.childrenExpanded === true;
      
      const childrenCount = Math.min((node.data as any)?.children?.length || 0, 8);
      // Predict height: base 160px + ~36px per visible column row + header/search
      const predictedHeight = willBeExpanded ? 200 + (childrenCount * 36) : 160;
      
      return {
        ...node,
        width: 420, // Standard width
        height: predictedHeight,
      };
    });
    
    try {
      const laidOutNodes = await elkLayout(
        nodesWithPredictedDimensions as any, 
        currentEdges as any, 
        'RIGHT'
      );
      
      // Return the new positions so caller can apply them with the state change
      return new Map(laidOutNodes.map(n => [n.id, n.position]));
    } catch (error) {
      console.error('Predictive layout failed:', error);
      return null;
    }
  }, [visibleNodeIds]);

  // Ref for predictive layout
  const applyPredictiveLayoutRef = useRef(applyPredictiveLayout);
  useEffect(() => {
    applyPredictiveLayoutRef.current = applyPredictiveLayout;
  }, [applyPredictiveLayout]);

  // Trigger auto-layout when relevant state changes
  useEffect(() => {
    if (autoLayoutEnabled && rfNodes.length > 0) {
      applyAutoLayout();
    }
  }, [autoLayoutEnabled, visibleNodeIds, rfNodes.length, applyAutoLayout]);

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
    
    // Skip dimension-triggered auto-layout since we'll call it explicitly
    skipAutoLayoutRef.current = true;
    
    // Update all nodes to show/hide children
    setRfNodes(prev => prev.map(node => ({
      ...node,
      data: {
        ...node.data,
        childrenExpanded: newShowAllChildren
      }
    })));
    
    // Trigger auto-layout after DOM has updated (don't fitView for dimension changes)
    setTimeout(() => {
      skipAutoLayoutRef.current = false; // Re-enable for future changes
      applyAutoLayout(false);
    }, 100);
  }, [showAllChildren, setRfNodes, applyAutoLayout]);

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
      
      const parent = nodesRef.current.find((n) => n.id === nodeId);
      if (!parent) return;

      // Update dynamic expansion state
      try {
        dir === 'up' 
          ? dynamicExpansion.expandUpstream(nodeId)
          : dynamicExpansion.expandDownstream(nodeId);
      } catch (error) {
        // Silently handle expansion errors
      }
      expandMutation.mutate(
        { nodeId, dir },
        {
          onSuccess: ({ ids }) => {
            const currentVisible = new Set(visibleNodeIds);
            // Always ensure the parent node is in the visible set
            currentVisible.add(nodeId);
            
            // Filter to only show nodes from the same schema as the parent node
            const parentNode = ALL_NODE_BY_ID.get(nodeId);
            const parentSchema = parentNode ? `${(parentNode as any).db}.${(parentNode as any).schema}` : null;
            
            const sameSchemaIds = parentSchema 
              ? ids.filter(id => {
                  const node = ALL_NODE_BY_ID.get(id);
                  return node && `${(node as any).db}.${(node as any).schema}` === parentSchema;
                })
              : ids;
            
            const toAdd = sameSchemaIds.filter((id) => !currentVisible.has(id));
            if (toAdd.length === 0) {
              // Track only the nodes that are actually visible (not all possible nodes)
              const visibleDownstreamNodes = sameSchemaIds.filter(id => currentVisible.has(id));
              if (dir === 'up') {
                setExpandedUpstreamByNode((m) => ({
                  ...m,
                  [nodeId]: new Set(visibleDownstreamNodes), // Track only visible nodes
                }));
              } else {
                setExpandedDownstreamByNode((m) => ({
                  ...m,
                  [nodeId]: new Set(visibleDownstreamNodes), // Track only visible nodes
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
            
            // NEW LOGIC: If more than 10 nodes, show first 3 as normal nodes and rest in compact grid
            const THRESHOLD = 10;
            const SHOW_NORMAL = 3;
            
            let newNodes: Node[] = [];
            
            // Use ids.length instead of toAdd.length to check total siblings
            if (ids.length > THRESHOLD) {
              // Split into normal nodes and group node
              const normalNodeIds = toAdd.slice(0, SHOW_NORMAL);
              const groupedNodeIds = toAdd.slice(SHOW_NORMAL);
              
              // Create normal nodes - start hidden for smooth reveal after layout
              const positions = placeNeighbors(parent, SHOW_NORMAL + 1, dir); // +1 for group node
              normalNodeIds.forEach((id, i) => {
                const base = ALL_NODE_BY_ID.get(id)!;
                const rf = makeRfNode({
                  ...base,
                  upstreamExpanded: false,
                  downstreamExpanded: false,
                }, { hidden: true }); // Always hide initially for smooth transition
                rf.position = positions[i];
                newNodes.push(rf);
              });
              
              // Create group node as a special NodeCard
              const groupNodeId = `${nodeId}-group-${dir}`;
              const groupedNodes = groupedNodeIds.map(id => ALL_NODE_BY_ID.get(id)!);
              
              // Create a group node that looks like a NodeCard but contains mini cards
              // Start hidden for smooth reveal after layout
              const groupNode: Node<NodeCardData> = {
                id: groupNodeId,
                type: 'lineage',
                style: { opacity: 0 }, // Start hidden for smooth transition
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
                    
                    // Create the promoted node - start hidden for smooth reveal after layout
                    const promotedNode = ALL_NODE_BY_ID.get(promotedNodeId)!;
                    const rf = makeRfNode({
                      ...promotedNode,
                      upstreamExpanded: false,
                      downstreamExpanded: false,
                    }, { hidden: true }); // Always hide initially for smooth transition
                    
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
                    // Hide edges connecting to the promoted node for smooth reveal
                    setRfEdges((currentEdges) => {
                      const newEdges = buildRfEdges(updatedVisible);
                      // Merge with existing edges, avoiding duplicates
                      const edgeMap = new Map(currentEdges.map(e => [e.id, e]));
                      newEdges.forEach(e => {
                        // Always hide edges to promoted node initially
                        if (e.source === promotedNodeId || e.target === promotedNodeId) {
                          edgeMap.set(e.id, { ...e, style: { ...e.style, opacity: 0 } });
                        } else {
                          edgeMap.set(e.id, e);
                        }
                      });
                      return Array.from(edgeMap.values()) as any;
                    });
                    
                    // Fade in promoted node and edges after layout settles
                    setTimeout(() => {
                      setRfNodes(prevNodes => 
                        prevNodes.map(node => {
                          if (node.id === promotedNodeId && (node.style as any)?.opacity === 0) {
                            return {
                              ...node,
                              style: {
                                ...node.style,
                                opacity: 1,
                                transition: 'opacity 0.15s ease-out',
                              },
                            };
                          }
                          return node;
                        }) as any
                      );
                      
                      setRfEdges(prevEdges => 
                        prevEdges.map(edge => {
                          if ((edge.style as any)?.opacity === 0) {
                            return {
                              ...edge,
                              style: {
                                ...edge.style,
                                opacity: 1,
                                transition: 'opacity 0.15s ease-out',
                              },
                            };
                          }
                          return edge;
                        })
                      );
                      
                      // Clean up transitions
                      setTimeout(() => {
                        setRfNodes(prevNodes => 
                          prevNodes.map(node => {
                            if (node.id === promotedNodeId && (node.style as any)?.transition) {
                              const { transition, ...restStyle } = node.style as any;
                              return {
                                ...node,
                                style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                              };
                            }
                            return node;
                          }) as any
                        );
                        
                        setRfEdges(prevEdges => 
                          prevEdges.map(edge => {
                            if ((edge.style as any)?.transition) {
                              const { transition, ...restStyle } = edge.style as any;
                              return {
                                ...edge,
                                style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                              };
                            }
                            return edge;
                          })
                        );
                      }, 200);
                    }, 350); // Longer delay to let positioning fully complete before reveal
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
              // Original logic for <= 10 nodes - start hidden for smooth reveal after layout
              const positions = placeNeighbors(parent, toAdd.length, dir);
              newNodes = toAdd.map((id, i) => {
                const base = ALL_NODE_BY_ID.get(id)!;
                const rf = makeRfNode({
                  ...base,
                  upstreamExpanded: false,
                  downstreamExpanded: false,
                }, { hidden: true }); // Always hide initially for smooth transition
                rf.position = positions[i];
                return rf;
              });
              toAdd.forEach((id) => currentVisible.add(id));
            }
            
            setVisibleNodeIds(currentVisible);
            
            // Track only the nodes that are actually visible after adding new ones
            // This ensures we can properly collapse the same nodes later
            const nodesToTrack = sameSchemaIds.filter(id => currentVisible.has(id));
            
            if (dir === 'up') {
              setExpandedUpstreamByNode((m) => ({
                ...m,
                [nodeId]: new Set(nodesToTrack), // Replace, don't add
              }));
            } else {
              setExpandedDownstreamByNode((m) => ({
                ...m,
                [nodeId]: new Set(nodesToTrack), // Replace, don't add
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
            // Merge with existing edges to preserve edges from promoted nodes
            // Hide all edges connecting to hidden nodes for smooth reveal
            const hiddenNodeIds = new Set(newNodes.filter(n => (n.style as any)?.opacity === 0).map(n => n.id));
            setRfEdges((currentEdges) => {
              const edgeMap = new Map(currentEdges.map(e => [e.id, e]));
              edges.forEach(e => {
                // If edge connects to a hidden node, start it hidden too
                if (hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target)) {
                  edgeMap.set(e.id, { ...e, style: { ...e.style, opacity: 0 } });
                } else {
                  edgeMap.set(e.id, e);
                }
              });
              return Array.from(edgeMap.values()) as any;
            });
            
            // Center on the parent node + all newly expanded nodes after layout settles
            // This creates a bounding box around all "focused" elements
            const focusedNodeIds = [nodeId, ...newNodes.map(n => n.id)];
            scheduleCentering(focusedNodeIds, [], [], 250);
            
            // Fade in hidden nodes and edges after layout settles
            // Use a delay to let centering/layout complete first
            setTimeout(() => {
              // Fade in nodes
              setRfNodes(prevNodes => 
                prevNodes.map(node => {
                  if (hiddenNodeIds.has(node.id)) {
                    return {
                      ...node,
                      style: {
                        ...node.style,
                        opacity: 1,
                        transition: 'opacity 0.15s ease-out',
                      },
                    };
                  }
                  return node;
                }) as any
              );
              
              // Fade in edges
              setRfEdges(prevEdges => 
                prevEdges.map(edge => {
                  if ((edge.style as any)?.opacity === 0) {
                    return {
                      ...edge,
                      style: {
                        ...edge.style,
                        opacity: 1,
                        transition: 'opacity 0.15s ease-out',
                      },
                    };
                  }
                  return edge;
                })
              );
              
              // Clean up transition styles after animation
              setTimeout(() => {
                setRfNodes(prevNodes => 
                  prevNodes.map(node => {
                    if (hiddenNodeIds.has(node.id) && (node.style as any)?.transition) {
                      const { transition, ...restStyle } = node.style as any;
                      return {
                        ...node,
                        style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                      };
                    }
                    return node;
                  }) as any
                );
                
                setRfEdges(prevEdges => 
                  prevEdges.map(edge => {
                    if ((edge.style as any)?.transition) {
                      const { transition, ...restStyle } = edge.style as any;
                      return {
                        ...edge,
                        style: Object.keys(restStyle).length > 0 ? restStyle : undefined,
                      };
                    }
                    return edge;
                  })
                );
              }, 200);
            }, 350); // Longer delay to let positioning fully complete before reveal
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
      dynamicExpansion,
      scheduleCentering,
    ],
  );

  const handleCollapse = useCallback(
    (nodeId: string, dir: 'up' | 'down') => {
      // Capture state before collapse (if not restoring)
      if (!isRestoringStateRef.current) {
        pushState(captureState());
      }
      
      // Update dynamic expansion state
      try {
        dir === 'up' 
          ? dynamicExpansion.collapseUpstream(nodeId)
          : dynamicExpansion.collapseDownstream(nodeId);
      } catch (error) {
        // Silently handle collapse errors
      }
      const record =
        dir === 'up'
          ? expandedUpstreamByNode[nodeId] || new Set<string>()
          : expandedDownstreamByNode[nodeId] || new Set<string>();
      const toRemove = new Set(record);
      if (toRemove.size === 0) {
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
      }
      
      setVisibleNodeIds(nextVisible);
      if (dir === 'up') {
        const copy = { ...expandedUpstreamByNode };
        delete copy[nodeId];
        setExpandedUpstreamByNode(copy);
      } else {
        const copy = { ...expandedDownstreamByNode };
        delete copy[nodeId];
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
          // Keep edge only if BOTH source and target are still in nextVisible
          const sourceStillVisible = nextVisible.has(e.source as string);
          const targetStillVisible = nextVisible.has(e.target as string);
          return sourceStillVisible && targetStillVisible;
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
      dynamicExpansion,
    ],
  );

  const resetGraph = useCallback(() => {
    
    // Show only FCT_ORDERS initially
    const initialNodeIds = ['DW.PUBLIC.FCT_ORDERS'];
    setVisibleNodeIds(new Set(initialNodeIds));
    setExpandedUpstreamByNode({});
    setExpandedDownstreamByNode({});
    setShowAllChildren(false);
    
    // Create initial nodes
    const nodes = initialNodeIds.map((id, index) => {
      const node = ALL_NODE_BY_ID.get(id);
      if (!node) return null;
      const rfNode = makeRfNode({ ...node, upstreamExpanded: false, downstreamExpanded: false });
      // Position them horizontally
      rfNode.position = { x: index * 600, y: 0 };
      return rfNode;
    }).filter(Boolean);
    
    setRfNodes(nodes as any);
    setRfEdges([] as any);
    
    setTimeout(() => fitView({ padding: 0.2, minZoom: 1, maxZoom: 1 }), 0);
  }, [
    setVisibleNodeIds,
    setExpandedUpstreamByNode,
    setExpandedDownstreamByNode,
    setRfNodes,
    setRfEdges,
    fitView,
    ALL_NODE_BY_ID,
  ]);

  // Initialize on mount
  useEffect(() => {
    resetGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const rfNodesWithHandlers = useMemo(() => {
    return (rfNodes as Node<NodeCardData>[]).map((n) => {
      // Skip processing for group nodes - they have their own handlers
      if ((n.data as any).isGroupNode) {
        return n;
      }
      
      // Use the context state as the source of truth for expansion state
      const upstreamExpanded = (expandedUpstreamByNode[n.id]?.size || 0) > 0;
      const downstreamExpanded = (expandedDownstreamByNode[n.id]?.size || 0) > 0;
      
      const selectedChildren = selectedChildrenByNode[n.id] || new Set<string>();
      // Use pinnedColumnsByNode for the pinned/focused column in this node
      const focusedChild = pinnedColumnsByNode[n.id] || undefined;
      // Primary selected column is the one user directly clicked (tracked by focusedColumn)
      const primarySelectedColumn = focusedColumn?.nodeId === n.id ? focusedColumn.columnName : undefined;
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
          primarySelectedColumn, // The column user directly clicked
          onToggleUpstream: () => {
            const expansionState = dynamicExpansion.getExpansionState(n.id);
            const isCurrentlyExpanded = expansionState.upstreamExpanded;
            isCurrentlyExpanded ? handleCollapse(n.id, 'up') : handleExpand(n.id, 'up');
          },
          onToggleDownstream: () => {
            const expansionState = dynamicExpansion.getExpansionState(n.id);
            const isCurrentlyExpanded = expansionState.downstreamExpanded;
            isCurrentlyExpanded ? handleCollapse(n.id, 'down') : handleExpand(n.id, 'down');
          },
          onToggleChildren: async () => {
            // Toggle children expansion state
            const newChildrenExpanded = !n.data.childrenExpanded;
            
            // Update the ref synchronously BEFORE setRfNodes so layout can use it
            nodesRef.current = nodesRef.current.map(node => {
              if (node.id === n.id) {
                return { 
                  ...node, 
                  data: { ...node.data, childrenExpanded: newChildrenExpanded }
                };
              }
              return node;
            });
            
            // Then update state
            setRfNodes(prev => prev.map(node => {
              if (node.id === n.id) {
                return { 
                  ...node, 
                  data: { ...node.data, childrenExpanded: newChildrenExpanded }
                };
              }
              return node;
            }));
            
            // Explicitly trigger auto-layout after state update (don't fitView for dimension changes)
            setTimeout(() => {
              applyAutoLayout(false);
            }, 50);
            
            // Note: We don't center here anymore to avoid conflicting with column lineage centering
            // Centering will happen from the column lineage effect if a column is selected
            
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
            // Skip if centering is scheduled to avoid interference
            setTimeout(() => {
              if (!isCenteringScheduledRef.current) {
                const currentViewport = getViewport();
                setViewport({ ...currentViewport });
              }
            }, 50);
          },
          onSelectChild: (childName: string) => {
            setSelectedChildrenByNode(prev => {
              const currentSelected = prev[n.id] || new Set<string>();
              const isCurrentlySelected = currentSelected.has(childName);
              
              if (isCurrentlySelected) {
                // Deselect the child - clear column lineage
                setSelectedColumnLineage(null);
                setFocusedColumn(null); // Clear focused column for drawer
                setPinnedColumnsByNode({}); // Clear all pinned columns
                setDrawerNode(null); // Close drawer
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
                // 4. Pin all related columns in their nodes
                setSelectedNodeId(null); // Clear selected node
                setSelectedNodeIds(new Set()); // Clear multi-selection
                setDrawerNode(null); // Close drawer
                setDrawerEdge(null); // Clear edge drawer
                // Clear edge selection
                setRfEdges(edges => edges.map(e => ({
                  ...e,
                  data: { ...e.data, isSelected: false }
                })));
                setSelectedColumnLineage({ nodeId: n.id, columnName: childName });
                setFocusedColumn({ nodeId: n.id, columnName: childName }); // Set for drawer
                
                // Find and highlight related columns
                const relatedColumns = findRelatedColumns(n.id, childName);
                const newSelectedChildren: Record<string, Set<string>> = {
                  [n.id]: new Set([childName]) // Selected column
                };
                
                // Pin all related columns (including the selected one)
                const newPinnedColumns: Record<string, string> = {
                  [n.id]: childName // Pin the selected column
                };
                
                // Add related columns to selection and pin them
                relatedColumns.forEach((columns, tableId) => {
                  newSelectedChildren[tableId] = columns;
                  // Pin the first related column in each node
                  const firstColumn = Array.from(columns)[0];
                  if (firstColumn) {
                    newPinnedColumns[tableId] = firstColumn;
                  }
                });
                
                // Update pinned columns state
                setPinnedColumnsByNode(newPinnedColumns);
                
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
                    .map(nodeId => ALL_NODE_BY_ID.get(nodeId))
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
            // Pin the column in this node
            setPinnedColumnsByNode(prev => ({
              ...prev,
              [n.id]: childName
            }));
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
  }, [rfNodes, expandedUpstreamByNode, expandedDownstreamByNode, selectedNodeId, selectedNodeIds, selectedChildrenByNode, pinnedColumnsByNode, handleExpand, handleCollapse, visibleNodeIds, setVisibleNodeIds, setRfNodes, setRfEdges, positionRelatedNodes, setSelectedColumnLineage, setSelectedChildrenByNode, applyAutoLayout, fitView]);

  // Add column lineage edges to the regular edges
  const allEdges = useMemo(() => {
    const columnEdges = createColumnLineageEdges(selectedColumnLineage, hoveredColumnLineage);
    return [...rfEdges, ...columnEdges];
  }, [rfEdges, selectedColumnLineage, hoveredColumnLineage]);

  // Force ReactFlow to recalculate edge positions when column lineage changes
  useEffect(() => {
    if (focusedColumn || selectedColumnLineage || Object.keys(pinnedColumnsByNode).length > 0) {
      // Small delay to ensure handles are rendered before edges are calculated
      const timer = setTimeout(() => {
        // Update internals for all nodes with expanded children to recalculate handle positions
        rfNodes.forEach(node => {
          if (node.data.childrenExpanded) {
            updateNodeInternals(node.id);
          }
        });
        // Only trigger viewport update if centering is NOT scheduled
        // This prevents interference with pending centering operations
        if (!isCenteringScheduledRef.current) {
          const currentViewport = getViewport();
          setViewport({ ...currentViewport });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [focusedColumn, selectedColumnLineage, pinnedColumnsByNode, rfNodes, updateNodeInternals, getViewport, setViewport]);

  // Center view on column lineage selection (includes source node and all related nodes)
  // Note: We capture visibleNodeIds at the time of selection, not as a dependency
  const visibleNodeIdsRef = useRef(visibleNodeIds);
  useEffect(() => {
    visibleNodeIdsRef.current = visibleNodeIds;
  }, [visibleNodeIds]);

  useEffect(() => {
    if (selectedColumnLineage) {
      const { nodeId, columnName } = selectedColumnLineage;
      
      // Collect all nodes involved in the column lineage
      const involvedNodeIds = new Set<string>([nodeId]);
      
      // Find related columns to get all involved nodes
      const relatedColumns = findRelatedColumns(nodeId, columnName);
      const relatedTableIds = Array.from(relatedColumns.keys());
      
      // Get current visible nodes for filtering
      const currentVisibleNodes = visibleNodeIdsRef.current;
      
      relatedTableIds.forEach(tableId => {
        // Add ALL related nodes that are visible on the canvas
        if (currentVisibleNodes.has(tableId)) {
          involvedNodeIds.add(tableId);
        }
      });
      
      console.log('🎯 Column lineage centering:', {
        selectedColumn: `${nodeId}.${columnName}`,
        relatedTables: relatedTableIds,
        visibleNodes: Array.from(currentVisibleNodes),
        involvedNodes: Array.from(involvedNodeIds),
        filteredOut: relatedTableIds.filter(id => !currentVisibleNodes.has(id))
      });
      
      // Use scheduleCentering with 350ms delay - this will cancel any other pending centering
      // (e.g., from handleExpand which uses 250ms) ensuring only one centering call executes
      scheduleCentering(Array.from(involvedNodeIds), [], [], 350);
    }
  }, [selectedColumnLineage, scheduleCentering]); // Removed visibleNodeIds dependency

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
          // Note: Don't center here - let column lineage centering handle it if a column is selected
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
        // Note: Don't auto-center on node click - it conflicts with column lineage centering
        // Users can use fitView or manual panning to adjust the view
      }
      
      // Clear column lineage, pinned columns, and children selections
      setSelectedChildrenByNode({});
      setSelectedColumnLineage(null);
      setPinnedColumnsByNode({});
      setFocusedColumn(null);
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
    setPinnedColumnsByNode({}); // Clear pinned columns
    setFocusedColumn(null); // Clear focused column
    
    // Update edges to mark this one as selected
    // Set both `selected` (for React Flow CSS class) and `data.isSelected` (for CustomEdge)
    setRfEdges(edges => 
      edges.map(e => ({
        ...e,
        selected: e.id === edge.id,
        data: {
          ...e.data,
          isSelected: e.id === edge.id
        }
      }))
    );
    
    // Center the view on the selected edge (use short delay via scheduler to avoid conflicts)
    scheduleCentering([], [], [edge], 50);
  }, [setRfEdges, scheduleCentering]);
  
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
        selected: false,
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
    
    // Skip dimension-triggered auto-layout since we'll call it explicitly
    skipAutoLayoutRef.current = true;
    
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
    
    // Trigger auto-layout after DOM updates (don't fitView for dimension changes)
    setTimeout(() => {
      skipAutoLayoutRef.current = false;
      applyAutoLayout(false);
    }, 100);
  }, [selectedNodeIds, setRfNodes, applyAutoLayout]);

  const handleHideAllColumnsForSelected = useCallback(() => {
    const selectedNodes = Array.from(selectedNodeIds);
    
    // Skip dimension-triggered auto-layout since we'll call it explicitly
    skipAutoLayoutRef.current = true;
    
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
    
    // Trigger auto-layout after DOM updates (don't fitView for dimension changes)
    setTimeout(() => {
      skipAutoLayoutRef.current = false;
      applyAutoLayout(false);
    }, 100);
  }, [selectedNodeIds, setRfNodes, applyAutoLayout]);

  const handleGroupNodes = useCallback(() => {
    if (selectedNodeIds.size < 2) {
      console.log('Need at least 2 nodes to create a group');
      return;
    }

    const selectedNodes = rfNodes.filter(n => selectedNodeIds.has(n.id));
    if (selectedNodes.length < 2) return;

    // Calculate bounding box of selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedNodes.forEach(node => {
      const nodeAny = node as any;
      const width = nodeAny.measured?.width || node.width || 280;
      const height = nodeAny.measured?.height || node.height || 160;
      
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    });

    // Add padding around the group
    const padding = 40;
    const headerHeight = 50; // Account for group header
    const groupWidth = maxX - minX + padding * 2;
    const groupHeight = maxY - minY + padding * 2 + headerHeight;
    const groupX = minX - padding;
    const groupY = minY - padding - headerHeight;

    // Generate unique group ID
    const groupId = `group-${Date.now()}`;

    // Create the group node
    const groupNode: Node<any> = {
      id: groupId,
      type: 'group',
      position: { x: groupX, y: groupY },
      style: {
        width: groupWidth,
        height: groupHeight,
      },
      data: {
        id: groupId,
        name: groupId,
        label: `Group (${selectedNodes.length} nodes)`,
        objType: 'GROUP' as const,
        description: 'Grouped nodes',
        color: 'blue',
        width: groupWidth,
        height: groupHeight,
        isCollapsed: false,
        onResize: (width: number, height: number) => handleGroupResize(groupId, width, height),
        onToggleCollapse: () => handleGroupToggleCollapse(groupId),
        onRemoveGroup: () => handleUngroupNodes(groupId),
      },
      // Group nodes should render behind children
      zIndex: -1,
    };

    // Update child nodes to reference the parent
    const updatedNodes = rfNodes.map(node => {
      if (selectedNodeIds.has(node.id)) {
        // Calculate position relative to group
        const relativeX = node.position.x - groupX;
        const relativeY = node.position.y - groupY;
        
        return {
          ...node,
          position: { x: relativeX, y: relativeY },
          parentId: groupId,
          extent: 'parent' as const,
          expandParent: true,
          // Increase zIndex so children render above parent
          zIndex: 1,
        };
      }
      return node;
    });

    // Add the group node at the beginning (so it renders first/behind)
    setRfNodes([groupNode, ...updatedNodes]);

    // Add group to visible nodes
    setVisibleNodeIds(prev => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });

    // Clear selection after grouping
    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setSelectedChildrenByNode({});

    console.log('Created group:', groupId, 'with nodes:', Array.from(selectedNodeIds));
  }, [selectedNodeIds, rfNodes, setRfNodes, setVisibleNodeIds, handleGroupResize, handleGroupToggleCollapse]);

  // Ungroup nodes - remove parent-child relationship
  const handleUngroupNodes = useCallback((groupId: string) => {
    const groupNode = rfNodes.find(n => n.id === groupId);
    if (!groupNode) return;

    // Find all child nodes of this group
    const childNodes = rfNodes.filter(n => n.parentId === groupId);
    
    // Update nodes: convert relative positions back to absolute and remove parent reference
    const updatedNodes = rfNodes
      .filter(n => n.id !== groupId) // Remove the group node
      .map(node => {
        if (node.parentId === groupId) {
          // Convert back to absolute position
          const absoluteX = groupNode.position.x + node.position.x;
          const absoluteY = groupNode.position.y + node.position.y;
          
          // Remove parent reference
          const { parentId, extent, expandParent, zIndex, ...rest } = node as any;
          return {
            ...rest,
            position: { x: absoluteX, y: absoluteY },
          };
        }
        return node;
      });

    setRfNodes(updatedNodes);

    // Remove group from visible nodes
    setVisibleNodeIds(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });

    console.log('Ungrouped:', groupId, 'released nodes:', childNodes.map(n => n.id));
  }, [rfNodes, setRfNodes, setVisibleNodeIds]);

  const handleDropNodes = useCallback(() => {
    // TODO: Implement node removal functionality
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
  const demoMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Close demo menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDemoMenu && demoMenuButtonRef.current && !demoMenuButtonRef.current.contains(event.target as HTMLElement)) {
        setShowDemoMenu(false);
      }
    };
    
    if (showDemoMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDemoMenu]);

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

  // Handle add node from catalog (click or drop)
  const handleAddNodeFromCatalog = useCallback(
    (node: LineageNode, position?: { x: number; y: number }) => {
      // Check if node is already on the canvas
      if (visibleNodeIds.has(node.id)) {
        return;
      }

      // Determine position - use provided position or center
      let nodePosition;
      if (position) {
        nodePosition = position;
      } else {
        const viewport = getViewport();
        nodePosition = {
          x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
          y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
        };
      }

      // Calculate correct expansion state based on visible upstream/downstream nodes
      const allEdges = [...ALL_EDGES, ...ALL_CATALOG_EDGES];
      const upstreamNodes = allEdges.filter(e => e.target === node.id).map(e => e.source);
      const downstreamNodes = allEdges.filter(e => e.source === node.id).map(e => e.target);
      
      const upstreamVisible = upstreamNodes.some(id => visibleNodeIds.has(id));
      const downstreamVisible = downstreamNodes.some(id => visibleNodeIds.has(id));

      // Create the new node
      const newRfNode = makeRfNode({
        ...node,
        upstreamExpanded: upstreamVisible,
        downstreamExpanded: downstreamVisible,
      });
      newRfNode.position = nodePosition;

      // Add to visible nodes
      setVisibleNodeIds(prev => new Set([...prev, node.id]));

      // Update dynamic expansion system with new visible nodes
      const newVisibleIds = new Set([...visibleNodeIds, node.id]);
      dynamicExpansion.updateVisibleNodes(newVisibleIds);

      // Add to ReactFlow
      setRfNodes(prev => [...prev, newRfNode as any]);

      // Update expansion tracking state if needed
      if (upstreamVisible) {
        const upstreamNodeIds = new Set(upstreamNodes.filter(id => visibleNodeIds.has(id)));
        setExpandedUpstreamByNode(prev => ({
          ...prev,
          [node.id]: upstreamNodeIds
        }));
        // Also update dynamic expansion system
        dynamicExpansion.markUpstreamExpanded(node.id, upstreamNodeIds);
      }
      if (downstreamVisible) {
        const downstreamNodeIds = new Set(downstreamNodes.filter(id => visibleNodeIds.has(id)));
        setExpandedDownstreamByNode(prev => ({
          ...prev,
          [node.id]: downstreamNodeIds
        }));
        // Also update dynamic expansion system
        dynamicExpansion.markDownstreamExpanded(node.id, downstreamNodeIds);
      }

      // Build edges for this new node
      const newEdges = allEdges
        .filter(edge =>
          (edge.source === node.id && visibleNodeIds.has(edge.target)) ||
          (edge.target === node.id && visibleNodeIds.has(edge.source))
        )
        .map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'custom',
          sourceHandle: `${edge.source}-main-out`,
          targetHandle: `${edge.target}-main-in`,
          data: { relation: edge.relation },
          animated: false,
        }));

      if (newEdges.length > 0) {
        setRfEdges(prev => [...prev, ...newEdges as any]);
      }

    },
    [visibleNodeIds, setVisibleNodeIds, setRfNodes, setRfEdges, getViewport, makeRfNode, dynamicExpansion]
  );

  // Handle add multiple nodes from schema
  const handleAddSchemaFromCatalog = useCallback(
    async (schemaObjects: LineageNode[]) => {
      // Filter out nodes that are already on the canvas
      const newNodes = schemaObjects.filter(node => !visibleNodeIds.has(node.id));
      
      if (newNodes.length === 0) {
        return;
      }

      // Calculate correct expansion state for each node
      const allEdges = [...ALL_EDGES, ...ALL_CATALOG_EDGES];
      const allNewNodeIds = new Set(newNodes.map(n => n.id));
      const allVisibleNodeIds = new Set([...visibleNodeIds, ...allNewNodeIds]);

      // Create ReactFlow nodes with correct expansion state
      const newRfNodes = newNodes.map(node => {
        const upstreamNodes = allEdges.filter(e => e.target === node.id).map(e => e.source);
        const downstreamNodes = allEdges.filter(e => e.source === node.id).map(e => e.target);
        
        const upstreamVisible = upstreamNodes.some(id => allVisibleNodeIds.has(id));
        const downstreamVisible = downstreamNodes.some(id => allVisibleNodeIds.has(id));

        return makeRfNode({
          ...node,
          upstreamExpanded: upstreamVisible,
          downstreamExpanded: downstreamVisible,
        });
      });

      // Find edges between the new nodes and existing visible nodes
      const newEdges = allEdges
        .filter(edge => {
          const sourceVisible = visibleNodeIds.has(edge.source) || newNodes.some(n => n.id === edge.source);
          const targetVisible = visibleNodeIds.has(edge.target) || newNodes.some(n => n.id === edge.target);
          return sourceVisible && targetVisible;
        })
        .map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'custom',
          sourceHandle: `${edge.source}-main-out`,
          targetHandle: `${edge.target}-main-in`,
          data: { relation: edge.relation },
          animated: false,
        }));

      // Add all new nodes to visible set
      const newVisibleNodeIds = new Set([...visibleNodeIds, ...newNodes.map(n => n.id)]);
      setVisibleNodeIds(newVisibleNodeIds);

      // Update dynamic expansion system with new visible nodes
      dynamicExpansion.updateVisibleNodes(newVisibleNodeIds);

      // Add new nodes to ReactFlow
      setRfNodes(prev => [...prev, ...newRfNodes as any]);

      // Update expansion tracking state for nodes that have visible upstream/downstream
      newRfNodes.forEach(rfNode => {
        const nodeId = rfNode.id;
        const upstreamNodes = allEdges.filter(e => e.target === nodeId).map(e => e.source);
        const downstreamNodes = allEdges.filter(e => e.source === nodeId).map(e => e.target);
        
        const upstreamVisible = upstreamNodes.some(id => newVisibleNodeIds.has(id));
        const downstreamVisible = downstreamNodes.some(id => newVisibleNodeIds.has(id));

        if (upstreamVisible) {
          const upstreamNodeIds = new Set(upstreamNodes.filter(id => newVisibleNodeIds.has(id)));
          setExpandedUpstreamByNode(prev => ({
            ...prev,
            [nodeId]: upstreamNodeIds
          }));
          // Also update dynamic expansion system
          dynamicExpansion.markUpstreamExpanded(nodeId, upstreamNodeIds);
        }
        if (downstreamVisible) {
          const downstreamNodeIds = new Set(downstreamNodes.filter(id => newVisibleNodeIds.has(id)));
          setExpandedDownstreamByNode(prev => ({
            ...prev,
            [nodeId]: downstreamNodeIds
          }));
          // Also update dynamic expansion system
          dynamicExpansion.markDownstreamExpanded(nodeId, downstreamNodeIds);
        }
      });

      // Add new edges to ReactFlow
      if (newEdges.length > 0) {
        setRfEdges(prev => [...prev, ...newEdges as any]);
      }

      // Apply ELK layout to all visible nodes
      const allVisibleRfNodes = [...rfNodes, ...newRfNodes];
      const allVisibleEdges = [...rfEdges, ...newEdges];
      
      try {
        const { elkLayout } = await import('./lib/elkLayout');
        const layoutedNodes = await elkLayout(allVisibleRfNodes, allVisibleEdges, 'RIGHT');
        setRfNodes(layoutedNodes as any);
        // Pan to center nodes without changing zoom (keep at 100%)
        setTimeout(() => fitView({ padding: 0.15, duration: 300, minZoom: 1, maxZoom: 1 }), 150);
      } catch (error) {
        console.error('Error applying ELK layout:', error);
      }

    },
    [visibleNodeIds, setVisibleNodeIds, setRfNodes, setRfEdges, rfNodes, rfEdges, makeRfNode, dynamicExpansion, fitView]
  );

  // Handle drag over from catalog
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drop from catalog
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeDataStr = event.dataTransfer.getData('application/reactflow');
      if (!nodeDataStr) {
        return;
      }

      try {
        const node: LineageNode = JSON.parse(nodeDataStr);
        
        // Get the drop position in flow coordinates
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        handleAddNodeFromCatalog(node, position);
      } catch (error) {
        // Silently handle drop parsing errors
      }
    },
    [screenToFlowPosition, handleAddNodeFromCatalog]
  );

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
        {/* Main ReactFlow Container */}
        <div 
          ref={reactFlowWrapperRef} 
          style={{ flex: 1, position: 'relative' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={rfNodesWithHandlers.map(node => {
              if (node.type === 'group') {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    onResize: (width: number, height: number) => handleGroupResize(node.id, width, height),
                    onToggleCollapse: () => handleGroupToggleCollapse(node.id),
                    onRemoveGroup: () => handleRemoveGroup(node.id),
                    onSelectNode: () => setSelectedNodeIds(new Set([node.id])),
                  }
                };
              }
              return node;
            }) as any}
            edges={allEdges as any}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(p: Edge<EdgeData> | Connection) =>
              setRfEdges((eds) => addEdge({ ...p, animated: false }, eds))
            }
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes as any}
            proOptions={{ hideAttribution: true }}
            // defaultEdgeOptions={{ animated: true, style: { cursor: 'pointer' } }}
            defaultEdgeOptions={{ animated: false }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            onMoveEnd={(_, viewport) => setCurrentZoom(viewport.zoom)}
          >
            <Background />
            <Controls />
            
            {/* Debug: Zoom Level Display */}
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 60,
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#00ff00',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'monospace',
                zIndex: 1000,
              }}
            >
              Zoom: {(currentZoom * 100).toFixed(0)}%
            </div>
            
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

            {/* Catalog Button - Top Left */}
            <RFPanel position="top-left">
              {!showCatalog && (
                <Button
                  variant="secondary"
                  size="md"
                  level="reactflow"
                  onClick={() => setShowCatalog(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M8.36035 1.00879C12.0588 1.19647 15.0008 4.25493 15.001 8L14.9912 8.36035C14.8035 12.0588 11.7451 15.0008 8 15.001L7.63965 14.9912C3.94127 14.8035 1.00026 11.745 1 8C1.00013 4.13407 4.13407 0.999155 8 0.999023L8.36035 1.00879ZM5.80664 10.75C5.96371 11.4164 6.17313 12.0093 6.41992 12.5029C6.96354 13.5899 7.53888 13.9544 7.9248 13.9961L8 14.001C8.38368 14.0009 9.00093 13.663 9.58105 12.5029C9.82785 12.0093 10.0375 11.4165 10.1943 10.75H5.80664ZM2.66797 10.75C3.35164 12.0729 4.51115 13.1099 5.92188 13.6309C5.42438 12.895 5.02768 11.9023 4.78125 10.75H2.66797ZM11.2188 10.75C10.9725 11.9016 10.5761 12.894 10.0791 13.6299C11.4893 13.1088 12.6484 12.0724 13.332 10.75H11.2188ZM2.22363 6.375C2.07858 6.89177 2.00002 7.43689 2 8C2.00005 8.60882 2.09114 9.19628 2.25977 9.75H4.61035C4.53835 9.19066 4.50002 8.60428 4.5 8C4.50001 7.44071 4.53374 6.89638 4.5957 6.375H2.22363ZM5.60254 6.375C5.53618 6.88953 5.50001 7.43424 5.5 8C5.50002 8.61204 5.543 9.19875 5.62012 9.75H10.3799C10.4569 9.19874 10.5 8.61202 10.5 8C10.5 7.43424 10.4637 6.88952 10.3975 6.375H5.60254ZM11.4043 6.375C11.4663 6.89637 11.5 7.44072 11.5 8C11.5 8.60425 11.4616 9.19066 11.3896 9.75H13.7402C13.9089 9.19625 14.0009 8.60885 14.001 8C14.001 7.43686 13.9215 6.89179 13.7764 6.375H11.4043ZM5.9209 2.36914C4.46603 2.90653 3.27729 3.99232 2.60352 5.375H4.75488C4.9988 4.16971 5.40569 3.13153 5.9209 2.36914ZM8 2C7.61634 2.00007 7.00003 2.33711 6.41992 3.49707C6.15778 4.02144 5.93801 4.65728 5.77832 5.375H10.2227C10.0632 4.65727 9.84319 4.02145 9.58105 3.49707C9.00092 2.33691 8.38369 2.00009 8 2ZM10.0791 2.36914C10.5942 3.1315 11.0002 4.16983 11.2441 5.375H13.3975C12.7236 3.99225 11.5341 2.90659 10.0791 2.36914Z" fill="#5D6A85"/>
                  </svg>
                  Catalog
                </Button>
              )}
            </RFPanel>
            
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
                  onClick={() => {
                    setAutoLayoutEnabled(!autoLayoutEnabled);
                    if (!autoLayoutEnabled) {
                      // Trigger layout immediately when enabling and center the view
                      setTimeout(() => applyAutoLayout(true), 50);
                    }
                  }}
                >
                  {autoLayoutEnabled ? 'Auto Layout: On' : 'Auto Layout: Off'}
                </Button>
                <Button 
                  variant="secondary"
                  size="md"
                  level="reactflow"
                  onClick={() => setSourceGroupsEnabled(!sourceGroupsEnabled)}
                >
                  {sourceGroupsEnabled ? 'Source Groups: On' : 'Source Groups: Off'}
                </Button>
                {!autoLayoutEnabled && (
                  <Button 
                    variant="secondary" 
                    size="md"
                    level="reactflow"
                    onClick={tidyUpNodes}
                  >
                    Tidy Up
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={resetGraph}
                >
                  Reset
                </Button>
                
                {/* Demo Menu Overflow Button */}
                <Button 
                  ref={demoMenuButtonRef}
                  variant="secondary" 
                  size="md"
                  level="reactflow"
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  style={{ 
                    backgroundColor: showDemoMenu ? '#e5e7eb' : undefined,
                    border: '1px solid #d1d5db'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="3" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="13" cy="8" r="1.5" />
                  </svg>
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
                  
                  {/* Demo Menu Popover */}
                  {showDemoMenu && (
                    <div
                      className="overflow-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        zIndex: 10000,
                        minWidth: '180px',
                        backgroundColor: 'white',
                        border: '2px solid #ef4444', // Red border for debugging
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        pointerEvents: 'auto',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div 
                        className="overflow-menu-item"
                        onClick={() => {
                          onDemoModeChange?.('basic');
                          setShowDemoMenu(false);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}>
                          <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="currentColor"/>
                        </svg>
                        Basic Demo
                      </div>
                      <div 
                        className="overflow-menu-item"
                        onClick={() => {
                          onDemoModeChange?.('advanced');
                          setShowDemoMenu(false);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}>
                          <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="currentColor"/>
                        </svg>
                        Advanced Demo
                      </div>
                      <div 
                        className="overflow-menu-item"
                        onClick={() => {
                          onDemoModeChange?.('dynamic');
                          setShowDemoMenu(false);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}>
                          <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="currentColor"/>
                        </svg>
                        Dynamic Relationships
                      </div>
                    </div>
                  )}
                </div>
              )}
            </RFPanel>
          </ReactFlow>
        </div>
        
        {/* Drawer - always open side panel */}
        <Drawer
          title={drawerNode ? (drawerNode.data.focusedChild ? 'Column Details' : 'Object') : drawerEdge ? 'Relationship' : 'Details'}
          isOpen={true}
          onClose={closeDrawer}
        >
          {!drawerNode && !drawerEdge ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>No selection</div>
              <div style={{ fontSize: 13 }}>Click on a node or edge to view details</div>
            </div>
          ) : drawerNode && drawerNode.data.focusedChild ? (
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

        {/* Catalog Panel */}
        <CatalogPanel
          isOpen={showCatalog}
          onClose={() => setShowCatalog(false)}
          onAddNode={handleAddNodeFromCatalog}
          onAddSchema={handleAddSchemaFromCatalog}
          onDragStart={() => {}}
        />

      </div>
    </>
  );
}

interface GraphViewProps {
  onDemoModeChange?: (mode: 'basic' | 'advanced' | 'dynamic') => void;
}

export function GraphView({ onDemoModeChange }: GraphViewProps = {}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className={container.root}>
        <ReactFlowProvider>
          <GraphProvider>
            <LineageCanvasInner onDemoModeChange={onDemoModeChange} />
          </GraphProvider>
        </ReactFlowProvider>
      </div>

    </div>
  );
}