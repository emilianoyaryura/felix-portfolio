"use client";

import { Search, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { sameTag } from "@/lib/validate";
import type { HomeFilter } from "../lib/admin-types";

type ToolbarProps = {
  search: string;
  onSearch: (v: string) => void;
  allTags: string[];
  tagFilter: string[];
  onTagFilter: (tags: string[]) => void;
  homeFilter: HomeFilter;
  onHomeFilter: (v: HomeFilter) => void;
  filteredCount: number;
  selectionCount: number;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
};

export default function Toolbar({
  search,
  onSearch,
  allTags,
  tagFilter,
  onTagFilter,
  homeFilter,
  onHomeFilter,
  filteredCount,
  selectionCount,
  onSelectAllFiltered,
  onClearSelection,
}: ToolbarProps) {
  const hasFilter =
    search.trim() !== "" || tagFilter.length > 0 || homeFilter !== "all";

  const toggleTag = (tag: string) => {
    if (tagFilter.some((t) => sameTag(t, tag))) {
      onTagFilter(tagFilter.filter((t) => !sameTag(t, tag)));
    } else {
      onTagFilter([...tagFilter, tag]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        {/* bg-white: sobre el fondo paper, el gris del DS no se distingue. */}
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por título o alt…"
          className="pl-9 bg-white"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="relative inline-flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-base lg:text-sm text-gray-700 focus:border-gray-300 transition-all duration-300 outline-none">
            <TagIcon className="w-4 h-4 text-gray-500" />
            Tags
            {tagFilter.length > 0 && (
              <span className="absolute -right-1 -top-1 w-[9px] h-[9px] rounded-full bg-primary border-2 border-background" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          {allTags.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              Todavía no hay tags
            </p>
          ) : (
            allTags.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
              >
                <Checkbox
                  checked={tagFilter.some((t) => sameTag(t, tag))}
                  onCheckedChange={() => toggleTag(tag)}
                />
                <span className="truncate">{tag}</span>
              </label>
            ))
          )}
          {tagFilter.length > 0 && (
            <button
              onClick={() => onTagFilter([])}
              className="mt-1 flex w-full items-center rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 border-t border-gray-100 pt-2"
            >
              Limpiar filtro de tags
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Select
        value={homeFilter}
        onValueChange={(v) => onHomeFilter(v as HomeFilter)}
      >
        <SelectTrigger className="w-[150px] bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="home">En home</SelectItem>
          <SelectItem value="out">Fuera de home</SelectItem>
        </SelectContent>
      </Select>

      {selectionCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Deseleccionar ({selectionCount})
        </Button>
      ) : (
        filteredCount > 0 &&
        hasFilter && (
          <Button variant="subtle" size="sm" onClick={onSelectAllFiltered}>
            Seleccionar las {filteredCount}
          </Button>
        )
      )}
    </div>
  );
}
