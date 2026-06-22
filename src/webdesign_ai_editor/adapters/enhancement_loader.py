from __future__ import annotations

from pathlib import Path

from playwright.async_api import Page


async def install_editor_enhancements(page: Page, script_path: Path) -> None:
    if not script_path.is_file():
        raise FileNotFoundError(f"Editor enhancement runtime not found: {script_path}")
    await page.add_init_script(path=script_path)
    await page.add_script_tag(path=script_path)
