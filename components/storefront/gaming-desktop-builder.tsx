"use client";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";

import { megaPcCatalog } from "@/lib/gaming-desktop/mega-catalog";

import { extendedPcCatalog } from "@/lib/gaming-desktop/extended-catalog";
import { explainPartCompatibility } from "@/lib/gaming-desktop/compatibility-display";

import {
  Component,
  Box,
  CircuitBoard,
  Monitor,
  Cpu,
  Fan,
  HardDrive,
  MemoryStick,
  RotateCcw,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import React, { Suspense, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Html,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import {
  partLabels,
  pcCatalog,
  type PcPart,
  type PcPartKind,
} from "@/lib/gaming-desktop/catalog";

import {
  getCompatibleCatalogItems,
  sanitizeChosenParts,
} from "@/lib/gaming-desktop/compatibility";

/*
 * Uses the same Stereophonie mustard family used throughout the
 * storefront rather than a separate gaming gold.
 */
const MUSTARD = "#f5b335";
const MUSTARD_DARK = "#a86f08";

type DesktopTheme = "white" | "dark";

const definitions: {
  key: PcPartKind;
  icon: typeof Cpu;
  eyebrow: string;
}[] = [
  { key: "cpu", icon: Cpu, eyebrow: "CPU" },
  { key: "gpu", icon: Monitor, eyebrow: "GPU" },
  { key: "motherboard", icon: CircuitBoard, eyebrow: "BOARD" },
  { key: "ram", icon: MemoryStick, eyebrow: "RAM" },
  { key: "storage", icon: HardDrive, eyebrow: "SSD" },
  { key: "cooling", icon: Fan, eyebrow: "COOLING" },
  { key: "psu", icon: Zap, eyebrow: "PSU" },
  { key: "case", icon: Box, eyebrow: "CASE" },
  { key: "fans", icon: Fan, eyebrow: "FANS" },
];

function defaultSelection(): Record<PcPartKind, PcPart> {
  return {
    cpu:
      pcCatalog.cpu.find((x) => x.model === "Ryzen 7 9800X3D") ??
      pcCatalog.cpu[0],
    gpu:
      pcCatalog.gpu.find((x) => x.model === "GeForce RTX 5080") ??
      pcCatalog.gpu[0],
    motherboard:
      pcCatalog.motherboard.find((x) => x.model.includes("X870E-E")) ??
      pcCatalog.motherboard[0],
    ram:
      pcCatalog.ram.find((x) => x.model.includes("32GB DDR5-6000")) ??
      pcCatalog.ram[0],
    storage:
      pcCatalog.storage.find((x) => x.model.includes("990 PRO 2TB")) ??
      pcCatalog.storage[0],
    cooling:
      pcCatalog.cooling.find((x) => x.model.includes("Kraken Elite 360")) ??
      pcCatalog.cooling[0],
    psu:
      pcCatalog.psu.find((x) => x.model.includes("RM1000x")) ??
      pcCatalog.psu[0],
    case:
      pcCatalog.case.find((x) => x.model.includes("O11 Dynamic EVO RGB")) ??
      pcCatalog.case[0],
    fans: pcCatalog.fans[0],
  };
}

function StereophonieWhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      data-st-whatsapp-icon="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16.02 3.2C9.04 3.2 3.36 8.8 3.36 15.7c0 2.2.58 4.35 1.69 6.24L3 29l7.26-1.9a12.8 12.8 0 0 0 5.75 1.38h.01c6.98 0 12.66-5.6 12.66-12.5S23 3.2 16.02 3.2Zm0 22.98h-.01a10.5 10.5 0 0 1-5.34-1.45l-.38-.22-4.3 1.13 1.15-4.13-.25-.4a10.28 10.28 0 0 1-1.61-5.42c0-5.67 4.68-10.29 10.74-10.29 5.91 0 10.72 4.62 10.72 10.29 0 5.67-4.81 10.49-10.72 10.49Z"
        clipRule="evenodd"
      />

      <path
        fill="currentColor"
        d="M21.84 18.38c-.32-.16-1.9-.92-2.19-1.03-.29-.1-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.18.21-.37.23-.69.08-.32-.16-1.34-.49-2.56-1.56-.95-.84-1.59-1.87-1.77-2.19-.19-.31-.02-.48.14-.64.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.68-.98-2.3-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.39-.29.31-1.11 1.08-1.11 2.63 0 1.55 1.14 3.05 1.3 3.26.16.21 2.24 3.39 5.43 4.75.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.9-.77 2.16-1.52.27-.76.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"
      />
    </svg>
  );
}

type SceneProps = {
  activePart: PcPartKind;
  onSelect: (part: PcPartKind) => void;
  chosenParts: PcPartKind[];
};

function PartMesh({
  part,
  active,
  onClick,
  position,
  scale,
  radius = 0.08,
  accent = false,
}: {
  part: PcPartKind;
  active: boolean;
  onClick: () => void;
  position: [number, number, number];
  scale: [number, number, number];
  radius?: number;
  accent?: boolean;
}) {
  const color = active || accent ? MUSTARD : "#d9d9d6";

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <RoundedBox args={scale} radius={radius} smoothness={4}>
        <meshStandardMaterial
          color={color}
          roughness={active ? 0.3 : 0.48}
          metalness={active ? 0.5 : 0.38}
          emissive={active ? MUSTARD : "#000000"}
          emissiveIntensity={active ? 0.14 : 0}
        />
      </RoundedBox>

      {active ? (
        <mesh position={[0, 0, scale[2] / 2 + 0.012]}>
          <planeGeometry args={[scale[0] * 1.12, scale[1] * 1.12]} />
          <meshBasicMaterial
            color={MUSTARD}
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function FanMesh({
  position,
  active,
  onClick,
}: {
  position: [number, number, number];
  active: boolean;
  onClick: () => void;
}) {
  const ref = React.useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z -= delta * 0.45;
    }
  });

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <mesh>
        <cylinderGeometry args={[0.34, 0.34, 0.08, 48]} />
        <meshStandardMaterial
          color={active ? MUSTARD : "#d7d7d4"}
          roughness={0.34}
          metalness={0.3}
        />
      </mesh>

      <group ref={ref} rotation={[Math.PI / 2, 0, 0]}>
        {Array.from({ length: 7 }).map((_, index) => (
          <mesh key={index} rotation={[0, 0, (index / 7) * Math.PI * 2]}>
            <RoundedBox
              args={[0.055, 0.23, 0.025]}
              radius={0.02}
              position={[0, 0.11, 0]}
            >
              <meshStandardMaterial
                color={active ? "#fff4d8" : "#9c9c99"}
                roughness={0.44}
                metalness={0.2}
              />
            </RoundedBox>
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.012, 16, 64]} />
        <meshStandardMaterial
          color={active ? MUSTARD : "#aaa"}
          emissive={active ? MUSTARD : "#000000"}
          emissiveIntensity={active ? 0.28 : 0}
        />
      </mesh>
    </group>
  );
}

function PremiumCaseFan({
  position,
  rotation = [0, 0, 0],
  active,
  onClick,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  active: boolean;
  onClick: () => void;
  scale?: number;
}) {
  const ref = React.useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 0.72;
    }
  });

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerEnter={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        document.body.style.cursor = "";
      }}
    >
      <RoundedBox args={[1.05, 1.05, 0.16]} radius={0.12} smoothness={5}>
        <meshPhysicalMaterial
          color={active ? MUSTARD : "#f4f4f2"}
          roughness={0.28}
          metalness={0.18}
          clearcoat={0.45}
        />
      </RoundedBox>

      <group ref={ref} position={[0, 0, 0.11]}>
        {[0, 1, 2, 3, 4, 5, 6].map((blade) => (
          <mesh
            key={blade}
            rotation={[0, 0, blade * ((Math.PI * 2) / 7)]}
            position={[0.22, 0, 0]}
          >
            <boxGeometry args={[0.43, 0.12, 0.055]} />
            <meshPhysicalMaterial
              color="#d7d7d4"
              roughness={0.3}
              metalness={0.05}
              transparent
              opacity={0.88}
            />
          </mesh>
        ))}

        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 36]} />
          <meshStandardMaterial color="#fafafa" roughness={0.2} />
        </mesh>
      </group>

      <mesh position={[0, 0, 0.18]}>
        <torusGeometry args={[0.38, 0.025, 12, 48]} />
        <meshStandardMaterial
          color={active ? MUSTARD : "#eeeeeb"}
          emissive={active ? MUSTARD : "#ffffff"}
          emissiveIntensity={active ? 0.28 : 0.025}
        />
      </mesh>
    </group>
  );
}

function CoolingTube({ points }: { points: [number, number, number][] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );

    return new THREE.TubeGeometry(curve, 34, 0.055, 10, false);
  }, [points]);

  React.useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#f6f6f3" roughness={0.28} metalness={0.04} />
    </mesh>
  );
}

/*
 * ============================================================
 * STEREOPHONIE — INTERACTIVE 3D COMPONENT BEACON
 * ============================================================
 *
 * A subtle mustard pulse makes every configurable physical
 * component discoverable without turning the PC into a gaming
 * neon interface.
 *
 * - pulses gently when available
 * - becomes stronger for the active component
 * - shows a check when explicitly selected
 * - clicking the beacon opens that component selector
 * ============================================================
 */

function InteractivePartBeacon(props: any) {
  const {
    position = [0, 0, 0],
    label = "",
    part = "",
    active = false,
    chosen = false,
    onClick,
  } = props;

  const pulseRef = React.useRef<THREE.Mesh>(null);

  const ringRef = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    const pulse = 1 + Math.sin(time * 3.2) * 0.11;

    if (pulseRef.current) {
      pulseRef.current.scale.setScalar(active ? pulse * 1.12 : pulse);
    }

    if (ringRef.current) {
      const ringPulse = 1.15 + ((Math.sin(time * 2.5) + 1) / 2) * 0.34;

      ringRef.current.scale.setScalar(ringPulse);

      const material = ringRef.current.material as THREE.MeshBasicMaterial;

      material.opacity = active ? 0.31 : 0.14;
    }
  });

  const displayLabel = String(label || part || "Customize");

  return (
    <group position={position as [number, number, number]}>
      {/* Invisible enlarged hit area */}
      <mesh
        onClick={(event) => {
          event.stopPropagation();

          if (typeof onClick === "function") {
            onClick();
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();

          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.34, 24, 24]} />

        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Soft pulsing aura */}
      <mesh ref={ringRef} renderOrder={8}>
        <sphereGeometry args={[0.18, 32, 32]} />

        <meshBasicMaterial
          color={MUSTARD}
          transparent
          opacity={0.15}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Main beacon */}
      <mesh
        ref={pulseRef}
        renderOrder={9}
        onClick={(event) => {
          event.stopPropagation();

          if (typeof onClick === "function") {
            onClick();
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();

          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.095, 32, 32]} />

        <meshStandardMaterial
          color={MUSTARD}
          emissive={MUSTARD}
          emissiveIntensity={active ? 1.35 : 0.72}
          roughness={0.23}
          metalness={0.08}
          depthTest={false}
        />
      </mesh>

      {/* Tiny white center */}
      <mesh position={[0, 0, 0.01]} renderOrder={10}>
        <sphereGeometry args={[0.034, 24, 24]} />

        <meshBasicMaterial color="#ffffff" depthTest={false} />
      </mesh>

      <Html
        center
        distanceFactor={8}
        zIndexRange={[45, 0]}
        style={{
          pointerEvents: "none",
          transform: "translateY(-38px)",
        }}
      >
        <div
          style={{
            display: active ? "flex" : "none",
            alignItems: "center",
            gap: "7px",
            whiteSpace: "nowrap",
            padding: "7px 10px",
            borderRadius: "12px",
            border: "1px solid rgba(29,29,31,.08)",
            background: "rgba(255,255,255,.94)",
            color: "#1d1d1f",
            boxShadow: "0 8px 28px rgba(29,29,31,.10)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "3px",
              background: MUSTARD,
              boxShadow: "0 0 0 5px rgba(245,179,53,.13)",
              flex: "0 0 auto",
            }}
          />

          {displayLabel}

          {chosen ? (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: "16px",
                height: "16px",
                borderRadius: "6px",
                background: MUSTARD,
                color: "#111",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              ✓
            </span>
          ) : null}
        </div>
      </Html>
    </group>
  );
}

function GamingTower({ activePart, onSelect, chosenParts }: SceneProps) {
  const clickable = (part: PcPartKind) => ({
    onClick: (event: any) => {
      event.stopPropagation();
      onSelect(part);
    },
    onPointerEnter: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerLeave: () => {
      document.body.style.cursor = "";
    },
  });

  return (
    <Float speed={0.28} rotationIntensity={0.018} floatIntensity={0.025}>
      <group rotation={[0.025, -0.28, 0]} position={[0, -0.08, 0]}>
        {/* --------------------------------------------------
            PREMIUM WHITE CHASSIS
           -------------------------------------------------- */}

        {/* Rear / structural body */}
        <RoundedBox
          args={[4.55, 5.45, 3.45]}
          radius={0.2}
          smoothness={9}
          {...clickable("case")}
        >
          <meshPhysicalMaterial
            color="#ececea"
            roughness={0.24}
            metalness={0.34}
            clearcoat={0.48}
            clearcoatRoughness={0.18}
          />
        </RoundedBox>

        {/* Open interior cavity */}
        <RoundedBox
          args={[4.2, 5.02, 3.18]}
          radius={0.16}
          smoothness={8}
          position={[0.12, 0.04, 0.12]}
        >
          <meshPhysicalMaterial
            color="#f9f9f7"
            roughness={0.34}
            metalness={0.08}
          />
        </RoundedBox>

        {/* Tempered glass side */}
        <RoundedBox
          args={[4.12, 5.0, 0.06]}
          radius={0.14}
          smoothness={6}
          position={[0.14, 0.04, 1.73]}
          {...clickable("case")}
        >
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.94}
            transparent
            opacity={0.2}
            roughness={0.08}
            metalness={0}
            ior={1.45}
            thickness={0.18}
          />
        </RoundedBox>

        {/* Vertical front frame */}
        {[-2.15, 2.15].map((x) => (
          <RoundedBox
            key={x}
            args={[0.18, 5.28, 3.58]}
            radius={0.06}
            position={[x, 0, 0]}
          >
            <meshPhysicalMaterial
              color="#dededb"
              roughness={0.25}
              metalness={0.48}
            />
          </RoundedBox>
        ))}

        {/* Top and bottom frame */}
        {[-2.63, 2.63].map((y) => (
          <RoundedBox
            key={y}
            args={[4.5, 0.18, 3.55]}
            radius={0.06}
            position={[0, y, 0]}
          >
            <meshPhysicalMaterial
              color="#dfdfdc"
              roughness={0.25}
              metalness={0.46}
            />
          </RoundedBox>
        ))}

        {/* --------------------------------------------------
            MOTHERBOARD
           -------------------------------------------------- */}

        <RoundedBox
          args={[2.55, 3.45, 0.12]}
          radius={0.08}
          smoothness={4}
          position={[-0.45, 0.25, 1.48]}
          {...clickable("motherboard")}
        >
          <meshPhysicalMaterial
            color={activePart === "motherboard" ? "#3f3828" : "#343638"}
            roughness={0.46}
            metalness={0.18}
            emissive={activePart === "motherboard" ? MUSTARD : "#000000"}
            emissiveIntensity={activePart === "motherboard" ? 0.08 : 0}
          />
        </RoundedBox>

        {/* Motherboard heatsinks */}
        <RoundedBox
          args={[1.05, 0.42, 0.18]}
          radius={0.05}
          position={[-0.92, 1.54, 1.59]}
        >
          <meshPhysicalMaterial
            color="#e5e5e2"
            metalness={0.55}
            roughness={0.26}
          />
        </RoundedBox>

        <RoundedBox
          args={[0.38, 1.25, 0.18]}
          radius={0.05}
          position={[-1.5, 0.73, 1.59]}
        >
          <meshPhysicalMaterial
            color="#e8e8e5"
            metalness={0.5}
            roughness={0.28}
          />
        </RoundedBox>

        {/* --------------------------------------------------
            CPU / AIO PUMP
           -------------------------------------------------- */}

        <group position={[-0.72, 0.68, 1.68]} {...clickable("cpu")}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.21, 48]} />
            <meshPhysicalMaterial
              color={activePart === "cpu" ? MUSTARD : "#eeeeeb"}
              metalness={0.32}
              roughness={0.18}
              clearcoat={0.6}
            />
          </mesh>

          <mesh position={[0, 0.115, 0]}>
            <torusGeometry args={[0.31, 0.025, 10, 48]} />
            <meshStandardMaterial
              color={activePart === "cpu" ? MUSTARD : "#d7d7d4"}
              emissive={activePart === "cpu" ? MUSTARD : "#ffffff"}
              emissiveIntensity={activePart === "cpu" ? 0.4 : 0.05}
            />
          </mesh>
        </group>

        {/* Cooling radiator */}
        <RoundedBox
          args={[2.65, 0.62, 0.33]}
          radius={0.08}
          position={[-0.15, 2.05, 0.7]}
          {...clickable("cooling")}
        >
          <meshPhysicalMaterial
            color={activePart === "cooling" ? "#f7e1a9" : "#dededb"}
            roughness={0.33}
            metalness={0.38}
          />
        </RoundedBox>

        {/* AIO tubes */}
        <CoolingTube
          points={[
            [-0.55, 0.77, 1.52],
            [-0.18, 1.15, 1.35],
            [0.33, 1.72, 1.02],
            [0.57, 2.02, 0.77],
          ]}
        />

        <CoolingTube
          points={[
            [-0.85, 0.77, 1.52],
            [-0.55, 1.18, 1.3],
            [0.02, 1.73, 0.95],
            [0.2, 2.04, 0.66],
          ]}
        />

        {/* --------------------------------------------------
            RAM
           -------------------------------------------------- */}

        {[-0.13, 0.11, 0.35, 0.59].map((x, index) => (
          <RoundedBox
            key={x}
            args={[0.13, 1.18, 0.18]}
            radius={0.035}
            position={[x, 0.67, 1.68]}
            {...clickable("ram")}
          >
            <meshPhysicalMaterial
              color={
                activePart === "ram"
                  ? MUSTARD
                  : index % 2
                    ? "#f8f8f5"
                    : "#e1e1de"
              }
              roughness={0.24}
              metalness={0.25}
              emissive={activePart === "ram" ? MUSTARD : "#ffffff"}
              emissiveIntensity={activePart === "ram" ? 0.18 : 0.015}
            />
          </RoundedBox>
        ))}

        {/* --------------------------------------------------
            GPU
           -------------------------------------------------- */}

        <group position={[-0.15, -0.55, 1.58]} {...clickable("gpu")}>
          <RoundedBox args={[2.95, 0.72, 0.42]} radius={0.09} smoothness={6}>
            <meshPhysicalMaterial
              color={activePart === "gpu" ? "#f7d98a" : "#dededb"}
              metalness={0.47}
              roughness={0.23}
              clearcoat={0.45}
            />
          </RoundedBox>

          <RoundedBox
            args={[2.5, 0.46, 0.46]}
            radius={0.07}
            position={[-0.06, 0, 0.06]}
          >
            <meshPhysicalMaterial
              color="#cfcfcb"
              roughness={0.28}
              metalness={0.35}
            />
          </RoundedBox>

          {/* GPU fan details */}
          {[-0.72, 0, 0.72].map((x) => (
            <mesh
              key={x}
              position={[x, 0, 0.27]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.23, 0.035, 10, 32]} />
              <meshStandardMaterial color="#bdbdb9" />
            </mesh>
          ))}
        </group>

        {/* GPU support / power cable */}
        <CoolingTube
          points={[
            [1.16, -0.48, 1.6],
            [1.52, -0.42, 1.37],
            [1.54, 0.1, 1.08],
          ]}
        />

        {/* --------------------------------------------------
            STORAGE
           -------------------------------------------------- */}

        <RoundedBox
          args={[0.82, 0.34, 0.11]}
          radius={0.045}
          position={[-0.58, -1.38, 1.59]}
          {...clickable("storage")}
        >
          <meshPhysicalMaterial
            color={activePart === "storage" ? MUSTARD : "#dadad7"}
            roughness={0.24}
            metalness={0.38}
          />
        </RoundedBox>

        {/* --------------------------------------------------
            PSU SHROUD
           -------------------------------------------------- */}

        <RoundedBox
          args={[3.52, 0.78, 2.7]}
          radius={0.11}
          position={[-0.1, -2.05, 0.13]}
          {...clickable("psu")}
        >
          <meshPhysicalMaterial
            color={activePart === "psu" ? "#f6dfa8" : "#e2e2df"}
            roughness={0.28}
            metalness={0.42}
          />
        </RoundedBox>

        {/* PSU vent */}
        {[0, 1, 2, 3, 4, 5].map((line) => (
          <mesh key={line} position={[-0.65 + line * 0.25, -1.83, 1.51]}>
            <boxGeometry args={[0.13, 0.025, 0.035]} />
            <meshStandardMaterial color="#bababa" />
          </mesh>
        ))}

        {/* --------------------------------------------------
            CASE FANS
           -------------------------------------------------- */}

        {/* front vertical triple */}
        {[1.35, 0.05, -1.25].map((y) => (
          <PremiumCaseFan
            key={`front-${y}`}
            position={[1.63, y, 1.5]}
            active={activePart === "fans"}
            onClick={() => onSelect("fans")}
            scale={0.92}
          />
        ))}

        {/* top triple */}
        {[-1.05, 0, 1.05].map((x) => (
          <PremiumCaseFan
            key={`top-${x}`}
            position={[x, 2.15, 1.25]}
            rotation={[Math.PI / 2, 0, 0]}
            active={activePart === "fans"}
            onClick={() => onSelect("fans")}
            scale={0.8}
          />
        ))}

        {/* rear fan */}
        <PremiumCaseFan
          position={[-1.63, 1.24, 1.48]}
          active={activePart === "fans"}
          onClick={() => onSelect("fans")}
          scale={0.82}
        />

        {/* --------------------------------------------------
            INTERACTIVE HOTSPOTS
           -------------------------------------------------- */}

        <InteractivePartBeacon
          part="cpu"
          label="Processor"
          position={[-0.72, 0.66, 2.15]}
          active={activePart === "cpu"}
          chosen={chosenParts.includes("cpu")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="gpu"
          label="Graphics card"
          position={[-0.05, -0.55, 2.2]}
          active={activePart === "gpu"}
          chosen={chosenParts.includes("gpu")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="motherboard"
          label="Motherboard"
          position={[-1.22, 0.15, 2.05]}
          active={activePart === "motherboard"}
          chosen={chosenParts.includes("motherboard")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="ram"
          label="Memory"
          position={[0.32, 0.84, 2.08]}
          active={activePart === "ram"}
          chosen={chosenParts.includes("ram")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="storage"
          label="Storage"
          position={[-0.56, -1.38, 2.0]}
          active={activePart === "storage"}
          chosen={chosenParts.includes("storage")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="cooling"
          label="CPU cooling"
          position={[0.5, 1.92, 1.95]}
          active={activePart === "cooling"}
          chosen={chosenParts.includes("cooling")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="psu"
          label="Power supply"
          position={[0.65, -2.02, 1.78]}
          active={activePart === "psu"}
          chosen={chosenParts.includes("psu")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="case"
          label="PC case"
          position={[1.88, 1.94, 1.88]}
          active={activePart === "case"}
          chosen={chosenParts.includes("case")}
          onSelect={onSelect}
        />

        <InteractivePartBeacon
          part="fans"
          label="Case fans"
          position={[1.62, 0.05, 2.03]}
          active={activePart === "fans"}
          chosen={chosenParts.includes("fans")}
          onSelect={onSelect}
        />

        {/* Feet */}
        {[-1.45, 1.45].map((x) => (
          <RoundedBox
            key={x}
            args={[0.65, 0.14, 1.15]}
            radius={0.05}
            position={[x, -2.78, 0]}
          >
            <meshStandardMaterial
              color="#c8c8c5"
              metalness={0.42}
              roughness={0.34}
            />
          </RoundedBox>
        ))}
      </group>
    </Float>
  );
}

function DesktopScene({
  activePart,
  onSelect,
  chosenParts,
  theme,
}: SceneProps & {
  theme: DesktopTheme;
}) {
  const hotspots: {
    part: PcPartKind;
    label: string;
    left: string;
    top: string;
    labelPosition?: "left" | "right" | "top";
  }[] = [
    {
      part: "cooling",
      label: "CPU cooling",
      left: "50.2%",
      top: "14.0%",
      labelPosition: "right",
    },
    {
      part: "case",
      label: "PC case",
      left: "82.5%",
      top: "8.0%",
      labelPosition: "left",
    },
    {
      part: "motherboard",
      label: "Motherboard",
      left: "28.2%",
      top: "35.8%",
      labelPosition: "left",
    },
    {
      part: "cpu",
      label: "Processor",
      left: "41.0%",
      top: "35%",
      labelPosition: "left",
    },
    {
      part: "ram",
      label: "Memory",
      left: "47.6%",
      top: "35.5%",
      labelPosition: "right",
    },
    {
      part: "storage",
      label: "Storage",
      left: "43.7%",
      top: "47.6%",
      labelPosition: "right",
    },
    {
      part: "gpu",
      label: "Graphics card",
      left: "42.8%",
      top: "64.1%",
      labelPosition: "right",
    },
    {
      part: "psu",
      label: "Power supply",
      left: "39.5%",
      top: "82.5%",
      labelPosition: "right",
    },
    {
      part: "fans",
      label: "Case fans",
      left: "74.4%",
      top: "50%",
      labelPosition: "left",
    },
  ];

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white">
      <div
        className="relative w-full max-w-[900px]"
        style={{
          aspectRatio: "3 / 2",
        }}
      >
        <img
          src={
            theme === "dark"
              ? "/stereophonie-gaming-desktop-dark.jpeg"
              : "/stereophonie-gaming-desktop.jpeg"
          }
          alt={
            theme === "dark"
              ? "Stereophonie dark custom gaming desktop"
              : "Stereophonie white custom gaming desktop"
          }
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-300"
        />

        {hotspots.map(({ part, label, left, top, labelPosition = "right" }) => {
          const active = activePart === part;

          const chosen = chosenParts.includes(part);

          const labelClass =
            labelPosition === "left"
              ? "right-[calc(100%+4px)] top-1/2 -translate-y-1/2 sm:right-[calc(100%+8px)]"
              : labelPosition === "top"
                ? "bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 sm:bottom-[calc(100%+8px)]"
                : "left-[calc(100%+4px)] top-1/2 -translate-y-1/2 sm:left-[calc(100%+8px)]";

          return (
            <button
              key={part}
              type="button"
              onClick={() => onSelect(part)}
              aria-label={`Configure ${label}`}
              aria-pressed={active}
              className={[
                "group absolute z-20",
                part === "motherboard" ? "!top-[26.2%] sm:!top-[35.8%]" : "",
                part === "cooling" ? "!left-[44%] sm:!left-[50.2%]" : "",
                part === "gpu"
                  ? "!left-[39%] !top-[64.5%] sm:!left-[42.8%] sm:!top-[64.1%]"
                  : "",
                part === "fans" ? "!top-[56%] sm:!top-[50%]" : "",
                "grid h-5 w-5 place-items-center sm:h-8 sm:w-8",
                "-translate-x-1/2 -translate-y-1/2",
                "rounded-[6px] border sm:rounded-[9px]",
                "transition-all duration-200",
                "focus:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-[#FDB73E]/35",
                "focus-visible:ring-offset-2",
                active
                  ? "border-[#FDB73E] bg-[#FDB73E] shadow-[0_8px_24px_rgba(29,29,31,0.14)]"
                  : chosen
                    ? "border-[#FDB73E]/70 bg-white shadow-[0_5px_16px_rgba(29,29,31,0.10)]"
                    : "border-[#FDB73E]/55 bg-white shadow-[0_5px_16px_rgba(29,29,31,0.09)]",
                "hover:border-[#FDB73E]",
                "hover:bg-[#FDB73E]",
                "hover:shadow-[0_8px_24px_rgba(29,29,31,0.14)]",
              ].join(" ")}
              style={{
                left,
                top,
              }}
            >
              <span
                className={[
                  "h-[6px] w-[6px] sm:h-[10px] sm:w-[10px]",
                  "rounded-[2px] sm:rounded-[3px]",
                  "transition-colors duration-200",
                  active ? "bg-white" : "bg-[#FDB73E]",
                  "group-hover:bg-white",
                ].join(" ")}
              />

              <span
                className={[
                  "pointer-events-none",
                  "absolute",
                  labelClass,
                  "whitespace-nowrap",
                  "rounded-[6px] sm:rounded-[9px]",
                  "border",
                  "px-1.5 py-1 sm:px-2.5 sm:py-1.5",
                  "text-[7px] sm:text-[9px]",
                  "font-semibold",
                  "tracking-[-0.01em]",
                  "shadow-[0_5px_16px_rgba(29,29,31,0.09)]",
                  active
                    ? "border-[#FDB73E]/40 bg-white text-[#1d1d1f]"
                    : "border-black/[0.07] bg-white text-[#1d1d1f]",
                ].join(" ")}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GamingDesktopBuilder() {
  const [selection, setSelection] = useState<Record<PcPartKind, PcPart>>(() =>
    defaultSelection(),
  );

  /*
   * The catalogue starts with sensible suggestions so the 3D
   * computer never looks incomplete.
   *
   * chosenParts is separate: it records only hardware the
   * CUSTOMER explicitly confirmed.
   */
  const [chosenParts, setChosenParts] = useState<Set<PcPartKind>>(
    () => new Set(),
  );

  const [activePart, setActivePart] = useState<PcPartKind>("gpu");

  /*
   * Visual case theme only.
   *
   * This does not alter, reset or duplicate the customer's
   * component configuration. The same hotspots and component
   * picker remain active over either desktop image.
   */
  const [desktopTheme, setDesktopTheme] = useState<DesktopTheme>("white");

  const [pickerOpen, setPickerOpen] = useState(false);

  const [pickerClosing, setPickerClosing] = useState(false);

  const [search, setSearch] = useState("");

  const [brandFilter, setBrandFilter] = useState("All");

  /*
   * "all" keeps every catalog item visible.
   * "compatible" shows only hardware that currently works
   * with the customer's confirmed build.
   */
  const [compatibilityView, setCompatibilityView] = useState<
    "all" | "compatible"
  >("all");

  const [reference, setReference] = useState("ST-PC-PENDING");

  React.useEffect(() => {
    setReference(
      `ST-PC-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 6)
        .toUpperCase()}`,
    );
  }, []);

  /*
   * Compatibility-aware component catalogue.
   *
   * The customer only sees hardware that can work with the
   * important components they have already confirmed.
   *
   * Examples:
   * - AM5 CPU -> only AM5 motherboards
   * - DDR5 board -> only DDR5 RAM
   * - RTX 5090 -> sufficiently powerful PSUs
   */
  /*
   * ==========================================================
   * FULL VISIBLE CATALOG
   * ==========================================================
   *
   * IMPORTANT:
   * We do NOT remove incompatible products anymore.
   *
   * Every product remains visible.
   * Incompatible products are disabled in the UI and the
   * customer sees the exact reason.
   */
  const activeItems = useMemo(() => {
    const seen = new Set<string>();

    return [
      ...pcCatalog[activePart],
      ...extendedPcCatalog[activePart],
      ...megaPcCatalog[activePart],
    ].filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);

      return true;
    });
  }, [activePart]);

  const incompatibilityById = useMemo(() => {
    return new Map(
      activeItems.map((item) => [
        item.id,

        explainPartCompatibility(item, selection, chosenParts),
      ]),
    );
  }, [activeItems, selection, chosenParts]);

  const brands = useMemo(
    () => [
      "All",
      ...Array.from(new Set(activeItems.map((item) => item.brand))).sort(),
    ],
    [activeItems],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeItems.filter((item) => {
      const brandMatches = brandFilter === "All" || item.brand === brandFilter;

      const searchMatches =
        !query ||
        [item.brand, item.model, item.detail]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const compatibilityMatches =
        compatibilityView === "all" || !incompatibilityById.get(item.id);

      return brandMatches && searchMatches && compatibilityMatches;
    });
  }, [
    activeItems,
    brandFilter,
    search,
    compatibilityView,
    incompatibilityById,
  ]);

  function openPart(part: PcPartKind) {
    setActivePart(part);
    setSearch("");
    setBrandFilter("All");
    setCompatibilityView("all");
    setPickerClosing(false);

    setPickerClosing(false);
    setPickerOpen(true);
  }

  function choosePart(item: PcPart) {
    const incompatibility = explainPartCompatibility(
      item,
      selection,
      chosenParts,
    );

    /*
     * UI disables incompatible products, but this server-side-
     * style guard also prevents selection if choosePart is
     * triggered by another path.
     */
    if (incompatibility) {
      return;
    }

    /*
     * Build the proposed configuration first.
     */
    const nextSelection = {
      ...selection,
      [item.kind]: item,
    };

    setSelection(nextSelection);

    /*
     * Mark the selected part as explicitly confirmed, then
     * automatically unconfirm anything that became incompatible.
     *
     * Example:
     * Customer had an Intel motherboard and changes CPU to AMD.
     * The AMD CPU remains chosen, while the Intel motherboard is
     * removed from the confirmed count until an AM5/AM4 board is
     * selected.
     */
    setChosenParts((current) => {
      const next = new Set(current);

      next.add(item.kind);

      return sanitizeChosenParts(nextSelection, next, item.kind);
    });

    setActivePart(item.kind);

    closePicker();
  }

  function closePicker() {
    if (!pickerOpen || pickerClosing) {
      return;
    }

    setPickerClosing(true);

    window.setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, 220);
  }

  function closePickerSmoothly() {
    if (!pickerOpen || pickerClosing) {
      return;
    }

    setPickerClosing(true);

    window.setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, 440);
  }

  function reset() {
    setSelection(defaultSelection());

    setChosenParts(new Set());

    setActivePart("gpu");
    setDesktopTheme("white");
    closePicker();
    setSearch("");
    setBrandFilter("All");
  }

  const { whatsappNumber } = useStoreSettings();

  function sendToWhatsApp() {
    /*
     * A quotation can only be sent after the customer has
     * explicitly confirmed every desktop component.
     *
     * Keep this guard even though the button is disabled below:
     * it prevents an incomplete configuration from being sent
     * if the function is ever triggered another way.
     */
    if (chosenParts.size !== definitions.length) {
      return;
    }

    const lines = [
      "Hello Stereophonie,",
      "",
      "I would like a quotation for this gaming desktop configuration:",
      "",
      `Reference: ${reference}`,
      `Desktop theme: ${desktopTheme === "dark" ? "Dark" : "White"}`,
      `Confirmed components: ${chosenParts.size}/${definitions.length}`,
      "",
      ...definitions.map(
        ({ key }) =>
          `${partLabels[key]}: ${selection[key].brand} ${selection[key].model}`,
      ),
      "",
      "Please verify compatibility, availability and provide the final quotation.",
      "",
      "Thank you.",
    ];

    const message = encodeURIComponent(lines.join("\n"));

    const phone = whatsappNumber.replace(/\D/g, "");

    const destination = `https://wa.me/${phone}?text=${message}`;

    window.open(destination, "_blank", "noopener,noreferrer");
  }

  const activeDefinition =
    definitions.find((item) => item.key === activePart) ?? definitions[0];

  return (
    <>
      <V3Header />

      <main className="st-pc-v4 min-h-screen bg-white text-[#1d1d1f]">
        {/* HERO */}
        <section className="border-b border-black/[0.055] bg-white">
          <div className="mx-auto max-w-[1180px] px-5 pb-5 pt-6 sm:px-8 lg:px-10 lg:pb-6 lg:pt-7">
            <div className="max-w-[880px]">
              <h1 className="max-w-[790px] text-[clamp(2.2rem,4vw,3.75rem)] font-semibold leading-[0.96] tracking-[-0.065em]">
                Your dream gaming
                <br />
                desktop.
                <span className="text-[#1d1d1f]"> We got you covered.</span>
              </h1>

              <p className="mt-4 max-w-[650px] text-sm leading-6 text-black/48 sm:text-[15px] sm:leading-7">
                Explore the desktop visually, choose a component and select the
                exact hardware you want. Stereophonie will review the complete
                build and prepare your quotation.
              </p>
            </div>
          </div>
        </section>

        {/* MAIN CONFIGURATOR */}
        <section className="bg-white">
          <div className="mx-auto max-w-[1180px] px-5 pb-6 pt-3 sm:px-8 lg:px-10 lg:pb-7 lg:pt-4">
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)]">
              {/* Minimal component navigation */}
              <aside className="lg:sticky lg:top-[105px] lg:self-start">
                <div className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-[0_18px_55px_rgba(29,29,31,0.045)]">
                  <div className="border-b border-black/[0.06] px-4 py-3.5">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#1d1d1f]">
                      Components
                    </span>

                    <div className="flex items-end justify-between gap-3">
                      <h2 className="mt-1.5 text-base font-semibold tracking-[-0.02em]">
                        Configure your desktop
                      </h2>

                      <span className="shrink-0 text-[9px] font-semibold tabular-nums text-black/38">
                        {chosenParts.size} / {definitions.length}
                      </span>
                    </div>

                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.055]">
                      <div
                        className="h-full rounded-full bg-[#f5b335] transition-[width] duration-500 ease-out"
                        style={{
                          width: `${Math.round(
                            (chosenParts.size / definitions.length) * 100,
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[9px] leading-4 text-black/32">
                      {chosenParts.size === definitions.length
                        ? "Configuration complete"
                        : `${definitions.length - chosenParts.size} components left to confirm`}
                    </p>
                  </div>

                  <div className="p-2">
                    {definitions.map(({ key, icon: Icon, eyebrow }) => {
                      const active = activePart === key;

                      const selected = selection[key];

                      const chosen = chosenParts.has(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => openPart(key)}
                          className={`group flex w-full items-center gap-3 rounded-[15px] px-3 py-2.5 text-left transition ${
                            active
                              ? "bg-[#fff8e9]"
                              : chosen
                                ? "bg-[#fffdf8] hover:bg-[#fff8e9]"
                                : "hover:bg-[#f7f7f5]"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${
                              active
                                ? "bg-[#f5b335] text-black"
                                : "bg-[#f4f4f2] text-black/55"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <small className="block text-[8px] font-bold uppercase tracking-[0.15em] text-black/30">
                              {eyebrow}
                            </small>

                            <strong className="mt-0.5 block truncate text-[11px] font-semibold">
                              {partLabels[key]}
                            </strong>

                            <span className="mt-0.5 block truncate text-[9px] text-black/34">
                              {selected.brand} {selected.model}
                            </span>
                          </span>

                          {chosen ? (
                            <span
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f5b335] text-[10px] font-black text-black shadow-[0_0_0_4px_rgba(245,179,53,0.10)]"
                              title="Selected"
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="text-black/22 transition group-hover:translate-x-0.5">
                              ›
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* 3D HERO */}
              <div className="min-w-0">
                <div className="relative overflow-hidden rounded-[22px] border border-black/[0.07] bg-white shadow-[0_20px_65px_rgba(29,29,31,0.055)]">
                  <div className="grid gap-4 border-b border-black/[0.055] px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-5">
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-black/30">
                        Custom desktop
                      </span>

                      <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                        Choose a component.
                      </h2>
                    </div>

                    <div
                      className="mx-auto inline-flex rounded-full border border-black/[0.07] bg-[#f5f5f3] p-1 shadow-[inset_0_1px_2px_rgba(29,29,31,0.035)]"
                      role="group"
                      aria-label="Desktop case theme"
                    >
                      <button
                        type="button"
                        onClick={() => setDesktopTheme("white")}
                        aria-pressed={desktopTheme === "white"}
                        className={[
                          "min-h-8 rounded-full px-4 text-[9px] font-semibold transition-all duration-300",
                          desktopTheme === "white"
                            ? "bg-white text-[#1d1d1f] shadow-[0_3px_12px_rgba(29,29,31,0.10)]"
                            : "text-black/38 hover:text-black/65",
                        ].join(" ")}
                      >
                        White theme
                      </button>

                      <button
                        type="button"
                        onClick={() => setDesktopTheme("dark")}
                        aria-pressed={desktopTheme === "dark"}
                        className={[
                          "min-h-8 rounded-full px-4 text-[9px] font-semibold transition-all duration-300",
                          desktopTheme === "dark"
                            ? "bg-[#1d1d1f] text-white shadow-[0_3px_14px_rgba(29,29,31,0.18)]"
                            : "text-black/38 hover:text-black/65",
                        ].join(" ")}
                      >
                        Dark theme
                      </button>
                    </div>

                    <div className="justify-self-start rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[9px] font-medium text-black/40 sm:justify-self-end">
                      Select a component on the desktop
                    </div>
                  </div>

                  <div className="relative h-[430px] bg-white sm:h-[470px] lg:h-[520px]">
                    <DesktopScene
                      activePart={activePart}
                      onSelect={openPart}
                      chosenParts={Array.from(chosenParts)}
                      theme={desktopTheme}
                    />
                  </div>

                  <div className="border-t border-black/[0.055] p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => openPart(activePart)}
                      className="flex min-h-16 w-full items-center justify-between gap-4 rounded-[20px] bg-[#f7f7f5] px-5 text-left transition hover:bg-[#fff5dc]"
                    >
                      <span>
                        <small className="block text-[8px] font-semibold uppercase tracking-[0.17em] text-black/30">
                          Currently selected
                        </small>

                        <strong className="mt-1 block text-sm">
                          {partLabels[activePart]} ·{" "}
                          {selection[activePart].brand}{" "}
                          {selection[activePart].model}
                        </strong>
                      </span>

                      <span className="shrink-0 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[10px] font-semibold">
                        Change
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIMPLE SUMMARY */}
        <section className="border-t border-black/[0.055] bg-white">
          <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]">
                  Your configuration
                </span>

                <h2 className="mt-2 max-w-[680px] text-xl font-semibold tracking-[-0.045em] sm:text-3xl">
                  {chosenParts.size === definitions.length
                    ? "Ready for Stereophonie review."
                    : chosenParts.size === 0
                      ? "Build your configuration."
                      : "Your build is taking shape."}
                </h2>

                <p className="mt-4 max-w-[650px] text-sm leading-6 text-black/42">
                  {chosenParts.size === definitions.length
                    ? "All 9 components are confirmed. Our team will verify compatibility, availability and prepare your final quotation."
                    : chosenParts.size === 0
                      ? "Choose and confirm each component. Only the parts you personally select will appear in your configuration."
                      : `${definitions.length - chosenParts.size} components left to confirm before this configuration is ready for Stereophonie review.`}
                </p>
              </div>

              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-[#f7f7f5] px-4 text-[10px] font-semibold text-black/60 transition hover:border-black/15 hover:bg-white hover:text-black"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>

            <div className="mt-9">
              {chosenParts.size === 0 ? (
                <div className="rounded-[16px] border border-dashed border-black/[0.10] bg-[#fafaf8] px-5 py-4 text-sm text-black/38">
                  No components confirmed yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {definitions
                    .filter(({ key }) => chosenParts.has(key))
                    .map(({ key, eyebrow }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openPart(key)}
                        className="group inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.07] bg-[#fafaf8] px-4 py-2.5 text-left transition hover:border-[#f5b335]/45 hover:bg-[#fff8e8]"
                      >
                        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#1d1d1f]">
                          {eyebrow}
                        </span>

                        <span className="max-w-[260px] truncate text-[10px] font-medium text-black/62">
                          {selection[key].brand} {selection[key].model}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-10 rounded-[20px] border border-[#f5b335]/30 bg-[#fff8e9] p-5 sm:p-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div className="flex items-start gap-4">
                <div className="relative top-[6px] grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[#f5b335]">
                  <span className="block h-5 w-5 text-black">
                    <StereophonieWhatsAppIcon />
                  </span>
                </div>

                <div>
                  <small className="block text-[8px] font-semibold uppercase tracking-[0.18em] text-[#1d1d1f]">
                    Stereophonie consultation
                  </small>

                  <strong className="mt-1 block text-base">
                    Send this configuration to our team.
                  </strong>

                  <span className="mt-1 block text-xs text-black/42">
                    Reference {reference}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={sendToWhatsApp}
                disabled={chosenParts.size !== definitions.length}
                aria-disabled={chosenParts.size !== definitions.length}
                title={
                  chosenParts.size === definitions.length
                    ? "Send completed configuration on WhatsApp"
                    : `Confirm all ${definitions.length} components before sending`
                }
                className={[
                  "mt-5 inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-full px-7 text-xs font-semibold transition lg:mt-0 lg:w-auto",
                  chosenParts.size === definitions.length
                    ? "cursor-pointer bg-[#f5b335] text-black hover:bg-[#eaaa2b]"
                    : "cursor-not-allowed border border-black/[0.07] bg-[#f5f5f3] text-black/35 shadow-none",
                ].join(" ")}
              >
                {chosenParts.size === definitions.length ? (
                  <>
                    Send on WhatsApp
                    <span>→</span>
                  </>
                ) : (
                  <>
                    Complete all {definitions.length} components first
                    <span className="tabular-nums">
                      {chosenParts.size}/{definitions.length}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* PICKER */}
        {pickerOpen ? (
          <div
            data-st-component-picker-state={pickerClosing ? "closing" : "open"}
            className="st-component-picker-overlay fixed inset-0 z-[120] flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose ${partLabels[activePart]}`}
          >
            <button
              type="button"
              className="absolute inset-0 bg-transparent"
              aria-label="Close component selector"
              onClick={() => closePicker()}
            />

            <section
              key={activePart}
              data-st-picker-content="true"
              className="st-component-picker-panel relative z-10 flex max-h-[70vh] w-full max-w-[590px] flex-col overflow-hidden rounded-t-[20px] border border-black/[0.08] bg-white shadow-[0_35px_120px_rgba(29,29,31,0.18)] sm:rounded-[20px]"
            >
              <header className="flex items-start justify-between gap-5 border-b border-black/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#1d1d1f]">
                    {activeDefinition.eyebrow}
                  </span>

                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.045em]">
                    Choose {partLabels[activePart].toLowerCase()}.
                  </h2>

                  <p className="mt-2 text-xs text-black/38">
                    {pcCatalog[activePart].length} options available in this
                    catalogue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => closePicker()}
                  className="!flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-[#f5f5f3] p-0 text-[#1d1d1f] transition hover:border-[#f5b335]/40 hover:bg-[#fff3d4] hover:text-[#8a5b00] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.10)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="border-b border-black/[0.06] px-4 py-3 sm:px-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/28" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${partLabels[
                      activePart
                    ].toLowerCase()}, model or generation…`}
                    className="h-11 w-full rounded-[14px] border border-black/[0.08] bg-[#f7f7f5] pl-11 pr-4 text-sm outline-none transition focus:border-[#f5b335]/75 focus:bg-white focus:ring-4 focus:ring-[#f5b335]/10"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div
                    className="inline-flex rounded-full border border-black/[0.07] bg-[#f5f5f3] p-1"
                    role="group"
                    aria-label="Compatibility filter"
                  >
                    <button
                      type="button"
                      onClick={() => setCompatibilityView("all")}
                      className={`relative inline-flex h-8 items-center justify-center rounded-full px-4 text-[9px] font-semibold transition-all duration-300 ${
                        compatibilityView === "all"
                          ? "bg-white text-black shadow-[0_2px_8px_rgba(29,29,31,0.08)]"
                          : "text-black/42 hover:text-black/70"
                      }`}
                    >
                      All
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompatibilityView("compatible")}
                      className={`relative inline-flex h-8 items-center justify-center rounded-full px-4 text-[9px] font-semibold transition-all duration-300 ${
                        compatibilityView === "compatible"
                          ? "bg-[#f5b335] text-black shadow-[0_3px_12px_rgba(245,179,53,0.22)]"
                          : "text-black/42 hover:text-black/70"
                      }`}
                    >
                      Compatible
                    </button>
                  </div>

                  <span className="shrink-0 text-[8px] font-medium text-black/30">
                    {compatibilityView === "compatible"
                      ? `${filteredItems.length} compatible`
                      : `${activeItems.length} total`}
                  </span>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setBrandFilter(brand)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-semibold transition ${
                        brandFilter === brand
                          ? "bg-[#f5b335] text-black"
                          : "border border-black/[0.07] bg-white text-black/55 hover:bg-[#f7f7f5]"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
                <div className="grid gap-2">
                  {filteredItems.map((item) => {
                    const selected = selection[activePart].id === item.id;

                    const explicitlyChosen =
                      selected && chosenParts.has(activePart);

                    const incompatibility =
                      incompatibilityById.get(item.id) ?? null;

                    const unavailable = Boolean(incompatibility);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!unavailable) {
                            choosePart(item);
                          }
                        }}
                        disabled={unavailable}
                        aria-disabled={unavailable}
                        title={incompatibility ?? undefined}
                        className={`flex min-h-[56px] w-full items-center gap-3 rounded-[13px] border px-3 py-2.5 text-left transition ${
                          unavailable
                            ? "cursor-not-allowed border-black/[0.045] bg-[#f7f7f6] opacity-[0.46] grayscale"
                            : selected
                              ? "border-[#f5b335]/55 bg-[#fff8e8]"
                              : "border-transparent bg-white hover:border-black/[0.07] hover:bg-[#f8f8f6]"
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${
                            selected ? "bg-[#f5b335]" : "bg-[#f3f3f1]"
                          }`}
                        >
                          <activeDefinition.icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <small className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1d1d1f]">
                            {item.brand}
                          </small>

                          <strong className="mt-0.5 block text-sm">
                            {item.model}
                          </strong>

                          <span className="mt-0.5 block text-[10px] text-black/38">
                            {item.detail}
                          </span>

                          {incompatibility ? (
                            <span className="mt-1.5 block max-w-[390px] text-[9px] font-semibold leading-[1.45] text-black/55">
                              {incompatibility}
                            </span>
                          ) : null}
                        </span>

                        {unavailable ? (
                          <span className="shrink-0 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.13em] text-black/45">
                            Incompatible
                          </span>
                        ) : selected ? (
                          <span
                            className={`shrink-0 rounded-full px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.13em] ${
                              explicitlyChosen
                                ? "bg-[#f5b335] text-black"
                                : "border border-black/[0.08] bg-white text-black/38"
                            }`}
                          >
                            {explicitlyChosen ? "Selected" : "Suggested"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}

                  {!filteredItems.length ? (
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold">
                        No compatible component found.
                      </p>

                      <p className="mt-2 text-xs leading-5 text-black/38">
                        Your current confirmed hardware limits the available
                        options. Try another brand or change the related
                        component in your configuration.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <V3Footer />
    </>
  );
}
