"use client";

interface SceneBlock {
  id: string;
  col: number;
  row: number;
  width: number;
  height: number;
  label: string;
  role: "start" | "destination" | "stairs" | "turn" | "path" | "context" | "landmark";
}

const ROLE_STYLES: Record<
  string,
  { top: string; left: string; right: string; text: string; stroke: string }
> = {
  start:      { top: "#22c55e", left: "#16a34a", right: "#15803d", text: "#fff",     stroke: "#fff" },
  destination:{ top: "#ef4444", left: "#dc2626", right: "#b91c1c", text: "#fff",     stroke: "#fff" },
  stairs:     { top: "#818cf8", left: "#6366f1", right: "#4338ca", text: "#fff",     stroke: "#fff" },
  turn:       { top: "#f97316", left: "#ea580c", right: "#c2410c", text: "#fff",     stroke: "#fff" },
  path:       { top: "#dbeafe", left: "#bfdbfe", right: "#93c5fd", text: "#1e40af",  stroke: "#93c5fd" },
  context:    { top: "#f3f4f6", left: "#e5e7eb", right: "#d1d5db", text: "#9ca3af",  stroke: "#e5e7eb" },
  landmark:   { top: "#fef9c3", left: "#fde68a", right: "#fcd34d", text: "#92400e",  stroke: "#fcd34d" },
};

const CELL = 62;
const ISO_X = 0.866;
const ISO_Y = 0.5;
const DEPTH = 20;

function toIso(col: number, row: number) {
  return {
    x: (col - row) * CELL * ISO_X,
    y: (col + row) * CELL * ISO_Y,
  };
}

function Block({ block }: { block: SceneBlock }) {
  const { col, row, width, height, label, role } = block;
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.context;

  const tl = toIso(col, row);
  const tr = toIso(col + width, row);
  const br = toIso(col + width, row + height);
  const bl = toIso(col, row + height);

  const topPts  = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
  const leftPts = `${bl.x},${bl.y} ${bl.x},${bl.y + DEPTH} ${tl.x},${tl.y + DEPTH} ${tl.x},${tl.y}`;
  const rightPts= `${br.x},${br.y} ${br.x},${br.y + DEPTH} ${bl.x},${bl.y + DEPTH} ${bl.x},${bl.y}`;

  const cx = (tl.x + br.x) / 2;
  const cy = (tl.y + br.y) / 2;
  const isWide = width >= 2;
  const fontSize = isWide ? 9.5 : 8;
  const shortLabel =
    role === "path" ? "" :
    label.length > 9 ? label.slice(0, 8) + "…" : label;

  return (
    <g>
      <polygon points={leftPts}  fill={s.left}  stroke={s.stroke} strokeWidth={0.8} />
      <polygon points={rightPts} fill={s.right} stroke={s.stroke} strokeWidth={0.8} />
      <polygon points={topPts}   fill={s.top}   stroke={s.stroke} strokeWidth={1.2} />

      {shortLabel && (
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={fontSize} fill={s.text}
          fontWeight={role === "start" || role === "destination" ? "700" : "500"}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {shortLabel}
        </text>
      )}

      {/* 마커 아이콘 */}
      {role === "start" && (
        <text x={cx} y={tl.y - 6} textAnchor="middle" fontSize={14}
          style={{ pointerEvents: "none" }}>🟢</text>
      )}
      {role === "destination" && (
        <text x={cx} y={tl.y - 6} textAnchor="middle" fontSize={14}
          style={{ pointerEvents: "none" }}>🔴</text>
      )}
      {role === "stairs" && (
        <text x={cx} y={tl.y - 6} textAnchor="middle" fontSize={14}
          style={{ pointerEvents: "none" }}>🪜</text>
      )}
      {role === "turn" && (
        <text x={cx} y={tl.y - 6} textAnchor="middle" fontSize={14}
          style={{ pointerEvents: "none" }}>↩️</text>
      )}
      {role === "landmark" && (
        <text x={cx} y={tl.y - 6} textAnchor="middle" fontSize={10}
          style={{ pointerEvents: "none" }}>📌</text>
      )}
    </g>
  );
}

interface Props {
  blocks: SceneBlock[];
  action: "start" | "walk" | "stairs" | "arrive";
}

export default function StepIsometricView({ blocks, action }: Props) {
  if (!blocks.length) return null;

  // 좌표 정규화
  const minCol = Math.min(...blocks.map((b) => b.col));
  const minRow = Math.min(...blocks.map((b) => b.row));
  const normalized = blocks.map((b) => ({
    ...b,
    col: b.col - minCol,
    row: b.row - minRow,
  }));

  const maxCol = Math.max(...normalized.map((b) => b.col + b.width));
  const maxRow = Math.max(...normalized.map((b) => b.row + b.height));

  const pad = 28;
  const svgMinX = (0 - maxRow) * CELL * ISO_X - pad;
  const svgMinY = -DEPTH - pad;
  const svgW = (maxCol + maxRow) * CELL * ISO_X + pad * 2;
  const svgH = (maxCol + maxRow) * CELL * ISO_Y + DEPTH + pad * 2 + 14;

  // 뒤→앞 렌더 순서
  const sorted = [...normalized].sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div className="w-full bg-gray-50 rounded-2xl overflow-hidden">
      {/* 범례 */}
      <div className="flex gap-3 px-3 pt-2.5 pb-0 text-xs flex-wrap">
        {[
          { color: "#22c55e", label: "출발" },
          { color: "#ef4444", label: "도착" },
          { color: "#818cf8", label: "계단" },
          { color: "#f97316", label: "↩️ 꺾임" },
          { color: "#fef9c3", label: "📌 주변 확인" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-gray-500">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-200"
              style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`${svgMinX} ${svgMinY} ${svgW} ${svgH}`}
        style={{ width: "100%", maxHeight: 230 }}
      >
        {sorted.map((b) => (
          <Block key={b.id} block={b} />
        ))}
      </svg>
    </div>
  );
}
