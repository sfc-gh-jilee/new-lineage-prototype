import React, {
    createContext,
    useContext,
    useMemo,
    useState,
    type Dispatch,
    type SetStateAction,
  } from 'react';
  
  type ExpandedMap = Record<string, Set<string>>;
  
  type GraphVisibility = {
    visibleNodeIds: Set<string>;
    setVisibleNodeIds: Dispatch<SetStateAction<Set<string>>>;
    expandedUpstreamByNode: ExpandedMap;
    expandedDownstreamByNode: ExpandedMap;
    setExpandedUpstreamByNode: Dispatch<SetStateAction<ExpandedMap>>;
    setExpandedDownstreamByNode: Dispatch<SetStateAction<ExpandedMap>>;
  };
  
  const Ctx = createContext<GraphVisibility | null>(null);
  
  export function GraphProvider({ children }: { children: React.ReactNode }) {
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
    const [expandedUpstreamByNode, setExpandedUpstreamByNode] = useState<ExpandedMap>({});
    const [expandedDownstreamByNode, setExpandedDownstreamByNode] = useState<ExpandedMap>({});
  
    const value = useMemo(
      () => ({
        visibleNodeIds,
        setVisibleNodeIds,
        expandedUpstreamByNode,
        expandedDownstreamByNode,
        setExpandedUpstreamByNode,
        setExpandedDownstreamByNode,
      }),
      [visibleNodeIds, expandedUpstreamByNode, expandedDownstreamByNode],
    );
  
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }
  
  export function useGraphVisibility() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useGraphVisibility must be used within GraphProvider');
    return ctx;
  }