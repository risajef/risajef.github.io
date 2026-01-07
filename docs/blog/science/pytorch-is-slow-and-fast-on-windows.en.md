---
lang: en
tags:
- science
- pytorch
- performance
- windows
- wsl
- gpu
auto_translated: false
---

# [PyTorch is slow and fast on Windows](/blog/science/pytorch-is-slow-and-fast-on-windows/)

For a project at work I had to train a neural network. I have a Windows laptop with a nice GPU. When using Windows my first approach is developping inside the [WSL](https://learn.microsoft.com/de-de/windows/wsl/) (Windows subsystem for Linux). And it also worked. I noticed however, that my GPU usage was not optimal. Therefore I also ran it on native Windows.

| Metric | Nativ Windows | WSL |
|---|---|---|
| Training | 2.2 it/s | 1.3 it/s  |
| Eval | ~5 it/s | 1.5it/s |
| Thread creation | 46s | ~5s |
| Thread creation | 54s | ~5s |
| GPU usage train | ![image](/assets/images/GPU_1_1.png) | ![image](/assets/images/GPU_2_1.png) |
| GPU usage val | ![image](/assets/images/GPU_1_2.png) | ![image](/assets/images/GPU_2_2.png)|

I used this knowledge by now running on native Windows but with persistent workers such that the threads don't need to be recreated in each epoch.

Of course this is only one example. Using a different pytorch version might changes this. Maybe with a different GPU it behaves differently.

The slow thread creation is a known issue when looking at forums but the significant performance increase in using native windows was unexpected.

> [Podman](https://podman.io) is as fast as native WSL.

> [Anaconda](https://anaconda.com) is also not faster then normal python in this setup.

