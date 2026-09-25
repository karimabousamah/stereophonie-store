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
  createBrandInline,
  renameBrandInline,
} from "@/components/admin/product-brand-picker-actions";

export type ProductBrandOption = {
 id: string;
 name: string;
};

type ProductBrandPickerProps = {
 brands: ProductBrandOption[];
 defaultValue?: string;
 name?: string;
 onBrandChange?: (brand: ProductBrandOption | null) => void;
};

type FloatingPosition = {
 top: number;
 left: number;
 width: number;
};

function normalize(value: string) {
 return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export default function ProductBrandPicker({
 brands,
 defaultValue = "",
 name = "brand_id",
 onBrandChange,
}: ProductBrandPickerProps) {
 const triggerRef = useRef<HTMLButtonElement>(null);
 const searchRef = useRef<HTMLInputElement>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);

 const [options, setOptions] = useState<ProductBrandOption[]>(brands);
 const [selectedId, setSelectedId] = useState(defaultValue);

 const [query, setQuery] = useState("");
 const [open, setOpen] = useState(false);
 const [activeIndex, setActiveIndex] = useState(-1);

 const [creating, setCreating] = useState(false);
 const [error, setError] = useState("");
 const [creationMessage, setCreationMessage] = useState("");
 const [editingBrandId, setEditingBrandId] =
   useState<string | null>(null);
 const [editValue, setEditValue] = useState("");
 const [editBusy, setEditBusy] = useState(false);
 const [mounted, setMounted] = useState(false);

 const [position, setPosition] = useState<FloatingPosition>({
 top: 0,
 left: 0,
 width: 320,
  });

 useEffect(() => {
 setMounted(true);
  }, []);

 useEffect(() => {
 setOptions(brands);
  }, [brands]);

 useEffect(() => {
 setSelectedId(defaultValue);
  }, [defaultValue]);

 const selectedBrand =
 options.find((brand) => brand.id === selectedId) ?? null;

 const cleanQuery = query.trim();
 const normalizedQuery = normalize(cleanQuery);

 const filteredBrands = useMemo(() => {
 if (!normalizedQuery) {
 return options;
    }

 return options.filter((brand) =>
 normalize(brand.name).includes(normalizedQuery),
    );
  }, [options, normalizedQuery]);

 const exactMatch = useMemo(() => {
 if (!normalizedQuery) {
 return null;
    }

 return (
 options.find((brand) => normalize(brand.name) === normalizedQuery) ?? null
    );
  }, [options, normalizedQuery]);

 const canCreate = Boolean(cleanQuery && !exactMatch);

 function updatePosition() {
 const trigger = triggerRef.current;

 if (!trigger) {
 return;
    }

 const rect = trigger.getBoundingClientRect();

 const viewportPadding = 16;
 const desiredWidth = Math.min(Math.max(rect.width, 300), 320);
 const maximumWidth = Math.min(desiredWidth, window.innerWidth - 32);

 let left = rect.left;

 if (left + maximumWidth > window.innerWidth - viewportPadding) {
 left = window.innerWidth - maximumWidth - viewportPadding;
    }

 if (left < viewportPadding) {
 left = viewportPadding;
    }

 setPosition({
 top: rect.bottom + 8,
 left,
 width: maximumWidth,
    });
  }

 useLayoutEffect(() => {
 if (!open) {
 return;
    }

 updatePosition();

 const handleViewportChange = () => updatePosition();

 window.addEventListener("resize", handleViewportChange);
 window.addEventListener("scroll", handleViewportChange, true);

 return () => {
 window.removeEventListener("resize", handleViewportChange);
 window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

 useEffect(() => {
 if (!open) {
 return;
    }

 const timeout = window.setTimeout(() => {
 searchRef.current?.focus();
    }, 30);

 function handlePointerDown(event: MouseEvent) {
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

 function handleEscape(event: globalThis.KeyboardEvent) {
 if (event.key !== "Escape") {
 return;
      }

 setOpen(false);
 setActiveIndex(-1);
 triggerRef.current?.focus();
    }

 document.addEventListener("mousedown", handlePointerDown);
 document.addEventListener("keydown", handleEscape);

 return () => {
 window.clearTimeout(timeout);
 document.removeEventListener("mousedown", handlePointerDown);
 document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

 useEffect(() => {
 setActiveIndex(-1);
  }, [normalizedQuery]);

 function chooseBrand(brand: ProductBrandOption | null) {
 setSelectedId(brand?.id ?? "");
 setQuery("");
 setOpen(false);
 setActiveIndex(-1);
 setError("");
 setCreationMessage("");

 onBrandChange?.(brand);

 requestAnimationFrame(() => {
 triggerRef.current?.focus();
    });
  }

 async function createRequestedBrand() {
 const requestedName = cleanQuery;

 if (!requestedName || creating) {
 return;
    }

 setCreating(true);
 setError("");
 setCreationMessage("");

 try {
 const result = await createBrandInline(requestedName);

 if (!result.ok) {
 setError(result.error);
 return;
      }

 const nextBrand = result.brand;

 setOptions((current) => {
 if (current.some((brand) => brand.id === nextBrand.id)) {
 return current;
        }

 return [...current, nextBrand].sort((a, b) =>
 a.name.localeCompare(b.name),
        );
      });

 setSelectedId(nextBrand.id);
 setQuery("");
 setActiveIndex(-1);

 setCreationMessage(
 result.created
          ? `${nextBrand.name} was created and selected.`
          : `${nextBrand.name} already existed and was selected.`,
      );

 onBrandChange?.(nextBrand);

 window.setTimeout(() => {
 setOpen(false);
 triggerRef.current?.focus();
      }, 450);
    } catch {
 setError("The brand could not be created. Please try again.");
    } finally {
 setCreating(false);
    }
  }
 async function saveBrandRename(brandId: string) {
   const currentBrand = options.find(
     (brand) => brand.id === brandId,
   );
   const requestedName = editValue.replace(/\s+/g, " ").trim();

   if (!currentBrand || !requestedName || editBusy) {
     return;
   }

   if (requestedName === currentBrand.name) {
     setEditingBrandId(null);
     setEditValue("");
     return;
   }

   setEditBusy(true);
   setError("");
   setCreationMessage("");

   try {
     const result = await renameBrandInline(brandId, requestedName);

     if (!result.ok) {
       setError(result.error);
       return;
     }

     const updatedBrand: ProductBrandOption = result.brand;

     setOptions((current) =>
       current
         .map((brand) =>
           brand.id === updatedBrand.id
             ? updatedBrand
             : brand,
         )
         .sort((a, b) => a.name.localeCompare(b.name)),
     );

     setEditingBrandId(null);
     setEditValue("");
     setQuery("");
     setActiveIndex(-1);
     setCreationMessage(
       `${updatedBrand.name} was renamed successfully.`,
     );

     if (updatedBrand.id === selectedId) {
       onBrandChange?.(updatedBrand);
     }
   } catch {
     setError("The brand could not be renamed. Please try again.");
   } finally {
     setEditBusy(false);
   }
 }


 function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
 if (event.key === "ArrowDown") {
 event.preventDefault();

 if (filteredBrands.length === 0) {
 return;
      }

 setActiveIndex((current) =>
 current < filteredBrands.length - 1 ? current + 1 : 0,
      );

 return;
    }

 if (event.key === "ArrowUp") {
 event.preventDefault();

 if (filteredBrands.length === 0) {
 return;
      }

 setActiveIndex((current) =>
 current > 0 ? current - 1 : filteredBrands.length - 1,
      );

 return;
    }

 if (event.key === "Enter") {
 event.preventDefault();

 if (activeIndex >= 0 && filteredBrands[activeIndex]) {
 chooseBrand(filteredBrands[activeIndex]);
 return;
      }

 if (filteredBrands.length === 1) {
 chooseBrand(filteredBrands[0]);
 return;
      }

 if (canCreate) {
 void createRequestedBrand();
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
            ariaLabel="Choose product brand"
            directoryLabel="Brand directory"
            countLabelSingular="brand"
            countLabelPlural="brands"
            options={filteredBrands.map((brand) => ({
              key: brand.id,
              label: brand.name,
              selected: brand.id === selectedId,
            }))}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onChoose={(option) => {
              const brand = filteredBrands.find(
                (candidate) => candidate.id === option.key,
              );

              if (brand) {
                chooseBrand(brand);
              }
            }}
            onEdit={(option) => {
              const brand = filteredBrands.find(
                (candidate) => candidate.id === option.key,
              );

              if (!brand) {
                return;
              }

              setEditingBrandId(brand.id);
              setEditValue(brand.name);
              setError("");
              setCreationMessage("");
            }}
            editingKey={editingBrandId}
            editValue={editValue}
            editBusy={editBusy}
            onEditValueChange={setEditValue}
            onEditSave={(option) => {
              void saveBrandRename(option.key);
            }}
            onEditCancel={() => {
              setEditingBrandId(null);
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
            onSearchKeyDown={handleSearchKeyDown}
            searchPlaceholder="Search brands..."
            searchAriaLabel="Search brands"
            emptyTitle="No matching brand"
            emptyDescription="You can create this brand without leaving the product."
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
                    onClick={createRequestedBrand}
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
 className={`st-admin-category-picker__trigger ${
 open ? "is-open" : ""
          }`}
 onClick={() => {
 setOpen((current) => !current);
 setError("");
 setCreationMessage("");

 if (!open) {
 requestAnimationFrame(updatePosition);
            }
          }}
 aria-haspopup="listbox"
 aria-expanded={open}
        >
          <span className="st-admin-category-picker__trigger-icon">
            <Search className="h-4 w-4" />
          </span>

          <span className="st-admin-category-picker__trigger-copy">
            <small>Brand</small>
            <strong>{selectedBrand?.name ?? "Select brand"}</strong>
          </span>

          <ChevronDown className="st-admin-category-picker__chevron h-4 w-4" />
        </button>
      {selectedBrand ? (
        <button
 type="button"
 onClick={() => chooseBrand(null)}
 className="st-admin-organization-clear-chip-v2"
        >
          <span>Clear brand</span>
          <X aria-hidden="true" />
        </button>
      ) : null}

      {dropdown}
    </div>
  );
}
