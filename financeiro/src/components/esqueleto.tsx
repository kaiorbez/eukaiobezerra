export function Esqueleto() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-48 rounded-md bg-muted" />
      <div className="h-24 rounded-xl bg-muted/60" />
      <div className="h-64 rounded-xl bg-muted/60" />
    </div>
  );
}
