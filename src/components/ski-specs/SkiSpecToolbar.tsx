import { useState } from 'react';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import type { ListSkiSpecsQuery } from '@/types/api.types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface SkiSpecToolbarProps {
  search: string;
  sortBy: ListSkiSpecsQuery['sort_by'];
  sortOrder: ListSkiSpecsQuery['sort_order'];
  limit: number;
  onSearchChange: (value: string) => void;
  onSortByChange: (value: ListSkiSpecsQuery['sort_by']) => void;
  onSortOrderChange: (value: ListSkiSpecsQuery['sort_order']) => void;
  onLimitChange: (value: number) => void;
}

const SORT_OPTIONS: { value: ListSkiSpecsQuery['sort_by']; label: string }[] = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'length', label: 'Length' },
  { value: 'surface_area', label: 'Surface Area' },
  { value: 'relative_weight', label: 'Relative Weight' },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: 5, label: '5 per page' },
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 50, label: '50 per page' },
];

export const SkiSpecToolbar = ({
  search,
  sortBy,
  sortOrder,
  limit,
  onSearchChange,
  onSortByChange,
  onSortOrderChange,
  onLimitChange,
}: SkiSpecToolbarProps) => {
  const [localSearch, setLocalSearch] = useState(search);

  const debouncedSearchChange = useDebouncedCallback((value: string) => {
    onSearchChange(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearchChange(value);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search by name or description..."
          value={localSearch}
          onChange={handleSearchChange}
          className="pl-10"
          aria-label="Search ski specifications"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
          <SelectTrigger className="w-36" aria-label="Items per page">
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-44" aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-md" role="group" aria-label="Sort order">
          <Button
            variant={sortOrder === 'asc' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSortOrderChange('asc')}
            aria-label="Sort ascending"
            aria-pressed={sortOrder === 'asc'}
            className="rounded-r-none border-r border-border"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant={sortOrder === 'desc' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSortOrderChange('desc')}
            aria-label="Sort descending"
            aria-pressed={sortOrder === 'desc'}
            className="rounded-l-none"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
