import React from 'react';

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <div className="pagination">
        <span>Showing 0 of 0</span>
      </div>
    );
  }

  return (
    <div className="pagination">
      <span>
        Showing {firstItem}–{lastItem} of {totalItems}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m10 3-5 5 5 5" />
          </svg>
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            type="button"
            className={safePage === page ? 'active' : ''}
            aria-current={safePage === page ? 'page' : undefined}
            onClick={() => onPageChange(page)}
            key={page}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          disabled={safePage === totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
