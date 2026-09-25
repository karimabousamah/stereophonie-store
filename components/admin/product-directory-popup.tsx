"use client";

import { Check, Pencil, Search, X } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

export type ProductDirectoryPopupOption = {
  key: string;
  label: string;
  selected: boolean;
};

type ProductDirectoryPopupProps = {
  dropdownRef: RefObject<HTMLDivElement | null>;
  searchRef?: RefObject<HTMLInputElement | null>;
  position: {
    top: number;
    left: number;
    width: number;
  };
  ariaLabel: string;
  directoryLabel: string;
  countLabelSingular: string;
  countLabelPlural: string;
  options: ProductDirectoryPopupOption[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onChoose: (option: ProductDirectoryPopupOption) => void;
  onEdit?: (option: ProductDirectoryPopupOption) => void;
  editingKey?: string | null;
  editValue?: string;
  editBusy?: boolean;
  onEditValueChange?: (value: string) => void;
  onEditSave?: (option: ProductDirectoryPopupOption) => void;
  onEditCancel?: () => void;
  searchable?: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  emptyTitle: string;
  emptyDescription?: string;
  multiselect?: boolean;
  statusContent?: ReactNode;
  footerContent?: ReactNode;
};

export default function ProductDirectoryPopup({
  dropdownRef,
  searchRef,
  position,
  ariaLabel,
  directoryLabel,
  countLabelSingular,
  countLabelPlural,
  options,
  activeIndex,
  onActiveIndexChange,
  onChoose,
  onEdit,
  editingKey = null,
  editValue = "",
  editBusy = false,
  onEditValueChange,
  onEditSave,
  onEditCancel,
  searchable = true,
  query = "",
  onQueryChange,
  onSearchKeyDown,
  searchPlaceholder = "Search...",
  searchAriaLabel = "Search",
  emptyTitle,
  emptyDescription,
  multiselect = false,
  statusContent,
  footerContent,
}: ProductDirectoryPopupProps) {
  const orderedOptions = [
    ...options.filter((option) => option.selected),
    ...options.filter((option) => !option.selected),
  ];

  return (
    <div
      ref={dropdownRef}
      className="st-admin-category-picker__dropdown"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      role="dialog"
      aria-label={ariaLabel}
    >
      {searchable ? (
        <div className="st-admin-directory-popup__header">
          <div className="st-admin-category-picker__search-shell">
            <Search
              className="h-[17px] w-[17px] shrink-0"
              aria-hidden="true"
            />

            <input
              ref={searchRef}
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="st-admin-category-picker__search-input"
              aria-label={searchAriaLabel}
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
            />

            {query ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange?.("");

                  requestAnimationFrame(() => {
                    searchRef?.current?.focus();
                  });
                }}
                className="st-admin-category-picker__clear"
                aria-label={`Clear ${searchAriaLabel.toLowerCase()}`}
              >
                <X
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>

          <div className="st-admin-category-picker__directory-heading">
            <span>{directoryLabel}</span>
            <small>
              {options.length}{" "}
              {options.length === 1
                ? countLabelSingular
                : countLabelPlural}
            </small>
          </div>
        </div>
      ) : (
        <div className="st-admin-category-picker__directory-heading st-admin-directory-popup__heading-only">
          <span>{directoryLabel}</span>
          <small>
            {options.length}{" "}
            {options.length === 1
              ? countLabelSingular
              : countLabelPlural}
          </small>
        </div>
      )}

      <div className="st-admin-category-picker__list">
        {options.length ? (
          <div
            role="listbox"
            aria-label={directoryLabel}
            aria-multiselectable={multiselect || undefined}
          >
              {orderedOptions.map((option, index) => {
                const active = index === activeIndex;
                const editing = editingKey === option.key;

                if (editing) {
                  return (
                    <div
                      key={option.key}
                      className="st-admin-category-picker__option st-admin-directory-popup__edit-row"
                    >
                      <input
                        type="text"
                        value={editValue}
                        disabled={editBusy}
                        autoFocus
                        aria-label={`Rename ${option.label}`}
                        className="st-admin-directory-popup__edit-input"
                        onChange={(event) => {
                          onEditValueChange?.(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();

                          if (event.key === "Enter") {
                            event.preventDefault();

                            if (!editBusy) {
                              onEditSave?.(option);
                            }
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();

                            if (!editBusy) {
                              onEditCancel?.();
                            }
                          }
                        }}
                      />

                      <div className="st-admin-directory-popup__edit-actions">
                        <button
                          type="button"
                          disabled={editBusy}
                          className="st-admin-directory-popup__edit-cancel"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditCancel?.();
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={editBusy || !editValue.trim()}
                          className="st-admin-directory-popup__edit-save"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditSave?.(option);
                          }}
                        >
                          {editBusy ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={option.selected}
                    onMouseEnter={() => onActiveIndexChange(index)}
                    onClick={() => onChoose(option)}
                    className={`st-admin-category-picker__option ${
                      option.selected ? "is-selected" : ""
                    } ${active ? "is-active" : ""}`}
                  >
                    <strong>{option.label}</strong>

                    <span className="st-admin-directory-popup__option-actions">
                      {onEdit ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Rename ${option.label}`}
                          title={`Rename ${option.label}`}
                          className="st-admin-directory-popup__edit-trigger"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onEdit(option);
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onEdit(option);
                            }
                          }}
                        >
                          <Pencil
                            className="h-3.5 w-3.5"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </span>
                      ) : null}

                      {option.selected ? (
                        <span className="st-admin-category-picker__check">
                          <Check
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                        </span>
                      ) : (
                        <small>Select</small>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="st-admin-category-picker__empty">
            <Search
              className="mx-auto h-5 w-5 text-black/20"
              aria-hidden="true"
            />

            <p>{emptyTitle}</p>

            {emptyDescription ? (
              <small>{emptyDescription}</small>
            ) : null}
          </div>
        )}
      </div>

      {statusContent}
      {footerContent}
    </div>
  );
}
