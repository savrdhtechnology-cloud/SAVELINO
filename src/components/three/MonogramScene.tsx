"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/lib/site";

type PointerRef = React.RefObject<{ x: number; y: number }>;

/**
 * The approved SL monogram given real depth: the exact logo artwork is stacked
 * into thin slices (no redrawing), so it reads as a solid gold object while it
 * slowly rotates. The back face is turned 180° so the monogram also reads
 * correctly from behind.
 */
function GoldMonogram({ layers, size, pointer }: { layers: number; size: number; pointer: PointerRef }) {
  const texture = useTexture(site.logo.monogram);
  const spin = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const depth = size * 0.07;

  const materials = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    const face = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 0.38,
      metalness: 0.55,
      roughness: 0.3,
      transparent: true,
      alphaTest: 0.32,
    });
    const edge = new THREE.MeshStandardMaterial({
      map: texture,
      color: new THREE.Color("#8d6b1f"),
      emissiveMap: texture,
      emissive: new THREE.Color("#3a2a08"),
      emissiveIntensity: 0.6,
      metalness: 0.85,
      roughness: 0.42,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    return { face, edge };
  }, [texture]);

  useEffect(() => {
    return () => {
      materials.face.dispose();
      materials.edge.dispose();
    };
  }, [materials]);

  const slices = useMemo(
    () => Array.from({ length: layers }, (_, i) => -depth / 2 + (depth * (i + 1)) / (layers + 1)),
    [layers, depth],
  );

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (spin.current) spin.current.rotation.y += d * 0.32;
    if (tilt.current && pointer.current) {
      const { x, y } = pointer.current;
      tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, y * 0.22, 3, d);
      tilt.current.rotation.z = THREE.MathUtils.damp(tilt.current.rotation.z, -x * 0.08, 3, d);
      tilt.current.position.x = THREE.MathUtils.damp(tilt.current.position.x, x * 0.25, 3, d);
    }
  });

  return (
    <group ref={tilt}>
      <group ref={spin}>
        <mesh position={[0, 0, depth / 2]} material={materials.face}>
          <planeGeometry args={[size, size]} />
        </mesh>
        {slices.map((z) => (
          <mesh key={z} position={[0, 0, z]} material={materials.edge}>
            <planeGeometry args={[size, size]} />
          </mesh>
        ))}
        <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]} material={materials.face}>
          <planeGeometry args={[size, size]} />
        </mesh>
      </group>
    </group>
  );
}

function OrbitingLights() {
  const a = useRef<THREE.PointLight>(null);
  const b = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.5;
    if (a.current) a.current.position.set(Math.cos(t) * 3.2, 1.4, Math.sin(t) * 3.2 + 1.5);
    if (b.current) b.current.position.set(Math.cos(t + Math.PI) * 3, -1.2, Math.sin(t + Math.PI) * 3 + 1.5);
  });
  return (
    <>
      <pointLight ref={a} color="#ffd98a" intensity={14} distance={12} decay={2} />
      <pointLight ref={b} color="#d4af37" intensity={9} distance={12} decay={2} />
    </>
  );
}

const goldMetal = { color: "#d4af37", metalness: 1, roughness: 0.28 } as const;

function FloatingOrnaments({ mobile }: { mobile: boolean }) {
  return (
    <>
      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh position={[mobile ? -1.5 : -3.1, 1.25, -1.2]} rotation={[1.1, 0.3, 0]}>
          <torusGeometry args={[0.42, 0.012, 16, 96]} />
          <meshStandardMaterial {...goldMetal} />
        </mesh>
      </Float>
      <Float speed={0.9} rotationIntensity={0.8} floatIntensity={1}>
        <mesh position={[mobile ? 1.6 : 3.2, -0.9, -1.6]} rotation={[0.4, 1, 0.2]}>
          <torusGeometry args={[0.62, 0.01, 16, 96]} />
          <meshStandardMaterial {...goldMetal} />
        </mesh>
      </Float>
      {!mobile && (
        <>
          <Float speed={1.6} rotationIntensity={1.4} floatIntensity={1.2}>
            <mesh position={[2.5, 1.6, -0.6]}>
              <octahedronGeometry args={[0.13, 0]} />
              <meshStandardMaterial {...goldMetal} flatShading />
            </mesh>
          </Float>
          <Float speed={1.3} rotationIntensity={1.2} floatIntensity={1.4}>
            <mesh position={[-2.6, -1.3, -0.4]}>
              <octahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial {...goldMetal} flatShading />
            </mesh>
          </Float>
        </>
      )}
    </>
  );
}

/** Shared with the hero's static fallback so the swap to 3D causes no visual jump. */
export const MONOGRAM = {
  visibleHeight: 2 * 6 * Math.tan((35 / 2) * (Math.PI / 180)),
  size: (mobile: boolean) => (mobile ? 1.45 : 2.2),
  offsetY: (mobile: boolean) => (mobile ? 0.5 : 0.45),
};

export type MonogramSceneProps = {
  active: boolean;
  mobile: boolean;
  onReady?: () => void;
};

export default function MonogramScene({ active, mobile, onReady }: MonogramSceneProps) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (mobile) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mobile]);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 35 }}
      onCreated={() => onReady?.()}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 5]} intensity={1.6} color="#fff1cc" />
      <spotLight position={[0, 5, 2]} angle={0.5} penumbra={1} intensity={30} color="#f6e3a1" />
      <OrbitingLights />
      <Suspense fallback={null}>
        <group position={[0, MONOGRAM.offsetY(mobile), 0]}>
          <GoldMonogram layers={mobile ? 12 : 22} size={MONOGRAM.size(mobile)} pointer={pointer} />
        </group>
      </Suspense>
      <FloatingOrnaments mobile={mobile} />
      <Sparkles
        count={mobile ? 40 : 90}
        scale={[8, 5, 3]}
        size={mobile ? 2 : 2.6}
        speed={0.25}
        opacity={0.7}
        color="#e9cf7d"
      />
    </Canvas>
  );
}
