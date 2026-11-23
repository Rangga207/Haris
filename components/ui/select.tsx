import * as React from "react";
import { cn } from "./button";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-navy">
            {label}
            {props.required && <span className="text-semantic-red ml-1">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "w-full rounded-md border border-borderline bg-white px-3 py-2 text-sm text-body focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky disabled:bg-slate-50 disabled:text-muted transition-colors",
            error && "border-semantic-red focus:border-semantic-red focus:ring-semantic-red/20",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && <p className="text-xs font-medium text-semantic-red">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
