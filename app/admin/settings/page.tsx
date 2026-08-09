import { redirect } from "next/navigation";
import { LockKeyhole, Settings2, ShieldCheck } from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import SettingsForm, { type StoreSettings } from "./settings-form";

export const dynamic = "force-dynamic";

const defaultSettings: StoreSettings = {
  store_name: "Nita Style",
  support_email: "thenitastyle@gmail.com",
  whatsapp_number: "+961 76 99 22 06",
  instagram_handle: "@thenitastyle",

  delivery_fee: 5,
  free_delivery_threshold: 150,
  delivery_estimate: "3–4 working days",
  delivery_country: "Lebanon",

  cod_enabled: true,
  order_prefix: "NITA",

  order_confirmation_emails_enabled: true,

  stock_alert_emails_enabled: true,

  assistant_enabled: true,
  assistant_model: "qwen3:8b",
  assistant_languages: "English, French, Arabic",

  assistant_welcome_message:
    "Hello! I can help you discover products, check available sizes and assist with your order.",

  store_status: "operational",

  maintenance_message:
    "Our online store is temporarily unavailable. Please check again shortly.",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login?error=This%20account%20is%20not%20authorized");
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const settings: StoreSettings = settingsData
    ? {
        store_name: settingsData.store_name ?? defaultSettings.store_name,

        support_email:
          settingsData.support_email ?? defaultSettings.support_email,

        whatsapp_number:
          settingsData.whatsapp_number ?? defaultSettings.whatsapp_number,

        instagram_handle:
          settingsData.instagram_handle ?? defaultSettings.instagram_handle,

        delivery_fee: Number(
          settingsData.delivery_fee ?? defaultSettings.delivery_fee,
        ),

        free_delivery_threshold: Number(
          settingsData.free_delivery_threshold ??
            defaultSettings.free_delivery_threshold,
        ),

        delivery_estimate:
          settingsData.delivery_estimate ?? defaultSettings.delivery_estimate,

        delivery_country:
          settingsData.delivery_country ?? defaultSettings.delivery_country,

        cod_enabled: settingsData.cod_enabled ?? defaultSettings.cod_enabled,

        order_prefix: settingsData.order_prefix ?? defaultSettings.order_prefix,

        order_confirmation_emails_enabled:
          settingsData.order_confirmation_emails_enabled ??
          defaultSettings.order_confirmation_emails_enabled,

        stock_alert_emails_enabled:
          settingsData.stock_alert_emails_enabled ??
          defaultSettings.stock_alert_emails_enabled,

        assistant_enabled:
          settingsData.assistant_enabled ?? defaultSettings.assistant_enabled,

        assistant_model:
          settingsData.assistant_model ?? defaultSettings.assistant_model,

        assistant_languages:
          settingsData.assistant_languages ??
          defaultSettings.assistant_languages,

        assistant_welcome_message:
          settingsData.assistant_welcome_message ??
          defaultSettings.assistant_welcome_message,

        store_status:
          settingsData.store_status === "maintenance" ||
          settingsData.store_status === "closed"
            ? settingsData.store_status
            : "operational",

        maintenance_message:
          settingsData.maintenance_message ??
          defaultSettings.maintenance_message,
      }
    : defaultSettings;

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Settings"
      pageDescription="Configure store identity, delivery, communication, AI and operational preferences."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <section className="border-b border-white/10 pb-9">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            Store configuration
          </p>

          <h2 className="mt-5 text-[clamp(3rem,7vw,6.5rem)] font-semibold uppercase leading-[0.84] tracking-[-0.065em]">
            System
            <br />
            settings
          </h2>

          <p className="mt-7 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
            Manage safe operational settings used by the store. Passwords,
            Supabase keys, email API secrets and private authentication
            credentials are never displayed here.
          </p>
        </section>

        <div className="grid gap-4 py-7 sm:grid-cols-2">
          <div className="flex items-start gap-4 border border-emerald-400/20 bg-emerald-400/[0.035] p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />

            <div>
              <p className="text-sm font-semibold">Administrator protected</p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Only active administrator accounts can read or update these
                settings.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 border border-white/10 bg-white/[0.025] p-5">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-white/50" />

            <div>
              <p className="text-sm font-semibold">Secrets remain private</p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Environment variables and customer credentials are not exposed
                through this page.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <Settings2 className="h-4 w-4 text-white/45" />

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Store preferences
          </p>
        </div>

        <SettingsForm
          initialSettings={settings}
          databaseReady={!settingsError}
        />
      </div>
    </AdminShell>
  );
}
