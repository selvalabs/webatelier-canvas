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
from webdesign_ai_editor.local_demo import LocalDemoServer
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


def is_loopback_host(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host.casefold() == "localhost"


def resolve_demo_root(explicit_path: Path | None = None) -> Path:
    candidates = []
    if explicit_path is not None:
        candidates.append(explicit_path)
    candidates.extend(
        [
            Path.cwd() / "examples" / "demo",
            Path(__file__).resolve().parents[2] / "examples" / "demo",
        ]
    )

    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if resolved.is_dir() and (resolved / "index.html").is_file():
            return resolved

    rendered = ", ".join(str(item) for item in candidates)
    raise typer.BadParameter(f"Demo directory not found. Checked: {rendered}")


def build_editor_host(
    settings: Settings,
    *,
    model: str | None,
    channel: str | None,
) -> BrowserEditorHost:
    if model:
        settings.ollama_model = model

    repository = JsonlPatchRepository(settings.sessions_dir)
    provider = OllamaClient(settings)
    service = AIEditService(provider)
    return BrowserEditorHost(
        session_id=uuid4(),
        patch_repository=repository,
        edit_service=service,
        browser_channel=channel,
    )


def run_editor(
    url: str,
    *,
    model: str | None,
    channel: str | None,
) -> None:
    settings = Settings()
    configure_logging(settings.log_level)
    host = build_editor_host(settings, model=model, channel=channel)

    try:
        asyncio.run(host.run(url))
    except KeyboardInterrupt:
        console.print("Editor encerrado.")
    except PlaywrightError as exc:
        console.print(f"[red]Falha no Playwright:[/red] {exc}")
        raise typer.Exit(code=1) from exc


@app.command()
def launch(
    url: str = typer.Option(..., "--url", "-u", help="URL do projeto web."),
    model: str | None = typer.Option(None, help="Sobrescreve WDA_OLLAMA_MODEL."),
    channel: str | None = typer.Option(None, help="Canal Playwright opcional, como chrome."),
) -> None:
    """Open a headed Chromium and inject the visual editor."""

    run_editor(validate_http_url(url), model=model, channel=channel)


@app.command()
def demo(
    port: int = typer.Option(
        4173,
        min=0,
        max=65535,
        help="Porta preferida. Use 0 para escolher uma porta livre.",
    ),
    bind_host: str = typer.Option("127.0.0.1", "--host", help="Host loopback do demo."),
    demo_dir: Path | None = typer.Option(
        None,
        "--demo-dir",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
        help="Diretório contendo index.html. O padrão usa examples/demo.",
    ),
    model: str | None = typer.Option(None, help="Sobrescreve WDA_OLLAMA_MODEL."),
    channel: str | None = typer.Option(None, help="Canal Playwright opcional, como chrome."),
) -> None:
    """Serve the bundled demo and launch the editor with one command."""

    if not is_loopback_host(bind_host):
        raise typer.BadParameter("O demo local aceita apenas host loopback.")

    root = resolve_demo_root(demo_dir)
    try:
        with LocalDemoServer(root, host=bind_host, preferred_port=port) as server:
            if port not in {0, server.port}:
                console.print(
                    f"[yellow]Porta {port} indisponível; usando {server.port}.[/yellow]"
                )
            console.print(f"[green]Demo:[/green] {server.url}")
            run_editor(server.url, model=model, channel=channel)
    except OSError as exc:
        console.print(f"[red]Falha ao iniciar o demo local:[/red] {exc}")
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

    if not is_loopback_host(host) and not allow_remote:
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

    runtime_path = Path(__file__).resolve().parent / "static" / "editor-runtime.js"
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
