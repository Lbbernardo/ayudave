interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({
  label = "Cargando…",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-trust"
        aria-hidden
      />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
