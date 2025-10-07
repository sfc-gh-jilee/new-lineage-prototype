import { useState, useCallback, useEffect } from 'react';
import { GraphStateManager, GraphState, NodeState, EdgeState } from '../lib/graphState';
import { LineageNode, LineageEdge } from '../lib/types';
import { ALL_CATALOG_NODES, ALL_CATALOG_EDGES } from '../lib/catalogData';
import { NODE_BY_ID, ALL_EDGES } from '../lib/mockData';

// Create combined node lookup
const ALL_NODE_BY_ID = new Map(NODE_BY_ID);
ALL_CATALOG_NODES.forEach(node => {
  ALL_NODE_BY_ID.set(node.id, node);
});

// Create combined edge list
const ALL_EDGES_COMBINED = [...ALL_EDGES, ...ALL_CATALOG_EDGES];

export function useGraphState() {
  const [stateManager] = useState(() => new GraphStateManager(ALL_NODE_BY_ID, ALL_EDGES_COMBINED));
  const [state, setState] = useState<GraphState>(stateManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  
  // Force re-render when state changes
  const forceUpdate = useCallback(() => {
    setState({ ...stateManager.getState() });
  }, [stateManager]);
  
  // Node operations
  const addNode = useCallback((node: LineageNode, position?: { x: number; y: number }) => {
    stateManager.addNode(node, position);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const removeNode = useCallback((nodeId: string) => {
    stateManager.removeNode(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    stateManager.updateNodePosition(nodeId, position);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const updateNodeStates = useCallback((nodeId: string, states: Set<NodeState>) => {
    const node = stateManager.getState().nodes.get(nodeId);
    if (node) {
      node.states = states;
      stateManager.updateLastModified();
      forceUpdate();
    }
  }, [stateManager, forceUpdate]);
  
  // Edge operations
  const addEdge = useCallback((edge: LineageEdge) => {
    stateManager.addEdge(edge);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const removeEdge = useCallback((edgeId: string) => {
    stateManager.removeEdge(edgeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const updateEdgeStates = useCallback((edgeId: string, states: Set<EdgeState>) => {
    const edge = stateManager.getState().edges.get(edgeId);
    if (edge) {
      edge.states = states;
      stateManager.updateLastModified();
      forceUpdate();
    }
  }, [stateManager, forceUpdate]);
  
  // Selection operations
  const selectNode = useCallback((nodeId: string) => {
    stateManager.selectNode(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const deselectNode = useCallback((nodeId: string) => {
    stateManager.deselectNode(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const selectNodes = useCallback((nodeIds: string[]) => {
    stateManager.selectNodes(nodeIds);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const clearSelection = useCallback(() => {
    stateManager.clearSelection();
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const focusNode = useCallback((nodeId: string) => {
    stateManager.focusNode(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const unfocusNode = useCallback(() => {
    stateManager.unfocusNode();
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  // Relationship operations
  const getAvailableUpstreamNodes = useCallback((nodeId: string) => {
    return stateManager.getAvailableUpstreamNodes(nodeId);
  }, [stateManager]);
  
  const getAvailableDownstreamNodes = useCallback((nodeId: string) => {
    return stateManager.getAvailableDownstreamNodes(nodeId);
  }, [stateManager]);
  
  const expandUpstream = useCallback((nodeId: string) => {
    stateManager.expandUpstream(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const expandDownstream = useCallback((nodeId: string) => {
    stateManager.expandDownstream(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const collapseUpstream = useCallback((nodeId: string) => {
    const node = stateManager.getState().nodes.get(nodeId);
    if (node) {
      node.states.delete('expanded-upstream');
      
      // Remove upstream nodes that were added by expansion
      const upstreamToRemove: string[] = [];
      stateManager.getState().nodes.forEach((n, id) => {
        if (n.downstreamNodes.has(nodeId) && n.states.has('expanded-upstream')) {
          upstreamToRemove.push(id);
        }
      });
      
      upstreamToRemove.forEach(id => {
        stateManager.removeNode(id);
      });
      
      stateManager.updateLastModified();
      forceUpdate();
    }
  }, [stateManager, forceUpdate]);
  
  const collapseDownstream = useCallback((nodeId: string) => {
    const node = stateManager.getState().nodes.get(nodeId);
    if (node) {
      node.states.delete('expanded-downstream');
      
      // Remove downstream nodes that were added by expansion
      const downstreamToRemove: string[] = [];
      stateManager.getState().nodes.forEach((n, id) => {
        if (n.upstreamNodes.has(nodeId) && n.states.has('expanded-downstream')) {
          downstreamToRemove.push(id);
        }
      });
      
      downstreamToRemove.forEach(id => {
        stateManager.removeNode(id);
      });
      
      stateManager.updateLastModified();
      forceUpdate();
    }
  }, [stateManager, forceUpdate]);
  
  // Graph operations
  const saveState = useCallback((name?: string) => {
    return stateManager.saveState(name);
  }, [stateManager]);
  
  const loadState = useCallback(() => {
    setIsLoading(true);
    stateManager.loadState();
    forceUpdate();
    setIsLoading(false);
  }, [stateManager, forceUpdate]);
  
  const loadStateById = useCallback((stateId: string) => {
    setIsLoading(true);
    stateManager.loadStateById(stateId);
    forceUpdate();
    setIsLoading(false);
  }, [stateManager, forceUpdate]);
  
  const getSavedStates = useCallback(() => {
    return stateManager.getSavedStates();
  }, [stateManager]);
  
  const deleteSavedState = useCallback((stateId: string) => {
    stateManager.deleteSavedState(stateId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const exportState = useCallback(() => {
    return stateManager.exportState();
  }, [stateManager]);
  
  const exportStateAsJSON = useCallback(() => {
    return stateManager.exportStateAsJSON();
  }, [stateManager]);
  
  const importState = useCallback((state: GraphState) => {
    stateManager.importState(state);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const importStateFromJSON = useCallback((jsonString: string) => {
    stateManager.importStateFromJSON(jsonString);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const generateShareableURL = useCallback(() => {
    return stateManager.generateShareableURL();
  }, [stateManager]);
  
  // Advanced filtering and search
  const searchNodes = useCallback((query: string) => {
    return stateManager.searchNodes(query);
  }, [stateManager]);
  
  const applyFilters = useCallback((filters: {
    searchQuery?: string;
    nodeTypes?: any[];
    schemas?: string[];
    databases?: string[];
    qualityRange?: { min: number; max: number };
  }) => {
    return stateManager.applyFilters(filters);
  }, [stateManager]);
  
  const getFilterOptions = useCallback(() => {
    return stateManager.getFilterOptions();
  }, [stateManager]);
  
  // Dynamic relationship management
  const refreshNodeRelationships = useCallback((nodeId: string) => {
    stateManager.refreshNodeRelationships(nodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const refreshAllRelationships = useCallback(() => {
    stateManager.refreshAllRelationships();
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const updateNodeMetadata = useCallback((nodeId: string, metadata: any) => {
    stateManager.updateNodeMetadata(nodeId, metadata);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  // Group node operations
  const addGroupNode = useCallback((groupNodeId: string, parentNodeId: string, direction: 'up' | 'down', groupedNodeIds: string[], position: { x: number; y: number }) => {
    stateManager.addGroupNode(groupNodeId, parentNodeId, direction, groupedNodeIds, position);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const removeGroupNode = useCallback((groupNodeId: string) => {
    stateManager.removeGroupNode(groupNodeId);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const updateGroupNode = useCallback((groupNodeId: string, groupedNodeIds: string[]) => {
    stateManager.updateGroupNode(groupNodeId, groupedNodeIds);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  const getGroupNodes = useCallback(() => {
    return stateManager.getGroupNodes();
  }, [stateManager]);
  
  const getGroupNodesForParent = useCallback((parentNodeId: string) => {
    return stateManager.getGroupNodesForParent(parentNodeId);
  }, [stateManager]);
  
  // View operations
  const updateViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    stateManager.updateViewport(viewport);
    forceUpdate();
  }, [stateManager, forceUpdate]);
  
  // Get computed values
  const getVisibleNodes = useCallback(() => {
    return stateManager.getVisibleNodes();
  }, [stateManager]);
  
  const getVisibleEdges = useCallback(() => {
    return stateManager.getVisibleEdges();
  }, [stateManager]);
  
  const getSelectedNodes = useCallback(() => {
    return Array.from(state.selectedNodeIds).map(id => state.nodes.get(id)).filter(Boolean);
  }, [state]);
  
  const getSelectedEdges = useCallback(() => {
    return Array.from(state.selectedEdgeIds).map(id => state.edges.get(id)).filter(Boolean);
  }, [state]);
  
  const getFocusedNode = useCallback(() => {
    return state.focusedNodeId ? state.nodes.get(state.focusedNodeId) : undefined;
  }, [state]);
  
  const getFocusedEdge = useCallback(() => {
    return state.focusedEdgeId ? state.edges.get(state.focusedEdgeId) : undefined;
  }, [state]);
  
  // Initialize with saved state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);
  
  return {
    // State
    state,
    isLoading,
    
    // Computed values
    visibleNodes: getVisibleNodes(),
    visibleEdges: getVisibleEdges(),
    selectedNodes: getSelectedNodes(),
    selectedEdges: getSelectedEdges(),
    focusedNode: getFocusedNode(),
    focusedEdge: getFocusedEdge(),
    
    // Node operations
    addNode,
    removeNode,
    updateNodePosition,
    updateNodeStates,
    
    // Edge operations
    addEdge,
    removeEdge,
    updateEdgeStates,
    
    // Selection operations
    selectNode,
    deselectNode,
    selectNodes,
    clearSelection,
    focusNode,
    unfocusNode,
    
    // Relationship operations
    getAvailableUpstreamNodes,
    getAvailableDownstreamNodes,
    expandUpstream,
    expandDownstream,
    collapseUpstream,
    collapseDownstream,
    
    // Graph operations
    saveState,
    loadState,
    loadStateById,
    getSavedStates,
    deleteSavedState,
    exportState,
    exportStateAsJSON,
    importState,
    importStateFromJSON,
    generateShareableURL,
    
    // Advanced filtering and search
    searchNodes,
    applyFilters,
    getFilterOptions,
    
    // Dynamic relationship management
    refreshNodeRelationships,
    refreshAllRelationships,
    updateNodeMetadata,
    
    // Group node operations
    addGroupNode,
    removeGroupNode,
    updateGroupNode,
    getGroupNodes,
    getGroupNodesForParent,
    
    // View operations
    updateViewport,
    
    // Direct access to state manager for advanced operations
    stateManager
  };
}
