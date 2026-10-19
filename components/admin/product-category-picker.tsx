"use client";

import {
 ArrowLeft,
 Check,
 ChevronDown,
 LoaderCircle,
 Pencil,
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

export type ProductCategoryOption = {
  id: string;
  name: string;

  /*
   * Product destination metadata.
   *
   * Root Category without children:
   *   rootCategoryId = id
   *   subcategoryId = null
   *
   * Leaf Subcategory:
   *   rootCategoryId = owning root Category
   *   subcategoryId = leaf id
   */
  rootCategoryId?: string;
  subcategoryId?: string | null;

  /*
   * Product destinations may be renamed inline:
   *
   * - root Category leaf
   * - deepest Subcategory leaf
   *
   * Organizational parent nodes remain absent from this
   * leaf-only Product selector.
   */
  editable?: boolean;
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
 const [popupPresent, setPopupPresent] = useState(false);
 const [creating, setCreating] = useState(false);
 const [error, setError] = useState("");
 const [creationMessage, setCreationMessage] = useState("");
 const [editingCategoryId, setEditingCategoryId] =
   useState<string | null>(null);
 const [editValue, setEditValue] = useState("");
 const [editBusy, setEditBusy] = useState(false);

 const [creationStep, setCreationStep] = useState<
   "idle" | "type" | "root" | "parent"
 >("idle");

 const [creationName, setCreationName] = useState("");

 const [creationHierarchyLoading, setCreationHierarchyLoading] =
   useState(false);

 const [creationRoots, setCreationRoots] = useState<
   {
     id: string;
     name: string;
   }[]
 >([]);

 const [creationNodes, setCreationNodes] = useState<
   {
     id: string;
     category_id: string;
     parent_subcategory_id: string | null;
     name: string;
   }[]
 >([]);

 const [creationRootId, setCreationRootId] = useState("");

 const [creationParentId, setCreationParentId] =
   useState<string | null>(null);


 const [creationEditingKey, setCreationEditingKey] =

   useState<string | null>(null);


 const [creationEditValue, setCreationEditValue] =

   useState("");


 const [creationEditBusy, setCreationEditBusy] =

   useState(false);

 const [position, setPosition] = useState({
 top: 0,
 left: 0,
 width: 320,
  });

 useEffect(() => {
 if (open) {
 setPopupPresent(true);
 return;
    }

 if (!popupPresent) {
 return;
    }

 const timeout = window.setTimeout(() => {
 setPopupPresent(false);
    }, 360);

 return () => {
 window.clearTimeout(timeout);
    };
  }, [open, popupPresent]);

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
 const matchingOptions = cleanQuery
   ? options.filter((category) =>
       normalize(category.name).includes(cleanQuery),
     )
   : options;

 return [...matchingOptions].sort((first, second) =>
   first.name.localeCompare(
     second.name,
     undefined,
     {
       sensitivity: "base",
       numeric: true,
     },
   ),
 );
  }, [options, cleanQuery]);

 const exactMatch = options.some(
    (category) => normalize(category.name) === cleanQuery,
  );

 const canCreate = Boolean(cleanQuery && !exactMatch);

 const creationSelectedRoot =
   creationRoots.find(
     (category) => category.id === creationRootId,
   ) ?? null;

 const creationParentOptions = useMemo(() => {
   if (!creationRootId) {
     return [];
   }

   const nodes = creationNodes.filter(
     (node) => node.category_id === creationRootId,
   );

   const childrenByParent = new Map<
     string,
     typeof nodes
   >();

   for (const node of nodes) {
     const parentKey =
       node.parent_subcategory_id ?? "__root__";

     const siblings =
       childrenByParent.get(parentKey) ?? [];

     siblings.push(node);
     childrenByParent.set(parentKey, siblings);
   }

   for (const siblings of childrenByParent.values()) {
     siblings.sort((first, second) =>
       first.name.localeCompare(
         second.name,
         undefined,
         {
           sensitivity: "base",
           numeric: true,
         },
       ),
     );
   }

   const flattened: {
     id: string;
     name: string;
     depth: number;
   }[] = [];

   const visited = new Set<string>();

   function visit(
     parentId: string | null,
     depth: number,
   ) {
     const parentKey =
       parentId ?? "__root__";

     for (
       const node of childrenByParent.get(parentKey) ?? []
     ) {
       if (visited.has(node.id)) {
         continue;
       }

       visited.add(node.id);

       flattened.push({
         id: node.id,
         name: node.name,
         depth,
       });

       visit(node.id, depth + 1);
     }
   }

   visit(null, 0);

   return flattened;
 }, [creationNodes, creationRootId]);

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

 function resetCreationFlow() {
 setCreationEditingKey(null);
 setCreationEditValue("");
 setCreationEditBusy(false);
 setCreationStep("idle");
 setCreationName("");
 setCreationRootId("");
 setCreationParentId(null);
 setCreationRoots([]);
 setCreationNodes([]);
 setCreationHierarchyLoading(false);
 setError("");
 setCreationMessage("");
}

function beginCreationFlow() {
 const requestedName =
   query.replace(/\s+/g, " ").trim();

 if (!requestedName || creating || !canCreate) {
   return;
 }

 setCreationName(requestedName);
 setCreationStep("type");
 setCreationRootId("");
 setCreationParentId(null);
 setError("");
 setCreationMessage("");
 setActiveIndex(-1);
}

function finishCreatedSelection(
 nextCategory: ProductCategoryOption,
 message: string,
 previousLeafId?: string,
) {
 setOptions((current) =>
   [
     ...current.filter(
       (category) =>
         category.id !== nextCategory.id &&
         category.id !== previousLeafId,
     ),
     nextCategory,
   ].sort((first, second) =>
     first.name.localeCompare(
       second.name,
       undefined,
       {
         sensitivity: "base",
         numeric: true,
       },
     ),
   ),
 );

 setSelectedId(nextCategory.id);
 setQuery("");
 setActiveIndex(-1);
 setError("");
 setCreationMessage(message);

 onCategoryChange?.(nextCategory);

 setCreationStep("idle");
 setCreationName("");
 setCreationRootId("");
 setCreationParentId(null);
 setCreationRoots([]);
 setCreationNodes([]);

 window.setTimeout(() => {
   setOpen(false);
   triggerRef.current?.focus();
 }, 450);
}

async function createRequestedRootCategory() {
 if (!creationName || creating) {
   return;
 }

 setCreating(true);
 setError("");
 setCreationMessage("");

 try {
   const result =
     await createCategoryInline(creationName);

   if (!result.ok) {
     setError(result.error);
     return;
   }

   const nextCategory: ProductCategoryOption = {
     id: result.category.id,
     name: result.category.name,
     rootCategoryId: result.category.id,
     subcategoryId: null,
     editable: true,
   };

   /*
    * An existing root Category with children is absent
    * from the leaf-only Product selector by design.
    */
   if (
     !result.created &&
     !options.some(
       (category) =>
         category.id === nextCategory.id,
     )
   ) {
     setError(
       "This category already exists and contains subcategories. Choose Subcategory to create a destination inside it.",
     );
     return;
   }

   finishCreatedSelection(
     nextCategory,
     result.created
       ? `${nextCategory.name} was created and selected.`
       : `${nextCategory.name} already existed and was selected.`,
   );
 } catch {
   setError(
     "The category could not be created. Please try again.",
   );
 } finally {
   setCreating(false);
 }
}

async function beginSubcategoryCreation() {
 if (creationHierarchyLoading || creating) {
   return;
 }

 setCreationHierarchyLoading(true);
 setError("");
 setCreationMessage("");

 try {
   const result =
     await loadCategoryCreationHierarchyInline();

   if (!result.ok) {
     setError(result.error);
     return;
   }

   setCreationRoots(
     [...result.categories].sort(
       (first, second) =>
         first.name.localeCompare(
           second.name,
           undefined,
           {
             sensitivity: "base",
             numeric: true,
           },
         ),
     ),
   );

   setCreationNodes(result.subcategories);
   setCreationRootId("");
   setCreationParentId(null);
   setCreationStep("root");
 } catch {
   setError(
     "The category hierarchy could not be loaded. Please try again.",
   );
 } finally {
   setCreationHierarchyLoading(false);
 }
}

async function createRequestedSubcategory() {
 if (
   !creationName ||
   !creationRootId ||
   creating
 ) {
   return;
 }

 setCreating(true);
 setError("");
 setCreationMessage("");

 try {
   const result =
     await createSubcategoryInline(
       creationName,
       creationRootId,
       creationParentId,
     );

   if (!result.ok) {
     setError(result.error);
     return;
   }

   const nextCategory: ProductCategoryOption = {
     id: result.category.id,
     name: result.category.name,
     rootCategoryId:
       result.category.categoryId,
     subcategoryId:
       result.category.id,
     editable: true,
   };

   /*
    * Product assignments always target leaves.
    *
    * If we created a child under a destination that was
    * previously a leaf, that parent must disappear from
    * the mounted Product selector immediately.
    */
   const previousLeafId =
     result.category.parentSubcategoryId ??
     result.category.categoryId;

   finishCreatedSelection(
     nextCategory,
     `${nextCategory.name} was created and selected.`,
     previousLeafId,
   );
 } catch {
   setError(
     "The subcategory could not be created. Please try again.",
   );
 } finally {
   setCreating(false);
 }
}

function beginCreationRename(
 kind: "root" | "subcategory",
 id: string,
 currentName: string,
) {
 if (creationEditBusy || creating) {
   return;
 }

 setCreationEditingKey(`${kind}:${id}`);
 setCreationEditValue(currentName);
 setError("");
 setCreationMessage("");
}

function cancelCreationRename() {
 if (creationEditBusy) {
   return;
 }

 setCreationEditingKey(null);
 setCreationEditValue("");
 setError("");
}

async function saveCreationRename() {
 if (
   !creationEditingKey ||
   creationEditBusy
 ) {
   return;
 }

 const nextName =
   creationEditValue.replace(/\s+/g, " ").trim();

 if (!nextName) {
   setError("Enter a name.");
   return;
 }

 const separator =
   creationEditingKey.indexOf(":");

 if (separator <= 0) {
   setError("This category could not be identified.");
   return;
 }

 const kind =
   creationEditingKey.slice(0, separator);

 const id =
   creationEditingKey.slice(separator + 1);

 if (
   (kind !== "root" &&
     kind !== "subcategory") ||
   !id
 ) {
   setError("This category could not be identified.");
   return;
 }

 setCreationEditBusy(true);
 setError("");
 setCreationMessage("");

 try {
   const result =
     kind === "root"
       ? await renameCategoryInline(id, nextName)
       : await renameSubcategoryInline(id, nextName);

   if (!result.ok) {
     setError(result.error);
     return;
   }

   const renamedName =
     result.category.name;

   if (kind === "root") {
     setCreationRoots((current) =>
       current
         .map((category) =>
           category.id === id
             ? {
                 ...category,
                 name: renamedName,
               }
             : category,
         )
         .sort((first, second) =>
           first.name.localeCompare(
             second.name,
             undefined,
             {
               sensitivity: "base",
               numeric: true,
             },
           ),
         ),
     );

     /*
      * A root Category only appears in the ordinary
      * Product picker when it is itself a leaf.
      */
     setOptions((current) =>
       current
         .map((category) =>
           category.id === id &&
           (category.subcategoryId ?? null) === null
             ? {
                 ...category,
                 name: renamedName,
               }
             : category,
         )
         .sort((first, second) =>
           first.name.localeCompare(
             second.name,
             undefined,
             {
               sensitivity: "base",
               numeric: true,
             },
           ),
         ),
     );
   } else {
     setCreationNodes((current) =>
       current.map((node) =>
         node.id === id
           ? {
               ...node,
               name: renamedName,
             }
           : node,
       ),
     );

     /*
      * If the renamed Subcategory is also a selectable
      * Product leaf, keep the ordinary picker live too.
      */
     setOptions((current) =>
       current
         .map((category) =>
           category.id === id
             ? {
                 ...category,
                 name: renamedName,
               }
             : category,
         )
         .sort((first, second) =>
           first.name.localeCompare(
             second.name,
             undefined,
             {
               sensitivity: "base",
               numeric: true,
             },
           ),
         ),
     );
   }

   setCreationEditingKey(null);
   setCreationEditValue("");
 } catch {
   setError(
     "The name could not be updated. Please try again.",
   );
 } finally {
   setCreationEditBusy(false);
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
     const result =
       currentCategory.subcategoryId
         ? await renameSubcategoryInline(
             currentCategory.subcategoryId,
             requestedName,
           )
         : await renameCategoryInline(
             currentCategory.rootCategoryId ??
               currentCategory.id,
             requestedName,
           );

     if (!result.ok) {
       setError(result.error);
       return;
     }

     const updatedCategory: ProductCategoryOption = {
       ...currentCategory,
       name: result.category.name,
     };

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
 beginCreationFlow();
      }
    }
  }

 const dropdown =
   popupPresent
     ? createPortal(
         creationStep === "idle" ? (
           <ProductDirectoryPopup
             open={open}
             dropdownRef={dropdownRef}
             searchRef={searchRef}
             position={position}
             ariaLabel="Choose product category"
             directoryLabel="Category directory"
             countLabelSingular="category"
             countLabelPlural="categories"
             preserveOptionOrder
             options={filtered.map((category) => ({
               key: category.id,
               label: category.name,
               selected: category.id === selectedId,
               editable: category.editable !== false,
             }))}
             activeIndex={activeIndex}
             onActiveIndexChange={setActiveIndex}
             onChoose={(option) => {
               const category = filtered.find(
                 (candidate) =>
                   candidate.id === option.key,
               );

               if (category) {
                 choose(category);
               }
             }}
             onEdit={(option) => {
               const category = filtered.find(
                 (candidate) =>
                   candidate.id === option.key,
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
             emptyDescription="Create a category or subcategory without leaving the product."
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
                     onClick={beginCreationFlow}
                     disabled={creating}
                     className="st-admin-picker-create-action-v40"
                   >
                     <span className="st-admin-picker-create-content-v40">
                       <span className="st-admin-picker-create-icon-v40">
                         <Plus
                           className="h-4 w-4"
                           strokeWidth={2.2}
                         />
                       </span>

                       <span className="st-admin-picker-create-copy-v40">
                         <strong>
                           Add “{query.replace(/\s+/g, " ").trim()}”
                         </strong>
                         <small>
                           Create a category or subcategory
                         </small>
                       </span>
                     </span>
                   </button>
                 </div>
               ) : null
             }
           />
         ) : (
           <div
             ref={dropdownRef}
             className={`st-admin-directory-popup-motion-v29 st-admin-category-create-v92 ${
               open ? "is-open" : "is-closing"
             }`}
             aria-hidden={!open}
             style={{
               top: position.top,
               left: position.left,
               width: position.width,
             }}
             role="dialog"
             aria-label={`Create ${creationName}`}
           >
             <div className="st-admin-category-create-v92__header">
               <button
                 type="button"
                 className="st-admin-category-create-v92__back"
                 aria-label="Go back"
                 disabled={
                   creating ||
                   creationHierarchyLoading
                 }
                 onClick={() => {
                   setError("");

                   if (creationStep === "parent") {
                     setCreationStep("root");
                     setCreationRootId("");
                     setCreationParentId(null);
                     return;
                   }

                   if (creationStep === "root") {
                     setCreationStep("type");
                     setCreationRootId("");
                     setCreationParentId(null);
                     return;
                   }

                   resetCreationFlow();

                   requestAnimationFrame(() => {
                     searchRef.current?.focus();
                   });
                 }}
               >
                 <ArrowLeft
                   aria-hidden="true"
                   strokeWidth={2}
                 />
               </button>

               <div className="st-admin-category-create-v92__heading">
                 <small>
                   {creationStep === "type"
                     ? "Create destination"
                     : creationStep === "root"
                       ? "Choose category"
                       : "Choose location"}
                 </small>

                 <strong>{creationName}</strong>
               </div>
             </div>

             <div className="st-admin-category-create-v92__body">
               {creationStep === "type" ? (
                 <div className="st-admin-category-create-v92__type-grid">
                   <button
                     type="button"
                     className="st-admin-category-create-v92__type"
                     disabled={
                       creating ||
                       creationHierarchyLoading
                     }
                     onClick={() => {
                       void createRequestedRootCategory();
                     }}
                   >
                     <span className="st-admin-category-create-v92__type-icon">
                       {creating ? (
                         <LoaderCircle
                           className="st-admin-category-create-v92__spinner h-4 w-4"
                           strokeWidth={2}
                         />
                       ) : (
                         "C"
                       )}
                     </span>

                     <span>
                       <strong>
                         {creating
                           ? "Creating..."
                           : "Category"}
                       </strong>
                       <small>
                         Create a new top-level category
                         and select it.
                       </small>
                     </span>
                   </button>

                   <button
                     type="button"
                     className="st-admin-category-create-v92__type"
                     disabled={
                       creating ||
                       creationHierarchyLoading
                     }
                     onClick={() => {
                       void beginSubcategoryCreation();
                     }}
                   >
                     <span className="st-admin-category-create-v92__type-icon">
                       {creationHierarchyLoading ? (
                         <LoaderCircle
                           className="st-admin-category-create-v92__spinner h-4 w-4"
                           strokeWidth={2}
                         />
                       ) : (
                         "S"
                       )}
                     </span>

                     <span>
                       <strong>
                         {creationHierarchyLoading
                           ? "Loading..."
                           : "Subcategory"}
                       </strong>
                       <small>
                         Place it inside an existing
                         category or subcategory.
                       </small>
                     </span>
                   </button>
                 </div>
               ) : null}

               {creationStep === "root" ? (
                 <>
                   <div className="st-admin-category-create-v92__instruction">
                     <strong>
                       Which category does this belong to?
                     </strong>
                     <span>
                       Select the top-level category first.
                     </span>
                   </div>

                   <div className="st-admin-category-create-v92__directory">
                     {creationRoots.length ? (
                       creationRoots.map((category) => {
                         const editing =
                           creationEditingKey ===
                           `root:${category.id}`;

                         if (editing) {
                           return (
                             <div
                               key={category.id}
                               className="st-admin-category-create-v92__edit-row st-admin-directory-popup__edit-row"
                             >
                               <input
                                 type="text"
                                 value={creationEditValue}
                                 disabled={creationEditBusy}
                                 autoFocus
                                 aria-label={`Rename ${category.name}`}
                                 className="st-admin-directory-popup__edit-input"
                                 onChange={(event) => {
                                   setCreationEditValue(
                                     event.target.value,
                                   );
                                 }}
                                 onKeyDown={(event) => {
                                   event.stopPropagation();

                                   if (
                                     event.key === "Enter"
                                   ) {
                                     event.preventDefault();

                                     if (
                                       !creationEditBusy
                                     ) {
                                       void saveCreationRename();
                                     }
                                   }

                                   if (
                                     event.key === "Escape"
                                   ) {
                                     event.preventDefault();
                                     cancelCreationRename();
                                   }
                                 }}
                               />

                               <div className="st-admin-directory-popup__edit-actions">
                                 <button
                                   type="button"
                                   disabled={creationEditBusy}
                                   className="st-admin-directory-popup__edit-cancel"
                                   onClick={cancelCreationRename}
                                 >
                                   Cancel
                                 </button>

                                 <button
                                   type="button"
                                   disabled={
                                     creationEditBusy ||
                                     !creationEditValue.trim()
                                   }
                                   className="st-admin-directory-popup__edit-save"
                                   onClick={() => {
                                     void saveCreationRename();
                                   }}
                                 >
                                   {creationEditBusy
                                     ? "Saving..."
                                     : "Save"}
                                 </button>
                               </div>
                             </div>
                           );
                         }

                         return (
                           <button
                             key={category.id}
                             type="button"
                             className="st-admin-category-create-v92__directory-row"
                             onClick={() => {
                               setCreationRootId(
                                 category.id,
                               );
                               setCreationParentId(null);
                               setError("");
                               setCreationStep("parent");
                             }}
                           >
                             <strong>
                               {category.name}
                             </strong>

                             <span className="st-admin-category-create-v92__row-actions">
                               <span
                                 role="button"
                                 tabIndex={0}
                                 aria-label={`Rename ${category.name}`}
                                 title={`Rename ${category.name}`}
                                 className="st-admin-directory-popup__edit-trigger"
                                 onMouseDown={(event) => {
                                   event.preventDefault();
                                   event.stopPropagation();
                                 }}
                                 onClick={(event) => {
                                   event.preventDefault();
                                   event.stopPropagation();

                                   beginCreationRename(
                                     "root",
                                     category.id,
                                     category.name,
                                   );
                                 }}
                                 onKeyDown={(event) => {
                                   event.stopPropagation();

                                   if (
                                     event.key === "Enter" ||
                                     event.key === " "
                                   ) {
                                     event.preventDefault();

                                     beginCreationRename(
                                       "root",
                                       category.id,
                                       category.name,
                                     );
                                   }
                                 }}
                               >
                                 <Pencil
                                   className="h-3.5 w-3.5"
                                   strokeWidth={2}
                                   aria-hidden="true"
                                 />
                               </span>

                               <span
                                 className="st-admin-category-create-v92__forward"
                                 aria-hidden="true"
                               >
                                 ›
                               </span>
                             </span>
                           </button>
                         );
                       })
                     ) : (
                       <div className="st-admin-category-create-v92__empty">
                         No categories are available.
                       </div>
                     )}
                   </div>
                 </>
               ) : null}

               {creationStep === "parent" &&
               creationSelectedRoot ? (
                 <>
                   <div className="st-admin-category-create-v92__instruction">
                     <strong>
                       Choose its location
                     </strong>
                     <span>
                       Category:{" "}
                       {creationSelectedRoot.name}
                     </span>
                   </div>

                   <div className="st-admin-category-create-v92__directory">
                     <button
                       type="button"
                       className={`st-admin-category-create-v92__parent-row ${
                         creationParentId === null
                           ? "is-selected"
                           : ""
                       }`}
                       onClick={() => {
                         setCreationParentId(null);
                         setError("");
                       }}
                     >
                       <span className="st-admin-category-create-v92__parent-copy">
                         <strong>
                           Directly under{" "}
                           {creationSelectedRoot.name}
                         </strong>
                         <small>
                           First-level subcategory
                         </small>
                       </span>

                       <span className="st-admin-category-create-v92__row-actions">
                         {creationParentId === null ? (
                           <span className="st-admin-category-create-v92__check">
                             <Check
                               className="h-3.5 w-3.5"
                               strokeWidth={2.5}
                               aria-hidden="true"
                             />
                           </span>
                         ) : (
                           <small className="st-admin-category-create-v92__select-label">
                             Select
                           </small>
                         )}
                       </span>
                     </button>

                     {creationParentOptions.map(
                       (subcategory) => {
                         const editing =
                           creationEditingKey ===
                           `subcategory:${subcategory.id}`;

                         if (editing) {
                           return (
                             <div
                               key={subcategory.id}
                               className="st-admin-category-create-v92__edit-row st-admin-directory-popup__edit-row"
                             >
                               <input
                                 type="text"
                                 value={creationEditValue}
                                 disabled={creationEditBusy}
                                 autoFocus
                                 aria-label={`Rename ${subcategory.name}`}
                                 className="st-admin-directory-popup__edit-input"
                                 onChange={(event) => {
                                   setCreationEditValue(
                                     event.target.value,
                                   );
                                 }}
                                 onKeyDown={(event) => {
                                   event.stopPropagation();

                                   if (
                                     event.key === "Enter"
                                   ) {
                                     event.preventDefault();

                                     if (
                                       !creationEditBusy
                                     ) {
                                       void saveCreationRename();
                                     }
                                   }

                                   if (
                                     event.key === "Escape"
                                   ) {
                                     event.preventDefault();
                                     cancelCreationRename();
                                   }
                                 }}
                               />

                               <div className="st-admin-directory-popup__edit-actions">
                                 <button
                                   type="button"
                                   disabled={creationEditBusy}
                                   className="st-admin-directory-popup__edit-cancel"
                                   onClick={cancelCreationRename}
                                 >
                                   Cancel
                                 </button>

                                 <button
                                   type="button"
                                   disabled={
                                     creationEditBusy ||
                                     !creationEditValue.trim()
                                   }
                                   className="st-admin-directory-popup__edit-save"
                                   onClick={() => {
                                     void saveCreationRename();
                                   }}
                                 >
                                   {creationEditBusy
                                     ? "Saving..."
                                     : "Save"}
                                 </button>
                               </div>
                             </div>
                           );
                         }

                         const selected =
                           creationParentId ===
                           subcategory.id;

                         return (
                           <button
                             key={subcategory.id}
                             type="button"
                             className={`st-admin-category-create-v92__parent-row ${
                               selected
                                 ? "is-selected"
                                 : ""
                             }`}
                             onClick={() => {
                               setCreationParentId(
                                 subcategory.id,
                               );
                               setError("");
                             }}
                           >
                             <span
                               className="st-admin-category-create-v92__parent-copy"
                               style={{
                                 paddingLeft:
                                   subcategory.depth * 12,
                               }}
                             >
                               <strong>
                                 {subcategory.name}
                               </strong>

                               <small>
                                 {subcategory.depth === 0
                                   ? "Subcategory"
                                   : `Nested level ${
                                       subcategory.depth +
                                       1
                                     }`}
                               </small>
                             </span>

                             <span className="st-admin-category-create-v92__row-actions">
                               <span
                                 role="button"
                                 tabIndex={0}
                                 aria-label={`Rename ${subcategory.name}`}
                                 title={`Rename ${subcategory.name}`}
                                 className="st-admin-directory-popup__edit-trigger"
                                 onMouseDown={(event) => {
                                   event.preventDefault();
                                   event.stopPropagation();
                                 }}
                                 onClick={(event) => {
                                   event.preventDefault();
                                   event.stopPropagation();

                                   beginCreationRename(
                                     "subcategory",
                                     subcategory.id,
                                     subcategory.name,
                                   );
                                 }}
                                 onKeyDown={(event) => {
                                   event.stopPropagation();

                                   if (
                                     event.key === "Enter" ||
                                     event.key === " "
                                   ) {
                                     event.preventDefault();

                                     beginCreationRename(
                                       "subcategory",
                                       subcategory.id,
                                       subcategory.name,
                                     );
                                   }
                                 }}
                               >
                                 <Pencil
                                   className="h-3.5 w-3.5"
                                   strokeWidth={2}
                                   aria-hidden="true"
                                 />
                               </span>

                               {selected ? (
                                 <span className="st-admin-category-create-v92__check">
                                   <Check
                                     className="h-3.5 w-3.5"
                                     strokeWidth={2.5}
                                     aria-hidden="true"
                                   />
                                 </span>
                               ) : (
                                 <small className="st-admin-category-create-v92__select-label">
                                   Select
                                 </small>
                               )}
                             </span>
                           </button>
                         );
                       },
                     )}
                   </div>

                   <div className="st-admin-category-create-v92__footer">
                     <div className="st-admin-category-create-v92__summary">
                       <small>
                         New subcategory
                       </small>

                       <strong>
                         {creationName}
                       </strong>
                     </div>

                     <button
                       type="button"
                       className="st-admin-category-create-v92__confirm"
                       disabled={creating}
                       onClick={() => {
                         void createRequestedSubcategory();
                       }}
                     >
                       {creating
                         ? "Creating..."
                         : "Create & Select"}
                     </button>
                   </div>
                 </>
               ) : null}

               {error ? (
                 <div
                   className="st-admin-category-create-v92__error"
                   role="alert"
                 >
                   {error}
                 </div>
               ) : null}
             </div>
           </div>
         ),
         document.body,
       )
     : null;

 return (
    <div className="st-admin-category-picker">
      <input
        type="hidden"
        name={name}
        value={
          selectedCategory?.rootCategoryId ??
          selectedCategory?.id ??
          ""
        }
      />

      <button
 ref={triggerRef}
 type="button"
 className={`st-admin-category-picker__trigger ${open ? "is-open" : ""}`}
 onClick={() => {
 setOpen((current) => !current);

 if (!open) {
 resetCreationFlow();
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
