"""Shared compatibility-route normalization, checked against explicit examples."""

def normalize_redirect_target(path: str, base_path: str) -> str:
    if path.startswith(("http://", "https://", "/")):
        return path

    normalized = path.strip().strip("/")
    if not normalized:
        return f"{base_path}/" if base_path else "/"
    return f"{base_path}/{normalized}/" if base_path else f"/{normalized}/"

