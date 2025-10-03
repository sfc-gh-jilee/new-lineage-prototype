import ELK from 'elkjs/lib/elk.bundled.js';
import type { Edge, Node } from 'reactflow';

const elk = new ELK();

export async function elkLayout(
  nodes: Node[],
  edges: Edge[],
  dir: 'RIGHT' | 'LEFT' | 'DOWN' | 'UP' = 'RIGHT',
  isExpansion: boolean = false,
  verticalSpacingMultiplier: number = 1, // Additional multiplier for vertical spacing only
) {
  // Base spacing values (original values)
  const baseSpacing = {
    nodeNodeBetweenLayers: 80,
    nodeNode: 60,
    edgeNodeBetweenLayers: 40,
  };

  // Calculate spacing based on whether this is an expansion (200% increase from base)
  const spacingMultiplier = isExpansion ? 6 : 2; // 6x for expansion (200% increase), 2x for normal (33% reduction from 3x)
  const spacing = {
    nodeNodeBetweenLayers: baseSpacing.nodeNodeBetweenLayers * spacingMultiplier, // Horizontal spacing
    nodeNode: baseSpacing.nodeNode * spacingMultiplier * verticalSpacingMultiplier, // Vertical spacing with additional multiplier
    edgeNodeBetweenLayers: baseSpacing.edgeNodeBetweenLayers * spacingMultiplier,
  };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': dir,
      'elk.layered.spacing.nodeNodeBetweenLayers': spacing.nodeNodeBetweenLayers.toString(),
      'elk.spacing.nodeNode': spacing.nodeNode.toString(),
      'elk.layered.spacing.edgeNodeBetweenLayers': spacing.edgeNodeBetweenLayers.toString(),
      'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: Math.max(400, (n as any).width || 400),
      height: Math.max(160, (n as any).height || 160),
    })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  } as any;

  const res = await elk.layout(graph);
  const posById = new Map(res.children?.map((c: any) => [c.id, { x: c.x, y: c.y }]) || []);
  return nodes.map((n) => ({ ...n, position: posById.get(n.id) || n.position }));
}