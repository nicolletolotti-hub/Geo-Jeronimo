import React from 'react';
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'inline-flex items-center justify-center rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200',
  variants: {
    variant: {
      primary: 'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-400 shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30',
      danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-400',
      secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-slate-500',
      ghost: 'bg-transparent text-primary-400 hover:bg-primary-500/10 focus:ring-primary-400',
    },
    size: {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const Button = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={button({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, button };
