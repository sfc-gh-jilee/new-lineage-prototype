import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { elkLayout } from './lib/elkLayout';
import { container } from './styles.stylex';

type Column = { name: string };
type TableNodeData = {
  table: string;
  schema: string;
  db: string;
  columns: Column[];
  selectedKey?: string;
  onSelectColumn?: (col?: string) => void;
};

const sx = {
  table: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    width: 240,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  head: {
    fontSize: 12,
    color: '#475569',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  title: { fontSize: 13, fontWeight: 600 },
  body: { maxHeight: 220, overflow: 'auto' },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 8px',
    gap: 6,
    borderBottom: '1px solid #f1f5f9',
  },
  rowSelected: {
    boxShadow: 'inset 0 0 0 2px #111827',
  },
  colName: {
    fontSize: 12,
    color: '#0f172a',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
};

function TableNode({ data }: NodeProps<TableNodeData>) {
  const headerH = 32;
  const rowH = 24;
  return (
    <div style={sx.table}>
      <div style={sx.head}>
        <div style={sx.title}>
          {data.db}.{data.schema}.{data.table}
        </div>
      </div>
      <div style={sx.body}>
        {data.columns.map((c, idx) => (
          <div
            key={idx}
            style={{
              ...sx.row,
              ...(data.selectedKey === c.name ? sx.rowSelected : {}),
              fontWeight: data.selectedKey === c.name ? 700 : 400,
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              const next = data.selectedKey === c.name ? undefined : c.name;
              data.onSelectColumn?.(next as string);
            }}
          >
            <Handle
              id={`in-${idx}`}
              type="target"
              position={Position.Left}
              style={{ top: headerH + idx * rowH + rowH / 2 }}
            />
            <div style={sx.colName}>{c.name}</div>
            <Handle
              id={`out-${idx}`}
              type="source"
              position={Position.Right}
              style={{ top: headerH + idx * rowH + rowH / 2 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { table: TableNode };

function makeTables(): { nodes: Node<TableNodeData>[]; edges: Edge[] } {
  const dbs = ['DB_A', 'DB_B'];
  const schemas = ['SALES', 'REVENUE', 'FINANCE', 'ANALYTICS'];
  // Use base columns that are unique per table, so injections below (shared keys)
  // don't create duplicates within a node.
  const baseCols = [
    'AMOUNT',
    'CREATED_AT',
    'UPDATED_AT',
    'PRICE',
    'QUANTITY',
    'STATUS',
    'REGION',
    'NOTES',
  ];
  const tables: Node<TableNodeData>[] = [];
  const edges: Edge[] = [];

  // 10 tables
  const spacingX = 520;
  const spacingY = 420;
  for (let i = 0; i < 10; i += 1) {
    // Start with mostly-unique columns per table (ensures sparse relationships)
    const cols = Array.from({ length: 8 }, (_, k) => ({ name: `${baseCols[k]}_T${i}` }));
    // Inject a few shared columns so only some tables link together
    if (i % 2 === 0) cols[1] = { name: 'CUSTOMER_ID' };
    if (i % 3 === 0) cols[2] = { name: 'PRODUCT_ID' };
    if (i % 5 === 0) cols[0] = { name: 'ORDER_ID' };
    // Additional shared columns to create more relationships with distinct colors
    if (i % 3 === 1) cols[3] = { name: 'PRICE' };
    if (i % 3 === 2) cols[4] = { name: 'QUANTITY' };
    if (i % 4 === 0) cols[5] = { name: 'STATUS' };
    if (i % 4 === 1) cols[6] = { name: 'REGION' };
    const db = dbs[i % dbs.length];
    const schema = schemas[i % schemas.length];
    const table = ['ORDERS', 'CUSTOMERS', 'PRODUCTS', 'PAYMENTS', 'EVENTS'][i % 5] + '_' + i;
    tables.push({
      id: `tbl-${i}`,
      type: 'table',
      position: {
        x: (i % 5) * spacingX + (i % 2 === 0 ? 20 : -20),
        y: Math.floor(i / 5) * spacingY + (i % 3 === 0 ? 15 : -15),
      },
      data: { db, schema, table, columns: cols },
      draggable: true,
    });
  }

  // Connect columns with same name across different tables
  const byCol = new Map<string, string[]>();
  for (const t of tables) {
    t.data.columns.forEach((c, idx) => {
      const key = c.name;
      const list = byCol.get(key) || [];
      list.push(`${t.id}::${idx}`);
      byCol.set(key, list);
    });
  }
  // Distinct color per column key by hashing name into palette
  const colors = [
    '#16a34a',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#a855f7',
    '#06b6d4',
    '#22c55e',
    '#0ea5e9',
    '#eab308',
    '#f97316',
    '#10b981',
    '#8b5cf6',
  ];
  let edgeId = 0;
  byCol.forEach((arr, key) => {
    // Only link consecutive occurrences to avoid cliques; this creates a chain per shared column
    for (let i = 0; i < arr.length - 1; i += 1) {
      const [aId, aIdx] = arr[i].split('::');
      const [bId, bIdx] = arr[i + 1].split('::');
      // Skip self-referencing edges within the same table
      if (aId === bId) continue;
      const s = String(key);
      let sum = 0;
      for (let k = 0; k < s.length; k += 1) sum += s.charCodeAt(k);
      const color = key === 'ORDER_ID' ? '#ef4444' : colors[sum % colors.length];
      edges.push({
        id: `e-${edgeId++}`,
        source: aId,
        target: bId,
        sourceHandle: `out-${aIdx}`,
        targetHandle: `in-${bIdx}`,
        animated: false,
        style: { stroke: color, strokeWidth: 1, strokeDasharray: '4 3' },
        data: { key },
      });
    }
    // Add a few extra connections to increase density: connect the first occurrence to
    // later ones to form a light star topology without creating a full clique
    if (arr.length > 2) {
      const [rootId, rootIdx] = arr[0].split('::');
      for (let j = 2; j < arr.length; j += 1) {
        const [toId, toIdx] = arr[j].split('::');
        if (rootId === toId) continue; // avoid self-reference
        edges.push({
          id: `e-${edgeId++}`,
          source: rootId,
          target: toId,
          sourceHandle: `out-${rootIdx}`,
          targetHandle: `in-${toIdx}`,
          animated: true,
          style: {
            stroke:
              key === 'ORDER_ID'
                ? '#ef4444'
                : colors[
                    Array.from(String(key)).reduce((a, ch) => a + ch.charCodeAt(0), 0) %
                      colors.length
                  ],
            strokeWidth: 1,
            strokeDasharray: '4 3',
          },
          data: { key },
        });
      }
    }
  });
  // Add a few extra relationships between inner tables with distinct colors
  function getIndex(nodeId: string, columnName: string): number | undefined {
    const n = tables.find((t) => t.id === nodeId);
    if (!n) return undefined;
    const idx = n.data.columns.findIndex((c) => c.name === columnName);
    return idx >= 0 ? idx : undefined;
  }
  function getStrokeForKey(keyName: string): string {
    const existing = edges.find(
      (e) => (e.data as { key?: string } | undefined)?.key === keyName && !!e.style,
    );
    const stroke = (existing?.style as CSSProperties | undefined)?.stroke as string | undefined;
    if (stroke) return stroke;
    if (keyName === 'ORDER_ID') return '#ef4444';
    const s = String(keyName);
    let sum = 0;
    for (let k = 0; k < s.length; k += 1) sum += s.charCodeAt(k);
    return colors[sum % colors.length];
  }
  function addExtraByKey(aId: string, bId: string, keyName: string) {
    const aIdx = getIndex(aId, keyName);
    const bIdx = getIndex(bId, keyName);
    if (aIdx === undefined || bIdx === undefined) return;
    edges.push({
      id: `e-${edgeId++}`,
      source: aId,
      target: bId,
      sourceHandle: `out-${aIdx}`,
      targetHandle: `in-${bIdx}`,
      animated: true,
      style: { stroke: getStrokeForKey(keyName), strokeWidth: 1, strokeDasharray: '4 3' },
      data: { key: keyName },
    });
  }
  // Extra relationships on matching, identical column names
  addExtraByKey('tbl-3', 'tbl-6', 'PRODUCT_ID');
  addExtraByKey('tbl-0', 'tbl-5', 'ORDER_ID');
  addExtraByKey('tbl-4', 'tbl-6', 'CUSTOMER_ID');
  return { nodes: tables, edges };
}

export function SchemaMapView() {
  const initial = useMemo(() => makeTables(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>(
    initial.nodes as unknown as Node<TableNodeData>[],
  );
  const [edges, setEdges] = useEdgesState<Edge>(initial.edges as Edge[]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const runElkLayout = async () => {
    if (!rf) return;
    const measured = rf.getNodes() as unknown as Node<TableNodeData>[];
    const laidOut = await elkLayout(
      measured as unknown as Node<TableNodeData>[],
      edges as Edge[],
      'RIGHT',
    );
    setNodes(laidOut as unknown as Node<TableNodeData>[]);
    setTimeout(() => rf.fitView({ padding: 0.25 }), 0);
  };
  // After the canvas measures node dimensions (when rf is ready),
  // run the same ELK layout as Reset Layout so both match exactly.
  useEffect(() => {
    if (!rf) return;
    void runElkLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf]);
  return (
    <div className={container.root}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={(nodes as unknown as Node<TableNodeData>[]).map((n) => ({
            ...n,
            data: { ...n.data, onSelectColumn: setSelectedKey, selectedKey },
          }))}
          edges={(edges as Edge[]).map((e) => {
            const baseStyle = (e.style ?? {}) as CSSProperties;
            const key = (e.data as { key?: string } | undefined)?.key;
            const highlight = Boolean(selectedKey && key === selectedKey);
            const style: CSSProperties = highlight
              ? { ...baseStyle, strokeWidth: 3, strokeDasharray: undefined }
              : { ...baseStyle, strokeWidth: baseStyle.strokeWidth ?? 1, strokeDasharray: '4 3' };
            return { ...e, style, animated: !highlight } as Edge;
          })}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onInit={(instance) => {
            setRf(instance);
            instance.zoomTo(0.9);
          }}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
          <Panel position="top-right">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 12 }}>Schema</strong>
              <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
              <button
                onClick={() => setSelectedKey(undefined)}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                }}
              >
                Clear Highlight
              </button>
              <button
                onClick={() => {
                  const next = makeTables();
                  setSelectedKey(undefined);
                  setNodes(next.nodes as unknown as Node<TableNodeData>[]);
                  setEdges(next.edges as Edge[]);
                  setTimeout(() => rf?.fitView({ padding: 0.25 }), 0);
                }}
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
              <button
                onClick={() => void runElkLayout()}
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
            </div>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}