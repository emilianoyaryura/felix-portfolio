"use client";

import { useMemo, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sameTag } from "@/lib/validate";

type TagComboboxProps = {
  allTags: string[];
  value: string[];
  onChange: (tags: string[]) => void;
};

// Chips removibles + input con sugerencias y creación inline ("Crear «x»").
export default function TagCombobox({ allTags, value, onChange }: TagComboboxProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTags
      .filter((t) => !value.some((v) => sameTag(v, t)))
      .filter((t) => (q ? t.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [allTags, value, query]);

  const canCreate =
    query.trim().length > 0 &&
    !allTags.some((t) => sameTag(t, query.trim())) &&
    !value.some((t) => sameTag(t, query.trim()));

  const add = (tag: string) => {
    const clean = tag.trim().replace(/\s+/g, " ");
    if (!clean || value.some((t) => sameTag(t, clean))) return;
    onChange([...value, clean]);
    setQuery("");
    // Cerrar el dropdown tras agregar: abierto tapa lo que hay debajo (p.ej. el
    // botón Confirmar) y un click ahí agregaría otro tag sin querer.
    setFocused(false);
    inputRef.current?.blur();
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => !sameTag(t, tag)));
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs bg-gray-100 text-gray-600"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={`Quitar ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canCreate) add(query);
              else if (suggestions.length > 0) add(suggestions[0]);
            }
          }}
          placeholder="Agregar tag…"
        />
        {focused && (suggestions.length > 0 || canCreate) && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white p-1 smooth-shadow max-h-48 overflow-y-auto">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(tag)}
                className="flex w-full items-center rounded-lg px-3 py-1.5 text-sm text-left hover:bg-gray-100"
              >
                {tag}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(query)}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-left text-primary hover:bg-gray-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear «{query.trim()}»
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
