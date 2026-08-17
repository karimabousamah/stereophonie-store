"use client";

import {
  Bot,
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/components/cart/cart-provider";
import {
  type WishlistProduct,
  useWishlist,
} from "@/components/wishlist/wishlist-provider";

type BrowserSpeechRecognitionResultEvent = Event & {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: {
        transcript: string;
        confidence: number;
      };
    };
  };
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error?: string;
};

type BrowserSpeechRecognition = EventTarget & {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type Language = "en" | "fr" | "ar";

type AssistantVariant = {
  id: string;
  size: string;
  regularPrice: number;
  salePrice: number | null;
  currentPrice: number;
  stockQuantity: number;
  availabilityStatus: string;
  purchasable: boolean;
};

type AssistantProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number | null;
  variants: AssistantVariant[];
};

type AssistantCartAction =
  | {
      type: "add_to_cart";
      productId: string;
      variantId: string;
      slug: string;
      name: string;
      imageUrl: string | null;
      size: string;
      unitPrice: number;
      regularPrice: number | null;
      maximumQuantity: number;
      quantity: number;
    }
  | {
      type: "remove_from_cart";
      cartItemId: string;
      name: string;
      size: string;
    }
  | {
      type: "update_cart_quantity";
      cartItemId: string;
      name: string;
      size: string;
      quantity: number;
    }
  | {
      type: "clear_cart";
    };

type AssistantWishlistAction =
  | {
      type: "add_to_wishlist";
      product: WishlistProduct;
    }
  | {
      type: "remove_from_wishlist";
      productId: string;
      name: string;
    }
  | {
      type: "clear_wishlist";
    };

type AssistantNavigationAction = {
  type: "navigate";
  destination: "checkout" | "track_order" | "wishlist";
  path: "/checkout" | "/track-order" | "/wishlist";
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  products?: AssistantProduct[];
};

const translations = {
  en: {
    title: "Stereophonie Assistant",
    subtitle: "Shopping and order assistance",
    welcome:
      "SYSTEM ONLINE. I can search Stereophonie products, compare configurations, check live availability and control your cart.",
    placeholder: "Enter command: product, configuration, price...",
    searching: "Thinking and checking our live collection...",
    results: "Here are the best available matches:",
    noResults: "I could not find an available product matching your request.",
    selectSize: "Select configuration",
    addToCart: "Add to cart",
    added: "Added to cart",
    viewProduct: "View product",
    from: "From",
    suggestions: [
      "Show available gaming products",
      "Find phones under $500",
      "Show new audio releases",
    ],
  },

  fr: {
    title: "Assistante Stereophonie",
    subtitle: "Conseils shopping et commandes",
    welcome:
      "SYSTÈME EN LIGNE. Je peux rechercher les produits Stereophonie, comparer les configurations, vérifier le stock et gérer votre panier.",
    placeholder: "Commande : produit, configuration, prix...",
    searching: "Réflexion et vérification de notre collection...",
    results: "Voici les meilleures options disponibles :",
    noResults:
      "Je n’ai trouvé aucun produit disponible correspondant à votre demande.",
    selectSize: "Sélectionnez la configuration",
    addToCart: "Ajouter au panier",
    added: "Ajouté au panier",
    viewProduct: "Voir le produit",
    from: "À partir de",
    suggestions: [
      "Montrez les produits gaming disponibles",
      "Trouvez des téléphones sous 500 $",
      "Montrez les nouveautés audio",
    ],
  },

  ar: {
    title: "مساعدة نيتا ستايل",
    subtitle: "مساعدة للتسوق والطلبات",
    welcome:
      "النظام جاهز. يمكنني البحث عن منتجات Stereophonie ومقارنة الإعدادات والتحقق من التوفر وإدارة سلة التسوق.",
    placeholder: "أدخل أمراً: منتج، إعداد، سعر...",
    searching: "جاري التفكير والتحقق من مجموعتنا...",
    results: "هذه أفضل المنتجات المتوفرة:",
    noResults: "لم أجد منتجًا متوفرًا يطابق طلبك.",
    selectSize: "اختر الإعداد",
    addToCart: "إضافة إلى السلة",
    added: "تمت الإضافة إلى السلة",
    viewProduct: "عرض المنتج",
    from: "ابتداءً من",
    suggestions: [
      "اعرض منتجات الألعاب المتوفرة",
      "ابحث عن هواتف تحت 500 دولار",
      "اعرض أحدث منتجات الصوت",
    ],
  },
} as const;

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ProductCard({
  product,
  language,
  onClose,
}: {
  product: AssistantProduct;
  language: Language;
  onClose: () => void;
}) {
  const { addItem } = useCart();

  const text = translations[language];

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants.length === 1 ? product.variants[0].id : "",
  );

  const [feedback, setFeedback] = useState("");

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    null;

  function addProduct() {
    if (!selectedVariant) {
      setFeedback(text.selectSize);
      return;
    }

    const result = addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      size: selectedVariant.size,
      variantId: selectedVariant.id,
      unitPrice: selectedVariant.currentPrice,
      regularPrice: selectedVariant.salePrice
        ? selectedVariant.regularPrice
        : null,
      maximumQuantity: selectedVariant.stockQuantity,
    });

    setFeedback(result.success ? text.added : result.message);
  }

  return (
    <article className="st-arcade-assistant-product overflow-hidden border border-black/10 bg-white">
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-[#f2f2f2]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.imageAlt}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.16em] text-black/35">
              Stereophonie
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.17em] text-black/50">
            {product.category}
          </p>

          <Link
            href={`/shop/${product.slug}`}
            className="mt-1 block text-sm font-semibold text-black"
          >
            {product.name}
          </Link>

          {product.price !== null ? (
            <p className="mt-1 text-xs text-black/65">
              {text.from} {money(product.price)}
            </p>
          ) : null}
        </div>

        <div className="relative">
          <select
            value={selectedVariantId}
            onChange={(event) => {
              setSelectedVariantId(event.target.value);
              setFeedback("");
            }}
            className="h-11 w-full appearance-none border border-black/15 bg-white px-3 pr-9 text-xs outline-none focus:border-black"
          >
            <option value="">{text.selectSize}</option>

            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.size} — {money(variant.currentPrice)}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>

        <button
          type="button"
          onClick={addProduct}
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-black px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#252525]"
        >
          <ShoppingBag className="h-4 w-4" />
          {text.addToCart}
        </button>

        {feedback ? (
          <p className="flex items-center gap-2 text-xs text-black/65">
            {feedback === text.added ? <Check className="h-4 w-4" /> : null}

            {feedback}
          </p>
        ) : null}

        <Link
          href={`/shop/${product.slug}`}
          onClick={() => {
            onClose();
          }}
          className="block text-center text-[9px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4"
        >
          {text.viewProduct}
        </Link>
      </div>
    </article>
  );
}

function FreeShoppingAssistantContents() {
  const router = useRouter();

  const {
    items,
    subtotal,
    isCartReady,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
  } = useCart();

  const {
    products: wishlistProducts,
    hydrated: wishlistHydrated,
    addProduct: addWishlistProduct,
    removeProduct: removeWishlistProduct,
    clearWishlist,
  } = useWishlist();

  const [isOpen, setIsOpen] = useState(false);

  const [language, setLanguage] = useState<Language>("en");

  const [input, setInput] = useState("");

  const [voiceListening, setVoiceListening] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(true);

  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      const recognition = speechRecognitionRef.current;

      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Recognition may already have ended.
        }
      }

      speechRecognitionRef.current = null;
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const text = translations[language];

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: translations.en.welcome,
    },
  ]);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);

    setMessages([
      {
        id: createId(),
        role: "assistant",
        text: translations[nextLanguage].welcome,
      },
    ]);
  }

  function getSpeechLanguage() {
    if (language === "fr") {
      return "fr-FR";
    }

    if (language === "ar") {
      return "ar-LB";
    }

    return "en-US";
  }

  function stopVoiceInput() {
    const recognition = speechRecognitionRef.current;

    if (!recognition) {
      setVoiceListening(false);
      return;
    }

    try {
      recognition.stop();
    } catch {
      // Recognition may already be stopped.
    }

    setVoiceListening(false);
  }

  function startVoiceInput() {
    if (typeof window === "undefined") {
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };

    const SpeechRecognitionConstructor =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setVoiceSupported(false);
      setVoiceListening(false);
      return;
    }

    if (voiceListening) {
      stopVoiceInput();
      return;
    }

    const recognition = new SpeechRecognitionConstructor();

    recognition.lang = getSpeechLanguage();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    speechRecognitionRef.current = recognition;

    const originalInput = input.trim();

    recognition.onstart = () => {
      setVoiceSupported(true);
      setVoiceListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }

      const cleanedTranscript = transcript.trim();

      if (!cleanedTranscript) {
        return;
      }

      setInput(
        originalInput
          ? `${originalInput} ${cleanedTranscript}`
          : cleanedTranscript,
      );
    };

    recognition.onerror = (event) => {
      console.warn(
        "Voice recognition stopped:",
        event.error ?? "unknown error",
      );

      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);

      speechRecognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (error) {
      console.warn("Could not start voice recognition:", error);

      setVoiceListening(false);
    }
  }

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim();

    if (!message || isLoading) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createId(),
      role: "user",
      text: message,
    };

    const conversation = [...messages, userMessage];

    setMessages(conversation);
    setInput("");
    setIsLoading(true);

    window.setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          messages: conversation
            .filter((entry) => entry.id !== "welcome")
            .map((entry) => {
              const productContext =
                entry.products && entry.products.length > 0
                  ? `\n\n[Verified displayed products in order:\n${entry.products
                      .map((product, index) => {
                        const availableVariants = product.variants.filter(
                          (variant) => variant.purchasable,
                        );

                        const availableSizes = Array.from(
                          new Set(
                            availableVariants.map((variant) => variant.size),
                          ),
                        );

                        const saleVariants = availableVariants.filter(
                          (variant) =>
                            variant.salePrice !== null &&
                            variant.salePrice < variant.regularPrice,
                        );

                        return [
                          `${index + 1}. ${product.name}`,
                          `Category: ${product.category}`,
                          `Current price: ${
                            product.price !== null
                              ? money(product.price)
                              : "Unavailable"
                          }`,
                          `Available sizes: ${
                            availableSizes.length > 0
                              ? availableSizes.join(", ")
                              : "None"
                          }`,
                          `On sale: ${saleVariants.length > 0 ? "Yes" : "No"}`,
                          `Verified description: ${
                            product.description || "Not specified"
                          }`,
                        ].join(" | ");
                      })
                      .join("\n")}]`
                  : "";

              return {
                role: entry.role,
                content: entry.text + productContext,
              };
            }),
          cart: isCartReady
            ? {
                items: items.map((item, index) => ({
                  position: index + 1,
                  cartItemId: item.cartItemId,
                  productId: item.productId,
                  variantId: item.variantId,
                  slug: item.slug,
                  name: item.name,
                  size: item.size,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  maximumQuantity: item.maximumQuantity,
                })),
                subtotal,
              }
            : {
                items: [],
                subtotal: 0,
              },
          wishlist: wishlistHydrated
            ? {
                hydrated: true,
                products: wishlistProducts.map((product, index) => ({
                  position: index + 1,
                  ...product,
                })),
              }
            : {
                hydrated: false,
                products: [],
              },
        }),
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        message?: string;
        products?: AssistantProduct[];
        cartActions?: AssistantCartAction[];
        wishlistActions?: AssistantWishlistAction[];
        navigationActions?: AssistantNavigationAction[];
      };

      if (!response.ok || !payload.message) {
        throw new Error(payload.message || "The assistant request failed.");
      }

      const assistantProducts =
        payload.products && payload.products.length > 0
          ? payload.products
          : undefined;

      const cartActions = payload.cartActions ?? [];

      const wishlistActions = payload.wishlistActions ?? [];

      const navigationActions = payload.navigationActions ?? [];

      const cartResults: string[] = [];

      const wishlistResults: string[] = [];

      let successfullyAdded = 0;

      for (const action of cartActions) {
        if (action.type === "remove_from_cart") {
          removeItem(action.cartItemId);

          if (language === "fr") {
            cartResults.push(
              `${action.name} (${action.size}) a été retiré du panier.`,
            );
          } else if (language === "ar") {
            cartResults.push(
              `تمت إزالة ${action.name} (${action.size}) من السلة.`,
            );
          } else {
            cartResults.push(
              `${action.name} (${action.size}) was removed from your cart.`,
            );
          }

          continue;
        }

        if (action.type === "update_cart_quantity") {
          updateQuantity(action.cartItemId, action.quantity);

          if (language === "fr") {
            cartResults.push(
              `La quantité de ${action.name} (${action.size}) est maintenant ${action.quantity}.`,
            );
          } else if (language === "ar") {
            cartResults.push(
              `أصبحت كمية ${action.name} (${action.size}) الآن ${action.quantity}.`,
            );
          } else {
            cartResults.push(
              `${action.name} (${action.size}) quantity is now ${action.quantity}.`,
            );
          }

          continue;
        }

        if (action.type === "clear_cart") {
          clearCart();

          cartResults.push(
            language === "fr"
              ? "Votre panier a été vidé."
              : language === "ar"
                ? "تم إفراغ سلة التسوق."
                : "Your cart has been emptied.",
          );

          continue;
        }

        if (action.type !== "add_to_cart") {
          continue;
        }

        let addedQuantity = 0;
        let failureMessage = "";

        for (let index = 0; index < action.quantity; index += 1) {
          const result = addItem({
            productId: action.productId,
            slug: action.slug,
            name: action.name,
            imageUrl: action.imageUrl,
            size: action.size,
            variantId: action.variantId,
            unitPrice: action.unitPrice,
            regularPrice: action.regularPrice,
            maximumQuantity: action.maximumQuantity,
          });

          if (!result.success) {
            failureMessage = result.message;
            break;
          }

          addedQuantity += 1;
          successfullyAdded += 1;
        }

        if (addedQuantity === action.quantity) {
          if (language === "fr") {
            cartResults.push(
              `${addedQuantity} × ${action.name} (${action.size}) ajouté${addedQuantity > 1 ? "s" : ""} au panier.`,
            );
          } else if (language === "ar") {
            cartResults.push(
              `تمت إضافة ${addedQuantity} × ${action.name} (${action.size}) إلى السلة.`,
            );
          } else {
            cartResults.push(
              `${addedQuantity} × ${action.name} (${action.size}) added to your cart.`,
            );
          }
        } else if (addedQuantity > 0) {
          if (language === "fr") {
            cartResults.push(
              `${addedQuantity} × ${action.name} ajouté au panier. ${failureMessage}`,
            );
          } else if (language === "ar") {
            cartResults.push(
              `تمت إضافة ${addedQuantity} × ${action.name}. ${failureMessage}`,
            );
          } else {
            cartResults.push(
              `${addedQuantity} × ${action.name} added. ${failureMessage}`,
            );
          }
        } else {
          cartResults.push(
            failureMessage ||
              (language === "fr"
                ? `${action.name} n’a pas pu être ajouté au panier.`
                : language === "ar"
                  ? `تعذرت إضافة ${action.name} إلى السلة.`
                  : `${action.name} could not be added to your cart.`),
          );
        }
      }

      for (const action of wishlistActions) {
        if (action.type === "add_to_wishlist") {
          const alreadySaved = wishlistProducts.some(
            (product) => product.id === action.product.id,
          );

          if (alreadySaved) {
            wishlistResults.push(
              language === "fr"
                ? `${action.product.name} est déjà dans votre liste de souhaits.`
                : language === "ar"
                  ? `${action.product.name} موجود بالفعل في قائمة الأمنيات.`
                  : `${action.product.name} is already in your wishlist.`,
            );

            continue;
          }

          addWishlistProduct(action.product);

          wishlistResults.push(
            language === "fr"
              ? `${action.product.name} a été ajouté à votre liste de souhaits.`
              : language === "ar"
                ? `تمت إضافة ${action.product.name} إلى قائمة الأمنيات.`
                : `${action.product.name} was added to your wishlist.`,
          );

          continue;
        }

        if (action.type === "remove_from_wishlist") {
          removeWishlistProduct(action.productId);

          wishlistResults.push(
            language === "fr"
              ? `${action.name} a été retiré de votre liste de souhaits.`
              : language === "ar"
                ? `تمت إزالة ${action.name} من قائمة الأمنيات.`
                : `${action.name} was removed from your wishlist.`,
          );

          continue;
        }

        if (action.type === "clear_wishlist") {
          clearWishlist();

          wishlistResults.push(
            language === "fr"
              ? "Votre liste de souhaits a été vidée."
              : language === "ar"
                ? "تم إفراغ قائمة الأمنيات."
                : "Your wishlist has been cleared.",
          );
        }
      }

      const actionResults = [...cartResults, ...wishlistResults];

      const assistantReply =
        actionResults.length > 0
          ? `${payload.message}\n\n${actionResults.join("\n")}`
          : payload.message;

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text: assistantReply,
          products: assistantProducts,
        },
      ]);

      if (successfullyAdded > 0) {
        window.setTimeout(() => {
          setIsOpen(false);
          openCart();
        }, 1200);
      } else if (navigationActions.length > 0) {
        const navigationAction = navigationActions[0];

        window.setTimeout(() => {
          setIsOpen(false);
          router.push(navigationAction.path);
        }, 900);
      }
    } catch (error) {
      console.error("AI assistant request failed:", error);

      const unavailable =
        language === "fr"
          ? "L’assistante locale est momentanément indisponible. Vérifiez qu’Ollama est ouvert, puis réessayez."
          : language === "ar"
            ? "المساعدة الذكية المحلية غير متاحة مؤقتًا. تأكدي من تشغيل Ollama ثم حاولي مجددًا."
            : "The local AI assistant is temporarily unavailable. Make sure Ollama is running, then try again.";

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          text: unavailable,
        },
      ]);
    } finally {
      setIsLoading(false);

      window.setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={text.title}
        onClick={() => setIsOpen(true)}
        className={`st-arcade-assistant-launcher ${
          isOpen ? "pointer-events-none scale-90 opacity-0" : ""
        }`}
      >
        <span className="st-arcade-assistant-launcher__signal" />

        <Bot className="relative z-10 h-7 w-7 transition duration-300 group-hover:scale-110" />
      </button>

      <div
        onClick={() => setIsOpen(false)}
        className={`st-arcade-assistant-backdrop ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <section
        dir={language === "ar" ? "rtl" : "ltr"}
        data-open={isOpen ? "true" : "false"}
        className={`st-arcade-assistant-terminal transform-gpu will-change-transform transition-transform duration-300 ease-out ${
          isOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-x-[115%] sm:translate-y-0"
        }`}
      >
        <header className="border-b border-white/15 bg-black px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25">
                <Bot className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">{text.title}</h2>

                <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-white/60">
                  {text.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 items-center justify-center border border-white/20 transition hover:bg-white hover:text-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="st-arcade-language-deck"
            aria-label="Assistant language"
          >
            <div className="st-arcade-language-deck__rail">
              <span>LANGUAGE MODULE</span>

              <span>
                CH /{language === "en" ? "01" : language === "fr" ? "02" : "03"}
              </span>
            </div>

            <div className="st-arcade-language-deck__slots">
              {(["en", "fr", "ar"] as Language[]).map((option, index) => {
                const active = language === option;

                const label =
                  option === "en"
                    ? "ENGLISH"
                    : option === "fr"
                      ? "FRANÇAIS"
                      : "العربية";

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => changeLanguage(option)}
                    aria-pressed={active}
                    className={`st-arcade-language-cartridge ${
                      active ? "is-active" : ""
                    }`}
                  >
                    <span className="st-arcade-language-cartridge__led" />

                    <span className="st-arcade-language-cartridge__number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="st-arcade-language-cartridge__copy">
                      <strong>{option.toUpperCase()}</strong>
                      <small>{label}</small>
                    </span>

                    <span className="st-arcade-language-cartridge__state">
                      {active ? "CONNECTED" : "INSERT"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="st-arcade-language-deck__footer">
              <span>STEREOPHONIE LANGUAGE BUS</span>
              <span>3 MODULES</span>
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto bg-[#f7f7f7] px-4 py-5"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%]"
                  : "mr-auto max-w-full"
              }
            >
              <div
                className={`whitespace-pre-line px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-black"
                }`}
              >
                {message.text}
              </div>

              {message.products ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {message.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      language={language}
                      onClose={() => {
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {isLoading ? (
            <div className="mr-auto flex items-center gap-3 border border-black/10 bg-white px-4 py-3 text-sm text-black/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              {text.searching}
            </div>
          ) : null}
        </div>

        <footer className="st-arcade-assistant-controls">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {text.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submitMessage(suggestion)}
                className="shrink-0 border border-black/15 px-3 py-2 text-[10px]"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitMessage(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage(input);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder={text.placeholder}
              className="min-h-12 flex-1 resize-none px-4 py-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={startVoiceInput}
              aria-label={
                voiceListening
                  ? "Stop voice input"
                  : "Speak to Stereophonie Assistant"
              }
              title={
                voiceSupported
                  ? voiceListening
                    ? "Listening..."
                    : "Voice input"
                  : "Voice input is not supported by this browser"
              }
              disabled={!voiceSupported}
              className={`st-arcade-assistant-control-button st-arcade-assistant-voice ${
                voiceListening ? "st-arcade-assistant-voice--listening" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className="st-arcade-assistant-voice-halo"
              />

              {voiceListening ? (
                <MicOff className="relative z-10 h-5 w-5" />
              ) : (
                <Mic className="relative z-10 h-5 w-5" />
              )}

              {voiceListening ? (
                <span className="sr-only">Listening</span>
              ) : null}
            </button>

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="st-arcade-assistant-control-button st-arcade-assistant-control-button--send disabled:opacity-40"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </footer>
      </section>
    </>
  );
}

/* PHASE_8E_ASSISTANT_BODY_PORTAL */
export default function FreeShoppingAssistant() {
  const [assistantMounted, setAssistantMounted] = useState(false);

  useEffect(() => {
    setAssistantMounted(true);

    return () => {
      setAssistantMounted(false);
    };
  }, []);

  if (!assistantMounted) {
    return null;
  }

  /*
   * IMPORTANT:
   * The complete assistant now lives directly under document.body.
   *
   * This prevents transformed storefront parents from becoming
   * the containing block for position: fixed.
   */
  return createPortal(<FreeShoppingAssistantContents />, document.body);
}
