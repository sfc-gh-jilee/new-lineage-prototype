import { GraphView } from './GraphView';
import { GraphStateDemo } from './components/GraphStateDemo';
import { AdvancedGraphStateDemo } from './components/AdvancedGraphStateDemo';
import { DynamicRelationshipDemo } from './components/DynamicRelationshipDemo';
import { useState } from 'react';

export function MainApp() {
  const [demoMode, setDemoMode] = useState<'graph' | 'basic' | 'advanced' | 'dynamic'>('graph');

  return (
    <div style={{ 
      height: '100vh', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {demoMode === 'graph' ? (
        <GraphView onDemoModeChange={setDemoMode} />
      ) : (
        <div style={{ height: '100vh', overflow: 'auto' }}>
          <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
            <button onClick={() => setDemoMode('graph')}>
              ← Back to Graph View
            </button>
            <span style={{ marginLeft: '20px', fontWeight: 'bold' }}>
              {demoMode === 'basic' ? 'Basic Graph State Demo' : 
               demoMode === 'advanced' ? 'Advanced Graph State Demo' : 
               'Dynamic Relationship Discovery Demo'}
            </span>
          </div>
          {demoMode === 'basic' ? <GraphStateDemo /> : 
           demoMode === 'advanced' ? <AdvancedGraphStateDemo /> : 
           <DynamicRelationshipDemo />}
        </div>
      )}
    </div>
  );
}

