"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LockKeyhole, Mail } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { type PointerEvent, type ReactNode } from "react";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";

const protectedPrefixes = ["/admin", "/auth", "/account/verify"];

const premiumEase = [0.16, 1, 0.3, 1] as const;

export default function StoreAvailabilityGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const { storeName, storeStatus, maintenanceMessage, supportEmail } =
    useStoreSettings();

  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  const smoothX = useSpring(pointerX, {
    stiffness: 70,
    damping: 24,
    mass: 0.65,
  });

  const smoothY = useSpring(pointerY, {
    stiffness: 70,
    damping: 24,
    mass: 0.65,
  });

  const contentX = useTransform(smoothX, [0, 100], [-10, 10]);

  const contentY = useTransform(smoothY, [0, 100], [-7, 7]);

  const backgroundX = useTransform(smoothX, [0, 100], [15, -15]);

  const backgroundY = useTransform(smoothY, [0, 100], [10, -10]);

  const spotlight = useMotionTemplate`
    radial-gradient(
      700px circle at ${smoothX}% ${smoothY}%,
      rgba(255,255,255,0.11),
      rgba(255,255,255,0.025) 38%,
      transparent 70%
    )
  `;

  const bypassStoreBlock = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (bypassStoreBlock || storeStatus === "operational") {
    return <>{children}</>;
  }

  const maintenance = storeStatus === "maintenance";

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();

    pointerX.set(((event.clientX - bounds.left) / bounds.width) * 100);

    pointerY.set(((event.clientY - bounds.top) / bounds.height) * 100);
  }

  function resetPointer() {
    pointerX.set(50);
    pointerY.set(50);
  }

  return (
    <main
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className={`nita-status-page relative min-h-[100dvh] overflow-hidden text-white ${
        maintenance
          ? "nita-status-page--maintenance"
          : "nita-status-page--closed"
      }`}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background: spotlight,
        }}
      />

      <motion.div
        aria-hidden="true"
        className="nita-status-page__wordmark pointer-events-none fixed left-[-3vw] top-[13vh] z-0 select-none whitespace-nowrap"
        style={{
          x: backgroundX,
          y: backgroundY,
        }}
      >
        {storeName}
      </motion.div>

      <div className="nita-status-page__grid" />
      <div className="nita-status-page__grain" />

      <motion.div
        aria-hidden="true"
        className="nita-status-page__light-beam"
        animate={{
          x: ["-25vw", "125vw"],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex min-h-[88px] items-center justify-between border-b border-white/10 px-6 sm:px-10 lg:px-14">
          <motion.p
            initial={{
              opacity: 0,
              x: -18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.75,
              delay: 0.08,
              ease: premiumEase,
            }}
            className="text-xs font-semibold uppercase tracking-[0.32em] sm:text-sm"
          >
            {storeName}
          </motion.p>

          <motion.div
            initial={{
              opacity: 0,
              x: 18,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.75,
              delay: 0.15,
              ease: premiumEase,
            }}
          >
            <Link
              href="/admin"
              className="group inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35 transition hover:text-white"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              Administrator
              <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </header>

        <section className="relative flex flex-1 items-center px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <motion.div
            className="relative z-10 w-full max-w-[1450px]"
            style={{
              x: contentX,
              y: contentY,
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
                duration: 0.75,
                ease: premiumEase,
              }}
              className="flex items-center gap-4"
            >
              <span
                className={`h-px w-12 ${
                  maintenance ? "bg-amber-300" : "bg-red-300"
                }`}
              />

              <p className="text-[9px] font-semibold uppercase tracking-[0.31em] text-white/45 sm:text-[10px]">
                {maintenance
                  ? "Scheduled maintenance"
                  : "Store temporarily closed"}
              </p>
            </motion.div>

            <div className="mt-8 overflow-hidden pb-4">
              <motion.h1
                initial={{
                  y: "110%",
                }}
                animate={{
                  y: 0,
                }}
                transition={{
                  delay: 0.27,
                  duration: 1.05,
                  ease: premiumEase,
                }}
                className="max-w-[1100px] text-[clamp(4.6rem,11vw,10rem)] font-semibold uppercase leading-[0.78] tracking-[-0.08em]"
              >
                {maintenance ? (
                  <>
                    We will
                    <br />
                    be back
                    <br />
                    soon
                  </>
                ) : (
                  <>
                    Temporarily
                    <br />
                    closed
                  </>
                )}
              </motion.h1>
            </div>

            <motion.div
              initial={{
                opacity: 0,
                y: 24,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.54,
                duration: 0.8,
                ease: premiumEase,
              }}
              className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,700px)_minmax(280px,380px)] lg:items-end lg:justify-between"
            >
              <div>
                <p className="max-w-2xl text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
                  {maintenanceMessage}
                </p>

                <a
                  href={`mailto:${supportEmail}`}
                  className="group mt-8 inline-flex min-h-14 items-center justify-center gap-4 border border-white bg-white px-7 text-[9px] font-semibold uppercase tracking-[0.19em] text-black transition hover:bg-transparent hover:text-white sm:text-[10px]"
                >
                  <Mail className="h-4 w-4" />
                  Contact customer service
                  <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>

              <motion.aside
                initial={{
                  opacity: 0,
                  x: 28,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.64,
                  duration: 0.8,
                  ease: premiumEase,
                }}
                className="border border-white/10 bg-black/25 backdrop-blur-xl"
              >
                <motion.div
                  initial={{
                    scaleX: 0,
                  }}
                  animate={{
                    scaleX: 1,
                  }}
                  transition={{
                    delay: 0.78,
                    duration: 0.85,
                    ease: premiumEase,
                  }}
                  className={`h-[3px] origin-left ${
                    maintenance ? "bg-amber-300" : "bg-red-300"
                  }`}
                />

                <div className="p-6">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-white/30">
                    Current status
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <motion.span
                      animate={{
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className={`h-2 w-2 rounded-full ${
                        maintenance ? "bg-amber-300" : "bg-red-300"
                      }`}
                    />

                    <p className="text-xs font-semibold uppercase tracking-[0.16em] sm:text-sm">
                      {maintenance ? "Maintenance" : "Temporarily closed"}
                    </p>
                  </div>

                  <p className="mt-5 text-xs leading-6 text-white/35">
                    Customer access is currently unavailable. Administrative
                    access remains fully active.
                  </p>
                </div>
              </motion.aside>
            </motion.div>
          </motion.div>

          <motion.div
            aria-hidden="true"
            className="absolute right-[6%] top-1/2 hidden h-[300px] w-[300px] -translate-y-1/2 rounded-full border border-white/[0.07] xl:block"
            style={{
              x: backgroundX,
              y: backgroundY,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 42,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="absolute inset-[35px] rounded-full border border-white/[0.055]" />
            <div className="absolute inset-[85px] rounded-full border border-white/[0.045]" />

            <span className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-white" />

            <span className="absolute bottom-[36px] right-[25px] h-1.5 w-1.5 rounded-full bg-white/65" />

            <span className="absolute bottom-[40px] left-[25px] h-1 w-1 rounded-full bg-white/40" />
          </motion.div>
        </section>

        <motion.footer
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.85,
            duration: 0.8,
          }}
          className="border-t border-white/10 px-6 py-5 sm:px-10 lg:px-14"
        >
          <div className="flex flex-col gap-2 text-[9px] uppercase tracking-[0.2em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <p>Thank you for your patience.</p>

            <p>{storeName} · Customer service available</p>
          </div>
        </motion.footer>
      </div>
    </main>
  );
}
