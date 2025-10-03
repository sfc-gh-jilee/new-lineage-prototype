import { useMemo } from 'react';
import { CHILDREN, PARENTS } from '../lib/mockData';

export function usePeek(nodeId: string, dir: 'up' | 'down') {
  return {
    data: useMemo(
      () => ({
        count: dir === 'up' ? PARENTS[nodeId]?.length || 0 : CHILDREN[nodeId]?.length || 0,
      }),
      [nodeId, dir],
    ),
  } as const;
}

export function useExpand() {
  return {
    mutate(
      { nodeId, dir }: { nodeId: string; dir: 'up' | 'down' },
      opts: { onSuccess?: (res: { ids: string[] }) => void },
    ) {
      const ids = dir === 'up' ? PARENTS[nodeId] || [] : CHILDREN[nodeId] || [];
      // simulate async
      setTimeout(() => opts.onSuccess?.({ ids }), 0);
    },
  } as const;
}