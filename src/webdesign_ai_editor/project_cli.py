from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import UUID, uuid4

import typer
from playwright.async_api import Error as PlaywrightError
from rich.console import Console

from webdesign_ai_editor.adapters.browser_host import BrowserEditorHost
from webdesign_ai_editor.adapters.json_project_repository import JsonProjectRepository
from webdesign_ai_editor.adapters.jsonl_patch_repository import JsonlPatchRepository
from webdesign_ai_editor.adapters.ollama import OllamaClient
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.projects import ProjectCreate, ProjectUpdate
from webdesign_ai_editor.services.edit_service import AIEditService
from webdesign_ai_editor.services.projects import (
    ProjectNotFoundError,
    ProjectService,
    ProjectValidationError,
)

app = typer.Typer(
    name="wda-project",
    help="Manage saved local WebAtelier Canvas projects.",
    no_args_is_help=True,
)
console = Console()


def service_from_settings(settings: Settings) -> ProjectService:
    return ProjectService(JsonProjectRepository(settings.data_dir / "projects"))


@app.command("create")
def create_project(
    name: str = typer.Option(..., "--name", "-n"),
    root: Path = typer.Option(
        ...,
        "--root",
        "-r",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    url: str = typer.Option(..., "--url", "-u"),
) -> None:
    """Save a local project without executing its source code."""

    settings = Settings()
    service = service_from_settings(settings)
    try:
        profile = service.create(
            ProjectCreate(name=name, root_path=str(root), local_url=url)
        )
    except (ProjectValidationError, ValueError) as exc:
        console.print(f"[red]Falha ao criar projeto:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    console.print(f"[green]Projeto criado:[/green] {profile.id}")
    console.print(f"Stack detectada: {profile.framework_hint}")


@app.command("list")
def list_projects() -> None:
    """List saved local project profiles."""

    profiles = service_from_settings(Settings()).list()
    if not profiles:
        console.print("Nenhum projeto salvo.")
        return
    for profile in profiles:
        console.print(
            f"{profile.id}  {profile.name}  {profile.framework_hint}  {profile.local_url}"
        )


@app.command("show")
def show_project(project_id: UUID = typer.Argument(...)) -> None:
    """Show one saved project and its local workspace paths."""

    service = service_from_settings(Settings())
    try:
        profile = service.get(project_id)
        workspace = service.workspace_info(project_id)
    except ProjectNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(code=1) from exc

    console.print(profile.model_dump_json(indent=2))
    for label, path in workspace.items():
        console.print(f"{label}: {path}")


@app.command("update")
def update_project(
    project_id: UUID = typer.Argument(...),
    name: str | None = typer.Option(None, "--name", "-n"),
    root: Path | None = typer.Option(
        None,
        "--root",
        "-r",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    url: str | None = typer.Option(None, "--url", "-u"),
) -> None:
    """Update safe project metadata and re-detect its stack when needed."""

    service = service_from_settings(Settings())
    try:
        profile = service.update(
            project_id,
            ProjectUpdate(
                name=name,
                root_path=str(root) if root is not None else None,
                local_url=url,
            ),
        )
    except (ProjectNotFoundError, ProjectValidationError, ValueError) as exc:
        console.print(f"[red]Falha ao atualizar projeto:[/red] {exc}")
        raise typer.Exit(code=1) from exc

    console.print(f"[green]Projeto atualizado:[/green] {profile.id}")


@app.command("open")
def open_project(
    project_id: UUID = typer.Argument(...),
    session_id: UUID | None = typer.Option(None, "--session-id"),
    model: str | None = typer.Option(None, "--model"),
    channel: str | None = typer.Option(None, "--channel"),
) -> None:
    """Open a saved project in headed Chromium with project-scoped patch storage."""

    settings = Settings()
    projects = JsonProjectRepository(settings.data_dir / "projects")
    service = ProjectService(projects)
    try:
        profile = service.get(project_id)
    except ProjectNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(code=1) from exc

    resolved_session = session_id or uuid4()
    service.attach_session(project_id, resolved_session)
    if model:
        settings.ollama_model = model

    patch_repository = JsonlPatchRepository(projects.sessions_dir(project_id))
    edit_service = AIEditService(OllamaClient(settings))
    host = BrowserEditorHost(
        session_id=resolved_session,
        patch_repository=patch_repository,
        edit_service=edit_service,
        browser_channel=channel,
    )

    console.print(f"Projeto: {profile.name}")
    console.print(f"Sessão: {resolved_session}")
    try:
        asyncio.run(host.run(profile.local_url))
    except KeyboardInterrupt:
        console.print("Editor encerrado.")
    except PlaywrightError as exc:
        console.print(f"[red]Falha no Playwright:[/red] {exc}")
        raise typer.Exit(code=1) from exc


@app.command("remove")
def remove_project(project_id: UUID = typer.Argument(...)) -> None:
    """Remove a saved profile while preserving its local workspace for recovery."""

    service = service_from_settings(Settings())
    try:
        service.remove(project_id)
    except ProjectNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(code=1) from exc
    console.print("[green]Perfil removido. O workspace local foi preservado.[/green]")


if __name__ == "__main__":
    app()
