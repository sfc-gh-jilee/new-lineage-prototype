import React, { forwardRef } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  level?: 'reactflow' | 'nodecard'; // New prop to specify button level
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  onClick, 
  variant = 'secondary', 
  size = 'md',
  level = 'reactflow', // Default to ReactFlow level
  disabled = false,
  style = {},
  className = ''
}, ref) => {
  // Build CSS class names based on level
  const levelPrefix = level === 'reactflow' ? 'rf' : 'nc';
  const baseClass = `${levelPrefix}-button`;
  const variantClass = `${levelPrefix}-button-${variant}`;
  const sizeClass = `${levelPrefix}-button-${size}`;
  
  const classNames = [baseClass, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      onClick={disabled ? undefined : onClick}
      className={classNames}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

