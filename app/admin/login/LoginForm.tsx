"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-border rounded-xl p-6 smooth-shadow-sm">
        <h1 className="font-serif text-2xl mb-1">Félix Gómez Roca</h1>
        <p className="text-sm text-gray-500 mb-6">Panel de administración</p>
        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="user" className="text-sm text-gray-500">
              Usuario
            </Label>
            <Input
              id="user"
              name="user"
              autoComplete="username"
              autoFocus
              required
              defaultValue={state.user ?? ""}
              key={state.user}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-gray-500">
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              error={Boolean(state.error)}
            />
          </div>
          {state.error && (
            <p className="text-xs text-red-500">{state.error}</p>
          )}
          <Button type="submit" className="w-full mt-2" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
