/**
 * ocrWorker — Tesseract.js worker thread for OCR processing.
 * Receives cropped image buffers from main thread via parentPort.
 * Returns recognized text + confidence score.
 */

const { parentPort } = require("worker_threads");
const { createWorker } = require("tesseract.js");

let tessWorker = null;

async function initWorker() {
  if (tessWorker) return;
  tessWorker = await createWorker("eng", 1, {
    // Suppress logging in production
    logger: () => {},
  });
  await tessWorker.setParameters({
    // Limit to expected characters — letters, digits, punctuation, spaces
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /():-!.",
  });
}

parentPort.on("message", async (msg) => {
  try {
    await initWorker();

    const { buffer, zone, timestamp } = msg;
    const {
      data: { text, confidence },
    } = await tessWorker.recognize(Buffer.from(buffer));

    parentPort.postMessage({
      text: text.trim(),
      zone,
      confidence,
      timestamp,
    });
  } catch (err) {
    parentPort.postMessage({
      text: "",
      zone: msg.zone || "unknown",
      confidence: 0,
      timestamp: msg.timestamp || Date.now(),
      error: err.message,
    });
  }
});

// Cleanup on thread exit
process.on("exit", async () => {
  if (tessWorker) {
    await tessWorker.terminate().catch(() => {});
  }
});
