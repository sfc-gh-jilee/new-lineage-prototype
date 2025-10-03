import { Button } from './Button';
import { Flex } from './Flex';
import React from 'react';

const drawerStyles = {
  panel: {
    height: '100%',
    width: 384,
    backgroundColor: '#fff',
    borderLeft: '1px solid #e2e8f0',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    transition: 'width 200ms ease',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  hidden: { 
    width: 0,
    borderLeft: 'none',
    boxShadow: 'none',
    overflow: 'hidden' as const,
  },
  visible: { 
    width: 384,
  },
  header: {
    padding: 16,
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  body: { 
    padding: 16,
    flex: 1,
    overflow: 'auto' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
};

export function Drawer({
  title,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      ...drawerStyles.panel,
      ...(isOpen ? drawerStyles.visible : drawerStyles.hidden)
    }}>
      <Flex justifyContent="space-between" alignItems="center" style={drawerStyles.header}>
        <strong>{title}</strong>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Flex>
      <div style={drawerStyles.body}>{children}</div>
    </div>
  );
}