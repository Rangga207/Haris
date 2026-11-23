import * as React from "react";
import { cn } from "./button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy">
            {label}
            {props.required && <span className="text-semantic-red ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-md border border-borderline bg-white px-3 py-2 text-sm text-body placeholder:text-muted focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky disabled:bg-slate-50 disabled:text-muted transition-colors",
            error && "border-semantic-red focus:border-semantic-red focus:ring-semantic-red/20",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && <p className="text-xs font-medium text-semantic-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
