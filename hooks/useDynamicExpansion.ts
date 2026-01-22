import { useCallback } from 'react';
import { dynamicRelationshipManager } from '../lib/dynamicRelationships';
import type { LineageNode, LineageEdge } from '../lib/types';

// Hook for managing dynamic up/downstream expansion
export function useDynamicExpansion() {
  
  // Initialize the relationship manager with all available nodes and edges
  const initializeRelationships = useCallback((nodes: LineageNode[], edges: LineageEdge[]) => {
    dynamicRelationshipManager.addNodes(nodes);
    dynamicRelationshipManager.addEdges(edges);
  }, []);

  // Update visible nodes in the relationship manager
  const updateVisibleNodes = useCallback((visibleNodeIds: Set<string>) => {
    dynamicRelationshipManager.setVisibleNodes(visibleNodeIds);
  }, []);

  // Get expansion state for a node
  const getExpansionState = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.getExpansionState(nodeId);
  }, []);

  // Expand upstream for a node
  const expandUpstream = useCallback((nodeId: string) => {
    const nodesToAdd = dynamicRelationshipManager.getUpstreamNodesToAdd(nodeId);
    const edgesToAdd = dynamicRelationshipManager.getUpstreamEdgesToAdd(nodeId);
    
    // Mark as expanded
    const expandedNodeIds = new Set(nodesToAdd.map(n => n.id));
    dynamicRelationshipManager.markUpstreamExpanded(nodeId, expandedNodeIds);
    
    return {
      nodesToAdd,
      edgesToAdd,
      expandedNodeIds: Array.from(expandedNodeIds)
    };
  }, []);

  // Expand downstream for a node
  const expandDownstream = useCallback((nodeId: string) => {
    const nodesToAdd = dynamicRelationshipManager.getDownstreamNodesToAdd(nodeId);
    const edgesToAdd = dynamicRelationshipManager.getDownstreamEdgesToAdd(nodeId);
    
    // Mark as expanded
    const expandedNodeIds = new Set(nodesToAdd.map(n => n.id));
    dynamicRelationshipManager.markDownstreamExpanded(nodeId, expandedNodeIds);
    
    return {
      nodesToAdd,
      edgesToAdd,
      expandedNodeIds: Array.from(expandedNodeIds)
    };
  }, []);

  // Collapse upstream for a node
  const collapseUpstream = useCallback((nodeId: string) => {
    const nodesToRemove = dynamicRelationshipManager.getUpstreamNodesToRemove(nodeId);
    
    // Mark as collapsed
    dynamicRelationshipManager.markUpstreamCollapsed(nodeId);
    
    return {
      nodesToRemove
    };
  }, []);

  // Collapse downstream for a node
  const collapseDownstream = useCallback((nodeId: string) => {
    const nodesToRemove = dynamicRelationshipManager.getDownstreamNodesToRemove(nodeId);
    
    // Mark as collapsed
    dynamicRelationshipManager.markDownstreamCollapsed(nodeId);
    
    return {
      nodesToRemove
    };
  }, []);

  // Check if a node has upstream connections
  const hasUpstream = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.hasUpstream(nodeId);
  }, []);

  // Check if a node has downstream connections
  const hasDownstream = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.hasDownstream(nodeId);
  }, []);

  // Check if a node has visible upstream connections
  const hasVisibleUpstream = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.hasVisibleUpstream(nodeId);
  }, []);

  // Check if a node has visible downstream connections
  const hasVisibleDownstream = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.hasVisibleDownstream(nodeId);
  }, []);

  // Get debug information for a node
  const getDebugInfo = useCallback((nodeId: string) => {
    return dynamicRelationshipManager.getDebugInfo(nodeId);
  }, []);

  // Update expansion state when nodes are added/removed
  const updateExpansionState = useCallback((nodeId: string) => {
    dynamicRelationshipManager.updateExpansionState(nodeId);
  }, []);

  // Mark node as expanded upstream
  const markUpstreamExpanded = useCallback((nodeId: string, expandedNodeIds: Set<string>) => {
    dynamicRelationshipManager.markUpstreamExpanded(nodeId, expandedNodeIds);
  }, []);

  // Mark node as expanded downstream
  const markDownstreamExpanded = useCallback((nodeId: string, expandedNodeIds: Set<string>) => {
    dynamicRelationshipManager.markDownstreamExpanded(nodeId, expandedNodeIds);
  }, []);

  return {
    initializeRelationships,
    updateVisibleNodes,
    getExpansionState,
    expandUpstream,
    expandDownstream,
    collapseUpstream,
    collapseDownstream,
    hasUpstream,
    hasDownstream,
    hasVisibleUpstream,
    hasVisibleDownstream,
    getDebugInfo,
    updateExpansionState,
    markUpstreamExpanded,
    markDownstreamExpanded,
  };
}
