"use client";

import {
  ChevronDown,
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { createPortal } from "react-dom";

import ProductDirectoryPopup from "@/components/admin/product-directory-popup";

export type ProductOrganizationPickerOption = {
  id: string;
  name: string;
};

type Props = {
  label: "Category" | "Subcategory";
  options: ProductOrganizationPickerOption[];
  selectedIds: string[];
  onSelectionChange: (
    selectedIds: string[],
  ) => void;
  disabled?: boolean;
  placeholder?: string;
};

function normalize(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export default function ProductOrganizationMultiPicker({
  label,
  options,
  selectedIds,
  onSelectionChange,
  disabled = false,
  placeholder,
}: Props) {
  const triggerRef =
    useRef<HTMLButtonElement>(null);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const searchRef =
    useRef<HTMLInputElement>(null);

  const [query, setQuery] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [
    popupPresent,
    setPopupPresent,
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(-1);

  const [
    position,
    setPosition,
  ] = useState({
    top: 0,
    left: 0,
    width: 320,
  });

  const normalizedQuery =
    normalize(query);

  const selectedOptions =
    selectedIds.flatMap(
      (id) => {
        const option =
          options.find(
            (candidate) =>
              candidate.id === id,
          );

        return option
          ? [option]
          : [];
      },
    );

  const filtered =
    useMemo(
      () =>
        [...options]
          .filter(
            (option) =>
              !normalizedQuery ||
              normalize(
                option.name,
              ).includes(
                normalizedQuery,
              ),
          )
          .sort(
            (first, second) =>
              first.name.localeCompare(
                second.name,
                undefined,
                {
                  sensitivity:
                    "base",
                  numeric: true,
                },
              ),
          ),
      [
        options,
        normalizedQuery,
      ],
    );

  const triggerLabel =
    selectedOptions.length > 1
      ? `${
          selectedOptions[0]
            ?.name ?? label
        } +${
          selectedOptions.length -
          1
        }`
      : selectedOptions[0]
          ?.name ??
        placeholder ??
        `Select ${label.toLowerCase()}`;

  function updatePosition() {
    const trigger =
      triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect =
      trigger.getBoundingClientRect();

    const viewportPadding = 16;

    const desiredWidth =
      Math.min(
        Math.max(
          rect.width,
          300,
        ),
        320,
      );

    const maximumWidth =
      Math.min(
        desiredWidth,
        window.innerWidth -
          32,
      );

    let left =
      rect.left;

    if (
      left +
        maximumWidth >
      window.innerWidth -
        viewportPadding
    ) {
      left =
        window.innerWidth -
        maximumWidth -
        viewportPadding;
    }

    if (
      left <
      viewportPadding
    ) {
      left =
        viewportPadding;
    }

    setPosition({
      top:
        rect.bottom + 8,
      left,
      width:
        maximumWidth,
    });
  }

  useEffect(() => {
    if (open) {
      setPopupPresent(true);
      return;
    }

    if (!popupPresent) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setPopupPresent(
            false,
          );
        },
        360,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    open,
    popupPresent,
  ]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handleViewportChange =
      () =>
        updatePosition();

    window.addEventListener(
      "resize",
      handleViewportChange,
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange,
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true,
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          searchRef.current
            ?.focus();
        },
        30,
      );

    function handlePointerDown(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        triggerRef.current
          ?.contains(target) ||
        dropdownRef.current
          ?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
    }

    function handleEscape(
      event: globalThis.KeyboardEvent,
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);

      triggerRef.current
        ?.focus();
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.clearTimeout(
        timeout,
      );

      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  function choose(
    id: string,
  ) {
    if (
      selectedIds.includes(
        id,
      )
    ) {
      onSelectionChange(
        selectedIds.filter(
          (selectedId) =>
            selectedId !== id,
        ),
      );

      return;
    }

    onSelectionChange([
      ...selectedIds,
      id,
    ]);
  }

  function handleSearchKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();

      if (!filtered.length) {
        return;
      }

      setActiveIndex(
        (current) =>
          current <
          filtered.length - 1
            ? current + 1
            : 0,
      );
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();

      if (!filtered.length) {
        return;
      }

      setActiveIndex(
        (current) =>
          current > 0
            ? current - 1
            : filtered.length -
              1,
      );
    }

    if (
      event.key ===
        "Enter" &&
      activeIndex >= 0 &&
      filtered[
        activeIndex
      ]
    ) {
      event.preventDefault();

      choose(
        filtered[
          activeIndex
        ].id,
      );
    }
  }

  const dropdown =
    popupPresent
      ? createPortal(
          <ProductDirectoryPopup
            open={open}
            dropdownRef={
              dropdownRef
            }
            searchRef={
              searchRef
            }
            position={
              position
            }
            ariaLabel={`Choose product ${label.toLowerCase()}`}
            directoryLabel={`${label} directory`}
            countLabelSingular={label.toLowerCase()}
            countLabelPlural={`${label.toLowerCase()}s`}
            multiselect
            options={filtered.map(
              (option) => ({
                key:
                  option.id,
                label:
                  option.name,
                selected:
                  selectedIds.includes(
                    option.id,
                  ),
              }),
            )}
            activeIndex={
              activeIndex
            }
            onActiveIndexChange={
              setActiveIndex
            }
            onChoose={(
              option,
            ) => {
              choose(
                option.key,
              );
            }}
            query={query}
            onQueryChange={(
              value,
            ) => {
              setQuery(value);
              setActiveIndex(-1);
            }}
            onSearchKeyDown={
              handleSearchKeyDown
            }
            searchPlaceholder={`Search ${label.toLowerCase()}s...`}
            searchAriaLabel={`Search ${label.toLowerCase()}s`}
            emptyTitle={`No matching ${label.toLowerCase()}`}
            emptyDescription={
              label ===
              "Subcategory"
                ? "Choose another category or create the subcategory from Categories."
                : "No categories match this search."
            }
          />,
          document.body,
        )
      : null;

  return (
    <div className="st-admin-category-picker">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`st-admin-category-picker__trigger ${
          open
            ? "is-open"
            : ""
        }`}
        onClick={() => {
          if (disabled) {
            return;
          }

          setOpen(
            (current) =>
              !current,
          );

          if (!open) {
            requestAnimationFrame(
              updatePosition,
            );
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="st-admin-category-picker__trigger-icon">
          <Search className="h-4 w-4" />
        </span>

        <span className="st-admin-category-picker__trigger-copy">
          <small>
            {label}
          </small>

          <strong>
            {triggerLabel}
          </strong>
        </span>

        <ChevronDown className="st-admin-category-picker__chevron h-4 w-4" />
      </button>

      {selectedIds.length >
      0 ? (
        <button
          type="button"
          onClick={() =>
            onSelectionChange(
              [],
            )
          }
          className="st-admin-organization-clear-chip-v2"
        >
          <span>
            Clear{" "}
            {label.toLowerCase()}
            {selectedIds.length >
            1
              ? "s"
              : ""}
          </span>

          <X aria-hidden="true" />
        </button>
      ) : null}

      {dropdown}
    </div>
  );
}
