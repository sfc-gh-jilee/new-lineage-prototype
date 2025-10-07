import type { LineageNode, LineageEdge } from './types';

// Dynamic relationship manager for handling up/downstream expansion
export class DynamicRelationshipManager {
  private allNodes: Map<string, LineageNode> = new Map();
  private allEdges: Map<string, LineageEdge> = new Map();
  private visibleNodes: Set<string> = new Set();
  private expandedUpstream: Map<string, Set<string>> = new Map();
  private expandedDownstream: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeFromCatalog();
  }

  // Initialize with all available nodes and edges
  private initializeFromCatalog() {
    // This will be populated from catalog data
    // For now, we'll add nodes dynamically as they're discovered
  }

  // Add a node to the manager
  addNode(node: LineageNode): void {
    this.allNodes.set(node.id, node);
    console.log('🔗 DynamicRelationshipManager: Added node', node.id, node.label);
  }

  // Add multiple nodes at once
  addNodes(nodes: LineageNode[]): void {
    console.log('🔗 DynamicRelationshipManager: Adding', nodes.length, 'nodes');
    nodes.forEach(node => {
      this.addNode(node);
    });
  }

  // Add an edge to the manager
  addEdge(edge: LineageEdge): void {
    this.allEdges.set(edge.id, edge);
    console.log('🔗 DynamicRelationshipManager: Added edge', edge.id, edge.source, '->', edge.target);
  }

  // Add multiple edges at once
  addEdges(edges: LineageEdge[]): void {
    console.log('🔗 DynamicRelationshipManager: Adding', edges.length, 'edges');
    edges.forEach(edge => {
      this.addEdge(edge);
    });
  }

  // Set visible nodes (nodes currently in the graph)
  setVisibleNodes(nodeIds: Set<string>): void {
    this.visibleNodes = new Set(nodeIds);
    console.log('🔗 DynamicRelationshipManager: Set visible nodes', Array.from(nodeIds));
  }

  // Find node by various reference formats (ID, name, label, path)
  private findNodeByReference(reference: string): LineageNode | null {
    // Try exact ID match first
    if (this.allNodes.has(reference)) {
      return this.allNodes.get(reference)!;
    }

    // Try name match (full path)
    for (const node of this.allNodes.values()) {
      if (node.name === reference) {
        return node;
      }
    }

    // Try label match
    for (const node of this.allNodes.values()) {
      if (node.label === reference) {
        return node;
      }
    }

    // Try partial path match (e.g., "DW.SALES.ORDERS" matches "DW.SALES.ORDERS")
    for (const node of this.allNodes.values()) {
      if (node.name.includes(reference) || reference.includes(node.name)) {
        return node;
      }
    }

    return null;
  }

  // Find node by column reference (e.g., "DW.SALES.ORDERS.ORDER_ID")
  private findNodeByColumnReference(columnRef: string): LineageNode | null {
    // Extract table path from column reference
    const parts = columnRef.split('.');
    if (parts.length >= 3) {
      const tablePath = parts.slice(0, 3).join('.');
      return this.findNodeByReference(tablePath);
    }
    return null;
  }

  // Get all upstream nodes for a given node
  getUpstreamNodes(nodeId: string): LineageNode[] {
    const node = this.allNodes.get(nodeId);
    if (!node) {
      console.log('🔗 getUpstreamNodes: Node not found', nodeId);
      return [];
    }

    console.log('🔗 getUpstreamNodes: Finding upstream for', nodeId, node.label);
    const upstreamNodes: LineageNode[] = [];
    const processed = new Set<string>();

    // Helper function to recursively find upstream nodes
    const findUpstream = (currentNodeId: string) => {
      if (processed.has(currentNodeId)) return;
      processed.add(currentNodeId);

      const currentNode = this.allNodes.get(currentNodeId);
      if (!currentNode) return;

      console.log('🔗 findUpstream: Processing node', currentNodeId, currentNode.label);

      // Check metadata for upstream references
      const nodeWithMetadata = currentNode as any;
      if (nodeWithMetadata.metadata?.upstreamReferences) {
        console.log('🔗 findUpstream: Found metadata upstream references', nodeWithMetadata.metadata.upstreamReferences);
        nodeWithMetadata.metadata.upstreamReferences.forEach(ref => {
          const upstreamNode = this.findNodeByReference(ref);
          if (upstreamNode && !upstreamNodes.some(n => n.id === upstreamNode.id)) {
            console.log('🔗 findUpstream: Added upstream node from metadata', upstreamNode.id, upstreamNode.label);
            upstreamNodes.push(upstreamNode);
            findUpstream(upstreamNode.id); // Recursively find more upstream
          }
        });
      }

      // Check column lineage for upstream references
      if (nodeWithMetadata.metadata?.columnLineage) {
        console.log('🔗 findUpstream: Found column lineage metadata');
        Object.values(nodeWithMetadata.metadata.columnLineage).forEach(columnLineage => {
          if (columnLineage.upstreamColumns) {
            columnLineage.upstreamColumns.forEach(upstreamCol => {
              const upstreamNode = this.findNodeByColumnReference(upstreamCol);
              if (upstreamNode && !upstreamNodes.some(n => n.id === upstreamNode.id)) {
                console.log('🔗 findUpstream: Added upstream node from column lineage', upstreamNode.id, upstreamNode.label);
                upstreamNodes.push(upstreamNode);
                findUpstream(upstreamNode.id);
              }
            });
          }
        });
      }

      // Check edges for upstream connections
      console.log('🔗 findUpstream: Checking edges for upstream connections');
      for (const edge of this.allEdges.values()) {
        if (edge.target === currentNodeId) {
          const upstreamNode = this.allNodes.get(edge.source);
          if (upstreamNode && !upstreamNodes.some(n => n.id === upstreamNode.id)) {
            console.log('🔗 findUpstream: Added upstream node from edge', upstreamNode.id, upstreamNode.label, 'via edge', edge.id);
            upstreamNodes.push(upstreamNode);
            findUpstream(upstreamNode.id);
          }
        }
      }
    };

    findUpstream(nodeId);
    console.log('🔗 getUpstreamNodes: Final result for', nodeId, ':', upstreamNodes.map(n => n.id));
    return upstreamNodes;
  }

  // Get all downstream nodes for a given node
  getDownstreamNodes(nodeId: string): LineageNode[] {
    const node = this.allNodes.get(nodeId);
    if (!node) return [];

    const downstreamNodes: LineageNode[] = [];
    const processed = new Set<string>();

    // Helper function to recursively find downstream nodes
    const findDownstream = (currentNodeId: string) => {
      if (processed.has(currentNodeId)) return;
      processed.add(currentNodeId);

      const currentNode = this.allNodes.get(currentNodeId);
      if (!currentNode) return;

      // Check metadata for downstream references
      const nodeWithMetadata = currentNode as any;
      if (nodeWithMetadata.metadata?.downstreamReferences) {
        nodeWithMetadata.metadata.downstreamReferences.forEach(ref => {
          const downstreamNode = this.findNodeByReference(ref);
          if (downstreamNode && !downstreamNodes.some(n => n.id === downstreamNode.id)) {
            downstreamNodes.push(downstreamNode);
            findDownstream(downstreamNode.id); // Recursively find more downstream
          }
        });
      }

      // Check column lineage for downstream references
      if (nodeWithMetadata.metadata?.columnLineage) {
        Object.values(nodeWithMetadata.metadata.columnLineage).forEach(columnLineage => {
          if (columnLineage.downstreamColumns) {
            columnLineage.downstreamColumns.forEach(downstreamCol => {
              const downstreamNode = this.findNodeByColumnReference(downstreamCol);
              if (downstreamNode && !downstreamNodes.some(n => n.id === downstreamNode.id)) {
                downstreamNodes.push(downstreamNode);
                findDownstream(downstreamNode.id);
              }
            });
          }
        });
      }

      // Check edges for downstream connections
      for (const edge of this.allEdges.values()) {
        if (edge.source === currentNodeId) {
          const downstreamNode = this.allNodes.get(edge.target);
          if (downstreamNode && !downstreamNodes.some(n => n.id === downstreamNode.id)) {
            downstreamNodes.push(downstreamNode);
            findDownstream(downstreamNode.id);
          }
        }
      }
    };

    findDownstream(nodeId);
    return downstreamNodes;
  }

  // Get nodes that should be added when expanding upstream
  getUpstreamNodesToAdd(nodeId: string): LineageNode[] {
    const allUpstream = this.getUpstreamNodes(nodeId);
    return allUpstream.filter(node => !this.visibleNodes.has(node.id));
  }

  // Get nodes that should be added when expanding downstream
  getDownstreamNodesToAdd(nodeId: string): LineageNode[] {
    const allDownstream = this.getDownstreamNodes(nodeId);
    return allDownstream.filter(node => !this.visibleNodes.has(node.id));
  }

  // Get edges that should be added when expanding upstream
  getUpstreamEdgesToAdd(nodeId: string): LineageEdge[] {
    const upstreamNodes = this.getUpstreamNodes(nodeId);
    const edgesToAdd: LineageEdge[] = [];

    // Find edges between upstream nodes and the target node
    for (const edge of this.allEdges.values()) {
      if (edge.target === nodeId && upstreamNodes.some(n => n.id === edge.source)) {
        edgesToAdd.push(edge);
      }
    }

    // Find edges between upstream nodes themselves
    for (const edge of this.allEdges.values()) {
      if (upstreamNodes.some(n => n.id === edge.source) && 
          upstreamNodes.some(n => n.id === edge.target)) {
        edgesToAdd.push(edge);
      }
    }

    return edgesToAdd;
  }

  // Get edges that should be added when expanding downstream
  getDownstreamEdgesToAdd(nodeId: string): LineageEdge[] {
    const downstreamNodes = this.getDownstreamNodes(nodeId);
    const edgesToAdd: LineageEdge[] = [];

    // Find edges between the target node and downstream nodes
    for (const edge of this.allEdges.values()) {
      if (edge.source === nodeId && downstreamNodes.some(n => n.id === edge.target)) {
        edgesToAdd.push(edge);
      }
    }

    // Find edges between downstream nodes themselves
    for (const edge of this.allEdges.values()) {
      if (downstreamNodes.some(n => n.id === edge.source) && 
          downstreamNodes.some(n => n.id === edge.target)) {
        edgesToAdd.push(edge);
      }
    }

    return edgesToAdd;
  }

  // Check if a node has upstream connections
  hasUpstream(nodeId: string): boolean {
    return this.getUpstreamNodes(nodeId).length > 0;
  }

  // Check if a node has downstream connections
  hasDownstream(nodeId: string): boolean {
    return this.getDownstreamNodes(nodeId).length > 0;
  }

  // Check if a node has visible upstream connections
  hasVisibleUpstream(nodeId: string): boolean {
    const upstreamNodes = this.getUpstreamNodes(nodeId);
    return upstreamNodes.some(node => this.visibleNodes.has(node.id));
  }

  // Check if a node has visible downstream connections
  hasVisibleDownstream(nodeId: string): boolean {
    const downstreamNodes = this.getDownstreamNodes(nodeId);
    return downstreamNodes.some(node => this.visibleNodes.has(node.id));
  }

  // Get expansion state for a node
  getExpansionState(nodeId: string): {
    upstreamExpanded: boolean;
    downstreamExpanded: boolean;
    hasUpstream: boolean;
    hasDownstream: boolean;
    hasVisibleUpstream: boolean;
    hasVisibleDownstream: boolean;
  } {
    const upstreamExpanded = this.expandedUpstream.has(nodeId) && this.expandedUpstream.get(nodeId)!.size > 0;
    const downstreamExpanded = this.expandedDownstream.has(nodeId) && this.expandedDownstream.get(nodeId)!.size > 0;
    
    return {
      upstreamExpanded,
      downstreamExpanded,
      hasUpstream: this.hasUpstream(nodeId),
      hasDownstream: this.hasDownstream(nodeId),
      hasVisibleUpstream: this.hasVisibleUpstream(nodeId),
      hasVisibleDownstream: this.hasVisibleDownstream(nodeId),
    };
  }

  // Mark node as expanded upstream
  markUpstreamExpanded(nodeId: string, expandedNodeIds: Set<string>): void {
    this.expandedUpstream.set(nodeId, expandedNodeIds);
  }

  // Mark node as expanded downstream
  markDownstreamExpanded(nodeId: string, expandedNodeIds: Set<string>): void {
    this.expandedDownstream.set(nodeId, expandedNodeIds);
  }

  // Mark node as collapsed upstream
  markUpstreamCollapsed(nodeId: string): void {
    this.expandedUpstream.delete(nodeId);
  }

  // Mark node as collapsed downstream
  markDownstreamCollapsed(nodeId: string): void {
    this.expandedDownstream.delete(nodeId);
  }

  // Get all nodes that should be removed when collapsing upstream
  getUpstreamNodesToRemove(nodeId: string): string[] {
    const expanded = this.expandedUpstream.get(nodeId);
    if (!expanded) return [];

    // Only remove nodes that were added by this expansion
    return Array.from(expanded).filter(nodeId => {
      // Check if this node was added by upstream expansion of the current node
      // This is a simplified check - in practice, you might want more sophisticated tracking
      return !this.visibleNodes.has(nodeId);
    });
  }

  // Get all nodes that should be removed when collapsing downstream
  getDownstreamNodesToRemove(nodeId: string): string[] {
    const expanded = this.expandedDownstream.get(nodeId);
    if (!expanded) return [];

    // Only remove nodes that were added by this expansion
    return Array.from(expanded).filter(nodeId => {
      // Check if this node was added by downstream expansion of the current node
      return !this.visibleNodes.has(nodeId);
    });
  }

  // Update node expansion state when nodes are added/removed
  updateExpansionState(nodeId: string): void {
    const node = this.allNodes.get(nodeId);
    if (!node) return;

    // Update the node's expansion flags based on current state
    const expansionState = this.getExpansionState(nodeId);
    
    // This would typically update the node in the graph state
    // For now, we'll just log the state
    console.log('🔗 DynamicRelationshipManager: Updated expansion state for', nodeId, expansionState);
  }

  // Get debug information about relationships
  getDebugInfo(nodeId: string): {
    node: LineageNode | undefined;
    upstreamNodes: LineageNode[];
    downstreamNodes: LineageNode[];
    upstreamToAdd: LineageNode[];
    downstreamToAdd: LineageNode[];
    expansionState: ReturnType<typeof this.getExpansionState>;
  } {
    return {
      node: this.allNodes.get(nodeId),
      upstreamNodes: this.getUpstreamNodes(nodeId),
      downstreamNodes: this.getDownstreamNodes(nodeId),
      upstreamToAdd: this.getUpstreamNodesToAdd(nodeId),
      downstreamToAdd: this.getDownstreamNodesToAdd(nodeId),
      expansionState: this.getExpansionState(nodeId),
    };
  }
}

// Singleton instance
export const dynamicRelationshipManager = new DynamicRelationshipManager();
