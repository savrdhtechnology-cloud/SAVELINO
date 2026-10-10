"use client";

import type { ReactElement } from "react";
import type { DesignSpec } from "@/lib/atelier/constants";

const COLOR_HEX: Record<string, string> = {
  wine: "#5a0f1e", noir: "#1a1716", ivory: "#efe6d2", gold: "#c9a446", emerald: "#0f5a43", burgundy: "#6b0f1a", blush: "#e6b8b0", champagne: "#e5cf9f", midnight: "#18213d", rose: "#b5566b",
};
export const colorHex = (c?: string) => COLOR_HEX[(c ?? "").toLowerCase().split(" ")[0]] ?? "#6b0f1a";

/** Neck opening on the right half: returns points from the shoulder-neck point to centre. */
function neck(style: string, back: boolean): { w: number; pts: string; depth: number } {
  const c = 100;
  const shapes: Record<string, { w: number; depth: number; d: (w: number, dep: number) => string }> = {
    round: { w: 24, depth: back ? 18 : 24, d: (w, dep) => `Q ${c + w} ${30 + dep} ${c} ${30 + dep}` },
    sweetheart: { w: 25, depth: 32, d: (w, dep) => `C ${c + w + 2} ${30 + dep * 0.7} ${c + w * 0.6} ${30 + dep} ${c + w * 0.35} ${30 + dep * 0.82} Q ${c + 6} ${30 + dep * 0.7} ${c} ${30 + dep}` },
    v: { w: 24, depth: 46, d: (_w, dep) => `L ${c} ${30 + dep}` },
    boat: { w: 40, depth: 10, d: (w, dep) => `Q ${c + w * 0.6} ${30 + dep} ${c} ${30 + dep}` },
    square: { w: 24, depth: 30, d: (w, dep) => `L ${c + w} ${30 + dep} L ${c} ${30 + dep}` },
    u: { w: 24, depth: 44, d: (w, dep) => `C ${c + w + 1} ${30 + dep} ${c + w * 0.4} ${30 + dep + 2} ${c} ${30 + dep + 2}` },
    high: { w: 18, depth: 6, d: (w, dep) => `Q ${c + w} ${30 + dep} ${c} ${30 + dep}` },
    "deep-u": { w: 26, depth: 70, d: (w, dep) => `C ${c + w + 2} ${30 + dep} ${c + w * 0.45} ${30 + dep + 2} ${c} ${30 + dep + 2}` },
    keyhole: { w: 22, depth: 14, d: (w, dep) => `Q ${c + w} ${30 + dep} ${c} ${30 + dep}` },
  };
  const s = shapes[style] ?? shapes.round;
  return { w: s.w, depth: s.depth, pts: s.d(s.w, s.depth) };
}

function mirrorPath(d: string) {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${200 - Number(x)} ${y}`);
}

/** Technical flat (front or back) generated from the design specification. */
export function TechFlat({ spec, view, color, sketch }: { spec: DesignSpec; view: "front" | "back"; color?: string; sketch?: string | null }) {
  const back = view === "back";
  const n = neck(back ? spec.backNeck : spec.neckline, back);
  const fill = colorHex(color ?? spec.colors[0]);
  const light = ["ivory", "champagne", "blush", "gold"].includes((color ?? spec.colors[0] ?? "").toLowerCase().split(" ")[0]);
  const ink = light ? "#3a2c18" : "#e9d9a8";
  const hemY = spec.cut === "katori" ? 168 : 172;

  const neckRight = `M ${100 + n.w} 30 ${n.pts}`;

  const sleeveLen: Record<string, number> = { cap: 66, short: 98, elbow: 150, "three-quarter": 182, puff: 102 };
  const sl = spec.sleeve === "sleeveless" ? 0 : sleeveLen[spec.sleeve] ?? 100;
  const sleeveRight =
    spec.sleeve === "sleeveless"
      ? ""
      : spec.sleeve === "puff"
        ? `M 162 40 C 196 30 206 70 198 98 L 172 104 C 166 96 160 90 158 84 Z`
        : spec.sleeve === "cap"
          ? `M 162 40 C 176 44 186 54 190 66 L 170 74 C 164 80 160 84 158 84 Z`
          : `M 162 40 C 178 48 188 ${sl * 0.5} ${190 + sl * 0.05} ${sl} L ${168 + sl * 0.02} ${sl + 4} C 166 ${sl * 0.6} 162 100 158 84 Z`;

  const emb = spec.embroidery !== "None";
  const motif = (cx: number, cy: number, k: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.4 * k} fill="#d4af37" opacity={0.95} />;
  const neckDots: ReactElement[] = [];
  if (emb) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = 100 + n.w * (1 - t) + 6 * Math.sin(t * Math.PI);
      const y = 34 + n.depth * t + 4;
      neckDots.push(motif(x, y, 1), motif(200 - x, y, 1));
    }
  }

  return (
    <g>
      {sketch && <image href={sketch} x={10} y={10} width={180} height={190} opacity={0.18} preserveAspectRatio="xMidYMid meet" />}
      {/* sleeves */}
      {sleeveRight && (
        <>
          <path d={sleeveRight} fill={fill} stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
          <path d={sleeveRight} transform="translate(200 0) scale(-1 1)" fill={fill} stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
          {spec.accessories.includes("Lace edging") && spec.sleeve !== "puff" && (
            <>
              <path d={`M ${170} ${sl + 6} q 3 3 6 0 q 3 3 6 0 q 3 3 6 0 q 3 3 6 0`} fill="none" stroke="#d4af37" strokeWidth={0.7} />
              <path d={`M ${170} ${sl + 6} q 3 3 6 0 q 3 3 6 0 q 3 3 6 0 q 3 3 6 0`} transform="translate(200 0) scale(-1 1)" fill="none" stroke="#d4af37" strokeWidth={0.7} />
            </>
          )}
        </>
      )}
      {/* body */}
      <path
        d={`M ${100 + n.w} 30 L 162 40 C 160 56 158 70 158 84 C 158 110 154 140 152 ${hemY} Q 126 ${hemY + 4} 100 ${hemY + 4} Q 74 ${hemY + 4} 48 ${hemY} C 46 140 42 110 42 84 C 42 70 40 56 38 40 L ${100 - n.w} 30 Z`}
        fill={fill}
        stroke={ink}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      {/* neck opening drawn as a cut-out on top of the body */}
      <path d={`${neckRight} L 100 ${30} Z`} fill="var(--color-noir, #0b0b0b)" stroke={ink} strokeWidth={0.9} />
      <path d={`${mirrorPath(neckRight)} L 100 30 Z`} fill="var(--color-noir, #0b0b0b)" stroke={ink} strokeWidth={0.9} />
      {spec.accessories.includes("Piping") && (
        <>
          <path d={neckRight} transform="translate(0 2)" fill="none" stroke="#d4af37" strokeWidth={0.6} />
          <path d={mirrorPath(neckRight)} transform="translate(0 2)" fill="none" stroke="#d4af37" strokeWidth={0.6} />
        </>
      )}
      {neckDots}
      {/* construction lines */}
      {spec.cut === "princess" && (
        <>
          <path d="M 156 66 C 140 74 130 92 128 108 C 127 130 127 150 127 172" fill="none" stroke={ink} strokeWidth={0.6} strokeDasharray="2 1.5" />
          <path d={mirrorPath("M 156 66 C 140 74 130 92 128 108 C 127 130 127 150 127 172")} fill="none" stroke={ink} strokeWidth={0.6} strokeDasharray="2 1.5" />
        </>
      )}
      {spec.cut === "katori" && !back && (
        <>
          <path d="M 44 112 Q 72 96 100 112 Q 128 96 156 112" fill="none" stroke={ink} strokeWidth={0.7} />
          <path d="M 72 104 L 74 112 M 128 104 L 126 112" stroke={ink} strokeWidth={0.6} />
        </>
      )}
      {(spec.cut === "darted" || spec.darts.includes("waist")) && !back && spec.cut !== "princess" && (
        <>
          <path d="M 122 174 L 126 128 L 130 174" fill="none" stroke={ink} strokeWidth={0.6} />
          <path d="M 78 174 L 74 128 L 70 174" fill="none" stroke={ink} strokeWidth={0.6} />
        </>
      )}
      {(spec.darts.includes("side") || spec.darts.includes("bust")) && !back && (
        <>
          <path d="M 157 104 L 134 110 L 156 114" fill="none" stroke={ink} strokeWidth={0.6} />
          <path d="M 43 104 L 66 110 L 44 114" fill="none" stroke={ink} strokeWidth={0.6} />
        </>
      )}
      {spec.darts.includes("back-waist") && back && (
        <>
          <path d="M 120 174 L 124 120 L 128 174" fill="none" stroke={ink} strokeWidth={0.6} />
          <path d="M 80 174 L 76 120 L 72 174" fill="none" stroke={ink} strokeWidth={0.6} />
        </>
      )}
      {/* closures */}
      {spec.closure === "front-hooks" && !back && (
        <>
          <line x1={100} y1={30 + n.depth} x2={100} y2={hemY + 4} stroke={ink} strokeWidth={0.6} strokeDasharray="1.5 1.5" />
          {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={102.5} cy={30 + n.depth + 8 + i * ((hemY - 36 - n.depth) / 6)} r={0.9} fill={ink} />)}
        </>
      )}
      {spec.closure === "back-hooks" && back && <line x1={100} y1={30 + n.depth} x2={100} y2={hemY + 4} stroke={ink} strokeWidth={0.6} strokeDasharray="1.5 1.5" />}
      {spec.closure === "back-zip" && back && <path d={`M 100 ${30 + n.depth} L 100 ${hemY + 4} M 98 ${30 + n.depth} L 98 ${hemY} M 102 ${30 + n.depth} L 102 ${hemY}`} stroke={ink} strokeWidth={0.5} />}
      {spec.closure === "side-zip" && <line x1={156} y1={96} x2={153} y2={160} stroke={ink} strokeWidth={0.8} strokeDasharray="3 1" />}
      {/* back details */}
      {back && spec.backNeck === "keyhole" && <ellipse cx={100} cy={70} rx={10} ry={18} fill="var(--color-noir, #0b0b0b)" stroke={ink} strokeWidth={0.8} />}
      {back && (spec.accessories.includes("Back tie (dori)") || spec.accessories.includes("Latkans")) && (
        <g stroke="#d4af37" strokeWidth={0.8} fill="none">
          <path d={`M 96 ${back && spec.backNeck === "keyhole" ? 52 : 30 + n.depth} q -6 18 -10 34 M 104 ${back && spec.backNeck === "keyhole" ? 52 : 30 + n.depth} q 6 18 10 34`} />
          {spec.accessories.includes("Latkans") && (
            <>
              <circle cx={86} cy={(back && spec.backNeck === "keyhole" ? 52 : 30 + n.depth) + 38} r={3} fill="#d4af37" />
              <circle cx={114} cy={(back && spec.backNeck === "keyhole" ? 52 : 30 + n.depth) + 38} r={3} fill="#d4af37" />
            </>
          )}
        </g>
      )}
      {spec.accessories.includes("Tassels") && !back && <path d="M 100 176 l -3 10 m 3 -10 l 0 11 m 0 -11 l 3 10" stroke="#d4af37" strokeWidth={0.7} />}
      {emb && !back && spec.cut === "princess" && <g opacity={0.9}>{[0, 1, 2, 3].map((i) => motif(100 + (i % 2 ? 7 : -7), 34 + n.depth + 10 + i * 9, 1.2))}</g>}
      {/* labels */}
      <text x={100} y={214} textAnchor="middle" fill="currentColor" fontSize={6} letterSpacing={2} opacity={0.6}>
        {back ? "BACK VIEW" : "FRONT VIEW"}
      </text>
    </g>
  );
}
