"use client";

import {
  Check,
  LoaderCircle,
  Pencil,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { updateProductVariantQuickPrice } from "./quick-price-actions";

type QuickPriceVariant = {
  id: string;
  name: string;
  regularPrice: number | null;
  salePrice: number | null;
};

type QuickPriceEditorProps = {
  productId: string;
  productName: string;
  variants: QuickPriceVariant[];
};

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `$${value.toFixed(2)}`;
}

export default function QuickPriceEditor({
  productId,
  productName,
  variants,
}: QuickPriceEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [localVariants, setLocalVariants] =
    useState<QuickPriceVariant[]>(variants);

  useEffect(() => {
    setLocalVariants(variants);
  }, [variants]);

  function openEditor() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setError("");
    setClosing(false);
    setOpen(true);
  }

  function closeEditor() {
    if (!open || closing) {
      return;
    }

    setError("");
    setClosing(true);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 190);
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || closing) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeEditor();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeEditor();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closing]);

  const lowestPrice = useMemo(() => {
    const prices = localVariants
      .map((variant) => variant.salePrice ?? variant.regularPrice)
      .filter(
        (price): price is number =>
          typeof price === "number" && Number.isFinite(price),
      );

    return prices.length > 0 ? Math.min(...prices) : null;
  }, [localVariants]);

  function saveVariant(
    variant: QuickPriceVariant,
    form: HTMLFormElement,
  ) {
    if (isPending) {
      return;
    }

    const formData = new FormData(form);

    formData.set("product_id", productId);
    formData.set("variant_id", variant.id);

    setError("");
    setSavingVariantId(variant.id);

    startTransition(async () => {
      try {
        const result = await updateProductVariantQuickPrice(formData);

        if (!result.ok) {
          setError(result.message);
          return;
        }

        setLocalVariants((current) =>
          current.map((currentVariant) =>
            currentVariant.id === variant.id
              ? {
                  ...currentVariant,
                  regularPrice: result.regularPrice,
                  salePrice: result.salePrice,
                }
              : currentVariant,
          ),
        );

        if (localVariants.length === 1) {
          closeEditor();
        }
      } catch {
        setError("The price could not be saved. Please try again.");
      } finally {
        setSavingVariantId(null);
      }
    });
  }

  return (
    <div
      ref={rootRef}
      className="st-admin-quick-price"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="st-admin-quick-price__display">
        <strong>{formatPrice(lowestPrice)}</strong>

        {localVariants.length > 0 ? (
          <button
            type="button"
            className="st-admin-quick-price__trigger"
            aria-label={`Edit price for ${productName}`}
            title="Edit price"
            onClick={() => {
              if (open) {
                closeEditor();
              } else {
                openEditor();
              }
            }}
          >
            <Pencil aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className={`st-admin-quick-price__popover${
            closing ? " is-closing" : " is-open"
          }`}
        >
          <div className="st-admin-quick-price__header">
            <div>
              <strong>Edit price</strong>
              <span>{productName}</span>
            </div>

            <button
              type="button"
              className="st-admin-quick-price__close"
              aria-label="Close price editor"
              onClick={closeEditor}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="st-admin-quick-price__variants">
            {localVariants.map((variant, index) => {
              const saving =
                isPending && savingVariantId === variant.id;

              return (
                <form
                  key={variant.id}
                  className="st-admin-quick-price__variant"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveVariant(variant, event.currentTarget);
                  }}
                >
                  {localVariants.length > 1 ? (
                    <div className="st-admin-quick-price__variant-name">
                      {variant.name || `Configuration ${index + 1}`}
                    </div>
                  ) : null}

                  <div className="st-admin-quick-price__fields">
                    <label>
                      <span>Regular price</span>

                      <div className="st-admin-quick-price__input-wrap st-admin-quick-price__input-wrap--single">
                        <span
                          className="st-admin-quick-price__currency"
                          aria-hidden="true"
                        >
                          $
                        </span>
                        <input
                          className="st-admin-quick-price__value-input"
                          type="text"
                          inputMode="decimal"
                          name="regular_price"
                          defaultValue={
                            variant.regularPrice === null
                              ? ""
                              : variant.regularPrice
                          }
                          required
                        />
                      </div>
                    </label>

                    <label>
                      <span>Sale price</span>

                      <div className="st-admin-quick-price__input-wrap st-admin-quick-price__input-wrap--single">
                        <span
                          className="st-admin-quick-price__currency"
                          aria-hidden="true"
                        >
                          $
                        </span>
                        <input
                          className="st-admin-quick-price__value-input"
                          type="text"
                          inputMode="decimal"
                          name="sale_price"
                          defaultValue={
                            variant.salePrice === null
                              ? ""
                              : variant.salePrice
                          }
                          placeholder="None"
                        />
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="st-admin-quick-price__save"
                    disabled={saving}
                  >
                    {saving ? (
                      <LoaderCircle
                        className="st-admin-quick-price__spinner"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check aria-hidden="true" />
                    )}

                    <span>{saving ? "Saving" : "Save"}</span>
                  </button>
                </form>
              );
            })}
          </div>

          {error ? (
            <div
              className="st-admin-quick-price__error"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {localVariants.length > 1 ? (
            <div className="st-admin-quick-price__hint">
              The Products table shows the lowest active configuration price.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
