import { useState, useRef, useCallback, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Generate or retrieve a persistent user ID (replaces auth for MVP)
function getUserId() {
  let id = localStorage.getItem("senticlabs_uid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("senticlabs_uid", id);
  }
  return id;
}

const STYLES = [
  { id: "70s_yearbook",  emoji: "📸", label: "70s Yearbook",    desc: "Groovy vintage vibes" },
  { id: "renaissance",   emoji: "🎨", label: "Renaissance",      desc: "Old master painting" },
  { id: "anime",         emoji: "✨", label: "Anime Hero",       desc: "Japanese animation" },
  { id: "80s_neon",      emoji: "🌆", label: "80s Neon",         desc: "Synthwave cyberpunk" },
  { id: "oil_painting",  emoji: "🖼️", label: "Oil Portrait",     desc: "Classic fine art" },
  { id: "comic_book",    emoji: "💥", label: "Comic Book",       desc: "POW! Marvel energy" },
  { id: "watercolor",    emoji: "🌊", label: "Watercolor",       desc: "Soft dreamy strokes" },
  { id: "pixar",         emoji: "🎬", label: "Pixar Character",  desc: "Animated movie magic" },
];

const SHARE_CAPTIONS = [
  "I just found out I was supposed to live in the Renaissance 😭",
  "This AI turned me into a Pixar character and honestly it's more accurate",
  "POV: the AI knows who you really are",
  "The 70s version of me could never be topped tbh — senticlabsai.com",
];

// ─── PROGRESS MESSAGES ───────────────────────────────────────────────────────
const PROGRESS_MSGS = [
  "Warming up the AI brushes...",
  "Studying your best angles...",
  "Applying artistic genius...",
  "Almost there — adding final details...",
  "Putting on the finishing touches...",
];

export default function Sentic LabsAI() {
  const [screen, setScreen]           = useState("home");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [resultImageUrl, setResultImageUrl] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [credits, setCredits]         = useState(null);
  const [hasFree, setHasFree]         = useState(true);
  const [progressMsg, setProgressMsg] = useState(0);
  const [dragOver, setDragOver]       = useState(false);
  const [shareCaption]                = useState(SHARE_CAPTIONS[Math.floor(Math.random() * SHARE_CAPTIONS.length)]);
  const fileRef = useRef();
  const userId  = getUserId();

  // Fetch credit balance on mount
  useEffect(() => {
    fetch(`${API_URL}/credits/${userId}`)
      .then(r => r.json())
      .then(d => { setCredits(d.credits); setHasFree(d.hasFree); })
      .catch(() => {});
  }, [userId]);

  // Cycle progress messages during generation
  useEffect(() => {
    if (screen !== "processing") return;
    const interval = setInterval(() => {
      setProgressMsg(p => (p + 1) % PROGRESS_MSGS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [screen]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScreen("pick");
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── MAIN TRANSFORM CALL ───────────────────────────────────────────────────
  const handleTransform = async () => {
    if (!selectedStyle) return;

    // Check if they need to pay
    if (!hasFree && credits <= 0) {
      setScreen("paywall");
      return;
    }

    setScreen("processing");
    setLoading(true);
    setError(null);
    setProgressMsg(0);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("style", selectedStyle);
      formData.append("userId", userId);

      const res = await fetch(`${API_URL}/transform`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.status === 402) {
        // No credits
        setScreen("paywall");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Transform failed");
      }

      setResultImageUrl(data.imageUrl);
      // Update local credit state
      setHasFree(false);
      if (typeof data.creditsRemaining === "number") setCredits(data.creditsRemaining);
      setScreen("result");

    } catch (err) {
      setError(err.message);
      setScreen("pick");
    }
    setLoading(false);
  };

  // ── STRIPE CHECKOUT ───────────────────────────────────────────────────────
  const handleCheckout = async (plan) => {
    try {
      const res = await fetch(`${API_URL}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url; // redirect to Stripe
    } catch (err) {
      alert("Payment setup failed. Please try again.");
    }
  };

  const reset = () => {
    setScreen("home");
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedStyle(null);
    setResultImageUrl(null);
    setError(null);
  };

  const style = STYLES.find(s => s.id === selectedStyle);
  const canTransformFree = hasFree;
  const canTransformPaid = credits > 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'Georgia', serif",
      color: "#f0ece0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 15% 50%, rgba(255,140,60,0.09) 0%, transparent 60%), radial-gradient(ellipse at 85% 15%, rgba(255,80,120,0.07) 0%, transparent 50%), radial-gradient(ellipse at 55% 85%, rgba(80,120,255,0.05) 0%, transparent 50%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", paddingTop: 48, paddingBottom: 16 }}>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #ff8c3c, #ff4080)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontSize: 12, fontFamily: "'Courier New', monospace",
            letterSpacing: 6, textTransform: "uppercase", marginBottom: 10,
          }}>
            ✦ AI Art Transformer ✦
          </div>
          <h1 style={{
            fontSize: "clamp(48px, 12vw, 80px)", fontWeight: 900, lineHeight: 1,
            margin: "0 0 6px", letterSpacing: -3,
            background: "linear-gradient(135deg, #fff8f0 0%, #ffd0a0 50%, #ff8c3c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            SENTIC <span style={{ fontStyle: "italic" }}>LABS</span>
          </h1>
          <p style={{ color: "#806858", fontSize: 15, margin: 0, letterSpacing: 0.5 }}>
            See yourself through art history
          </p>

          {/* Credit badge */}
          {!hasFree && credits !== null && (
            <div style={{
              display: "inline-block", marginTop: 12,
              padding: "5px 14px", borderRadius: 50,
              background: credits > 0 ? "rgba(255,140,60,0.15)" : "rgba(255,60,60,0.1)",
              border: `1px solid ${credits > 0 ? "rgba(255,140,60,0.3)" : "rgba(255,60,60,0.2)"}`,
              fontSize: 12, color: credits > 0 ? "#ff8c3c" : "#ff6060",
            }}>
              {credits > 0 ? `✦ ${credits} transforms remaining` : "⚠ No transforms remaining"}
            </div>
          )}
        </div>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#ff8c3c" : "#302820"}`,
                borderRadius: 24, padding: "64px 30px", textAlign: "center",
                cursor: "pointer", transition: "all 0.3s",
                background: dragOver ? "rgba(255,140,60,0.06)" : "rgba(255,255,255,0.015)",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 56, marginBottom: 14 }}>📷</div>
              <p style={{ fontSize: 21, fontWeight: 700, margin: "0 0 6px" }}>Drop your photo here</p>
              <p style={{ color: "#604838", fontSize: 14, margin: "0 0 22px" }}>or click to browse · any selfie works</p>
              <div style={{
                display: "inline-block", padding: "13px 32px",
                background: "linear-gradient(135deg, #ff8c3c, #ff4080)",
                borderRadius: 50, fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: 0.5,
              }}>
                Choose a Photo
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Style pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 32 }}>
              {STYLES.map(s => (
                <span key={s.id} style={{
                  padding: "6px 14px", borderRadius: 50, background: "rgba(255,255,255,0.04)",
                  border: "1px solid #252018", fontSize: 12, color: "#907060",
                }}>
                  {s.emoji} {s.label}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div style={{
              background: "rgba(255,255,255,0.025)", borderRadius: 18,
              padding: "20px 24px", border: "1px solid #201810",
              display: "flex", justifyContent: "space-around", textAlign: "center",
            }}>
              {[["2.4M+","transformations"], ["4.9★","avg rating"], ["FREE","first try"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#ff8c3c" }}>{v}</div>
                  <div style={{ fontSize: 12, color: "#604838", marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PICK STYLE ── */}
        {screen === "pick" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {error && (
              <div style={{
                background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.2)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 16,
                color: "#ff8080", fontSize: 14,
              }}>
                ⚠ {error} — please try again
              </div>
            )}

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <img src={previewUrl} alt="your photo" style={{
                width: 110, height: 110, borderRadius: "50%", objectFit: "cover",
                border: "3px solid #ff8c3c", boxShadow: "0 0 40px rgba(255,140,60,0.25)",
              }} />
              <p style={{ color: "#907060", fontSize: 14, marginTop: 10 }}>
                {canTransformFree ? "✨ First transform is FREE" : `${credits} transforms left`}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {STYLES.map(s => (
                <div key={s.id} onClick={() => setSelectedStyle(s.id)} style={{
                  padding: "16px 14px", borderRadius: 16, cursor: "pointer",
                  border: `2px solid ${selectedStyle === s.id ? "#ff8c3c" : "#201810"}`,
                  background: selectedStyle === s.id ? "rgba(255,140,60,0.08)" : "rgba(255,255,255,0.015)",
                  transition: "all 0.18s", textAlign: "center",
                }}>
                  <div style={{ fontSize: 26, marginBottom: 5 }}>{s.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#604838" }}>{s.desc}</div>
                </div>
              ))}
            </div>

            <button onClick={handleTransform} disabled={!selectedStyle} style={{
              width: "100%", padding: "17px", borderRadius: 50, border: "none",
              background: selectedStyle ? "linear-gradient(135deg, #ff8c3c, #ff4080)" : "#1a1410",
              color: selectedStyle ? "#fff" : "#403028",
              fontSize: 16, fontWeight: 900, cursor: selectedStyle ? "pointer" : "not-allowed",
              letterSpacing: 0.5, transition: "all 0.25s", marginBottom: 10,
            }}>
              {selectedStyle
                ? `✨ Transform into ${STYLES.find(s => s.id === selectedStyle)?.label}`
                : "Select a style above"}
            </button>
            <button onClick={reset} style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #201810", borderRadius: 50,
              color: "#604838", fontSize: 14, cursor: "pointer",
            }}>
              ← Change photo
            </button>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {screen === "processing" && (
          <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeUp 0.3s ease" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 32 }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                border: "3px solid #201810",
                borderTop: "3px solid #ff8c3c",
                animation: "spin 1s linear infinite",
                margin: "0 auto",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36,
              }}>
                {style?.emoji}
              </div>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>
              Creating your {style?.label}...
            </h2>
            <p style={{ color: "#907060", fontSize: 15, minHeight: 24, transition: "opacity 0.5s" }}>
              {PROGRESS_MSGS[progressMsg]}
            </p>
            <p style={{ color: "#403028", fontSize: 13, marginTop: 20 }}>
              This takes about 20–30 seconds
            </p>
          </div>
        )}

        {/* ── RESULT ── */}
        {screen === "result" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                display: "inline-block", padding: "6px 18px", borderRadius: 50,
                background: "rgba(255,140,60,0.12)", border: "1px solid rgba(255,140,60,0.25)",
                fontSize: 12, color: "#ff8c3c", letterSpacing: 2, textTransform: "uppercase",
              }}>
                {style?.emoji} Your {style?.label} Transformation
              </div>
            </div>

            {/* Before / After */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#604838", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Before</div>
                <img src={previewUrl} alt="original" style={{
                  width: "100%", aspectRatio: "1", objectFit: "cover",
                  borderRadius: 16, border: "2px solid #201810",
                }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#ff8c3c", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>After ✦</div>
                {resultImageUrl ? (
                  <img src={resultImageUrl} alt="AI transformed" style={{
                    width: "100%", aspectRatio: "1", objectFit: "cover",
                    borderRadius: 16, border: "2px solid rgba(255,140,60,0.4)",
                    boxShadow: "0 0 30px rgba(255,140,60,0.15)",
                  }} />
                ) : (
                  <div style={{
                    width: "100%", aspectRatio: "1", borderRadius: 16,
                    background: "#120e09", border: "2px solid #201810",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
                  }}>
                    {style?.emoji}
                  </div>
                )}
              </div>
            </div>

            {/* Download button */}
            {resultImageUrl && (
              <a href={resultImageUrl} download="glowup-transformation.jpg" style={{
                display: "block", textAlign: "center", padding: "13px",
                background: "rgba(255,255,255,0.04)", border: "1px solid #302018",
                borderRadius: 50, color: "#f0ece0", textDecoration: "none",
                fontSize: 14, marginBottom: 14,
              }}>
                ⬇ Download your transformation
              </a>
            )}

            {/* Share CTA */}
            <div style={{
              background: "rgba(255,255,255,0.025)", borderRadius: 18,
              padding: "18px 20px", border: "1px solid #201810", marginBottom: 14,
              textAlign: "center",
            }}>
              <p style={{ fontSize: 12, color: "#604838", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
                Suggested caption
              </p>
              <p style={{ fontSize: 14, color: "#f0ece0", margin: "0 0 14px", fontStyle: "italic" }}>
                "{shareCaption}"
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {[["📸","Instagram"], ["𝕏","Twitter/X"], ["🎵","TikTok"]].map(([ico, name]) => (
                  <div key={name} style={{
                    padding: "7px 14px", borderRadius: 50,
                    background: "rgba(255,255,255,0.04)", border: "1px solid #302018",
                    fontSize: 12, cursor: "pointer",
                  }}>
                    {ico} {name}
                  </div>
                ))}
              </div>
            </div>

            {/* Upsell or try another */}
            {(!hasFree && credits <= 0) ? (
              <button onClick={() => setScreen("paywall")} style={{
                width: "100%", padding: "17px", borderRadius: 50, border: "none",
                background: "linear-gradient(135deg, #ff8c3c, #ff4080)",
                color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer",
                marginBottom: 10,
              }}>
                ✨ Unlock All 8 Styles — $4.99
              </button>
            ) : (
              <button onClick={() => setScreen("pick")} style={{
                width: "100%", padding: "17px", borderRadius: 50, border: "none",
                background: "linear-gradient(135deg, #ff8c3c, #ff4080)",
                color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer",
                marginBottom: 10,
              }}>
                ✨ Try Another Style ({credits > 0 ? `${credits} left` : "1 free left"})
              </button>
            )}
            <button onClick={reset} style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #201810", borderRadius: 50,
              color: "#604838", fontSize: 14, cursor: "pointer",
            }}>
              Start over with new photo
            </button>
          </div>
        )}

        {/* ── PAYWALL ── */}
        {screen === "paywall" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🔓</div>
              <h2 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px" }}>Unlock All Styles</h2>
              <p style={{ color: "#907060", fontSize: 15 }}>
                You've used your free transformation — ready to go all in?
              </p>
            </div>

            {/* Plans */}
            {[
              {
                plan: "monthly",
                name: "Monthly Unlimited",
                price: "$7.99/mo",
                desc: "Unlimited transforms · all 8 styles · new styles every month · cancel anytime",
                tag: "MOST POPULAR",
                primary: true,
              },
              {
                plan: "pack",
                name: "One-Time Pack",
                price: "$4.99",
                desc: "40 transforms · all 8 styles · no subscription",
                tag: null,
                primary: false,
              },
            ].map(p => (
              <div key={p.plan} style={{
                padding: "22px 22px", borderRadius: 20, marginBottom: 12,
                border: `2px solid ${p.primary ? "#ff8c3c" : "#201810"}`,
                background: p.primary ? "rgba(255,140,60,0.06)" : "rgba(255,255,255,0.015)",
                position: "relative",
              }}>
                {p.tag && (
                  <div style={{
                    position: "absolute", top: -12, right: 18,
                    background: "linear-gradient(135deg, #ff8c3c, #ff4080)",
                    padding: "4px 14px", borderRadius: 50,
                    fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 1,
                  }}>
                    {p.tag}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#ff8c3c" }}>{p.price}</div>
                </div>
                <div style={{ color: "#604838", fontSize: 13, marginBottom: 16 }}>{p.desc}</div>
                <button onClick={() => handleCheckout(p.plan)} style={{
                  width: "100%", padding: "13px", borderRadius: 50, border: "none",
                  background: p.primary ? "linear-gradient(135deg, #ff8c3c, #ff4080)" : "rgba(255,255,255,0.05)",
                  color: p.primary ? "#fff" : "#f0ece0",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}>
                  {p.primary ? `Get Unlimited — ${p.price}` : `Buy Pack — ${p.price}`}
                </button>
              </div>
            ))}

            <p style={{ textAlign: "center", color: "#403028", fontSize: 12, margin: "16px 0" }}>
              🔒 Secure payment via Stripe · Cancel anytime · No hidden fees
            </p>
            <button onClick={() => setScreen(resultImageUrl ? "result" : "pick")} style={{
              width: "100%", padding: "10px", background: "transparent",
              border: "none", color: "#504030", fontSize: 13, cursor: "pointer",
            }}>
              ← Go back
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button { font-family: 'Georgia', serif; }
      `}</style>
    </div>
  );
}
