# AI edit approval flow

Prompt-based editing is advisory until the user approves the validated plan.

1. The selected element context and prompt are sent to the configured Ollama model.
2. Python validates the structured `EditPlan` and its allowlisted actions.
3. The browser displays the summary, every proposed action and model warnings.
4. The user chooses **Apply plan** or **Discard**.
5. Only approved actions enter the normal patch history and persistence flow.

A timeout, missing model, malformed JSON, prohibited action or explicit discard leaves manual editing available. The timeout is configured with `WDA_OLLAMA_TIMEOUT_SECONDS`.

The approval dialog never renders model output as HTML. Text is inserted with `textContent`, and the existing server and client allowlists remain authoritative.
