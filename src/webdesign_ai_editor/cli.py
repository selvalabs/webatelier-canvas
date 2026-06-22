from __future__ import annotations

import asyncio
import ipaddress
import logging
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import typer
import uvicorn
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import async_playwright
from rich.console import Console

from webdesign_ai_editor.adapters.browser_host import BrowserEditorHost
from webdesign_ai_editor.adapters.jsonl_patch_repository import JsonlPatchRepository
from webdesign_ai_editor.adapters.ollama import OllamaClient, OllamaError
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.services.edit_service import AIEditService

app = typer.Typer(
    name="wda",
    help="Editor visual local-first para páginas web reais.",
    no_args_is_help=True,
)
console = Console()


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def validate_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise typer.BadParameter("Use uma URL http(s) completa, por exemplo http://127.0.0.1:3000")
    return url


@app.command()
def launch(
    url: str = typer.Option(..., "--url", "-u", help="URL do projeto web."),
    model: str | None = typer.Option(None, help="Sobrescreve WDA_OLLAMA_MODEL."),
    channel: str | None = typer.Option(None, help="Canal Playwright opcional, como chrome."),
) -> None:
    """Open a headed Chromium and inject the visual editor."""

    resolved_url = validate_http_url(url)
    settings = Settings()
    if model:
        settings.ollama_model = model
    configure_logging(settings.log_level)

    repository = JsonlPatchRepository(settings.sessions_dir)
    provider = OllamaClient(settings)
    service = AIEditService(provider)
    host = BrowserEditorHost(
        session_id=uuid4(),
        patch_repository=repository,
        edit_service=service,
        browser_channel=channel,
    )

    try:
        asyncio.run(host.run(resolved_url))
    except KeyboardInterrupt:
        console.print("Editor encerrado.")
    except PlaywrightError as exc:
        console.print(f"[red]Falha no Playwright:[/red] {exc}")
        raise typer.Exit(code=1) from exc


@app.command()
def serve(
    host: str = typer.Option("127.0.0.1", help="Host de bind."),
    port: int = typer.Option(8787, min=1, max=65535),
    allow_remote: bool = typer.Option(
        False,
        help="Permite bind não-loopback. Não torna o MVP seguro para internet.",
    ),
) -> None:
    """Run the optional FastAPI adapter."""

    try:
        address = ipaddress.ip_address(host)
        is_loopback = address.is_loopback
    except ValueError:
        is_loopback = host.casefold() == "localhost"

    if not is_loopback and not allow_remote:
        raise typer.BadParameter(
            "Host remoto bloqueado. Use loopback ou --allow-remote "
            "em rede de desenvolvimento confiável."
        )

    settings = Settings(api_host=host, api_port=port)
    configure_logging(settings.log_level)
    uvicorn.run(
        "webdesign_ai_editor.api.app:app",
        host=host,
        port=port,
        reload=False,
    )


@app.command()
def doctor() -> None:
    """Check runtime bundle, Playwright browser, Ollama, and configured model."""

    settings = Settings()
    configure_logging(settings.log_level)
    failures: list[str] = []

    runtime_path = (
        Path(__file__).resolve().parent / "static" / "editor-runtime.js"
    )
    if runtime_path.is_file():
        console.print(f"[green]OK[/green] Runtime: {runtime_path}")
    else:
        failures.append("runtime ausente; execute npm run --prefix editor-runtime build")

    async def run_checks() -> None:
        try:
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch(headless=True)
                await browser.close()
            console.print("[green]OK[/green] Chromium do Playwright")
        except PlaywrightError as exc:
            failures.append(f"Chromium indisponível: {exc}")

        client = OllamaClient(settings)
        try:
            models = await client.list_models()
            console.print(
                f"[green]OK[/green] Ollama em {settings.ollama_base_url} ({len(models)} modelos)"
            )
            configured = settings.ollama_model
            model_found = configured in models or any(
                item.split(":", maxsplit=1)[0] == configured for item in models
            )
            if model_found:
                console.print(f"[green]OK[/green] Modelo configurado: {configured}")
            else:
                failures.append(
                    f"modelo '{configured}' não encontrado; disponíveis: "
                    f"{', '.join(models) or 'nenhum'}"
                )
        except OllamaError as exc:
            failures.append(str(exc))

    asyncio.run(run_checks())

    if failures:
        for failure in failures:
            console.print(f"[red]ERRO[/red] {failure}")
        raise typer.Exit(code=1)

    console.print("[green]Ambiente pronto.[/green]")
