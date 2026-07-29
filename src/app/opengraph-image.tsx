import { ImageResponse } from "next/og";

export const alt = "FaultSmith — evidence-first debugging practice";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#080a0d",
          color: "#f5f2eb",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          padding: "54px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            border: "1px solid #242931",
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(240,190,87,.08), transparent 55%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "54px 58px",
              width: "68%",
            }}
          >
            <div style={{ alignItems: "center", display: "flex", gap: "18px" }}>
              <div
                style={{
                  alignItems: "center",
                  border: "1px solid #6c5931",
                  borderRadius: "12px",
                  color: "#f0be57",
                  display: "flex",
                  fontSize: "30px",
                  height: "56px",
                  justifyContent: "center",
                  width: "56px",
                }}
              >
                <div
                  style={{
                    border: "2px solid #f0be57",
                    display: "flex",
                    height: "19px",
                    transform: "rotate(45deg)",
                    width: "19px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  letterSpacing: "7px",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ fontSize: "25px", fontWeight: 700 }}>FaultSmith</span>
                <span style={{ color: "#8f969f", fontSize: "12px", letterSpacing: "4px" }}>
                  Deliberate debugging practice
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ color: "#f0be57", display: "flex", fontSize: "17px", letterSpacing: "4px" }}>
                OBSERVE · HYPOTHESIZE · REPAIR · VERIFY
              </div>
              <div style={{ display: "flex", flexDirection: "column", fontSize: "62px", fontWeight: 700, lineHeight: 1.02 }}>
                <span>AI can write the patch.</span>
                <span style={{ color: "#9ba2ab" }}>Learn to prove it.</span>
              </div>
            </div>

            <div style={{ color: "#aeb4bc", display: "flex", fontSize: "20px" }}>
              Guided roadmaps · validated Python labs · verified progress
            </div>
          </div>

          <div
            style={{
              background: "#0d1116",
              borderLeft: "1px solid #242931",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              justifyContent: "center",
              padding: "42px",
              width: "32%",
            }}
          >
            {[
              ["01", "Observe", "failure captured"],
              ["02", "Hypothesize", "cause isolated"],
              ["03", "Repair", "minimal change"],
              ["04", "Verify", "evidence sealed"],
            ].map(([step, label, state]) => (
              <div
                key={step}
                style={{
                  alignItems: "center",
                  background: step === "04" ? "rgba(74,180,128,.07)" : "#0a0d11",
                  border: step === "04" ? "1px solid #24503d" : "1px solid #242931",
                  display: "flex",
                  gap: "15px",
                  padding: "16px 17px",
                }}
              >
                <span style={{ color: "#f0be57", fontFamily: "monospace", fontSize: "15px" }}>{step}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <strong style={{ fontSize: "18px" }}>{label}</strong>
                  <span style={{ color: step === "04" ? "#6fd0a4" : "#777f89", fontFamily: "monospace", fontSize: "12px" }}>
                    {state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
