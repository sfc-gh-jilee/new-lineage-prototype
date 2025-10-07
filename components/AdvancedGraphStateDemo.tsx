import { useState, useMemo } from 'react';
import { useGraphState } from '../hooks/useGraphState';
import { ALL_CATALOG_NODES } from '../lib/catalogData';
import { ObjType } from '../lib/types';

export function AdvancedGraphStateDemo() {
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
    loadStateById,
    getSavedStates,
    deleteSavedState,
    exportStateAsJSON,
    importStateFromJSON,
    generateShareableURL,
    applyFilters,
    getFilterOptions
  } = useGraphState();

  // Local state for UI
  const [newStateName, setNewStateName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<ObjType[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [qualityRange, setQualityRange] = useState({ min: 0, max: 100 });
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedStates, setShowSavedStates] = useState(false);
  const [importJSON, setImportJSON] = useState('');

  // Get saved states
  const savedStates = useMemo(() => getSavedStates(), [getSavedStates]);
  
  // Get filter options
  const filterOptions = useMemo(() => getFilterOptions(), [getFilterOptions]);
  
  // Apply current filters
  const filteredNodes = useMemo(() => {
    return applyFilters({
      searchQuery: searchQuery || undefined,
      nodeTypes: selectedNodeTypes.length > 0 ? selectedNodeTypes : undefined,
      schemas: selectedSchemas.length > 0 ? selectedSchemas : undefined,
      databases: selectedDatabases.length > 0 ? selectedDatabases : undefined,
      qualityRange: qualityRange.min > 0 || qualityRange.max < 100 ? qualityRange : undefined
    });
  }, [searchQuery, selectedNodeTypes, selectedSchemas, selectedDatabases, qualityRange, applyFilters]);

  const handleAddRandomNode = () => {
    const randomNode = ALL_CATALOG_NODES[Math.floor(Math.random() * ALL_CATALOG_NODES.length)];
    const position = {
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200
    };
    addNode(randomNode, position);
  };

  const handleSaveState = () => {
    if (newStateName.trim()) {
      const stateId = saveState(newStateName.trim());
      setNewStateName('');
      console.log('State saved with ID:', stateId);
    } else {
      saveState();
    }
  };

  const handleLoadState = (stateId: string) => {
    loadStateById(stateId);
    setShowSavedStates(false);
  };

  const handleDeleteState = (stateId: string) => {
    if (confirm('Are you sure you want to delete this saved state?')) {
      deleteSavedState(stateId);
    }
  };

  const handleExportState = () => {
    const json = exportStateAsJSON();
    navigator.clipboard.writeText(json);
    alert('State exported to clipboard!');
  };

  const handleImportState = () => {
    try {
      importStateFromJSON(importJSON);
      setImportJSON('');
      alert('State imported successfully!');
    } catch (error) {
      alert('Failed to import state: ' + error);
    }
  };

  const handleShareState = () => {
    const url = generateShareableURL();
    navigator.clipboard.writeText(url);
    alert('Shareable URL copied to clipboard!');
  };

  const handleNodeTypeToggle = (nodeType: ObjType) => {
    setSelectedNodeTypes(prev => 
      prev.includes(nodeType) 
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
    );
  };

  const handleSchemaToggle = (schema: string) => {
    setSelectedSchemas(prev => 
      prev.includes(schema) 
        ? prev.filter(s => s !== schema)
        : [...prev, schema]
    );
  };

  const handleDatabaseToggle = (database: string) => {
    setSelectedDatabases(prev => 
      prev.includes(database) 
        ? prev.filter(d => d !== database)
        : [...prev, database]
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Advanced Graph State Management Demo</h2>
      
      {/* Main Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleAddRandomNode}>
          Add Random Node
        </button>
        
        <button 
          onClick={() => selectedNodes.forEach(node => node && removeNode(node.id))}
          disabled={selectedNodes.length === 0}
        >
          Remove Selected ({selectedNodes.length})
        </button>
        
        <button onClick={clearSelection}>
          Clear Selection
        </button>
        
        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
        
        <button onClick={() => setShowSavedStates(!showSavedStates)}>
          {showSavedStates ? 'Hide' : 'Show'} Saved States
        </button>
      </div>

      {/* State Management */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>State Management</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="State name (optional)"
            value={newStateName}
            onChange={(e) => setNewStateName(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button onClick={handleSaveState}>
            Save State
          </button>
          <button onClick={handleExportState}>
            Export to Clipboard
          </button>
          <button onClick={handleShareState}>
            Generate Share URL
          </button>
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <textarea
            placeholder="Paste JSON to import state..."
            value={importJSON}
            onChange={(e) => setImportJSON(e.target.value)}
            style={{ width: '100%', height: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button onClick={handleImportState} disabled={!importJSON.trim()}>
            Import State
          </button>
        </div>
      </div>

      {/* Saved States */}
      {showSavedStates && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <h3>Saved States ({Object.keys(savedStates).length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
            {Object.entries(savedStates).map(([stateId, state]) => (
              <div key={stateId} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white' }}>
                <div style={{ fontWeight: 'bold' }}>{state.metadata.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Nodes: {state.nodes.size}, Edges: {state.edges.size}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(state.metadata.lastModified).toLocaleString()}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                  <button onClick={() => handleLoadState(stateId)}>
                    Load
                  </button>
                  <button onClick={() => handleDeleteState(stateId)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
          <h3>Advanced Filters</h3>
          
          {/* Search */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search:</label>
            <input
              type="text"
              placeholder="Search nodes by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          {/* Node Types */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Node Types:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {filterOptions.nodeTypes.map(nodeType => (
                <label key={nodeType} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={selectedNodeTypes.includes(nodeType)}
                    onChange={() => handleNodeTypeToggle(nodeType)}
                  />
                  {nodeType}
                </label>
              ))}
            </div>
          </div>

          {/* Schemas */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Schemas:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {filterOptions.schemas.map(schema => (
                <label key={schema} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={selectedSchemas.includes(schema)}
                    onChange={() => handleSchemaToggle(schema)}
                  />
                  {schema}
                </label>
              ))}
            </div>
          </div>

          {/* Databases */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Databases:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {filterOptions.databases.map(database => (
                <label key={database} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="checkbox"
                    checked={selectedDatabases.includes(database)}
                    onChange={() => handleDatabaseToggle(database)}
                  />
                  {database}
                </label>
              ))}
            </div>
          </div>

          {/* Quality Range */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Quality Score: {qualityRange.min} - {qualityRange.max}
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="range"
                min={filterOptions.qualityRange.min}
                max={filterOptions.qualityRange.max}
                value={qualityRange.min}
                onChange={(e) => setQualityRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
              />
              <input
                type="range"
                min={filterOptions.qualityRange.min}
                max={filterOptions.qualityRange.max}
                value={qualityRange.max}
                onChange={(e) => setQualityRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#666' }}>
            Showing {filteredNodes.length} of {visibleNodes.length} nodes
          </div>
        </div>
      )}

      {/* State Info */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Current Graph State</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Total Nodes:</strong> {state.nodes.size}</div>
          <div><strong>Visible Nodes:</strong> {visibleNodes.length}</div>
          <div><strong>Filtered Nodes:</strong> {filteredNodes.length}</div>
          <div><strong>Total Edges:</strong> {state.edges.size}</div>
          <div><strong>Visible Edges:</strong> {visibleEdges.length}</div>
          <div><strong>Selected Nodes:</strong> {selectedNodes.length}</div>
          <div><strong>Focused Node:</strong> {focusedNode?.label || 'None'}</div>
          <div><strong>Viewport:</strong> x={state.viewport.x.toFixed(1)}, y={state.viewport.y.toFixed(1)}, zoom={state.viewport.zoom.toFixed(2)}</div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          <strong>Last Modified:</strong> {new Date(state.metadata.lastModified).toLocaleString()}
        </div>
      </div>

      {/* Filtered Nodes */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Filtered Nodes ({filteredNodes.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {filteredNodes.map(node => node ? (
            <div 
              key={node.id}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                backgroundColor: selectedNodes.some(n => n.id === node.id) ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
              onClick={() => selectNode(node.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{node.label}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{node.name}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {node.objType} • {node.db}.{node.schema}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                Quality: {node.metadata?.qualityScore || 'N/A'} • 
                Upstream: {node.upstreamNodes.size} • 
                Downstream: {node.downstreamNodes.size}
              </div>
              
              {/* Node Actions */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    expandUpstream(node.id);
                  }}
                  disabled={getAvailableUpstreamNodes(node.id).length === 0}
                >
                  ↑ ({getAvailableUpstreamNodes(node.id).length})
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    expandDownstream(node.id);
                  }}
                  disabled={getAvailableDownstreamNodes(node.id).length === 0}
                >
                  ↓ ({getAvailableDownstreamNodes(node.id).length})
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
          ) : null)}
        </div>
      </div>
    </div>
  );
}
