import { LineageNode, LineageEdge, ObjType } from './types';

// Node states in the graph
export type NodeState = 'in-graph' | 'visible' | 'hidden' | 'selected' | 'focused' | 'expanded-upstream' | 'expanded-downstream' | 'group-node';

// Edge states in the graph  
export type EdgeState = 'in-graph' | 'visible' | 'hidden' | 'selected' | 'focused';

// Comprehensive node representation in graph state
export interface GraphNode {
  id: string;
  label: string;
  name: string; // full path like DW.SALES.ORDERS
  objType: ObjType;
  db: string;
  schema: string;
  
  // Position in the graph
  position: { x: number; y: number };
  
  // States
  states: Set<NodeState>;
  
  // Relationships (discovered dynamically)
  upstreamNodes: Set<string>; // node IDs that this node depends on
  downstreamNodes: Set<string>; // node IDs that depend on this node
  
  // Metadata
  metadata?: {
    qualityScore?: number;
    lastRefreshed?: string;
    rowCount?: number;
    sizeBytes?: number;
    owner?: string;
    description?: string;
    tags?: string[];
    errors?: number;
    warnings?: number;
    dataFreshness?: 'fresh' | 'stale' | 'outdated' | 'unknown';
    certificationStatus?: 'certified' | 'pending' | 'deprecated' | 'none';
    
    // Dynamic relationship discovery
    upstreamReferences?: string[]; // References to upstream nodes (IDs, names, or paths)
    downstreamReferences?: string[]; // References to downstream nodes (IDs, names, or paths)
    
    // Column-level lineage metadata
    columnLineage?: {
      [columnName: string]: {
        upstreamColumns?: string[]; // e.g., ["DW.SALES.ORDERS.ORDER_ID", "DW.CUSTOMERS.CUSTOMER_ID"]
        downstreamColumns?: string[]; // e.g., ["DW.ANALYTICS.ORDER_SUMMARY.ORDER_ID"]
        transformationType?: string; // e.g., "join", "aggregate", "filter"
        dataQuality?: number; // 0-100
      };
    };
    
    // Group node metadata
    isGroupNode?: boolean;
    parentNodeId?: string;
    direction?: 'upstream' | 'downstream';
    groupedNodeIds?: string[];
    groupSize?: number;
  };
  
  // Column metadata
  columnsMetadata?: any[];
}

// Comprehensive edge representation in graph state
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  
  // States
  states: Set<EdgeState>;
  
  // Metadata
  metadata?: {
    columnMapping?: Record<string, string>; // source column -> target column
    transformationType?: string;
    dataQuality?: number;
  };
}

// Complete graph state
export interface GraphState {
  // Core graph data
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  
  // Graph metadata
  metadata: {
    name?: string;
    description?: string;
    createdAt: number;
    lastModified: number;
    version: string;
  };
  
  // View state
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  
  // Selection state
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  focusedNodeId?: string;
  focusedEdgeId?: string;
  
  // Filter state
  filters: {
    nodeTypes?: ObjType[];
    schemas?: string[];
    databases?: string[];
    qualityScore?: { min: number; max: number };
  };
}

// Graph state operations
export interface GraphStateOperations {
  // Node operations
  addNode: (node: LineageNode, position?: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeStates: (nodeId: string, states: Set<NodeState>) => void;
  
  // Edge operations
  addEdge: (edge: LineageEdge) => void;
  removeEdge: (edgeId: string) => void;
  updateEdgeStates: (edgeId: string, states: Set<EdgeState>) => void;
  
  // Selection operations
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  selectNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  focusNode: (nodeId: string) => void;
  unfocusNode: () => void;
  
  // Relationship operations
  discoverUpstreamNodes: (nodeId: string) => Set<string>;
  discoverDownstreamNodes: (nodeId: string) => Set<string>;
  expandUpstream: (nodeId: string) => void;
  expandDownstream: (nodeId: string) => void;
  collapseUpstream: (nodeId: string) => void;
  collapseDownstream: (nodeId: string) => void;
  
  // Graph operations
  saveState: (name?: string) => void;
  loadState: (stateId: string) => void;
  exportState: () => GraphState;
  importState: (state: GraphState) => void;
  
  // View operations
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  fitToView: () => void;
}

// Graph state manager class
export class GraphStateManager {
  private state: GraphState;
  private allNodes: Map<string, LineageNode>; // All available nodes from catalog
  private allEdges: LineageEdge[]; // All available edges from catalog
  
  constructor(allNodes: Map<string, LineageNode>, allEdges: LineageEdge[]) {
    this.allNodes = allNodes;
    this.allEdges = allEdges;
    
    this.state = {
      nodes: new Map(),
      edges: new Map(),
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0'
      },
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      filters: {}
    };
  }
  
  // Get current state
  getState(): GraphState {
    return { ...this.state };
  }
  
  // Get nodes in graph
  getNodesInGraph(): GraphNode[] {
    return Array.from(this.state.nodes.values());
  }
  
  // Get edges in graph
  getEdgesInGraph(): GraphEdge[] {
    return Array.from(this.state.edges.values());
  }
  
  // Get visible nodes
  getVisibleNodes(): GraphNode[] {
    return this.getNodesInGraph().filter(node => 
      node.states.has('visible') || node.states.has('in-graph')
    );
  }
  
  // Get visible edges
  getVisibleEdges(): GraphEdge[] {
    return this.getEdgesInGraph().filter(edge => 
      edge.states.has('visible') || edge.states.has('in-graph')
    );
  }
  
  // Add node to graph
  addNode(node: LineageNode, position?: { x: number; y: number }): void {
    const graphNode: GraphNode = {
      id: node.id,
      label: node.label,
      name: node.name,
      objType: node.objType,
      db: (node as any).db,
      schema: (node as any).schema,
      position: position || { x: 0, y: 0 },
      states: new Set(['in-graph', 'visible']),
      upstreamNodes: new Set(),
      downstreamNodes: new Set(),
      metadata: (node as any).metadata,
      columnsMetadata: node.columnsMetadata
    };
    
    // Discover relationships
    this.discoverNodeRelationships(graphNode);
    
    this.state.nodes.set(node.id, graphNode);
    this.updateLastModified();
  }
  
  // Add group node to graph (special handling for group nodes)
  addGroupNode(groupNodeId: string, parentNodeId: string, direction: 'up' | 'down', groupedNodeIds: string[], position: { x: number; y: number }): void {
    const graphNode: GraphNode = {
      id: groupNodeId,
      label: `Group (${groupedNodeIds.length})`,
      name: `${parentNodeId}-group-${direction}`,
      objType: 'TABLE' as ObjType, // Treat group nodes as tables for now
      db: 'GROUP',
      schema: 'NODES',
      position,
      states: new Set(['in-graph', 'visible', 'group-node']),
      upstreamNodes: new Set(),
      downstreamNodes: new Set(),
      metadata: {
        isGroupNode: true,
        parentNodeId,
        direction,
        groupedNodeIds,
        groupSize: groupedNodeIds.length
      },
      columnsMetadata: []
    };
    
    this.state.nodes.set(groupNodeId, graphNode);
    this.updateLastModified();
  }
  
  // Remove node from graph
  removeNode(nodeId: string): void {
    this.state.nodes.delete(nodeId);
    
    // Remove edges connected to this node
    const edgesToRemove: string[] = [];
    this.state.edges.forEach((edge, edgeId) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgesToRemove.push(edgeId);
      }
    });
    
    edgesToRemove.forEach(edgeId => {
      this.state.edges.delete(edgeId);
    });
    
    // Remove from selection/focus
    this.state.selectedNodeIds.delete(nodeId);
    this.state.selectedEdgeIds.delete(nodeId);
    if (this.state.focusedNodeId === nodeId) {
      this.state.focusedNodeId = undefined;
    }
    
    this.updateLastModified();
  }
  
  // Remove group node and handle cleanup
  removeGroupNode(groupNodeId: string): void {
    const groupNode = this.state.nodes.get(groupNodeId);
    if (groupNode && groupNode.metadata?.isGroupNode) {
      // Remove the group node
      this.removeNode(groupNodeId);
      
      // Add the grouped nodes back to the graph if they're not already there
      const groupedNodeIds = groupNode.metadata.groupedNodeIds || [];
      groupedNodeIds.forEach((nodeId: string) => {
        if (!this.state.nodes.has(nodeId)) {
          // Find the original node data and add it back
          const originalNode = this.allNodes.get(nodeId);
          if (originalNode) {
            this.addNode(originalNode, { x: 0, y: 0 }); // Position will be updated by GraphView
          }
        }
      });
    }
  }
  
  // Update group node (when nodes are added/removed from group)
  updateGroupNode(groupNodeId: string, groupedNodeIds: string[]): void {
    const groupNode = this.state.nodes.get(groupNodeId);
    if (groupNode && groupNode.metadata?.isGroupNode) {
      groupNode.label = `Group (${groupedNodeIds.length})`;
      groupNode.metadata.groupedNodeIds = groupedNodeIds;
      groupNode.metadata.groupSize = groupedNodeIds.length;
      this.updateLastModified();
    }
  }
  
  // Get all group nodes
  getGroupNodes(): GraphNode[] {
    return this.getNodesInGraph().filter(node => node.metadata?.isGroupNode);
  }
  
  // Get group nodes for a specific parent node
  getGroupNodesForParent(parentNodeId: string): GraphNode[] {
    return this.getGroupNodes().filter(node => 
      node.metadata?.parentNodeId === parentNodeId
    );
  }
  
  // Discover relationships for a node dynamically from metadata
  private discoverNodeRelationships(node: GraphNode): void {
    const upstream = new Set<string>();
    const downstream = new Set<string>();
    
    // First, try to find relationships from node metadata
    if (node.metadata) {
      // Check for explicit upstream/downstream references in metadata
      if (node.metadata.upstreamReferences) {
        node.metadata.upstreamReferences.forEach(ref => {
          const upstreamNode = this.findNodeByReference(ref);
          if (upstreamNode) {
            upstream.add(upstreamNode.id);
          }
        });
      }
      
      if (node.metadata.downstreamReferences) {
        node.metadata.downstreamReferences.forEach(ref => {
          const downstreamNode = this.findNodeByReference(ref);
          if (downstreamNode) {
            downstream.add(downstreamNode.id);
          }
        });
      }
      
      // Check for column-level lineage in metadata
      if (node.metadata?.columnLineage) {
        Object.values(node.metadata.columnLineage).forEach(columnLineage => {
          if (columnLineage.upstreamColumns) {
            columnLineage.upstreamColumns.forEach((upstreamCol: string) => {
              const upstreamNode = this.findNodeByColumnReference(upstreamCol);
              if (upstreamNode) {
                upstream.add(upstreamNode.id);
              }
            });
          }
          
          if (columnLineage.downstreamColumns) {
            columnLineage.downstreamColumns.forEach(downstreamCol => {
              const downstreamNode = this.findNodeByColumnReference(downstreamCol);
              if (downstreamNode) {
                downstream.add(downstreamNode.id);
              }
            });
          }
        });
      }
      
      // Also check legacy columnsMetadata format
      if (node.columnsMetadata) {
        node.columnsMetadata.forEach(column => {
          if (column.upstreamColumns) {
            column.upstreamColumns.forEach((upstreamCol: string) => {
              const upstreamNode = this.findNodeByColumnReference(upstreamCol);
              if (upstreamNode) {
                upstream.add(upstreamNode.id);
              }
            });
          }
          
          if (column.downstreamColumns) {
            column.downstreamColumns.forEach(downstreamCol => {
              const downstreamNode = this.findNodeByColumnReference(downstreamCol);
              if (downstreamNode) {
                downstream.add(downstreamNode.id);
              }
            });
          }
        });
      }
    }
    
    // Fallback to hardcoded edges if no metadata relationships found
    if (upstream.size === 0 && downstream.size === 0) {
      this.allEdges.forEach(edge => {
        if (edge.target === node.id) {
          upstream.add(edge.source);
        }
        if (edge.source === node.id) {
          downstream.add(edge.target);
        }
      });
    }
    
    node.upstreamNodes = upstream;
    node.downstreamNodes = downstream;
  }
  
  // Find node by reference (supports various reference formats)
  private findNodeByReference(reference: string): LineageNode | null {
    // Try exact ID match first
    if (this.allNodes.has(reference)) {
      return this.allNodes.get(reference)!;
    }
    
    // Try to find by full path (e.g., "DW.SALES.ORDERS")
    for (const [id, node] of this.allNodes) {
      if (node.name === reference || id === reference) {
        return node;
      }
    }
    
    // Try to find by label match
    for (const [id, node] of this.allNodes) {
      if (node.label === reference) {
        return node;
      }
    }
    
    return null;
  }
  
  // Find node by column reference (e.g., "DW.SALES.ORDERS.ORDER_ID")
  private findNodeByColumnReference(columnRef: string): LineageNode | null {
    // Extract table reference from column reference
    const parts = columnRef.split('.');
    if (parts.length >= 3) {
      const tableRef = parts.slice(0, 3).join('.'); // e.g., "DW.SALES.ORDERS"
      return this.findNodeByReference(tableRef);
    }
    
    return null;
  }
  
  // Get available upstream nodes (not yet in graph)
  getAvailableUpstreamNodes(nodeId: string): LineageNode[] {
    const node = this.state.nodes.get(nodeId);
    if (!node) return [];
    
    const available: LineageNode[] = [];
    node.upstreamNodes.forEach(upstreamId => {
      if (!this.state.nodes.has(upstreamId)) {
        const upstreamNode = this.allNodes.get(upstreamId);
        if (upstreamNode) {
          available.push(upstreamNode);
        }
      }
    });
    
    return available;
  }
  
  // Get available downstream nodes (not yet in graph)
  getAvailableDownstreamNodes(nodeId: string): LineageNode[] {
    const node = this.state.nodes.get(nodeId);
    if (!node) return [];
    
    const available: LineageNode[] = [];
    node.downstreamNodes.forEach(downstreamId => {
      if (!this.state.nodes.has(downstreamId)) {
        const downstreamNode = this.allNodes.get(downstreamId);
        if (downstreamNode) {
          available.push(downstreamNode);
        }
      }
    });
    
    return available;
  }
  
  // Expand upstream (add upstream nodes to graph)
  expandUpstream(nodeId: string): void {
    const availableUpstream = this.getAvailableUpstreamNodes(nodeId);
    
    availableUpstream.forEach((upstreamNode, index) => {
      // Position upstream nodes to the left
      const position = {
        x: -300 - (index * 200),
        y: Math.random() * 200 - 100
      };
      
      this.addNode(upstreamNode, position);
      
      // Add edge
      const edge: LineageEdge = {
        id: `${upstreamNode.id}-${nodeId}`,
        source: upstreamNode.id,
        target: nodeId,
        relation: 'depends_on'
      };
      this.addEdge(edge);
    });
    
    // Mark node as expanded upstream
    const node = this.state.nodes.get(nodeId);
    if (node) {
      node.states.add('expanded-upstream');
    }
    
    this.updateLastModified();
  }
  
  // Expand downstream (add downstream nodes to graph)
  expandDownstream(nodeId: string): void {
    const availableDownstream = this.getAvailableDownstreamNodes(nodeId);
    
    availableDownstream.forEach((downstreamNode, index) => {
      // Position downstream nodes to the right
      const position = {
        x: 300 + (index * 200),
        y: Math.random() * 200 - 100
      };
      
      this.addNode(downstreamNode, position);
      
      // Add edge
      const edge: LineageEdge = {
        id: `${nodeId}-${downstreamNode.id}`,
        source: nodeId,
        target: downstreamNode.id,
        relation: 'feeds_into'
      };
      this.addEdge(edge);
    });
    
    // Mark node as expanded downstream
    const node = this.state.nodes.get(nodeId);
    if (node) {
      node.states.add('expanded-downstream');
    }
    
    this.updateLastModified();
  }
  
  // Add edge to graph
  addEdge(edge: LineageEdge): void {
    const graphEdge: GraphEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      states: new Set(['in-graph', 'visible']),
      metadata: {}
    };
    
    this.state.edges.set(edge.id, graphEdge);
    this.updateLastModified();
  }
  
  // Remove edge from graph
  removeEdge(edgeId: string): void {
    this.state.edges.delete(edgeId);
    this.state.selectedEdgeIds.delete(edgeId);
    if (this.state.focusedEdgeId === edgeId) {
      this.state.focusedEdgeId = undefined;
    }
    this.updateLastModified();
  }
  
  // Selection operations
  selectNode(nodeId: string): void {
    this.state.selectedNodeIds.add(nodeId);
    this.updateLastModified();
  }
  
  deselectNode(nodeId: string): void {
    this.state.selectedNodeIds.delete(nodeId);
    this.updateLastModified();
  }
  
  selectNodes(nodeIds: string[]): void {
    nodeIds.forEach(id => this.state.selectedNodeIds.add(id));
    this.updateLastModified();
  }
  
  clearSelection(): void {
    this.state.selectedNodeIds.clear();
    this.state.selectedEdgeIds.clear();
    this.updateLastModified();
  }
  
  focusNode(nodeId: string): void {
    this.state.focusedNodeId = nodeId;
    this.updateLastModified();
  }
  
  unfocusNode(): void {
    this.state.focusedNodeId = undefined;
    this.updateLastModified();
  }
  
  // Update node position
  updateNodePosition(nodeId: string, position: { x: number; y: number }): void {
    const node = this.state.nodes.get(nodeId);
    if (node) {
      node.position = position;
      this.updateLastModified();
    }
  }
  
  // Update viewport
  updateViewport(viewport: { x: number; y: number; zoom: number }): void {
    this.state.viewport = viewport;
    this.updateLastModified();
  }
  
  // Save state to localStorage with multiple states support
  saveState(name?: string): string {
    const stateId = `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stateToSave = {
      ...this.state,
      metadata: {
        ...this.state.metadata,
        id: stateId,
        name: name || `Graph State ${new Date().toLocaleString()}`,
        lastModified: Date.now()
      }
    };
    
    try {
      // Get existing saved states
      const existingStates = this.getSavedStates();
      
      // Add new state
      existingStates[stateId] = stateToSave;
      
      // Save back to localStorage
      localStorage.setItem('lineage-saved-states', JSON.stringify(existingStates, (key, value) => {
        // Convert Sets to Arrays for JSON serialization
        if (value instanceof Set) {
          return Array.from(value);
        }
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      }));
      
      // Also save as current state
      localStorage.setItem('lineage-current-state', JSON.stringify(stateToSave, (key, value) => {
        if (value instanceof Set) {
          return Array.from(value);
        }
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      }));
      
      console.log('💾 Graph state saved:', stateToSave.metadata.name, 'ID:', stateId);
      return stateId;
    } catch (error) {
      console.error('Failed to save graph state:', error);
      throw error;
    }
  }
  
  // Load current state from localStorage
  loadState(): void {
    try {
      const savedStateData = localStorage.getItem('lineage-current-state');
      if (savedStateData) {
        const parsedState = this.parseStateFromJSON(savedStateData);
        this.state = parsedState;
        console.log('📂 Current graph state loaded:', parsedState.metadata.name);
      }
    } catch (error) {
      console.error('Failed to load current graph state:', error);
    }
  }
  
  // Load specific state by ID
  loadStateById(stateId: string): void {
    try {
      const savedStates = this.getSavedStates();
      const stateToLoad = savedStates[stateId];
      if (stateToLoad) {
        this.state = this.parseStateFromJSON(JSON.stringify(stateToLoad));
        
        // Update current state
        localStorage.setItem('lineage-current-state', JSON.stringify(stateToLoad, (key, value) => {
          if (value instanceof Set) {
            return Array.from(value);
          }
          if (value instanceof Map) {
            return Object.fromEntries(value);
          }
          return value;
        }));
        
        console.log('📂 Graph state loaded:', stateToLoad.metadata.name);
      } else {
        console.error('State not found:', stateId);
      }
    } catch (error) {
      console.error('Failed to load graph state by ID:', error);
    }
  }
  
  // Get all saved states
  getSavedStates(): Record<string, GraphState> {
    try {
      const savedStatesData = localStorage.getItem('lineage-saved-states');
      if (savedStatesData) {
        const parsedStates = JSON.parse(savedStatesData);
        // Convert each state back to proper format
        const convertedStates: Record<string, GraphState> = {};
        Object.entries(parsedStates).forEach(([id, state]) => {
          convertedStates[id] = this.parseStateFromJSON(JSON.stringify(state));
        });
        return convertedStates;
      }
      return {};
    } catch (error) {
      console.error('Failed to get saved states:', error);
      return {};
    }
  }
  
  // Delete a saved state
  deleteSavedState(stateId: string): void {
    try {
      const savedStates = this.getSavedStates();
      delete savedStates[stateId];
      
      localStorage.setItem('lineage-saved-states', JSON.stringify(savedStates, (key, value) => {
        if (value instanceof Set) {
          return Array.from(value);
        }
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      }));
      
      console.log('🗑️ Saved state deleted:', stateId);
    } catch (error) {
      console.error('Failed to delete saved state:', error);
    }
  }
  
  // Parse state from JSON with proper type conversion
  private parseStateFromJSON(jsonString: string): GraphState {
    return JSON.parse(jsonString, (key, value) => {
      // Convert Arrays back to Sets and Objects back to Maps
      if (key === 'selectedNodeIds' || key === 'selectedEdgeIds' || key === 'states') {
        return new Set(value);
      }
      if (key === 'nodes' || key === 'edges') {
        return new Map(Object.entries(value));
      }
      if (key === 'upstreamNodes' || key === 'downstreamNodes') {
        return new Set(value);
      }
      return value;
    });
  }
  
  // Export state
  exportState(): GraphState {
    return { ...this.state };
  }
  
  // Import state
  importState(state: GraphState): void {
    this.state = { ...state };
    this.updateLastModified();
  }
  
  // Advanced filtering and search
  searchNodes(query: string): GraphNode[] {
    const lowerQuery = query.toLowerCase();
    return this.getVisibleNodes().filter(node => 
      node.label.toLowerCase().includes(lowerQuery) ||
      node.name.toLowerCase().includes(lowerQuery) ||
      node.metadata?.description?.toLowerCase().includes(lowerQuery) ||
      node.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  filterNodesByType(nodeTypes: ObjType[]): GraphNode[] {
    return this.getVisibleNodes().filter(node => nodeTypes.includes(node.objType));
  }
  
  filterNodesBySchema(schemas: string[]): GraphNode[] {
    return this.getVisibleNodes().filter(node => schemas.includes(node.schema));
  }
  
  filterNodesByDatabase(databases: string[]): GraphNode[] {
    return this.getVisibleNodes().filter(node => databases.includes(node.db));
  }
  
  filterNodesByQuality(qualityRange: { min: number; max: number }): GraphNode[] {
    return this.getVisibleNodes().filter(node => {
      const quality = node.metadata?.qualityScore || 0;
      return quality >= qualityRange.min && quality <= qualityRange.max;
    });
  }
  
  // Apply multiple filters
  applyFilters(filters: {
    searchQuery?: string;
    nodeTypes?: ObjType[];
    schemas?: string[];
    databases?: string[];
    qualityRange?: { min: number; max: number };
  }): GraphNode[] {
    let filteredNodes = this.getVisibleNodes();
    
    if (filters.searchQuery) {
      filteredNodes = this.searchNodes(filters.searchQuery);
    }
    
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter(node => filters.nodeTypes!.includes(node.objType));
    }
    
    if (filters.schemas && filters.schemas.length > 0) {
      filteredNodes = filteredNodes.filter(node => filters.schemas!.includes(node.schema));
    }
    
    if (filters.databases && filters.databases.length > 0) {
      filteredNodes = filteredNodes.filter(node => filters.databases!.includes(node.db));
    }
    
    if (filters.qualityRange) {
      filteredNodes = filteredNodes.filter(node => {
        const quality = node.metadata?.qualityScore || 0;
        return quality >= filters.qualityRange!.min && quality <= filters.qualityRange!.max;
      });
    }
    
    return filteredNodes;
  }
  
  // Get available filter options
  getFilterOptions(): {
    nodeTypes: ObjType[];
    schemas: string[];
    databases: string[];
    qualityRange: { min: number; max: number };
  } {
    const visibleNodes = this.getVisibleNodes();
    
    const nodeTypes = Array.from(new Set(visibleNodes.map(n => n.objType)));
    const schemas = Array.from(new Set(visibleNodes.map(n => n.schema)));
    const databases = Array.from(new Set(visibleNodes.map(n => n.db)));
    
    const qualityScores = visibleNodes
      .map(n => n.metadata?.qualityScore || 0)
      .filter(score => score > 0);
    
    const qualityRange = {
      min: qualityScores.length > 0 ? Math.min(...qualityScores) : 0,
      max: qualityScores.length > 0 ? Math.max(...qualityScores) : 100
    };
    
    return { nodeTypes, schemas, databases, qualityRange };
  }
  
  // State sharing capabilities
  exportStateAsJSON(): string {
    return JSON.stringify(this.state, (key, value) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    });
  }
  
  importStateFromJSON(jsonString: string): void {
    try {
      const importedState = this.parseStateFromJSON(jsonString);
      this.state = importedState;
      this.updateLastModified();
      console.log('📥 State imported successfully');
    } catch (error) {
      console.error('Failed to import state from JSON:', error);
      throw error;
    }
  }
  
  // Generate shareable URL (for future implementation)
  generateShareableURL(): string {
    const stateData = this.exportStateAsJSON();
    const encodedState = encodeURIComponent(stateData);
    return `${window.location.origin}${window.location.pathname}?state=${encodedState}`;
  }
  
  // Load state from URL (for future implementation)
  loadStateFromURL(urlParams: URLSearchParams): void {
    const stateParam = urlParams.get('state');
    if (stateParam) {
      try {
        const decodedState = decodeURIComponent(stateParam);
        this.importStateFromJSON(decodedState);
      } catch (error) {
        console.error('Failed to load state from URL:', error);
      }
    }
  }
  
  // Refresh relationships for a node (useful when metadata is updated)
  refreshNodeRelationships(nodeId: string): void {
    const node = this.state.nodes.get(nodeId);
    if (node) {
      this.discoverNodeRelationships(node);
      this.updateLastModified();
    }
  }
  
  // Refresh relationships for all nodes in the graph
  refreshAllRelationships(): void {
    this.state.nodes.forEach(node => {
      this.discoverNodeRelationships(node);
    });
    this.updateLastModified();
  }
  
  // Update node metadata and refresh relationships
  updateNodeMetadata(nodeId: string, metadata: Partial<GraphNode['metadata']>): void {
    const node = this.state.nodes.get(nodeId);
    if (node) {
      node.metadata = { ...node.metadata, ...metadata };
      this.discoverNodeRelationships(node); // Refresh relationships with new metadata
      this.updateLastModified();
    }
  }
  
  // Update last modified timestamp
  public updateLastModified(): void {
    this.state.metadata.lastModified = Date.now();
  }
}
