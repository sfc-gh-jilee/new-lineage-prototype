import { useGraphState } from '../hooks/useGraphState';
import { ALL_CATALOG_NODES } from '../lib/catalogData';

export function GraphStateDemo() {
  const {
    state,
    visibleNodes,
    visibleEdges,
    selectedNodes,
    focusedNode,
    addNode,
    removeNode,
    selectNode,
    clearSelection,
    expandUpstream,
    expandDownstream,
    collapseUpstream,
    collapseDownstream,
    getAvailableUpstreamNodes,
    getAvailableDownstreamNodes,
    saveState,
    loadState
  } = useGraphState();

  const handleAddRandomNode = () => {
    const randomNode = ALL_CATALOG_NODES[Math.floor(Math.random() * ALL_CATALOG_NODES.length)];
    const position = {
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200
    };
    addNode(randomNode, position);
  };

  const handleRemoveSelectedNodes = () => {
    selectedNodes.forEach(node => {
      if (node) {
        removeNode(node.id);
      }
    });
    clearSelection();
  };

  const handleExpandUpstream = (nodeId: string) => {
    expandUpstream(nodeId);
  };

  const handleExpandDownstream = (nodeId: string) => {
    expandDownstream(nodeId);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Graph State Management Demo</h2>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleAddRandomNode}>
          Add Random Node
        </button>
        
        <button 
          onClick={handleRemoveSelectedNodes}
          disabled={selectedNodes.length === 0}
        >
          Remove Selected ({selectedNodes.length})
        </button>
        
        <button onClick={clearSelection}>
          Clear Selection
        </button>
        
        <button onClick={() => saveState('Demo State')}>
          Save State
        </button>
        
        <button onClick={loadState}>
          Load State
        </button>
      </div>

      {/* State Info */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Graph State Info</h3>
        <p><strong>Total Nodes in Graph:</strong> {state.nodes.size}</p>
        <p><strong>Visible Nodes:</strong> {visibleNodes.length}</p>
        <p><strong>Total Edges:</strong> {state.edges.size}</p>
        <p><strong>Visible Edges:</strong> {visibleEdges.length}</p>
        <p><strong>Selected Nodes:</strong> {selectedNodes.length}</p>
        <p><strong>Focused Node:</strong> {focusedNode?.label || 'None'}</p>
        <p><strong>Viewport:</strong> x={state.viewport.x.toFixed(1)}, y={state.viewport.y.toFixed(1)}, zoom={state.viewport.zoom.toFixed(2)}</p>
        <p><strong>Last Modified:</strong> {new Date(state.metadata.lastModified).toLocaleString()}</p>
      </div>

      {/* Visible Nodes */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Visible Nodes ({visibleNodes.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {visibleNodes.map(node => (
            <div 
              key={node.id}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                backgroundColor: selectedNodes.some(n => n && n.id === node.id) ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
              onClick={() => selectNode(node.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{node.label}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{node.name}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Position: ({node.position.x.toFixed(0)}, {node.position.y.toFixed(0)})
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                States: {Array.from(node.states).join(', ')}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Upstream: {node.upstreamNodes.size}, Downstream: {node.downstreamNodes.size}
              </div>
              
              {/* Node Actions */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandUpstream(node.id);
                  }}
                  disabled={getAvailableUpstreamNodes(node.id).length === 0}
                >
                  Expand ↑ ({getAvailableUpstreamNodes(node.id).length})
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandDownstream(node.id);
                  }}
                  disabled={getAvailableDownstreamNodes(node.id).length === 0}
                >
                  Expand ↓ ({getAvailableDownstreamNodes(node.id).length})
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseUpstream(node.id);
                  }}
                  disabled={!node.states.has('expanded-upstream')}
                >
                  Collapse ↑
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseDownstream(node.id);
                  }}
                  disabled={!node.states.has('expanded-downstream')}
                >
                  Collapse ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Nodes from Catalog */}
      <div>
        <h3>Available Nodes from Catalog ({ALL_CATALOG_NODES.length})</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
          {ALL_CATALOG_NODES.slice(0, 20).map(node => (
            <div 
              key={node.id}
              style={{ 
                padding: '5px', 
                fontSize: '12px',
                backgroundColor: state.nodes.has(node.id) ? '#e8f5e8' : 'white',
                borderBottom: '1px solid #eee'
              }}
            >
              <strong>{node.label}</strong> - {node.name}
              {state.nodes.has(node.id) && <span style={{ color: 'green' }}> ✓ In Graph</span>}
            </div>
          ))}
          {ALL_CATALOG_NODES.length > 20 && (
            <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>
              ... and {ALL_CATALOG_NODES.length - 20} more nodes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
