"use client";

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Float, Sparkles, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type CarouselItem = { slug: string; title: string; src: string; aspect: number };

type Props = {
  items: CarouselItem[];
  active: boolean;
  mobile: boolean;
  onFocusChange: (index: number) => void;
  onSelect: (slug: string) => void;
};

const CARD_H = 2.3;

function Card({
  item,
  texture,
  angle,
  radius,
  onSelect,
}: {
  item: CarouselItem;
  texture: THREE.Texture;
  angle: number;
  radius: number;
  onSelect: (slug: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const w = CARD_H * item.aspect;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hovered ? 1.08 : 1;
    const s = THREE.MathUtils.damp(ref.current.scale.x, target, 6, Math.min(delta, 0.05));
    ref.current.scale.setScalar(s);
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group
      position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
      rotation={[0, angle, 0]}
    >
      <group ref={ref}>
        {/* antique gold frame */}
        <mesh position={[0, 0, -0.012]}>
          <planeGeometry args={[w + 0.07, CARD_H + 0.07]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.32} emissive="#4a360c" emissiveIntensity={0.5} />
        </mesh>
        <mesh
          onPointerOver={onOver}
          onPointerOut={onOut}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.slug);
          }}
        >
          <planeGeometry args={[w, CARD_H]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Ring({ items, mobile, onFocusChange, onSelect }: Omit<Props, "active">) {
  const textures = useTexture(items.map((i) => i.src));
  const ring = useRef<THREE.Group>(null);
  const focused = useRef(-1);
  const radius = mobile ? 2.6 : 3.6;
  const step = (Math.PI * 2) / items.length;

  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    });
  }, [textures]);

  useFrame((_, delta) => {
    if (!ring.current) return;
    ring.current.rotation.y -= Math.min(delta, 0.05) * 0.16;
    // Which card currently faces the camera?
    const rot = ((-ring.current.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.round(rot / step) % items.length;
    if (index !== focused.current) {
      focused.current = index;
      onFocusChange(index);
    }
  });

  return (
    <group ref={ring} position={[0, 0.05, -radius + (mobile ? 1.2 : 1.6)]}>
      {items.map((item, i) => (
        <Card
          key={item.slug}
          item={item}
          texture={textures[i]}
          angle={i * step}
          radius={radius}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export default function ProductCarousel({ items, active, mobile, onFocusChange, onSelect }: Props) {
  // Match the floor to the current theme background (dark or light template).
  const [floor, setFloor] = useState("#0b0b0b");
  useEffect(() => {
    const read = () => setFloor(getComputedStyle(document.documentElement).getPropertyValue("--color-noir").trim() || "#0b0b0b");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    return () => obs.disconnect();
  }, []);
  useEffect(() => () => void (document.body.style.cursor = ""), []);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.35, 5.2], fov: 42 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 4, 5]} intensity={2} color="#fff1cc" />
      <pointLight position={[0, -1.5, 2]} intensity={8} color="#d4af37" distance={10} />
      <Suspense fallback={null}>
        <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.25}>
          <Ring items={items} mobile={mobile} onFocusChange={onFocusChange} onSelect={onSelect} />
        </Float>
      </Suspense>
      <Sparkles count={mobile ? 30 : 60} scale={[9, 4, 4]} size={2.2} speed={0.2} opacity={0.6} color="#e9cf7d" />
      {/* Polished noir floor reflection hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color={floor} metalness={0.8} roughness={0.35} transparent opacity={0.9} />
      </mesh>
    </Canvas>
  );
}
