"""Read every audio URL used by rendered players, including later playlist tracks."""

import json


def audio_urls(soup) -> set[str]:
    urls = set()
    for player in soup.select("audio"):
        if player.get("src"):
            urls.add(str(player["src"]))
        if player.get("data-playlist"):
            playlist = json.loads(str(player["data-playlist"]))
            if not isinstance(playlist, list) or any(
                not isinstance(track, dict) or not isinstance(track.get("url"), str) for track in playlist
            ):
                raise ValueError("Audio playlist must contain track URL objects")
            urls.update(track["url"] for track in playlist)
    return urls
