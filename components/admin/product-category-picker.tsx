"use client";

import {
 Check,
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
  renameCategoryInline,
} from "@/components/admin/product-category-picker-actions";

export type ProductCategoryOption = {
 id: string;
 name: string;
};

type Props = {
 categories: ProductCategoryOption[];
 defaultValue?: string;
 name?: string;
 onCategoryChange?: (category: ProductCategoryOption | null) => void;
};

function normalize(value: string) {
 return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function ProductCategoryPicker({
 categories,
 defaultValue = "",
 name = "category_id",
 onCategoryChange,
}: Props) {
 const triggerRef = useRef<HTMLButtonElement>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const searchRef = useRef<HTMLInputElement>(null);

 const [options, setOptions] = useState(categories);
 const [selectedId, setSelectedId] = useState(defaultValue);
 const [query, setQuery] = useState("");
 const [open, setOpen] = useState(false);
 const [activeIndex, setActiveIndex] = useState(-1);
 const [mounted, setMounted] = useState(false);
 const [creating, setCreating] = useState(false);
 const [error, setError] = useState("");
 const [creationMessage, setCreationMessage] = useState("");
 const [editingCategoryId, setEditingCategoryId] =
   useState<string | null>(null);
 const [editValue, setEditValue] = useState("");
 const [editBusy, setEditBusy] = useState(false);

 const [position, setPosition] = useState({
 top: 0,
 left: 0,
 width: 320,
  });

 useEffect(() => {
 setMounted(true);
  }, []);

 useEffect(() => {
 setOptions(categories);
  }, [categories]);

 useEffect(() => {
 setSelectedId(defaultValue);
  }, [defaultValue]);

 const selectedCategory =
 options.find((category) => category.id === selectedId) ?? null;

 const cleanQuery = normalize(query);

 const filtered = useMemo(() => {
 if (!cleanQuery) {
 return options;
    }

 return options.filter((category) =>
 normalize(category.name).includes(cleanQuery),
    );
  }, [options, cleanQuery]);

 const exactMatch = options.some(
    (category) => normalize(category.name) === cleanQuery,
  );

 const canCreate = Boolean(cleanQuery && !exactMatch);

 function calculatePosition() {
 const button = triggerRef.current;

 if (!button) {
 return;
    }

 const rect = button.getBoundingClientRect();
 const padding = 16;

 let width = Math.min(Math.max(rect.width, 300), 320);

 width = Math.min(width, window.innerWidth - padding * 2);

 let left = rect.left;

 if (left + width > window.innerWidth - padding) {
 left = window.innerWidth - width - padding;
    }

 left = Math.max(padding, left);

 setPosition({
 top: rect.bottom + 8,
 left,
 width,
    });
  }

 useLayoutEffect(() => {
 if (!open) {
 return;
    }

 calculatePosition();

 const update = () => calculatePosition();

 window.addEventListener("resize", update);
 window.addEventListener("scroll", update, true);

 return () => {
 window.removeEventListener("resize", update);
 window.removeEventListener("scroll", update, true);
    };
  }, [open]);

 useEffect(() => {
 if (!open) {
 return;
    }

 const timer = window.setTimeout(() => {
 searchRef.current?.focus();
    }, 30);

 function outside(event: MouseEvent) {
 const target = event.target as Node;

 if (
 triggerRef.current?.contains(target) ||
 dropdownRef.current?.contains(target)
      ) {
 return;
      }

 setOpen(false);
 setActiveIndex(-1);
    }

 function escape(event: globalThis.KeyboardEvent) {
 if (event.key === "Escape") {
 setOpen(false);
 setActiveIndex(-1);
 triggerRef.current?.focus();
      }
    }

 document.addEventListener("mousedown", outside);
 document.addEventListener("keydown", escape);

 return () => {
 window.clearTimeout(timer);
 document.removeEventListener("mousedown", outside);
 document.removeEventListener("keydown", escape);
    };
  }, [open]);

 function choose(category: ProductCategoryOption) {
 setSelectedId(category.id);
 setQuery("");
 setOpen(false);
 setActiveIndex(-1);
 setError("");
 setCreationMessage("");

 onCategoryChange?.(category);
  }

 async function createRequestedCategory() {
 const requestedName = query.replace(/\s+/g, " ").trim();

 if (!requestedName || creating || !canCreate) {
 return;
    }

 setCreating(true);
 setError("");
 setCreationMessage("");

 try {
 const result = await createCategoryInline(requestedName);

 if (!result.ok) {
 setError(result.error);
 return;
      }

 const nextCategory = result.category;

 setOptions((current) => {
 if (current.some((category) => category.id === nextCategory.id)) {
 return current;
        }

 return [...current, nextCategory].sort((a, b) =>
 a.name.localeCompare(b.name),
        );
      });

 setSelectedId(nextCategory.id);
 setQuery("");
 setActiveIndex(-1);

 setCreationMessage(
 result.created
          ? `${nextCategory.name} was created and selected.`
          : `${nextCategory.name} already existed and was selected.`,
      );

 onCategoryChange?.(nextCategory);

 window.setTimeout(() => {
 setOpen(false);
 triggerRef.current?.focus();
      }, 450);
    } catch {
 setError("The category could not be created. Please try again.");
    } finally {
 setCreating(false);
    }
  }
 async function saveCategoryRename(categoryId: string) {
   const currentCategory = options.find(
     (category) => category.id === categoryId,
   );
   const requestedName = editValue.replace(/\s+/g, " ").trim();

   if (!currentCategory || !requestedName || editBusy) {
     return;
   }

   if (requestedName === currentCategory.name) {
     setEditingCategoryId(null);
     setEditValue("");
     return;
   }

   setEditBusy(true);
   setError("");
   setCreationMessage("");

   try {
     const result = await renameCategoryInline(categoryId, requestedName);

     if (!result.ok) {
       setError(result.error);
       return;
     }

     const updatedCategory: ProductCategoryOption = result.category;

     setOptions((current) =>
       current
         .map((category) =>
           category.id === updatedCategory.id
             ? updatedCategory
             : category,
         )
         .sort((a, b) => a.name.localeCompare(b.name)),
     );

     setEditingCategoryId(null);
     setEditValue("");
     setQuery("");
     setActiveIndex(-1);
     setCreationMessage(
       `${updatedCategory.name} was renamed successfully.`,
     );

     if (updatedCategory.id === selectedId) {
       onCategoryChange?.(updatedCategory);
     }
   } catch {
     setError("The category could not be renamed. Please try again.");
   } finally {
     setEditBusy(false);
   }
 }


 function keyDown(event: KeyboardEvent<HTMLInputElement>) {
 if (event.key === "ArrowDown") {
 event.preventDefault();

 if (!filtered.length) return;

 setActiveIndex((current) =>
 current < filtered.length - 1 ? current + 1 : 0,
      );
    }

 if (event.key === "ArrowUp") {
 event.preventDefault();

 if (!filtered.length) return;

 setActiveIndex((current) =>
 current > 0 ? current - 1 : filtered.length - 1,
      );
    }

 if (event.key === "Enter") {
 event.preventDefault();

 if (activeIndex >= 0 && filtered[activeIndex]) {
 choose(filtered[activeIndex]);
      } else if (filtered.length === 1) {
 choose(filtered[0]);
      } else if (canCreate) {
 void createRequestedCategory();
      }
    }
  }

 const dropdown =
    mounted && open
      ? createPortal(
          <ProductDirectoryPopup
            dropdownRef={dropdownRef}
            searchRef={searchRef}
            position={position}
            ariaLabel="Choose product category"
            directoryLabel="Category directory"
            countLabelSingular="category"
            countLabelPlural="categories"
            options={filtered.map((category) => ({
              key: category.id,
              label: category.name,
              selected: category.id === selectedId,
            }))}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onChoose={(option) => {
              const category = filtered.find(
                (candidate) => candidate.id === option.key,
              );

              if (category) {
                choose(category);
              }
            }}
            onEdit={(option) => {
              const category = filtered.find(
                (candidate) => candidate.id === option.key,
              );

              if (!category) {
                return;
              }

              setEditingCategoryId(category.id);
              setEditValue(category.name);
              setError("");
              setCreationMessage("");
            }}
            editingKey={editingCategoryId}
            editValue={editValue}
            editBusy={editBusy}
            onEditValueChange={setEditValue}
            onEditSave={(option) => {
              void saveCategoryRename(option.key);
            }}
            onEditCancel={() => {
              setEditingCategoryId(null);
              setEditValue("");
              setError("");
            }}
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setError("");
              setCreationMessage("");
              setActiveIndex(-1);
            }}
            onSearchKeyDown={keyDown}
            searchPlaceholder="Search categories..."
            searchAriaLabel="Search categories"
            emptyTitle="No matching category"
            emptyDescription="You can create this category without leaving the product."
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
              canCreate ? (
                <div className="st-admin-picker-create-footer-v40">
                  <button
                    type="button"
                    onClick={createRequestedCategory}
                    disabled={creating}
                    className="st-admin-picker-create-action-v40"
                  >
                    <span className="st-admin-picker-create-content-v40">
                      <span className="st-admin-picker-create-icon-v40">
                        {creating ? (
                          <LoaderCircle
                            className="h-4 w-4 animate-spin"
                            strokeWidth={2.2}
                          />
                        ) : (
                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </span>

                      <span className="st-admin-picker-create-copy-v40">
                        <strong>
                          {creating
                            ? "Creating..."
                            : `Add “${cleanQuery}”`}
                        </strong>
                        <small>Create and select automatically</small>
                      </span>
                    </span>
                  </button>
                </div>
              ) : null
            }
          />,
          document.body,
        )
      : null;

 return (
    <div className="st-admin-category-picker">
      <input type="hidden" name={name} value={selectedId} />

      <button
 ref={triggerRef}
 type="button"
 className={`st-admin-category-picker__trigger ${open ? "is-open" : ""}`}
 onClick={() => {
 setOpen((current) => !current);

 if (!open) {
 requestAnimationFrame(calculatePosition);
          }
        }}
 aria-expanded={open}
      >
        <span className="st-admin-category-picker__trigger-icon">
          <Search className="h-4 w-4" />
        </span>

        <span className="st-admin-category-picker__trigger-copy">
          <small>Category</small>
          <strong>{selectedCategory?.name ?? "Select category"}</strong>
        </span>

        <ChevronDown className="st-admin-category-picker__chevron h-4 w-4" />
      </button>

      {selectedCategory ? (
        <button
 type="button"
 onClick={() => {
 setSelectedId("");
 setQuery("");
 setOpen(false);
 setActiveIndex(-1);
 setError("");
 setCreationMessage("");
 onCategoryChange?.(null);
          }}
 className="st-admin-organization-clear-chip-v2"
        >
          <span>Clear category</span>
          <X aria-hidden="true" />
        </button>
      ) : null}

      {dropdown}
    </div>
  );
}
