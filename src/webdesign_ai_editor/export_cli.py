from __future__ import annotations

import json
from pathlib import Path

import typer
from pydantic import ValidationError
from rich.console import Console

from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.export_models import ExportPayload
from webdesign_ai_editor.services.exporter import ExportService

app = typer.Typer(
    name="wda-export",
    help="Generate a reviewable local WebAtelier Canvas export package.",
    no_args_is_help=True,
)
console = Console()


@app.command()
def package(
    payload: Path = typer.Option(
        ...,
        "--payload",
        "-p",
        exists=True,
        file_okay=True,
        dir_okay=False,
        readable=True,
        resolve_path=True,
        help="JSON file conforming to ExportPayload.",
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output-dir",
        "-o",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
        help="Local destination directory. Defaults to the application data directory.",
    ),
) -> None:
    """Validate a snapshot payload and generate a deterministic ZIP package."""

    try:
        raw = json.loads(payload.read_text(encoding="utf-8"))
        request = ExportPayload.model_validate(raw)
        settings = Settings()
        destination = output_dir or (settings.data_dir / "exports")
        result = ExportService(destination).export(request)
    except (OSError, json.JSONDecodeError, ValidationError, ValueError) as exc:
        console.print(f"[red]Falha na exportação:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    console.print(f"[green]ZIP gerado:[/green] {result.archive_path}")
    for name in result.files:
        console.print(f"  - {name}")
    for warning in result.warnings:
        console.print(f"[yellow]Aviso:[/yellow] {warning}")


if __name__ == "__main__":
    app()
