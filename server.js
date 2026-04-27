require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const Replicate = require("replicate");
const multer = require("multer");
const fs = require("fs");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (userId) {
      if (plan === "pack") { let c = creditStore.get(userId) || 0; creditStore.set(userId, c + 40); }
      else if (plan === "monthly") { creditStore.set(userId, 999); }
    }
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

const creditStore = new Map();

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/credits/:userId", (req, res) => {
  const { userId } = req.params;
  const credits = creditStore.get(userId) || 0;
  const hasFree = !creditStore.has("free_" + userId);
  res.json({ userId, credits, hasFree });
});

app.post("/create-checkout", async (req, res) => {
  const { plan, userId } = req.body;
  if (!plan || !userId) return res.status(400).json({ error: "plan and userId required" });
  try {
    const isPack = plan === "pack";
    const sessionConfig = {
      payment_method_types: ["card"],
      metadata: { userId, plan },
      success_url: process.env.FRONTEND_URL + "/?success=true",
      cancel_url: process.env.FRONTEND_URL + "/",
    };
    if (isPack) {
      sessionConfig.mode = "payment";
      sessionConfig.line_items = [{ price_data: { currency: "usd", product_data: { name: "Sentic Labs AI Pack" }, unit_amount: 499 }, quantity: 1 }];
    } else {
      sessionConfig.mode = "subscription";
      sessionConfig.line_items = [{ price: process.env.STRIPE_MONTHLY_PRICE_ID, quantity: 1 }];
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/transform", upload.single("image"), async (req, res) => {
  const { style, userId } = req.body;
  if (!style || !userId || !req.file) return res.status(400).json({ error: "missing fields" });
  const freeKey = "free_" + userId;
  const hasUsedFree = creditStore.has(freeKey);
  const credits = creditStore.get(userId) || 0;
  if (hasUsedFree && credits <= 0) {
    fs.unlinkSync(req.file.path);
    return res.status(402).json({ error: "no_credits" });
  }
  try {
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = "data:" + req.file.mimetype + ";base64," + imageBuffer.toString("base64");
    const styles = {
      "70s_yearbook": "1970s yearbook portrait, vintage film grain, Kodachrome colors",
      "renaissance": "Renaissance oil painting portrait, dramatic lighting, masterpiece",
      "anime": "anime character portrait, Studio Ghibli style, expressive eyes",
      "80s_neon": "1980s synthwave neon portrait, cyberpunk, neon lighting",
      "oil_painting": "classical oil painting portrait, impressionist brushstrokes",
      "comic_book": "Marvel comic book style, bold ink outlines, halftone dots",
      "watercolor": "delicate watercolor portrait, soft pastel colors, paper texture",
      "pixar": "Pixar 3D animated character, warm studio lighting, CGI render"
    };
    const output = await replicate.run(
      "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4af4b51808e25f3d9bdf4dcf15de372011",
      { input: { image: base64Image, prompt: "portrait, " + (styles[style] || style) + ", highly detailed", negative_prompt: "blurry, low quality, watermark", prompt_strength: 0.65, num_inference_steps: 30, guidance_scale: 7.5 } }
    );
    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!hasUsedFree) creditStore.set(freeKey, true);
    else creditStore.set(userId, credits - 1);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, imageUrl, style });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Sentic Labs AI running on port " + PORT));
module.exports = app;
