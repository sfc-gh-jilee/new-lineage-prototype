import type { Edge, Node } from 'reactflow';

type TreeNodeData = {
  label: string;
  index: number;
  level: number;
  childCount: number;
  fqName: string;
};

/**
 * generateTreeGraph
 * Creates a rooted tree with approximately `totalNodes` nodes and
 * a fixed `branchingFactor`. Returns positioned nodes and edges for React Flow.
 */
export function generateTreeGraph(
  totalNodes: number,
  branchingFactor: number,
  {
    horizontalSpacing = 160,
    verticalSpacing = 120,
  }: { horizontalSpacing?: number; verticalSpacing?: number } = {},
  maxDepth?: number,
  minDepth?: number,
): { nodes: Node<TreeNodeData>[]; edges: Edge[] } {
  const nodeCount = Math.max(1, Math.floor(totalNodes));
  const b = Math.max(1, Math.floor(branchingFactor));

  const nodes: Node<TreeNodeData>[] = [];
  const edges: Edge[] = [];
  const childCounts = new Map<number, number>();

  // Build a BFS-style tree: parent at index i has children at indices [next..next+b-1]
  // Track level widths to calculate x positions centered per level
  const levels: number[] = []; // level index for each node id
  const levelCounts = new Map<number, number>();
  const levelPositions = new Map<number, number>();

  // Optional spine to guarantee minimum depth
  let nextId = 0;
  const queue: Array<{ id: number; level: number }> = [];
  levels[0] = 0;
  levelCounts.set(0, 1);
  nextId = 1;

  if (minDepth && minDepth > 1) {
    let prev = 0;
    for (let d = 1; d < minDepth && nextId < nodeCount; d += 1) {
      const curr = nextId++;
      levels[curr] = d;
      levelCounts.set(d, (levelCounts.get(d) || 0) + 1);
      edges.push({ id: `e-${prev}-${curr}`, source: `t-${prev}`, target: `t-${curr}` });
      childCounts.set(prev, (childCounts.get(prev) || 0) + 1);
      prev = curr;
    }
    // Seed BFS from all nodes in the spine to create breadth beneath them
    for (let i = 0; i < nextId; i += 1) queue.push({ id: i, level: levels[i] || 0 });
  } else {
    queue.push({ id: 0, level: 0 });
  }

  while (nextId < nodeCount && queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const { id: parent, level: parentLevel } = head;
    const childLevel = parentLevel + 1;
    const canGrow = maxDepth ? childLevel < maxDepth : true;
    const spawn = canGrow ? b : 0;
    for (let c = 0; c < spawn && nextId < nodeCount; c += 1) {
      levels[nextId] = childLevel;
      levelCounts.set(childLevel, (levelCounts.get(childLevel) || 0) + 1);
      edges.push({ id: `e-${parent}-${nextId}`, source: `t-${parent}`, target: `t-${nextId}` });
      childCounts.set(parent, (childCounts.get(parent) || 0) + 1);
      queue.push({ id: nextId, level: childLevel });
      nextId += 1;
    }
  }

  // If nodes remain (depth capped), append leaves at last level
  if (nextId < nodeCount) {
    const lastLevel = Math.max(...levels);
    while (nextId < nodeCount) {
      levels[nextId] = lastLevel;
      levelCounts.set(lastLevel, (levelCounts.get(lastLevel) || 0) + 1);
      // connect to a random node from previous level for completeness
      const parentCandidates = levels
        .map((lvl, idx) => ({ lvl, idx }))
        .filter((p) => p.lvl === lastLevel - 1);
      const parent = parentCandidates.length
        ? parentCandidates[Math.floor(Math.random() * parentCandidates.length)].idx
        : 0;
      edges.push({ id: `e-${parent}-${nextId}`, source: `t-${parent}`, target: `t-${nextId}` });
      childCounts.set(parent, (childCounts.get(parent) || 0) + 1);
      nextId += 1;
    }
  }

  // For each level, compute a centered x range and assign nodes in that level spaced horizontally
  const maxLevel = Math.max(...levels);
  const nodesByLevel: number[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (let i = 0; i < levels.length; i += 1) nodesByLevel[levels[i]].push(i);

  for (let lvl = 0; lvl <= maxLevel; lvl += 1) {
    const count = nodesByLevel[lvl].length;
    const totalWidth = (count - 1) * horizontalSpacing * 1.15; // ensure extra spacing between nodes
    levelPositions.set(lvl, -totalWidth / 2);
  }

  for (let i = 0; i < nodeCount; i += 1) {
    const lvl = levels[i] || 0;
    const idxInLevel = nodesByLevel[lvl].indexOf(i);
    const startX = levelPositions.get(lvl) || 0;
    const x = startX + idxInLevel * horizontalSpacing;
    const y = lvl * verticalSpacing;
    const db = `DB_${String.fromCharCode(65 + (i % 6))}`;
    const schema = ['SALES', 'REVENUE', 'FINANCE', 'ANALYTICS'][i % 4];
    const table = ['ORDERS', 'CUSTOMERS', 'PRODUCTS', 'PAYMENTS', 'EVENTS'][i % 5];
    const fqName = `${db}.${schema}.${table}_${i}`;
    nodes.push({
      id: `t-${i}`,
      data: {
        label: table,
        index: i,
        level: lvl,
        childCount: childCounts.get(i) || 0,
        fqName,
      },
      position: { x, y },
      draggable: true,
    });
  }

  // Color edges by level bands
  const edgesColored = edges.map((e) => {
    const src = Number(e.source.slice(2));
    const lvl = levels[src] || 0;
    const hue = (lvl * 37) % 360;
    return { ...e, style: { stroke: `hsl(${hue} 70% 45%)` } } as Edge;
  });
  return { nodes, edges: edgesColored };
}