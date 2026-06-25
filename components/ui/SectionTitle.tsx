import { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  description?: string;
}

export default function SectionTitle({
  children,
  description,
}: SectionTitleProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{children}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}
    </div>
  );
}
