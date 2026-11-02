"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden" style={{ background: "#7a1f2b", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
      Print / Save as PDF
    </button>
  );
}
