"use client";

import { useMemo, useState } from "react";
import { Home, Tag as TagIcon, Trash2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { sameTag } from "@/lib/validate";
import type { AdminPhoto } from "../lib/admin-types";

type SelectionBarProps = {
  selected: AdminPhoto[];
  allTags: string[];
  onToggleTag: (tag: string) => void; // agrega a las que no lo tienen / quita de todas
  onSetHome: (inHome: boolean) => void;
  onDelete: () => void;
  onClear: () => void;
};

export default function SelectionBar({
  selected,
  allTags,
  onToggleTag,
  onSetHome,
  onDelete,
  onClear,
}: SelectionBarProps) {
  const [query, setQuery] = useState("");

  const allInHome = selected.every((p) => p.inHome);
  const n = selected.length;

  // Estado de cada tag sobre la selección: all | some | none.
  const tagState = useMemo(() => {
    const map = new Map<string, "all" | "some" | "none">();
    for (const tag of allTags) {
      const count = selected.filter((p) =>
        p.tags.some((t) => sameTag(t, tag))
      ).length;
      map.set(tag, count === 0 ? "none" : count === n ? "all" : "some");
    }
    return map;
  }, [allTags, selected, n]);

  const visibleTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allTags.filter((t) => t.toLowerCase().includes(q)) : allTags;
  }, [allTags, query]);

  const canCreate =
    query.trim().length > 0 && !allTags.some((t) => sameTag(t, query.trim()));

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto">
      <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 smooth-shadow overflow-x-auto scrollbar-hide">
        <span className="text-sm font-medium tabular-nums whitespace-nowrap pr-1">
          {n} {n === 1 ? "foto" : "fotos"}
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <TagIcon className="w-3.5 h-3.5" />
              Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" side="top" className="w-60 p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  onToggleTag(query.trim().replace(/\s+/g, " "));
                  setQuery("");
                }
              }}
              placeholder="Buscar o crear tag…"
              className="mb-1.5 h-8"
            />
            <div className="max-h-48 overflow-y-auto">
              {visibleTags.map((tag) => {
                const state = tagState.get(tag) ?? "none";
                return (
                  <label
                    key={tag}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100"
                  >
                    <Checkbox
                      checked={
                        state === "all"
                          ? true
                          : state === "some"
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={() => onToggleTag(tag)}
                    />
                    <span className="truncate">{tag}</span>
                  </label>
                );
              })}
              {canCreate && (
                <button
                  onClick={() => {
                    onToggleTag(query.trim().replace(/\s+/g, " "));
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-left text-primary hover:bg-gray-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear «{query.trim()}»
                </button>
              )}
              {visibleTags.length === 0 && !canCreate && (
                <p className="px-2 py-1.5 text-sm text-gray-400">Sin tags</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="sm" onClick={() => onSetHome(!allInHome)}>
          <Home className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">
            {allInHome ? "Quitar de home" : "Mostrar en home"}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-500 md:hover:bg-red-50 md:hover:border-red-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Borrar
        </Button>

        <button
          onClick={onClear}
          aria-label="Deseleccionar todo"
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
