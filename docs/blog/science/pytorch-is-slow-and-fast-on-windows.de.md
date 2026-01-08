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

Für ein Projekt bei der Arbeit musste ich ein neuronales Netzwerk trainieren. Ich habe einen Windows-Laptop mit einer guten GPU. Wenn ich unter Windows entwickle, ist mein erster Ansatz, im [WSL](https://learn.microsoft.com/de-de/windows/wsl/) (Windows Subsystem für Linux) zu arbeiten. Und es funktionierte auch. Ich bemerkte jedoch, dass meine GPU-Nutzung nicht optimal war. Deshalb habe ich es auch unter nativem Windows ausgeführt.

| Metric | Nativ Windows | WSL |
|---|---|---|
| Training | 2.2 it/s | 1.3 it/s  |
| Eval | ~5 it/s | 1.5it/s |
| Thread-Erstellung | 46s | ~5s |
| Thread-Erstellung | 54s | ~5s |
| GPU-Nutzung Training | ![Bild](/assets/images/GPU_1_1.png) | ![Bild](/assets/images/GPU_2_1.png) |
| GPU-Nutzung Val | ![Bild](/assets/images/GPU_1_2.png) | ![Bild](/assets/images/GPU_2_2.png)|

Ich habe dieses Wissen genutzt, indem ich jetzt unter nativem Windows laufe, aber mit persistenten Workers, sodass die Threads nicht in jeder Epoche neu erstellt werden müssen.

Natürlich ist dies nur ein Beispiel. Mit einer anderen PyTorch-Version könnte sich das ändern. Vielleicht verhält es sich mit einer anderen GPU anders.

Die langsame Thread-Erstellung ist ein bekanntes Problem, wenn man Foren betrachtet, aber die signifikante Leistungssteigerung bei Verwendung von nativem Windows war unerwartet.

> [Podman](https://podman.io) ist genauso schnell wie natives WSL.

> [Anaconda](https://anaconda.com) ist in diesem Setup auch nicht schneller als normales Python.
