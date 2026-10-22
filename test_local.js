/**
 * Local Telegram Polling Tester for @onlineearninggtbot
 * Run: node test_local.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env if present
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {}

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("Error: BOT_TOKEN not set. Please set it in .env or as an environment variable.");
  process.exit(1);
}
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;


let offset = 0;

function apiRequest(method, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const url = new URL(`${BASE_URL}/${method}`);

    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return apiRequest("sendMessage", payload);
}

async function pollUpdates() {
  try {
    const res = await apiRequest("getUpdates", {
      offset: offset,
      timeout: 25,
      limit: 10,
    });

    if (res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        offset = update.update_id + 1;

        if (update.message) {
          const msg = update.message;
          const from = msg.from;
          const text = msg.text || "[Non-text message]";

          console.log(`\n📩 Received message from ${from.first_name} (@${from.username || "no_user"}, ID: ${from.id}):`);
          console.log(`   Text: "${text}"`);

          if (text === "/start") {
            await sendMessage(
              msg.chat.id,
              `👋 <b>Hello ${from.first_name}!</b>\n\nYour bot <code>@onlineearninggtbot</code> is connected and receiving messages live from your local PC!\n\nAdmin ID configured: <code>6656939308</code>`
            );
            console.log(`   ✅ Sent test reply to ${from.first_name}`);
          } else if (text === "/ping") {
            await sendMessage(msg.chat.id, `🏓 <b>Pong!</b> Bot is running on local PC.`);
            console.log(`   ✅ Sent pong reply to ${from.first_name}`);
          }
        } else if (update.callback_query) {
          const cb = update.callback_query;
          console.log(`\n🔘 Callback button clicked by ${cb.from.first_name}: data = "${cb.data}"`);
          await apiRequest("answerCallbackQuery", {
            callback_query_id: cb.id,
            text: `Clicked: ${cb.data}`,
          });
        }
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
  }

  // Continue polling
  setTimeout(pollUpdates, 500);
}

console.log("==================================================");
console.log("🚀 Telegram Bot Local Poller Started!");
console.log("Bot: @onlineearninggtbot");
console.log("Status: Listening for updates on local PC...");
console.log("Send /start or /ping to @onlineearninggtbot in Telegram");
console.log("Press Ctrl+C to stop.");
console.log("==================================================");

pollUpdates();
