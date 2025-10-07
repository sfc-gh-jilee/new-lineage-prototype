import { useState, useMemo } from 'react';
import { useGraphState } from '../hooks/useGraphState';
import { ALL_CATALOG_NODES } from '../lib/catalogData';

export function DynamicRelationshipDemo() {
  const {
    state,
    visibleNodes,
    addNode,
    removeNode,
    expandUpstream,
    expandDownstream,
    getAvailableUpstreamNodes,
    getAvailableDownstreamNodes,
    refreshNodeRelationships,
    updateNodeMetadata
  } = useGraphState();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [newUpstreamRefs, setNewUpstreamRefs] = useState<string>('');
  const [newDownstreamRefs, setNewDownstreamRefs] = useState<string>('');

  // Get nodes with dynamic relationship metadata
  const nodesWithMetadata = useMemo(() => {
    return ALL_CATALOG_NODES.filter(node => {
      const nodeWithMetadata = node as any;
      return nodeWithMetadata.metadata?.upstreamReferences || 
             nodeWithMetadata.metadata?.downstreamReferences || 
             nodeWithMetadata.metadata?.columnLineage;
    });
  }, []);

  const handleAddNodeWithMetadata = (node: any) => {
    const position = {
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200
    };
    addNode(node, position);
  };

  const handleUpdateNodeMetadata = () => {
    if (!selectedNodeId) return;

    const upstreamRefs = newUpstreamRefs.split(',').map(ref => ref.trim()).filter(Boolean);
    const downstreamRefs = newDownstreamRefs.split(',').map(ref => ref.trim()).filter(Boolean);

    const metadata = {
      upstreamReferences: upstreamRefs.length > 0 ? upstreamRefs : undefined,
      downstreamReferences: downstreamRefs.length > 0 ? downstreamRefs : undefined,
    };

    updateNodeMetadata(selectedNodeId, metadata);
    setNewUpstreamRefs('');
    setNewDownstreamRefs('');
  };

  const handleRefreshRelationships = () => {
    if (selectedNodeId) {
      refreshNodeRelationships(selectedNodeId);
    }
  };

  const selectedNode = selectedNodeId ? state.nodes.get(selectedNodeId) : null;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Dynamic Relationship Discovery Demo</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>How Dynamic Relationships Work</h3>
        <p>
          The system now discovers relationships dynamically from node metadata instead of relying on hardcoded edges.
          This allows for more flexible and data-driven relationship discovery.
        </p>
        <ul>
          <li><strong>upstreamReferences</strong>: Array of node references (IDs, names, or paths)</li>
          <li><strong>downstreamReferences</strong>: Array of node references (IDs, names, or paths)</li>
          <li><strong>columnLineage</strong>: Column-level lineage with upstream/downstream column references</li>
          <li><strong>Fallback</strong>: If no metadata relationships found, falls back to hardcoded edges</li>
        </ul>
      </div>

      {/* Current Graph State */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>Current Graph State</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Total Nodes:</strong> {state.nodes.size}</div>
          <div><strong>Visible Nodes:</strong> {visibleNodes.length}</div>
          <div><strong>Nodes with Metadata:</strong> {nodesWithMetadata.length}</div>
        </div>
      </div>

      {/* Add Nodes with Dynamic Metadata */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>Add Nodes with Dynamic Relationship Metadata</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {nodesWithMetadata.slice(0, 6).map(node => (
            <div key={node.id} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white' }}>
              <div style={{ fontWeight: 'bold' }}>{node.label}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{node.name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                <div>Upstream: {(node as any).metadata?.upstreamReferences?.length || 0}</div>
                <div>Downstream: {(node as any).metadata?.downstreamReferences?.length || 0}</div>
                <div>Column Lineage: {(node as any).metadata?.columnLineage ? Object.keys((node as any).metadata.columnLineage).length : 0}</div>
              </div>
              <button 
                onClick={() => handleAddNodeWithMetadata(node)}
                style={{ marginTop: '8px', padding: '4px 8px' }}
              >
                Add to Graph
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Metadata Editor */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '8px' }}>
        <h3>Dynamic Metadata Editor</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Node:</label>
          <select 
            value={selectedNodeId} 
            onChange={(e) => setSelectedNodeId(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select a node...</option>
            {visibleNodes.map(node => (
              <option key={node.id} value={node.id}>{node.label} ({node.name})</option>
            ))}
          </select>
        </div>

        {selectedNode && (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Upstream References (comma-separated):
              </label>
              <input
                type="text"
                placeholder="e.g., DW.SALES.ORDERS, DW.CUSTOMERS.CUSTOMER_BASE"
                value={newUpstreamRefs}
                onChange={(e) => setNewUpstreamRefs(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Downstream References (comma-separated):
              </label>
              <input
                type="text"
                placeholder="e.g., DW.ANALYTICS.REVENUE_ATTRIBUTION, DW.ANALYTICS.CONVERSION_FUNNEL"
                value={newDownstreamRefs}
                onChange={(e) => setNewDownstreamRefs(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleUpdateNodeMetadata}>
                Update Metadata
              </button>
              <button onClick={handleRefreshRelationships}>
                Refresh Relationships
              </button>
            </div>

            {/* Current Node Info */}
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
              <h4>Current Node: {selectedNode.label}</h4>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div><strong>Upstream Nodes:</strong> {selectedNode.upstreamNodes.size}</div>
                <div><strong>Downstream Nodes:</strong> {selectedNode.downstreamNodes.size}</div>
                <div><strong>Available Upstream:</strong> {getAvailableUpstreamNodes(selectedNodeId).length}</div>
                <div><strong>Available Downstream:</strong> {getAvailableDownstreamNodes(selectedNodeId).length}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visible Nodes with Relationship Info */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Visible Nodes with Relationship Info ({visibleNodes.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {visibleNodes.map(node => (
            <div 
              key={node.id}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                backgroundColor: selectedNodeId === node.id ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{node.label}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{node.name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                <div>Upstream: {node.upstreamNodes.size} (Available: {getAvailableUpstreamNodes(node.id).length})</div>
                <div>Downstream: {node.downstreamNodes.size} (Available: {getAvailableDownstreamNodes(node.id).length})</div>
                <div>States: {Array.from(node.states).join(', ')}</div>
              </div>
              
              {/* Node Actions */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                <button 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandUpstream(node.id);
                  }}
                  disabled={getAvailableUpstreamNodes(node.id).length === 0}
                >
                  Expand ↑ ({getAvailableUpstreamNodes(node.id).length})
                </button>
                
                <button 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandDownstream(node.id);
                  }}
                  disabled={getAvailableDownstreamNodes(node.id).length === 0}
                >
                  Expand ↓ ({getAvailableDownstreamNodes(node.id).length})
                </button>
                
                <button 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(node.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Metadata Structure */}
      <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Example Metadata Structure</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
{`{
  "upstreamReferences": [
    "DW.SALES.ORDERS",
    "DW.CUSTOMERS.CUSTOMER_BASE"
  ],
  "downstreamReferences": [
    "DW.ANALYTICS.REVENUE_ATTRIBUTION",
    "DW.ANALYTICS.CONVERSION_FUNNEL"
  ],
  "columnLineage": {
    "user_id": {
      "upstreamColumns": ["DW.CUSTOMERS.CUSTOMER_BASE.customer_id"],
      "transformationType": "lookup",
      "dataQuality": 95
    },
    "campaign_id": {
      "upstreamColumns": ["DW.SALES.ORDERS.campaign_id"],
      "transformationType": "direct_copy",
      "dataQuality": 100
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}
