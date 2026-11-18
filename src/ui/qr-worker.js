/* Reads QR codes off camera frames for the join screen (src/ui/online.js), off the main thread so the menu's
   race keeps its frame rate. jsQR (vendor/jsqr) because Safari has no BarcodeDetector. Each message is one
   RGBA frame; the reply is the code's text, or null. */
importScripts('../../vendor/jsqr/jsQR.js');
self.onmessage = e => {
  const { data, width, height } = e.data;
  let text = null;
  try { text = self.jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'dontInvert' })?.data || null; } catch { /* an unreadable frame */ }
  self.postMessage(text);
};
