import { useState, useCallback, useRef } from 'react';

export interface HistoryState {
  // Node positions
  nodePositions: Record<string, { x: number; y: number }>;
  // Visible nodes
  visibleNodeIds: Set<string>;
  // Expansion states
  expandedUpstreamByNode: Record<string, Set<string>>;
  expandedDownstreamByNode: Record<string, Set<string>>;
  // Viewport
  viewport: { x: number; y: number; zoom: number };
}

interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushState: (state: HistoryState) => void;
  getCurrentState: () => HistoryState | undefined;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;

export function useHistory(): UseHistoryReturn {
  const historyRef = useRef<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [, forceUpdate] = useState({});
  const isUndoRedoRef = useRef(false); // Flag to prevent recording during undo/redo

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < historyRef.current.length - 1;

  const pushState = useCallback((state: HistoryState) => {
    // Don't record state changes during undo/redo operations
    if (isUndoRedoRef.current) {
      console.log('⏸️ Skipping state push during undo/redo');
      return;
    }

    console.log('💾 Pushing state to history', { currentIndex, historyLength: historyRef.current.length });
    
    // Remove any future states if we're not at the end
    historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    
    // Add new state
    historyRef.current.push(state);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
      // Index stays the same since we removed from beginning
    } else {
      setCurrentIndex(historyRef.current.length - 1);
    }
    
    forceUpdate({});
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      console.log('⏪ Undo from index', currentIndex, 'to', currentIndex - 1);
      isUndoRedoRef.current = true;
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 500);
    }
  }, [canUndo, currentIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      console.log('⏩ Redo from index', currentIndex, 'to', currentIndex + 1);
      isUndoRedoRef.current = true;
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 500);
    }
  }, [canRedo, currentIndex]);

  const getCurrentState = useCallback(() => {
    const state = historyRef.current[currentIndex];
    console.log('📖 Getting current state at index', currentIndex, state ? '✅' : '❌');
    return state;
  }, [currentIndex]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setCurrentIndex(-1);
    forceUpdate({});
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushState,
    getCurrentState,
    clearHistory
  };
}

