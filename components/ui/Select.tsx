import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[] | readonly string[];
  error?: string;
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, placeholder, id, className, required, ...props },
  ref
) {
  const selectId = id || props.name;
  const normalized: Option[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-emergency"> *</span>}
      </label>
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={cn(
          "w-full min-h-[48px] rounded-xl border bg-white px-3.5 py-3 text-base text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-trust/60",
          error ? "border-emergency" : "border-gray-300 focus:border-trust",
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-emergency">{error}</p>}
    </div>
  );
});

export default Select;
