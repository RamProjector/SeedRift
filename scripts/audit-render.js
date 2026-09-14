import puppeteer from 'puppeteer';
import fs from 'fs';

async function runRenderAudit() {
  console.log("🔍 Launching SEEDRIFT Game Engine Render Audit...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-gpu-blocklist',
      '--enable-unsafe-swiftshader'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', err => {
    const text = `[PAGE ERROR] ${err.toString()}`;
    errors.push(text);
    console.error(text);
  });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Audit DOM & Canvas state
    const domStatus = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const hud = document.getElementById('hudOverlay');
      const radar = document.getElementById('hudMinimapCanvas');
      const debugBox = document.getElementById('debugErrorBox');

      return {
        hasCanvas: !!canvas,
        canvasWidth: canvas ? canvas.width : 0,
        canvasHeight: canvas ? canvas.height : 0,
        hasHUD: !!hud,
        hasRadar: !!radar,
        hasDebugError: !!debugBox,
        debugErrorText: debugBox ? debugBox.textContent : null
      };
    });

    console.log("\n📊 --- ENGINE DIAGNOSTIC RESULT ---");
    console.log("Canvas Element Present:", domStatus.hasCanvas ? "✅ YES" : "❌ NO");
    console.log("Canvas Resolution:", `${domStatus.canvasWidth}x${domStatus.canvasHeight}`);
    console.log("HUD Overlay Active:", domStatus.hasHUD ? "✅ YES" : "❌ NO");
    console.log("Radar Minimap Active:", domStatus.hasRadar ? "✅ YES" : "❌ NO");
    console.log("Engine Error Box Detected:", domStatus.hasDebugError ? "❌ YES (Error Found)" : "✅ NO (Zero Errors)");

    if (domStatus.debugErrorText) {
      console.error("Debug Error Details:", domStatus.debugErrorText);
    }

    // Save audit screenshot
    fs.mkdirSync('/home/user/dist', { recursive: true });
    await page.screenshot({ path: '/home/user/dist/render_audit_screenshot.png' });
    console.log("📸 Saved visual audit screenshot to /home/user/dist/render_audit_screenshot.png");

  } catch (err) {
    console.error("Audit Execution Error:", err);
  } finally {
    await browser.close();
    console.log("🏁 Render Audit Complete.");
  }
}

runRenderAudit();
