import React from 'react';

interface IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  level?: 'reactflow' | 'nodecard'; // New prop to specify button level
}

export function IconButton({ 
  children, 
  onClick, 
  disabled = false,
  'aria-label': ariaLabel,
  onMouseDown,
  style = {},
  className = '',
  variant = 'icon', // Default to icon variant for IconButton
  size = 'md',
  level = 'nodecard' // Default to NodeCard level for IconButton
}: IconButtonProps) {
  // Build CSS class names based on level
  const levelPrefix = level === 'reactflow' ? 'rf' : 'nc';
  const baseClass = `${levelPrefix}-button`;
  const variantClass = `${levelPrefix}-button-${variant}`;
  const sizeClass = `${levelPrefix}-button-${size}`;
  const disabledClass = disabled ? 'disabled' : '';
  
  const classNames = [baseClass, variantClass, sizeClass, disabledClass, className]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      aria-label={ariaLabel}
      className={classNames}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

