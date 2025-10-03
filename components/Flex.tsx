import React from 'react';

interface FlexProps {
  children: React.ReactNode;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  gap?: string | number;
  style?: React.CSSProperties;
}

export function Flex({ 
  children, 
  justifyContent = 'flex-start', 
  alignItems = 'flex-start',
  gap,
  style = {}
}: FlexProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent,
        alignItems,
        gap,
        ...style
      }}
    >
      {children}
    </div>
  );
}

