import json
from pathlib import Path

from playwright.sync_api import sync_playwright


EFFECTS = [
    ("ascii", "ASCII"),
    ("dithering", "Dithering"),
    ("halftone", "Halftone"),
    ("matrix-rain", "Matrix Rain"),
    ("dots", "Dots"),
    ("contour", "Contour"),
    ("pixel-sort", "Pixel Sort"),
    ("blockify", "Blockify"),
    ("threshold", "Threshold"),
    ("edge-detection", "Edge Detection"),
    ("crosshatch", "Crosshatch"),
    ("wave-lines", "Wave Lines"),
    ("noise-field", "Noise Field"),
    ("voronoi", "Voronoi"),
    ("vhs", "VHS"),
]


output_dir = Path("/tmp/hanzi-frame-parity")
output_dir.mkdir(parents=True, exist_ok=True)
console_errors = []
page_errors = []
results = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1800, "height": 1200},
        device_scale_factor=1,
        accept_downloads=True,
    )
    page = context.new_page()
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.add_init_script("""
      window.__frameParityQa = { workers: 0, readPixels: 0 };
      if (window.Worker) {
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          constructor(...args) {
            window.__frameParityQa.workers += 1;
            super(...args);
          }
        };
      }
      for (const name of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
        const Context = window[name];
        if (Context?.prototype?.readPixels) {
          const nativeReadPixels = Context.prototype.readPixels;
          Context.prototype.readPixels = function(...args) {
            window.__frameParityQa.readPixels += 1;
            return nativeReadPixels.apply(this, args);
          };
        }
      }
    """)
    page.goto("http://127.0.0.1:3100/studio")
    page.wait_for_load_state("networkidle")

    preview_canvas = page.locator("[data-studio-preview] canvas").first
    preview_canvas.wait_for(state="visible")
    page.get_by_role("checkbox", name="Play").uncheck()
    export_png = page.get_by_role("button", name="Export PNG")

    for effect_id, label in EFFECTS:
        page.get_by_role("button", name=label, exact=True).click()
        page.wait_for_timeout(900)
        preview_path = output_dir / f"{effect_id}-preview.png"
        export_path = output_dir / f"{effect_id}-export.png"
        preview_canvas.screenshot(path=str(preview_path))
        with page.expect_download(timeout=45000) as download_info:
            export_png.click()
        download_info.value.save_as(str(export_path))
        page.wait_for_timeout(250)
        results.append({
            "effect": effect_id,
            "preview": str(preview_path),
            "export": str(export_path),
        })

    counters = page.evaluate("window.__frameParityQa")
    browser.close()

print(json.dumps({
    "results": results,
    "counters": counters,
    "consoleErrors": console_errors,
    "pageErrors": page_errors,
}))
