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
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const isUndoRedoRef = useRef(false); // Flag to prevent recording during undo/redo

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((state: HistoryState) => {
    // Don't record state changes during undo/redo operations
    if (isUndoRedoRef.current) {
      return;
    }

    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push(state);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        setCurrentIndex(prev => prev); // Index stays the same since we removed from beginning
        return newHistory;
      }
      
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      isUndoRedoRef.current = true;
      setCurrentIndex(prev => prev - 1);
      // The actual state restoration happens in the component
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      isUndoRedoRef.current = true;
      setCurrentIndex(prev => prev + 1);
      // The actual state restoration happens in the component
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [canRedo]);

  const getCurrentState = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return undefined;
  }, [history, currentIndex]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
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

