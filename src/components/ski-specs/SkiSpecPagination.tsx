import type { PaginationMeta } from '@/types/api.types';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface SkiSpecPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

/**
 * Generates an array of page numbers to display in pagination
 * Shows: first page, last page, current page, and 2 pages before/after current
 * Uses null for ellipsis positions
 */
const generatePageNumbers = (currentPage: number, totalPages: number): (number | null)[] => {
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  // Add ellipsis after first page if needed
  if (rangeStart > 2) {
    pages.push(null);
  }

  // Add pages around current page
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (rangeEnd < totalPages - 1) {
    pages.push(null);
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
};

export const SkiSpecPagination = ({ pagination, onPageChange }: SkiSpecPaginationProps) => {
  const { page, total_pages } = pagination;

  // Don't render if no pages or only one page
  if (total_pages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers(page, total_pages);
  const isPreviousDisabled = page === 1;
  const isNextDisabled = page === total_pages;

  return (
    <nav className="flex items-center justify-between gap-4 mt-6" aria-label="Ski specifications pagination">
      <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
        <span aria-current="page">Page {page}</span> of {total_pages}
      </div>
      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => !isPreviousDisabled && onPageChange(page - 1)}
              aria-disabled={isPreviousDisabled}
              className={isPreviousDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              tabIndex={isPreviousDisabled ? -1 : 0}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum, index) =>
            pageNum === null ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={pageNum === page}
                  aria-label={`Go to page ${pageNum}`}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => !isNextDisabled && onPageChange(page + 1)}
              aria-disabled={isNextDisabled}
              className={isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              tabIndex={isNextDisabled ? -1 : 0}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </nav>
  );
};
