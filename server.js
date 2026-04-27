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

app.use(cors({require("dotenv").config();
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

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" })); origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
