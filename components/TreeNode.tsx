import { Handle, Position, type NodeProps } from 'reactflow';

const sx = {
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 8,
    width: 180,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  header: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  actions: { marginTop: 6, display: 'flex', justifyContent: 'flex-end' },
  btn: {
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
};

export type TreeNodeData = {
  label: string;
  index: number;
  level: number;
  childCount: number;
  fqName: string;
  expanded?: boolean;
  onShowDetails?: () => void;
};

export function TreeNode({ data }: NodeProps<TreeNodeData>) {
  return (
    <div style={sx.card}>
      <div style={sx.header}>{data.fqName}</div>
      <div style={sx.title}>{data.label}</div>
      <div style={sx.actions}>
        <button
          style={sx.btn}
          onClick={(e) => {
            e.stopPropagation();
            data.onShowDetails?.();
          }}
        >
          {data.expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      {data.expanded && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#334155' }}>
          <div>Columns:</div>
          <ul style={{ margin: '4px 0 0 16px' }}>
            {['SALES_ID', 'REVENUE', 'CUSTOMER_ID', 'ORDER_TS', 'AMOUNT'].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}