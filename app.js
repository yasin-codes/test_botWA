import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"; // Ensure correct import
import * as fs from "fs";
import Boom from "@hapi/boom";
import path from "path";
import { fileURLToPath } from "url";

// Create __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const sessionDir = "./session";

// Create session directory if it doesn't exist
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir);
}

// Async function to connect to WhatsApp
const connectToWhatsApp = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    // Event listener for credential updates
    sock.ev.on("creds.update", saveCreds);

    // Event listener for connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("Connection closed due to", lastDisconnect?.error, ", reconnecting", shouldReconnect);
        if (shouldReconnect) {
          await connectToWhatsApp(); // Reconnect if not logged out
        }
      } else if (connection === "open") {
        console.log("Opened connection");
      }
    });

    // Event listener for new messages
    sock.ev.on("messages.upsert", async (m) => {
      console.log(JSON.stringify(m, undefined, 2));
      // Example of replying to a message
      // const message = m.messages[0];
      // await sock.sendMessage(message.key.remoteJid, { text: 'Hello there!' });
    });
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error.message || error);
  }
};

// Start Express server and WhatsApp connection
app.listen(process.env.PORT || port, () => {
  connectToWhatsApp();
  console.log(`WhatsApp bot running on port ${port}`);
});
