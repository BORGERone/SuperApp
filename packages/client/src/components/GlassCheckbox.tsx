import React from 'react';

interface GlassCheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  title?: string;
}

/**
 * Glassmorphism checkbox with animated check. Pure CSS animation —
 * styles live in `index.css` under `.glass-checkbox`.
 */
export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({
  checked,
  onChange,
  onClick,
  size = 'md',
  disabled,
  className = '',
  title,
  ...aria
}) => {
  const sizeClass = size === 'sm' ? 'size-sm' : size === 'lg' ? 'size-lg' : '';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (!e.defaultPrevented && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      title={title}
      disabled={disabled}
      onClick={handleClick}
      className={`glass-checkbox ${sizeClass} ${checked ? 'is-checked' : ''} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
};
