import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-6 py-12 text-[#1d1d1f]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center">
        <section className="grid w-full gap-16 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9a6200]">
              Stereophonie Back Office
            </p>

            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-7xl">
              Manage the boutique with confidence.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-black/50">
              Products, photographs, inventory, collections, customers, coupons,
              and orders will be managed from this protected area.
            </p>
          </div>

          <div className="rounded-[32px] border border-black/[0.08] bg-white p-8 text-black shadow-[0_28px_80px_rgba(29,29,31,0.08)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
              Authorized access
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
              Admin login
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Use the administrator account created in Supabase.
            </p>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form action={login} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-[0.16em]"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-black/[0.12] bg-[#f7f7f8] px-4 py-4 outline-none transition focus:border-[#f5b335] focus:ring-4 focus:ring-[#f5b335]/15"
                  placeholder="admin@stereophonie.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.16em]"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full rounded-2xl border border-black/[0.12] bg-[#f7f7f8] px-4 py-4 outline-none transition focus:border-[#f5b335] focus:ring-4 focus:ring-[#f5b335]/15"
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                className="st3-admin-login-submit w-full px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Sign in
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
