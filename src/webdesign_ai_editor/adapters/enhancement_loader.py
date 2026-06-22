from __future__ import annotations

from pathlib import Path

from playwright.async_api import Page


def discover_editor_extensions(primary_script: Path) -> list[Path]:
    if not primary_script.is_file():
        raise FileNotFoundError(f"Editor enhancement runtime not found: {primary_script}")
    optional = sorted(primary_script.parent.glob("editor-extension-*.js"))
    return [primary_script, *optional]


async def install_editor_enhancements(page: Page, script_path: Path) -> None:
    for extension in discover_editor_extensions(script_path):
        await page.add_init_script(path=extension)
        await page.add_script_tag(path=extension)
