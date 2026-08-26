"use client";

import React, {
  Suspense,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  ThreeEvent,
  useFrame,
} from "@react-three/fiber";

import {
  ContactShadows,
  Html,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";

import * as THREE from "three";

import type {
  PcPartKind,
} from "@/lib/gaming-desktop/catalog";

const MUSTARD = "#f5b335";

type PremiumGamingPcSceneProps = {
  activePart: PcPartKind;
  chosenParts: PcPartKind[];
  onSelect: (part: PcPartKind) => void;
};

type ClickableProps = {
  part: PcPartKind;
  activePart: PcPartKind;
  onSelect: (part: PcPartKind) => void;
  children: React.ReactNode;
};

function ClickablePart({
  part,
  activePart,
  onSelect,
  children,
}: ClickableProps) {
  const active =
    activePart === part;

  return (
    <group
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor =
          "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor =
          "default";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part);
      }}
      scale={
        active
          ? [1.012, 1.012, 1.012]
          : [1, 1, 1]
      }
    >
      {children}
    </group>
  );
}

function PulseMarker({
  part,
  label,
  position,
  active,
  chosen,
  onSelect,
}: {
  part: PcPartKind;
  label: string;
  position: [number, number, number];
  active: boolean;
  chosen: boolean;
  onSelect: (part: PcPartKind) => void;
}) {
  const halo =
    useRef<THREE.Mesh>(null);

  const core =
    useRef<THREE.Mesh>(null);

  const [hovered, setHovered] =
    useState(false);

  useFrame((_, delta) => {
    if (halo.current) {
      const scale =
        halo.current.scale.x;

      const next =
        scale >= 1.85
          ? 1
          : scale + delta * 0.85;

      halo.current.scale.setScalar(
        next,
      );

      const material =
        halo.current
          .material as THREE.MeshBasicMaterial;

      material.opacity =
        Math.max(
          0,
          0.22 -
            (next - 1) * 0.22,
        );
    }

    if (core.current) {
      core.current.rotation.z +=
        delta * 0.6;
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor =
          "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor =
          "default";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part);
      }}
    >
      {/* Large invisible interaction target */}
      <mesh>
        <sphereGeometry
          args={[0.34, 20, 20]}
        />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={halo}>
        <sphereGeometry
          args={[0.12, 24, 24]}
        />
        <meshBasicMaterial
          color={MUSTARD}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry
          args={[
            active ? 0.095 : 0.075,
            28,
            28,
          ]}
        />

        <meshStandardMaterial
          color={MUSTARD}
          emissive={MUSTARD}
          emissiveIntensity={
            active ? 2.1 : 1.2
          }
          roughness={0.3}
          metalness={0.08}
        />
      </mesh>

      {(hovered || active) ? (
        <Html
          center
          position={[0, 0.34, 0]}
          transform={false}
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border:
                "1px solid rgba(29,29,31,.08)",
              borderRadius: 999,
              background:
                "rgba(255,255,255,.96)",
              padding: "7px 11px",
              boxShadow:
                "0 10px 35px rgba(29,29,31,.12)",
              backdropFilter:
                "blur(16px)",
              whiteSpace: "nowrap",
              fontSize: 11,
              fontWeight: 650,
              color: "#1d1d1f",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: MUSTARD,
                boxShadow:
                  "0 0 0 4px rgba(245,179,53,.14)",
              }}
            />

            {label}

            {chosen ? (
              <span
                style={{
                  marginLeft: 2,
                  fontSize: 9,
                  opacity: 0.45,
                }}
              >
                ✓
              </span>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function PremiumFan({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [
    number,
    number,
    number,
  ];
  rotation?: [
    number,
    number,
    number,
  ];
  scale?: number;
}) {
  const rotor =
    useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rotor.current) {
      rotor.current.rotation.z +=
        delta * 1.65;
    }
  });

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <RoundedBox
        args={[0.91, 0.91, 0.12]}
        radius={0.09}
        smoothness={5}
      >
        <meshPhysicalMaterial
          color="#f8f8f7"
          roughness={0.28}
          metalness={0.08}
          clearcoat={0.35}
        />
      </RoundedBox>

      <mesh
        position={[0, 0, 0.07]}
      >
        <torusGeometry
          args={[
            0.32,
            0.045,
            16,
            48,
          ]}
        />

        <meshStandardMaterial
          color="#dadad8"
          roughness={0.3}
          metalness={0.35}
        />
      </mesh>

      <group
        ref={rotor}
        position={[0, 0, 0.13]}
      >
        {Array.from({
          length: 7,
        }).map((_, index) => {
          const angle =
            (index / 7) *
            Math.PI *
            2;

          return (
            <mesh
              key={index}
              position={[
                Math.cos(angle) *
                  0.15,
                Math.sin(angle) *
                  0.15,
                0,
              ]}
              rotation={[
                0,
                0,
                angle +
                  Math.PI / 2,
              ]}
            >
              <capsuleGeometry
                args={[
                  0.075,
                  0.26,
                  4,
                  10,
                ]}
              />
              <meshPhysicalMaterial
                color="#f3f3f2"
                transparent
                opacity={0.82}
                roughness={0.28}
              />
            </mesh>
          );
        })}
      </group>

      <mesh
        position={[0, 0, 0.15]}
      >
        <mesh rotation={[
            Math.PI / 2,
            0,
            0,
          ]}>
          <cylinderGeometry
          args={[
            0.095,
            0.095,
            0.08,
            30,
          ]}
          
        />
        </mesh>

        <meshStandardMaterial
          color="#bfc0c0"
          roughness={0.32}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

function CoolingTube({
  points,
}: {
  points: [
    number,
    number,
    number,
  ][];
}) {
  const geometry =
    useMemo(() => {
      const curve =
        new THREE.CatmullRomCurve3(
          points.map(
            (point) =>
              new THREE.Vector3(
                ...point,
              ),
          ),
        );

      return new THREE.TubeGeometry(
        curve,
        36,
        0.055,
        12,
        false,
      );
    }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e4e4e2"
        roughness={0.58}
        metalness={0.05}
      />
    </mesh>
  );
}

function Motherboard({
  activePart,
  onSelect,
}: {
  activePart: PcPartKind;
  onSelect: (part: PcPartKind) => void;
}) {
  return (
    <ClickablePart
      part="motherboard"
      activePart={activePart}
      onSelect={onSelect}
    >
      <group
        position={[
          -0.35,
          0.13,
          0.28,
        ]}
      >
        <RoundedBox
          args={[
            2.55,
            3.0,
            0.12,
          ]}
          radius={0.07}
          smoothness={5}
        >
          <meshPhysicalMaterial
            color="#d8d9d6"
            roughness={0.42}
            metalness={0.27}
            clearcoat={0.2}
          />
        </RoundedBox>

        {/* PCB inset */}
        <RoundedBox
          args={[
            2.28,
            2.72,
            0.09,
          ]}
          radius={0.05}
          position={[
            0,
            0,
            0.105,
          ]}
        >
          <meshStandardMaterial
            color="#bcbfbb"
            roughness={0.58}
            metalness={0.18}
          />
        </RoundedBox>

        {/* VRM blocks */}
        <RoundedBox
          args={[
            1.18,
            0.32,
            0.22,
          ]}
          radius={0.04}
          position={[
            -0.27,
            1.03,
            0.22,
          ]}
        >
          <meshStandardMaterial
            color="#ececea"
            roughness={0.28}
            metalness={0.62}
          />
        </RoundedBox>

        <RoundedBox
          args={[
            0.34,
            1.04,
            0.22,
          ]}
          radius={0.04}
          position={[
            -0.99,
            0.55,
            0.22,
          ]}
        >
          <meshStandardMaterial
            color="#ececea"
            roughness={0.28}
            metalness={0.62}
          />
        </RoundedBox>

        {/* PCI lanes */}
        {[0, 1, 2].map(
          (index) => (
            <RoundedBox
              key={index}
              args={[
                1.62,
                0.095,
                0.11,
              ]}
              radius={0.025}
              position={[
                0.1,
                -0.72 -
                  index * 0.32,
                0.2,
              ]}
            >
              <meshStandardMaterial
                color="#f2f2ef"
                roughness={0.36}
                metalness={0.34}
              />
            </RoundedBox>
          ),
        )}

        {/* M2 covers */}
        {[0, 1].map(
          (index) => (
            <RoundedBox
              key={index}
              args={[
                0.92,
                0.2,
                0.12,
              ]}
              radius={0.03}
              position={[
                0.43,
                -0.04 -
                  index * 0.4,
                0.19,
              ]}
            >
              <meshStandardMaterial
                color="#e7e7e5"
                roughness={0.29}
                metalness={0.54}
              />
            </RoundedBox>
          ),
        )}
      </group>
    </ClickablePart>
  );
}

function GamingTower({
  activePart,
  chosenParts,
  onSelect,
}: PremiumGamingPcSceneProps) {
  const chosen = (
    part: PcPartKind,
  ) =>
    chosenParts.includes(part);

  return (
    <group
      rotation={[
        -0.03,
        -0.28,
        0,
      ]}
      position={[0, 0.08, 0]}
    >
      {/* ======================================================
          CHASSIS / STRUCTURE
         ====================================================== */}

      <ClickablePart
        part="case"
        activePart={activePart}
        onSelect={onSelect}
      >
        {/* Rear panel */}
        <RoundedBox
          args={[
            4.3,
            5.65,
            2.7,
          ]}
          radius={0.17}
          smoothness={7}
          position={[
            0,
            0,
            -0.17,
          ]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color="#f4f4f2"
            roughness={0.22}
            metalness={0.36}
            clearcoat={0.65}
            clearcoatRoughness={0.22}
          />
        </RoundedBox>

        {/* Inner cavity */}
        <RoundedBox
          args={[
            3.94,
            5.17,
            2.43,
          ]}
          radius={0.11}
          smoothness={6}
          position={[
            -0.02,
            0,
            0.02,
          ]}
        >
          <meshPhysicalMaterial
            color="#eeeeeb"
            roughness={0.37}
            metalness={0.17}
          />
        </RoundedBox>

        {/* Glass panel */}
        <RoundedBox
          args={[
            3.87,
            5.02,
            0.065,
          ]}
          radius={0.1}
          smoothness={6}
          position={[
            -0.03,
            0,
            1.255,
          ]}
        >
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.17}
            roughness={0.04}
            metalness={0}
            transmission={0.76}
            thickness={0.28}
            ior={1.45}
            clearcoat={1}
            clearcoatRoughness={0.05}
            depthWrite={false}
          />
        </RoundedBox>

        {/* Front glass panel */}
        <RoundedBox
          args={[
            0.065,
            5.02,
            2.36,
          ]}
          radius={0.09}
          smoothness={6}
          position={[
            2.02,
            0,
            0.02,
          ]}
        >
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            roughness={0.04}
            transmission={0.8}
            thickness={0.22}
            clearcoat={1}
            depthWrite={false}
          />
        </RoundedBox>

        {/* Frame members */}
        {[
          [-2.03, 0, 1.28],
          [2.03, 0, 1.28],
          [-2.03, 0, -1.28],
          [2.03, 0, -1.28],
        ].map(
          (position, index) => (
            <RoundedBox
              key={index}
              args={[
                0.14,
                5.55,
                0.14,
              ]}
              radius={0.035}
              position={
                position as [
                  number,
                  number,
                  number,
                ]
              }
            >
              <meshPhysicalMaterial
                color="#dededb"
                roughness={0.25}
                metalness={0.62}
              />
            </RoundedBox>
          ),
        )}

        {/* Top / bottom rails */}
        {[-2.73, 2.73].map(
          (y) => (
            <RoundedBox
              key={y}
              args={[
                4.15,
                0.12,
                2.55,
              ]}
              radius={0.035}
              position={[
                0,
                y,
                0,
              ]}
            >
              <meshPhysicalMaterial
                color="#dededb"
                roughness={0.3}
                metalness={0.56}
              />
            </RoundedBox>
          ),
        )}
      </ClickablePart>

      {/* ======================================================
          MOTHERBOARD
         ====================================================== */}

      <Motherboard
        activePart={activePart}
        onSelect={onSelect}
      />

      {/* ======================================================
          CPU + AIO
         ====================================================== */}

      <ClickablePart
        part="cpu"
        activePart={activePart}
        onSelect={onSelect}
      >
        <group
          position={[
            -0.62,
            0.55,
            0.56,
          ]}
        >
          <RoundedBox
            args={[
              0.76,
              0.76,
              0.17,
            ]}
            radius={0.08}
          >
            <meshPhysicalMaterial
              color="#d8d9d6"
              roughness={0.25}
              metalness={0.69}
            />
          </RoundedBox>

          <RoundedBox
            args={[
              0.48,
              0.48,
              0.13,
            ]}
            radius={0.07}
            position={[
              0,
              0,
              0.14,
            ]}
          >
            <meshPhysicalMaterial
              color="#f7f7f5"
              roughness={0.19}
              metalness={0.4}
              clearcoat={0.6}
            />
          </RoundedBox>
        </group>
      </ClickablePart>

      <ClickablePart
        part="cooling"
        activePart={activePart}
        onSelect={onSelect}
      >
        <group>
          {/* AIO pump */}
          <mesh
            position={[
              -0.62,
              0.55,
              0.76,
            ]}
          >
            <mesh rotation={[
                Math.PI / 2,
                0,
                0,
              ]}>
          <cylinderGeometry
              args={[
                0.34,
                0.34,
                0.18,
                42,
              ]}
              
            />
        </mesh>
            <meshPhysicalMaterial
              color="#f7f7f4"
              roughness={0.19}
              metalness={0.55}
              clearcoat={0.7}
            />
          </mesh>

          <mesh
            position={[
              -0.62,
              0.55,
              0.88,
            ]}
          >
            <torusGeometry
              args={[
                0.2,
                0.022,
                12,
                42,
              ]}
            />
            <meshStandardMaterial
              color={MUSTARD}
              emissive={MUSTARD}
              emissiveIntensity={
                activePart ===
                "cooling"
                  ? 1.4
                  : 0.25
              }
            />
          </mesh>

          {/* Top radiator */}
          <RoundedBox
            args={[
              2.95,
              0.25,
              0.95,
            ]}
            radius={0.06}
            smoothness={5}
            position={[
              -0.3,
              2.36,
              0.14,
            ]}
          >
            <meshPhysicalMaterial
              color="#d4d4d1"
              roughness={0.35}
              metalness={0.48}
            />
          </RoundedBox>

          <CoolingTube
            points={[
              [-0.38, 0.74, 0.73],
              [0.3, 1.23, 0.78],
              [0.65, 1.84, 0.64],
              [0.67, 2.24, 0.48],
            ]}
          />

          <CoolingTube
            points={[
              [-0.86, 0.72, 0.72],
              [-0.2, 1.25, 0.76],
              [0.12, 1.84, 0.55],
              [0.12, 2.23, 0.43],
            ]}
          />
        </group>
      </ClickablePart>

      {/* ======================================================
          RAM
         ====================================================== */}

      <ClickablePart
        part="ram"
        activePart={activePart}
        onSelect={onSelect}
      >
        <group
          position={[
            0.31,
            0.7,
            0.62,
          ]}
        >
          {[
            -0.26,
            -0.085,
            0.085,
            0.26,
          ].map(
            (x, index) => (
              <RoundedBox
                key={x}
                args={[
                  0.11,
                  1.42,
                  0.21,
                ]}
                radius={0.035}
                position={[
                  x,
                  0,
                  0,
                ]}
              >
                <meshPhysicalMaterial
                  color={
                    index % 2
                      ? "#f0f0ee"
                      : "#dadbd8"
                  }
                  roughness={0.27}
                  metalness={0.44}
                  clearcoat={0.32}
                />
              </RoundedBox>
            ),
          )}
        </group>
      </ClickablePart>

      {/* ======================================================
          GPU
         ====================================================== */}

      <ClickablePart
        part="gpu"
        activePart={activePart}
        onSelect={onSelect}
      >
        <group
          position={[
            -0.05,
            -0.78,
            0.76,
          ]}
        >
          <RoundedBox
            args={[
              3.02,
              0.8,
              0.54,
            ]}
            radius={0.09}
            smoothness={6}
            castShadow
          >
            <meshPhysicalMaterial
              color={
                activePart ===
                "gpu"
                  ? "#f4ca6b"
                  : "#d9dad7"
              }
              roughness={0.27}
              metalness={0.52}
              clearcoat={0.4}
            />
          </RoundedBox>

          {/* GPU side strip */}
          <RoundedBox
            args={[
              2.32,
              0.11,
              0.57,
            ]}
            radius={0.03}
            position={[
              0.07,
              0.35,
              0,
            ]}
          >
            <meshPhysicalMaterial
              color="#eeeeeb"
              roughness={0.24}
              metalness={0.46}
            />
          </RoundedBox>

          {/* GPU fans */}
          {[-0.88, 0, 0.88].map(
            (x) => (
              <group
                key={x}
                position={[
                  x,
                  0,
                  0.31,
                ]}
              >
                <mesh>
                  <mesh rotation={[
                      Math.PI / 2,
                      0,
                      0,
                    ]}>
          <cylinderGeometry
                    args={[
                      0.26,
                      0.26,
                      0.07,
                      30,
                    ]}
                    
                  />
        </mesh>
                  <meshPhysicalMaterial
                    color="#c2c3c0"
                    roughness={0.36}
                    metalness={0.38}
                  />
                </mesh>

                <mesh
                  position={[
                    0,
                    0,
                    0.06,
                  ]}
                >
                  <torusGeometry
                    args={[
                      0.18,
                      0.025,
                      12,
                      36,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#f5f5f3"
                    metalness={0.4}
                    roughness={0.24}
                  />
                </mesh>
              </group>
            ),
          )}
        </group>
      </ClickablePart>

      {/* ======================================================
          STORAGE
         ====================================================== */}

      <ClickablePart
        part="storage"
        activePart={activePart}
        onSelect={onSelect}
      >
        <RoundedBox
          args={[
            0.88,
            0.22,
            0.14,
          ]}
          radius={0.035}
          position={[
            0.26,
            -0.05,
            0.63,
          ]}
        >
          <meshPhysicalMaterial
            color="#eeeeda"
            roughness={0.3}
            metalness={0.35}
          />
        </RoundedBox>
      </ClickablePart>

      {/* ======================================================
          PSU
         ====================================================== */}

      <ClickablePart
        part="psu"
        activePart={activePart}
        onSelect={onSelect}
      >
        <group
          position={[
            -0.48,
            -2.0,
            0.18,
          ]}
        >
          <RoundedBox
            args={[
              2.48,
              0.76,
              1.74,
            ]}
            radius={0.09}
            smoothness={6}
          >
            <meshPhysicalMaterial
              color="#dededb"
              roughness={0.35}
              metalness={0.49}
            />
          </RoundedBox>

          <mesh
            position={[
              0.54,
              0,
              0.9,
            ]}
          >
            <torusGeometry
              args={[
                0.24,
                0.025,
                12,
                40,
              ]}
            />
            <meshStandardMaterial
              color="#b9bab7"
              metalness={0.55}
              roughness={0.33}
            />
          </mesh>
        </group>
      </ClickablePart>

      {/* ======================================================
          CASE FANS
         ====================================================== */}

      <ClickablePart
        part="fans"
        activePart={activePart}
        onSelect={onSelect}
      >
        {/* Top */}
        {[-1.02, 0, 1.02].map(
          (x) => (
            <PremiumFan
              key={`top-${x}`}
              position={[
                x,
                2.27,
                0.23,
              ]}
              rotation={[
                Math.PI / 2,
                0,
                0,
              ]}
              scale={0.78}
            />
          ),
        )}

        {/* Side/front column */}
        {[1.24, 0.15, -0.94].map(
          (y) => (
            <PremiumFan
              key={`side-${y}`}
              position={[
                1.63,
                y,
                0.19,
              ]}
              rotation={[
                0,
                Math.PI / 2,
                0,
              ]}
              scale={0.83}
            />
          ),
        )}

        {/* Rear */}
        <PremiumFan
          position={[
            -1.67,
            1.28,
            0.1,
          ]}
          scale={0.8}
        />

        {/* Bottom */}
        {[-0.95, 0, 0.95].map(
          (x) => (
            <PremiumFan
              key={`bottom-${x}`}
              position={[
                x,
                -2.42,
                0.22,
              ]}
              rotation={[
                Math.PI / 2,
                0,
                0,
              ]}
              scale={0.76}
            />
          ),
        )}
      </ClickablePart>

      {/* ======================================================
          CABLE DETAILS
         ====================================================== */}

      <CoolingTube
        points={[
          [0.9, -0.6, 0.52],
          [1.34, -0.5, 0.43],
          [1.38, 0.0, 0.22],
          [1.44, 0.72, 0.05],
        ]}
      />

      <CoolingTube
        points={[
          [-0.35, -1.14, 0.61],
          [-0.1, -1.52, 0.53],
          [0.35, -1.8, 0.36],
          [0.7, -2.0, 0.2],
        ]}
      />

      {/* ======================================================
          INTERACTIVE DISCOVERY MARKERS
         ====================================================== */}

      <PulseMarker
        part="cpu"
        label="Processor"
        position={[
          -0.68,
          0.58,
          1.14,
        ]}
        active={
          activePart === "cpu"
        }
        chosen={chosen("cpu")}
        onSelect={onSelect}
      />

      <PulseMarker
        part="motherboard"
        label="Motherboard"
        position={[
          -1.23,
          -0.05,
          1.06,
        ]}
        active={
          activePart ===
          "motherboard"
        }
        chosen={
          chosen("motherboard")
        }
        onSelect={onSelect}
      />

      <PulseMarker
        part="ram"
        label="Memory"
        position={[
          0.34,
          1.1,
          1.09,
        ]}
        active={
          activePart === "ram"
        }
        chosen={chosen("ram")}
        onSelect={onSelect}
      />

      <PulseMarker
        part="gpu"
        label="Graphics card"
        position={[
          0.15,
          -0.74,
          1.39,
        ]}
        active={
          activePart === "gpu"
        }
        chosen={chosen("gpu")}
        onSelect={onSelect}
      />

      <PulseMarker
        part="storage"
        label="Storage"
        position={[
          0.52,
          -0.04,
          1.03,
        ]}
        active={
          activePart ===
          "storage"
        }
        chosen={
          chosen("storage")
        }
        onSelect={onSelect}
      />

      <PulseMarker
        part="cooling"
        label="CPU cooling"
        position={[
          -0.18,
          1.88,
          1.04,
        ]}
        active={
          activePart ===
          "cooling"
        }
        chosen={
          chosen("cooling")
        }
        onSelect={onSelect}
      />

      <PulseMarker
        part="psu"
        label="Power supply"
        position={[
          -0.22,
          -2.0,
          1.11,
        ]}
        active={
          activePart === "psu"
        }
        chosen={chosen("psu")}
        onSelect={onSelect}
      />

      <PulseMarker
        part="fans"
        label="Case fans"
        position={[
          1.62,
          0.15,
          1.04,
        ]}
        active={
          activePart === "fans"
        }
        chosen={chosen("fans")}
        onSelect={onSelect}
      />

      <PulseMarker
        part="case"
        label="PC case"
        position={[
          1.83,
          1.91,
          1.34,
        ]}
        active={
          activePart === "case"
        }
        chosen={chosen("case")}
        onSelect={onSelect}
      />
    </group>
  );
}

function SceneContents(
  props: PremiumGamingPcSceneProps,
) {
  return (
    <>
      {/* Local lighting only.
          No external HDR download. */}
      <ambientLight
        intensity={1.45}
      />

      <hemisphereLight
        args={[
          "#ffffff",
          "#d8d8d4",
          1.6,
        ]}
      />

      <directionalLight
        position={[5.8, 8, 7]}
        intensity={2.6}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <directionalLight
        position={[
          -5,
          4,
          6,
        ]}
        intensity={1.15}
        color="#fff8e8"
      />

      <directionalLight
        position={[
          2,
          -2,
          5,
        ]}
        intensity={0.55}
        color="#ffffff"
      />

      <pointLight
        position={[
          0.8,
          1.6,
          3.8,
        ]}
        intensity={1.1}
        color="#ffffff"
      />

      <GamingTower
        {...props}
      />

      <ContactShadows
        position={[0, -3.02, 0]}
        opacity={0.24}
        scale={10}
        blur={3.2}
        far={7}
      />
    </>
  );
}

export default function PremiumGamingPcScene(
  props: PremiumGamingPcSceneProps,
) {
  return (
    <Canvas
      camera={{
        position: [7.4, 4.0, 8.8],
        fov: 31,
      }}
      dpr={[1, 1.65]}
      shadows
      gl={{
        antialias: true,
        alpha: true,
        powerPreference:
          "high-performance",
      }}
      onPointerMissed={() => {
        document.body.style.cursor =
          "default";
      }}
    >
      <color
        attach="background"
        args={["#ffffff"]}
      />

      <Suspense fallback={null}>
              <ambientLight intensity={0.7} />

      <directionalLight
        position={[7, 9, 7]}
        intensity={2.35}
        color="#ffffff"
        castShadow
      />

      <directionalLight
        position={[-5, 5, 4]}
        intensity={1.05}
        color="#fff9ed"
      />

      <directionalLight
        position={[2, 1, -6]}
        intensity={0.85}
        color="#eaf4ff"
      />

      <pointLight
        position={[0.5, 2.8, 3.8]}
        intensity={0.7}
        color="#ffffff"
      />

<SceneContents
          {...props}
        />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.62}
        zoomSpeed={0.72}
        minDistance={7.2}
        maxDistance={11.5}
        minPolarAngle={0.72}
        maxPolarAngle={1.62}
        minAzimuthAngle={-1.05}
        maxAzimuthAngle={1.05}
      />
    </Canvas>
  );
}
