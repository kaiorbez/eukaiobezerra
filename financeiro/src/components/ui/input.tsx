import type * as React from "react";
import { cn } from "@/lib/utils";

export const estiloCampo =
  "flex h-9 w-full rounded-md border border-input bg-background/60 px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(estiloCampo, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(estiloCampo, "pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />;
}

export function Campo({
  rotulo,
  htmlFor,
  erro,
  dica,
  children,
  className,
}: {
  rotulo: string;
  htmlFor: string;
  erro?: string;
  dica?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{rotulo}</Label>
      {children}
      {erro ? (
        <p className="text-xs text-negativo">{erro}</p>
      ) : dica ? (
        <p className="text-xs text-muted-foreground">{dica}</p>
      ) : null}
    </div>
  );
}
