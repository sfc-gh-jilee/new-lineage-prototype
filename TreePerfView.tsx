import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateTreeGraph } from './lib/treeGenerator';
import { container } from './styles.stylex';

import { Drawer } from './components/Drawer';
import { TreeNode, type TreeNodeData } from './components/TreeNode';
import { elkLayout } from './lib/elkLayout';

// TreeNodeData is imported from components/TreeNode
const nodeTypes: NodeTypes = { tree: TreeNode };

export function TreePerfView() {
  const initial = useMemo(() => generateTreeGraph(200, 3, {}, 20, 20), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<TreeNodeData>(
    initial.nodes as unknown as Node<TreeNodeData>[],
  );
  const [edges, setEdges] = useEdgesState<Edge>(initial.edges as Edge[]);
  const [selected, setSelected] = React.useState<Node<TreeNodeData> | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const [elkDirection, setElkDirection] = useState<'RIGHT' | 'LEFT' | 'DOWN' | 'UP'>('DOWN');

  const nodesRef = useRef<Node<TreeNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  useEffect(() => void (nodesRef.current = nodes as Node<TreeNodeData>[]), [nodes]);
  useEffect(() => void (edgesRef.current = edges as Edge[]), [edges]);

  const onResetCamera = useCallback(() => {
    rf?.fitView({ padding: 0.2 });
  }, [rf]);

  const onResetGraph = useCallback(() => {
    setNodes(initial.nodes as unknown as Node<TreeNodeData>[]);
    setEdges(initial.edges as Edge[]);
    setTimeout(() => rf?.fitView({ padding: 0.2 }), 0);
  }, [rf, setNodes, setEdges, initial]);

  const onResetLayout = useCallback(async () => {
    const laidOut = await elkLayout(
      initial.nodes as unknown as Node<TreeNodeData>[],
      initial.edges as unknown as Edge[],
      elkDirection,
    );
    setNodes(laidOut as unknown as Node<TreeNodeData>[]);
  }, [elkDirection, setNodes, initial]);
  return (
    <>
      <div className={container.root}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={(nodes as unknown as Node<TreeNodeData>[]).map((n) => ({
              ...n,
              type: 'tree',
              data: {
                ...n.data,
                onShowDetails: () =>
                  setNodes(
                    (curr) =>
                      (curr as unknown as Node<TreeNodeData>[]).map((cn) => {
                        if (cn.id !== n.id) return cn as unknown as Node<TreeNodeData>;
                        return {
                          ...(cn as unknown as Node<TreeNodeData>),
                          data: {
                            ...(cn.data as TreeNodeData),
                            expanded: !((cn.data as TreeNodeData).expanded ?? false),
                          },
                        } as unknown as Node<TreeNodeData>;
                      }) as unknown as Node<TreeNodeData>[],
                  ),
              },
            }))}
            edges={edges}
            fitView
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => setSelected(node as Node<TreeNodeData>)}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => setRf(instance)}
            nodeTypes={nodeTypes}
          >
            <Background style={{ pointerEvents: 'none' }} />
            <MiniMap pannable zoomable />
            <Controls />
            <div
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 6,
                display: 'flex',
                gap: 8,
                pointerEvents: 'auto',
                zIndex: 5,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>Tree</span>
              <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                Layout:
                <select
                  value={elkDirection}
                  onChange={(e) =>
                    setElkDirection(e.target.value as 'RIGHT' | 'LEFT' | 'DOWN' | 'UP')
                  }
                  style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="RIGHT">Left → Right</option>
                  <option value="LEFT">Right → Left</option>
                  <option value="DOWN">Top → Bottom</option>
                  <option value="UP">Bottom → Top</option>
                </select>
              </label>
              <button
                onClick={onResetLayout}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                }}
              >
                Reset Layout
              </button>
              <button
                onClick={onResetCamera}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                }}
              >
                Fit View
              </button>
              <button
                onClick={onResetGraph}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                }}
              >
                Reset Graph
              </button>
            </div>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <Drawer
        title={selected ? 'Tree Node' : ''}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            <div style={{ color: '#64748b', fontSize: 12 }}>{selected.data.fqName}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.data.label}</div>
            <div>
              <span style={{ fontWeight: 600 }}>Index:</span> {selected.data.index}
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>Level:</span> {selected.data.level}
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>Children:</span> {selected.data.childCount}
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>Columns:</span>
              <ul style={{ margin: '6px 0 0 16px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i}>{['SALES_ID', 'REVENUE', 'CUSTOMER_ID', 'ORDER_TS', 'AMOUNT'][i]}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}