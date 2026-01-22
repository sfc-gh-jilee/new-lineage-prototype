import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from 'reactflow';

const elk = new ELK();

export async function elkLayout(
  nodes: Node[],
  edges: Edge[],
  dir: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP' = 'RIGHT',
) {
  // Consistent spacing values
  const spacing = {
    nodeNodeBetweenLayers: 160, // Horizontal spacing between layers (columns)
    nodeNode: 40, // Vertical spacing between nodes in same layer
    edgeNodeBetweenLayers: 40, // Edge to node spacing
  };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': dir,
      'elk.layered.spacing.nodeNodeBetweenLayers': spacing.nodeNodeBetweenLayers.toString(),
      'elk.spacing.nodeNode': spacing.nodeNode.toString(),
      'elk.layered.spacing.edgeNodeBetweenLayers': spacing.edgeNodeBetweenLayers.toString(),
      // Ensure consistent alignment within layers
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: (n as any).width || 280,
      height: (n as any).height || 160,
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  } as any;

  const res = await elk.layout(graph);
  const posById = new Map(res.children?.map((c: any) => [c.id, { x: c.x, y: c.y }]) || []);
  return nodes.map((n) => ({ ...n, position: posById.get(n.id) || n.position }));
}