"use client";

import { Button } from "@/components/ui/button";

// Error boundary del admin: cualquier crash render/data cae acá en vez de a la
// pantalla en blanco de Next.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-background text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-medium mb-2">Algo salió mal</h1>
        <p className="text-sm text-gray-500 mb-1">
          El admin tuvo un error inesperado. Tus fotos están a salvo — nada se
          borra ni se publica por un error de pantalla.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            ref: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-3">
          Reintentar
        </Button>
      </div>
    </div>
  );
}
