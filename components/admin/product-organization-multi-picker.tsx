"use client";

import {
  ChevronDown,
  LoaderCircle,
  Plus,
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
import {
  createCategoryInline,
  createSubcategoryInline,
  loadCategoryCreationHierarchyInline,
  renameCategoryInline,
  renameSubcategoryInline,
} from "@/components/admin/product-category-picker-actions";

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
  onCreated?: (item: ProductOrganizationPickerOption & {
    category_id?: string;
    parent_subcategory_id?: string | null;
  }) => void;
  onRenamed?: (item: ProductOrganizationPickerOption) => void;
  parentCategories?: ProductOrganizationPickerOption[];
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
  onCreated,
  onRenamed,
  parentCategories = [],
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

  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [creationName, setCreationName] = useState("");
  const [creationRoots, setCreationRoots] = useState<
    ProductOrganizationPickerOption[]
  >([]);
  const [creationNodes, setCreationNodes] = useState<Array<{
    id: string;
    name: string;
    category_id: string;
    parent_subcategory_id: string | null;
  }>>([]);
  const [creationRootId, setCreationRootId] = useState("");
  const [creationParentId, setCreationParentId] = useState("");
  const [error, setError] = useState("");
  const [creationMessage, setCreationMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editBusy, setEditBusy] = useState(false);

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

  const cleanQuery = query.replace(/\s+/g, " ").trim();
  const canCreate =
    cleanQuery.length > 0 &&
    !options.some(
      (option) => normalize(option.name) === normalize(cleanQuery),
    );

  const availableParents = creationNodes
    .filter((node) => node.category_id === creationRootId)
    .sort((first, second) => first.name.localeCompare(second.name));

  function parentPath(node: (typeof creationNodes)[number]) {
    const names = [node.name];
    const seen = new Set([node.id]);
    let parentId = node.parent_subcategory_id;

    while (parentId && !seen.has(parentId)) {
      const parent = creationNodes.find((item) => item.id === parentId);
      if (!parent) break;
      names.unshift(parent.name);
      seen.add(parentId);
      parentId = parent.parent_subcategory_id;
    }

    return names.join(" / ");
  }

  async function beginCreation() {
    if (!canCreate || creating || editBusy) return;

    setError("");
    setCreationMessage("");

    if (label === "Category") {
      setCreating(true);

      try {
        const result = await createCategoryInline(cleanQuery);

        if (!result.ok) {
          setError(result.error);
          return;
        }

        const created = result.category;
        onCreated?.(created);

        if (!selectedIds.includes(created.id)) {
          onSelectionChange([...selectedIds, created.id]);
        }

        setQuery("");
        setActiveIndex(-1);
        setCreationMessage(
          result.created
            ? `${created.name} was created and selected.`
            : `${created.name} was selected.`,
        );
      } catch {
        setError("The category could not be created. Please try again.");
      } finally {
        setCreating(false);
      }

      return;
    }

    setCreating(true);

    try {
      const result = await loadCategoryCreationHierarchyInline();

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const roots = result.categories.filter((category) =>
        parentCategories.some((item) => item.id === category.id),
      );

      if (roots.length === 0) {
        setError("Select the parent category first.");
        return;
      }

      setCreationRoots(roots);
      setCreationNodes(result.subcategories);
      setCreationRootId(roots.length === 1 ? roots[0].id : "");
      setCreationParentId("");
      setCreationName(cleanQuery);
      setCreateMode(true);
    } catch {
      setError("The category hierarchy could not be loaded.");
    } finally {
      setCreating(false);
    }
  }

  async function finishSubcategoryCreation() {
    if (!creationName || !creationRootId || creating) return;

    setCreating(true);
    setError("");

    try {
      const result = await createSubcategoryInline(
        creationName,
        creationRootId,
        creationParentId || null,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const created = {
        id: result.category.id,
        name: result.category.name,
        category_id: result.category.categoryId,
        parent_subcategory_id: result.category.parentSubcategoryId,
      };

      onCreated?.(created);

      if (!selectedIds.includes(created.id)) {
        onSelectionChange([...selectedIds, created.id]);
      }

      setCreateMode(false);
      setCreationName("");
      setCreationParentId("");
      setQuery("");
      setActiveIndex(-1);
      setCreationMessage(`${created.name} was created and selected.`);
    } catch {
      setError("The subcategory could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: string) {
    const current = options.find((option) => option.id === id);
    const name = editValue.replace(/\s+/g, " ").trim();

    if (!current || !name || editBusy) return;

    if (name === current.name) {
      setEditingId(null);
      setEditValue("");
      return;
    }

    setEditBusy(true);
    setError("");

    try {
      const result =
        label === "Category"
          ? await renameCategoryInline(id, name)
          : await renameSubcategoryInline(id, name);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onRenamed?.(result.category);
      setEditingId(null);
      setEditValue("");
      setQuery("");
      setActiveIndex(-1);
      setCreationMessage(
        `${result.category.name} was renamed successfully.`,
      );
    } catch {
      setError(`The ${label.toLowerCase()} could not be renamed.`);
    } finally {
      setEditBusy(false);
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
            onEdit={(option) => {
              const item = options.find(
                (candidate) => candidate.id === option.key,
              );
              if (!item) return;
              setEditingId(item.id);
              setEditValue(item.name);
              setError("");
              setCreationMessage("");
            }}
            editingKey={editingId}
            editValue={editValue}
            editBusy={editBusy}
            onEditValueChange={setEditValue}
            onEditSave={(option) => {
              void saveRename(option.key);
            }}
            onEditCancel={() => {
              setEditingId(null);
              setEditValue("");
              setError("");
            }}
            statusContent={
              <>
                {error ? (
                  <div className="border-t border-black/[0.07] px-4 py-3 text-[12px] font-medium text-red-600">
                    {error}
                  </div>
                ) : null}
                {creationMessage ? (
                  <div className="border-t border-black/[0.07] px-4 py-3 text-[12px] font-medium text-black/55">
                    {creationMessage}
                  </div>
                ) : null}
              </>
            }
            footerContent={
              createMode && label === "Subcategory" ? (
                <div className="st-admin-picker-create-footer-v40">
                  <div className="w-full space-y-3 px-3 py-3">
                    <strong className="block text-sm">
                      Add “{creationName}”
                    </strong>

                    <select
                      aria-label="Parent category"
                      value={creationRootId}
                      onChange={(event) => {
                        setCreationRootId(event.target.value);
                        setCreationParentId("");
                      }}
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black"
                    >
                      {creationRoots.length > 1 ? (
                        <option value="">Choose parent category</option>
                      ) : null}
                      {creationRoots.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {creationRootId ? (
                      <select
                        aria-label="Parent subcategory"
                        value={creationParentId}
                        onChange={(event) =>
                          setCreationParentId(event.target.value)
                        }
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black"
                      >
                        <option value="">
                          Directly under selected category
                        </option>
                        {availableParents.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parentPath(parent)}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => {
                          setCreateMode(false);
                          setError("");
                        }}
                        className="text-sm font-medium text-black/60"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={creating || !creationRootId}
                        onClick={() => void finishSubcategoryCreation()}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {creating ? "Creating..." : "Create and select"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : canCreate ? (
                <div className="st-admin-picker-create-footer-v40">
                  <button
                    type="button"
                    disabled={creating || editBusy}
                    onClick={() => void beginCreation()}
                    className="st-admin-picker-create-action-v40"
                  >
                    <span className="st-admin-picker-create-content-v40">
                      <span className="st-admin-picker-create-icon-v40">
                        {creating ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                          />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                      <span className="st-admin-picker-create-copy-v40">
                        <strong>
                          {creating
                            ? "Preparing..."
                            : `Add “${cleanQuery}”`}
                        </strong>
                        <small>Create and select automatically</small>
                      </span>
                    </span>
                  </button>
                </div>
              ) : null
            }
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
                ? "You can create this subcategory without leaving the product."
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
