"use client";

import {
  Bot,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  PackageCheck,
  Save,
  Settings2,
  Store,
  Truck,
} from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import { saveStoreSettings, type SaveSettingsResult } from "./actions";

export type StoreSettings = {
  store_name: string;
  support_email: string;
  whatsapp_number: string;
  instagram_handle: string;

  delivery_fee: number;
  free_delivery_threshold: number;
  delivery_estimate: string;
  delivery_country: string;

  cod_enabled: boolean;
  order_prefix: string;

  order_confirmation_emails_enabled: boolean;
  stock_alert_emails_enabled: boolean;

  assistant_enabled: boolean;
  assistant_model: string;
  assistant_languages: string;
  assistant_welcome_message: string;

  store_status: "operational" | "maintenance" | "closed";

  maintenance_message: string;
};

type SettingsFormProps = {
  initialSettings: StoreSettings;
  databaseReady: boolean;
};

const inputClass =
  "mt-2 min-h-12 w-full border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/35";

const labelClass =
  "text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40";

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>

        <p className="mt-1 text-xs leading-5 text-white/35">{description}</p>
      </div>

      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-white"
      />
    </label>
  );
}

export default function SettingsForm({
  initialSettings,
  databaseReady,
}: SettingsFormProps) {
  const [pending, startTransition] = useTransition();

  const [result, setResult] = useState<SaveSettingsResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    setResult(null);

    startTransition(async () => {
      const response = await saveStoreSettings(formData);

      setResult(response);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {!databaseReady ? (
        <div className="border border-amber-400/25 bg-amber-400/[0.06] px-5 py-4 text-sm text-amber-200">
          Apply the new Supabase migration before saving these settings. The
          form currently displays safe default values.
        </div>
      ) : null}

      {result ? (
        <div
          className={`flex items-start gap-3 border px-5 py-4 text-sm ${
            result.success
              ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
              : "border-red-400/25 bg-red-400/[0.06] text-red-200"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}

          <p>{result.message}</p>
        </div>
      ) : null}

      <section className="border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <Store className="mt-0.5 h-5 w-5 text-white/50" />

          <div>
            <h2 className="text-lg font-semibold">Store identity</h2>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Public contact and brand information used throughout the webshop.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label>
            <span className={labelClass}>Store name *</span>

            <input
              name="store_name"
              required
              defaultValue={initialSettings.store_name}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Support email *</span>

            <input
              type="email"
              name="support_email"
              required
              defaultValue={initialSettings.support_email}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>WhatsApp number *</span>

            <input
              name="whatsapp_number"
              required
              defaultValue={initialSettings.whatsapp_number}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Instagram handle</span>

            <input
              name="instagram_handle"
              defaultValue={initialSettings.instagram_handle}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <Truck className="mt-0.5 h-5 w-5 text-white/50" />

          <div>
            <h2 className="text-lg font-semibold">Delivery and orders</h2>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Configure delivery pricing, estimated timing and order defaults.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label>
            <span className={labelClass}>Delivery fee</span>

            <input
              type="number"
              name="delivery_fee"
              min="0"
              step="0.01"
              defaultValue={initialSettings.delivery_fee}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Free delivery threshold</span>

            <input
              type="number"
              name="free_delivery_threshold"
              min="0"
              step="0.01"
              defaultValue={initialSettings.free_delivery_threshold}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Delivery estimate *</span>

            <input
              name="delivery_estimate"
              required
              defaultValue={initialSettings.delivery_estimate}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Delivery country *</span>

            <input
              name="delivery_country"
              required
              defaultValue={initialSettings.delivery_country}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Order prefix *</span>

            <input
              name="order_prefix"
              required
              maxLength={12}
              defaultValue={initialSettings.order_prefix}
              className={inputClass}
            />
          </label>

          <div>
            <span className={labelClass}>Payment</span>

            <div className="mt-2">
              <Toggle
                name="cod_enabled"
                label="Cash on delivery"
                description="Allow customers to select COD at checkout."
                defaultChecked={initialSettings.cod_enabled}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <Mail className="mt-0.5 h-5 w-5 text-white/50" />

          <div>
            <h2 className="text-lg font-semibold">Customer communication</h2>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Control automatic order and stock notification emails.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Toggle
            name="order_confirmation_emails_enabled"
            label="Order confirmation emails"
            description="Send confirmation after a customer submits an order."
            defaultChecked={initialSettings.order_confirmation_emails_enabled}
          />

          <Toggle
            name="stock_alert_emails_enabled"
            label="Restock alert emails"
            description="Send notifications when requested sizes become available."
            defaultChecked={initialSettings.stock_alert_emails_enabled}
          />
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <Bot className="mt-0.5 h-5 w-5 text-white/50" />

          <div>
            <h2 className="text-lg font-semibold">AI shopping assistant</h2>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Display configuration for the Ollama-powered customer assistant.
              Secret connection values remain in environment variables.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <Toggle
              name="assistant_enabled"
              label="Enable AI assistant"
              description="Show the shopping assistant on the customer storefront."
              defaultChecked={initialSettings.assistant_enabled}
            />
          </div>

          <label>
            <span className={labelClass}>Ollama model</span>

            <input
              name="assistant_model"
              defaultValue={initialSettings.assistant_model}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>Supported languages</span>

            <input
              name="assistant_languages"
              defaultValue={initialSettings.assistant_languages}
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <span className={labelClass}>Welcome message</span>

            <textarea
              name="assistant_welcome_message"
              rows={4}
              defaultValue={initialSettings.assistant_welcome_message}
              className={`${inputClass} py-3`}
            />
          </label>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <PackageCheck className="mt-0.5 h-5 w-5 text-white/50" />

          <div>
            <h2 className="text-lg font-semibold">Store availability</h2>

            <p className="mt-1 text-xs leading-5 text-white/35">
              Define whether the customer storefront is operational, under
              maintenance or temporarily closed.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <label>
            <span className={labelClass}>Store status</span>

            <select
              name="store_status"
              defaultValue={initialSettings.store_status}
              className={inputClass}
            >
              <option value="operational">Operational</option>

              <option value="maintenance">Maintenance mode</option>

              <option value="closed">Temporarily closed</option>
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className={labelClass}>Maintenance or closure message</span>

            <textarea
              name="maintenance_message"
              rows={4}
              defaultValue={initialSettings.maintenance_message}
              className={`${inputClass} py-3`}
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end border border-white/10 bg-[#0d0d0d]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-white/80 disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {pending ? "Saving settings" : "Save settings"}
        </button>
      </div>

      <div className="hidden">
        <MessageCircle />
      </div>
    </form>
  );
}
