import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center">
        <section className="grid w-full gap-16 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-neutral-400">
              Stereophonie Back Office
            </p>

            <h1 className="mt-6 max-w-3xl text-5xl font-semibold uppercase leading-none tracking-[-0.03em] sm:text-7xl">
              Manage the boutique with confidence.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-400">
              Products, photographs, inventory, collections, customers, coupons,
              and orders will be managed from this protected area.
            </p>
          </div>

          <div className="border border-white/15 bg-white p-8 text-black shadow-2xl sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
              Authorized access
            </p>

            <h2 className="mt-4 text-3xl font-semibold uppercase tracking-[-0.02em]">
              Admin login
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Use the administrator account created in Supabase.
            </p>

            {error ? (
              <div className="mt-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                  className="mt-2 w-full border border-neutral-300 px-4 py-4 outline-none transition focus:border-black"
                  placeholder="admin@nitastyle.com"
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
                  className="mt-2 w-full border border-neutral-300 px-4 py-4 outline-none transition focus:border-black"
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                className="w-full border border-black bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition duration-300 hover:bg-white hover:text-black"
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
