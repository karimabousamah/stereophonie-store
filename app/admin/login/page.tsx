import AdminOtpForm from "./admin-otp-form";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    step?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, step } = await searchParams;

  const otpMode = step === "otp";

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
              Protected administration for products, inventory, customers and
              orders.
            </p>
          </div>

          <div className="rounded-[32px] border border-black/[0.08] bg-white p-8 text-black shadow-[0_28px_80px_rgba(29,29,31,0.08)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
              {otpMode ? "Identity verification" : "Authorized access"}
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
              {otpMode ? "Enter security code" : "Admin login"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {otpMode
                ? "A six-digit security code was sent to the administrator email address. It expires in 10 minutes."
                : "Enter your administrator credentials. A second security verification will be required."}
            </p>

            {error ? (
              <div
                role="alert"
                className="mt-6 rounded-[16px] border border-[#e6c4c0] bg-[#fff6f5] px-4 py-3 text-sm leading-6 text-[#8f2c27]"
              >
                {error}
              </div>
            ) : null}

            {otpMode ? (
              <AdminOtpForm />
            ) : (
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
                    placeholder="Administrator email"
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
                  className="st3-admin-login-submit w-full rounded-[14px] border border-[#c58b22]/55 !bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] !text-[#1d1d1f] shadow-[0_2px_8px_rgba(29,29,31,0.035)] transition-all duration-300 hover:!border-[#c58b22]/80 hover:!bg-[#fffaf0] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.11),0_10px_30px_rgba(196,135,27,0.13)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f5b335]/15"
                >
                  Continue securely
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
