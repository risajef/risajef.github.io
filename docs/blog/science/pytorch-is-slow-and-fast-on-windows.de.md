---
lang: de
tags:
- science
- pytorch
- performance
- windows
- wsl
- gpu
auto_translated: true
source_lang: en
---

# [PyTorch ist langsam und schnell unter Windows](/blog/science/pytorch-is-slow-and-fast-on-windows/)

Für ein Projekt bei der Arbeit musste ich ein neuronales Netzwerk trainieren. Ich habe einen Windows-Laptop mit einer schönen GPU. Bei Windows entwickelt sich mein erster Ansatz innerhalb der [WSL](https://learn.microsoft.com/de-de/windows/wsl/) (Windows Subsystem für Linux). Und es funktionierte auch. Ich bemerkte jedoch, dass meine GPU-Nutzung nicht optimal war. Deshalb habe ich es auch unter nativen Windows ausgeführt.

| Metric | Nativ Windows | WSL |
|----------
| Training | 2.2 it/s | 1.3 it/s |
| Eval | ~5 it/s | 1.5it/s |
| Thread create | 46s | ~5s |
| Thread create | 54s | ~5s |
| GPU-Nutzungszug | | ![Bild](/Assets/Bilder/GPU 1 1.png) | | ![Bild](/Assets/Bilder/GPU 2 1.png) |
| GPU-Nutzung val | ![Bild](/Attenten/Bilder/GPU 1 2.png) | | ![Bild](/Attenten/Bilder/GPU 2 2.png)|

Ich habe dieses Wissen benutzt, indem ich jetzt unter nativen Windows läuft, aber mit hartnäckigen Arbeitern, so dass die Fäden nicht in jeder Epoche wiederhergestellt werden müssen.

Natürlich ist dies nur ein Beispiel. Mit einer anderen Pytorch-Version könnte dies ändern. Vielleicht verhält es sich mit einer anderen GPU anders.

Die langsame Thread-Erstellung ist ein bekanntes Problem bei der Betrachtung von Foren, aber die signifikante Leistungssteigerung bei der Verwendung von nativen Fenstern war unerwartet.

> [Podman](https://podman.io) ist so schnell wie native WSL.

> [Anaconda](https://anaconda.com) ist auch nicht schneller als normaler Python in diesem Setup.

