import { useMemo } from 'react';
import { CHILDREN, PARENTS } from '../lib/mockData';
import { ALL_CATALOG_EDGES, ALL_CATALOG_NODES } from '../lib/catalogData';
import { ALL_NODES } from '../lib/mockData';

export function usePeek(nodeId: string, dir: 'up' | 'down') {
  // Create combined mappings that include both original and catalog edges
  const allChildren = useMemo(() => {
    const combined = { ...CHILDREN };
    ALL_CATALOG_EDGES.forEach(({ source, target }) => {
      (combined[source] ||= []).push(target);
    });
    return combined;
  }, []);

  const allParents = useMemo(() => {
    const combined = { ...PARENTS };
    ALL_CATALOG_EDGES.forEach(({ source, target }) => {
      (combined[target] ||= []).push(source);
    });
    return combined;
  }, []);

  return {
    data: useMemo(
      () => ({
        count: dir === 'up' ? allParents[nodeId]?.length || 0 : allChildren[nodeId]?.length || 0,
      }),
      [nodeId, dir, allParents, allChildren],
    ),
  } as const;
}

export function useExpand() {
  // Create combined mappings that include both original and catalog edges
  const allChildren = useMemo(() => {
    const combined = { ...CHILDREN };
    ALL_CATALOG_EDGES.forEach(({ source, target }) => {
      (combined[source] ||= []).push(target);
    });
    return combined;
  }, []);

  const allParents = useMemo(() => {
    const combined = { ...PARENTS };
    ALL_CATALOG_EDGES.forEach(({ source, target }) => {
      (combined[target] ||= []).push(source);
    });
    return combined;
  }, []);

  return {
    mutate(
      { nodeId, dir }: { nodeId: string; dir: 'up' | 'down' },
      opts: { onSuccess?: (res: { ids: string[] }) => void },
    ) {
      // First try to get relationships from node metadata (dynamic)
      const allNodes = [...ALL_NODES, ...ALL_CATALOG_NODES];
      const node = allNodes.find(n => n.id === nodeId);
      
      let ids: string[] = [];
      
      if (node && (node as any).metadata) {
        const metadata = (node as any).metadata;
        
        if (dir === 'up' && metadata.upstreamReferences) {
          // Use dynamic upstream references
          ids = metadata.upstreamReferences.map((ref: string) => {
            // Try to find node by reference (ID, name, or label)
            const foundNode = allNodes.find(n => 
              n.id === ref || n.name === ref || n.label === ref
            );
            return foundNode?.id;
          }).filter(Boolean);
        } else if (dir === 'down' && metadata.downstreamReferences) {
          // Use dynamic downstream references
          ids = metadata.downstreamReferences.map((ref: string) => {
            // Try to find node by reference (ID, name, or label)
            const foundNode = allNodes.find(n => 
              n.id === ref || n.name === ref || n.label === ref
            );
            return foundNode?.id;
          }).filter(Boolean);
        }
      }
      
      // Fallback to hardcoded relationships if no dynamic relationships found
      if (ids.length === 0) {
        ids = dir === 'up' ? allParents[nodeId] || [] : allChildren[nodeId] || [];
      }
      
      // simulate async
      setTimeout(() => opts.onSuccess?.({ ids }), 0);
    },
  } as const;
}