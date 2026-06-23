from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any
from uuid import UUID

from playwright.async_api import Browser, Page, async_playwright
from pydantic import ValidationError

from webdesign_ai_editor.adapters.enhancement_loader import install_editor_enhancements
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.export_models import ExportPayload
from webdesign_ai_editor.domain.models import (
    AIEditRequest,
    BridgePatchMessage,
    PatchRecord,
)
from webdesign_ai_editor.domain.ports import PatchRepository
from webdesign_ai_editor.services.edit_service import AIEditService
from webdesign_ai_editor.services.exporter import ExportService

LOGGER = logging.getLogger(__name__)


class BrowserEditorHost:
    def __init__(
        self,
        *,
        session_id: UUID,
        patch_repository: PatchRepository,
        edit_service: AIEditService,
        browser_channel: str | None = None,
    ) -> None:
        self._session_id = session_id
        self._patch_repository = patch_repository
        self._edit_service = edit_service
        self._browser_channel = browser_channel

    @property
    def session_id(self) -> UUID:
        return self._session_id

    @property
    def runtime_path(self) -> Path:
        return Path(__file__).resolve().parents[1] / "static" / "editor-runtime.js"

    @property
    def enhancement_runtime_path(self) -> Path:
        return Path(__file__).resolve().parents[1] / "static" / "editor-enhancements.js"

    async def run(self, url: str) -> None:
        runtime_path = self.runtime_path
        if not runtime_path.is_file():
            raise FileNotFoundError(
                f"Runtime visual não encontrado em {runtime_path}. "
                "Execute npm run --prefix editor-runtime build."
            )

        async with async_playwright() as playwright:
            launch_options: dict[str, Any] = {"headless": False}
            if self._browser_channel:
                launch_options["channel"] = self._browser_channel

            browser = await playwright.chromium.launch(**launch_options)
            try:
                context = await browser.new_context(no_viewport=True)
                page = await context.new_page()
                await self._wire_page(page)
                await page.add_init_script(path=runtime_path)
                await page.goto(url, wait_until="domcontentloaded")
                await install_editor_enhancements(page, self.enhancement_runtime_path)
                LOGGER.info("Editor aberto em %s", url)
                print(f"Sessão: {self._session_id}")
                print(f"Patches: {self._session_id}.jsonl")
                print("Feche o Chromium ou pressione Ctrl+C para encerrar.")
                await self._wait_for_close(browser, page)
            finally:
                await browser.close()

    async def _wire_page(self, page: Page) -> None:
        async def emit_binding(source: dict[str, Any], payload: Any) -> dict[str, Any]:
            try:
                message = BridgePatchMessage.model_validate(payload)
                source_page = source.get("page")
                current_url = source_page.url if isinstance(source_page, Page) else page.url
                record = PatchRecord.from_event(
                    session_id=self._session_id,
                    url=current_url,
                    event=message.patch,
                )
                self._patch_repository.append(record)
                return {"ok": True, "record_id": str(record.id)}
            except ValidationError as exc:
                LOGGER.warning("Rejected browser patch payload: %s", exc)
                return {"ok": False, "error": "invalid patch payload"}
            except Exception:
                LOGGER.exception("Failed to persist browser patch")
                return {"ok": False, "error": "patch persistence failed"}

        async def ai_binding(source: dict[str, Any], payload: Any) -> dict[str, Any]:
            del source
            request = AIEditRequest.model_validate(payload)
            plan = await self._edit_service.plan(request)
            return plan.model_dump(mode="json")

        async def session_binding(source: dict[str, Any]) -> dict[str, Any]:
            del source
            records = self._patch_repository.list_by_session(self._session_id)
            return {
                "session_id": str(self._session_id),
                "patches": [record.model_dump(mode="json") for record in records],
            }

        async def clear_session_binding(source: dict[str, Any]) -> dict[str, bool]:
            del source
            self._patch_repository.clear_session(self._session_id)
            return {"ok": True}

        async def export_binding(source: dict[str, Any], payload: Any) -> dict[str, Any]:
            del source
            try:
                request = ExportPayload.model_validate(payload)
                settings = Settings()
                result = ExportService(settings.data_dir / "exports").export(request)
                return {"ok": True, **result.model_dump(mode="json")}
            except (ValidationError, ValueError) as exc:
                LOGGER.warning("Rejected export payload: %s", exc)
                return {"ok": False, "error": str(exc)}
            except Exception:
                LOGGER.exception("Failed to export project package")
                return {"ok": False, "error": "project export failed"}

        await page.expose_binding("__wda_emit", emit_binding)
        await page.expose_binding("__wda_ai_edit", ai_binding)
        await page.expose_binding("__wda_session_state", session_binding)
        await page.expose_binding("__wda_clear_session", clear_session_binding)
        await page.expose_binding("__wda_export_package", export_binding)

        page.on(
            "console",
            lambda message: LOGGER.debug("browser console [%s] %s", message.type, message.text),
        )
        page.on("pageerror", lambda error: LOGGER.warning("browser pageerror: %s", error))

    async def _wait_for_close(self, browser: Browser, page: Page) -> None:
        closed = asyncio.Event()
        page.on("close", lambda _: closed.set())
        browser.on("disconnected", lambda _: closed.set())
        await closed.wait()
