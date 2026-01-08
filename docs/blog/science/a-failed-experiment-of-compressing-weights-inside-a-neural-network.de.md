---
lang: de
tags:
- science
- machine-learning
- neural-networks
- compression
- wavelets
- pytorch
auto_translated: true
source_lang: en
---

# [Ein gescheitertes Experiment: Gewichte innerhalb eines neuronalen Netzwerks komprimieren](/blog/science/a-failed-experiment-of-compressing-weights-inside-a-neural-network/)

In neuronalen Netzwerken scheint es viele Gewichte zu geben, um auszudrücken, was wir wollen. Also dachte ich daran, die grundlegendste Operation – nämlich die Matrixmultiplikation – in einer komprimierten Version zu implementieren. Statt einfach zwei Matrizen zu multiplizieren, komprimieren wir die Gewichtsmatrix und multiplizieren diese. Ich benutzte Wavelet-Zerlegung mit einem Schwellenwert. Mein Ansatz war erfolgreich darin, die Gewichtsmatrix während des Trainings zu 75% auf Null zu setzen.

Ich benutzte so etwas:
```python
coeffs = ptwt.wavedec(w_flat, "haar", mode="zero")
coeffs_thresh = tuple(
                torch.where(torch.abs(c) < threshold, torch.zeros_like(c), c)
                for c in coeffs
            )
w_compressed = ptwt.waverec(coeffs_thresh, "haar")
```

Während das Netzwerk folgendermassen aussah:
```python
class NetFC(nn.Module):
    def __init__(self):
        super(NetFC2, self).__init__()
        self.fc1 = CompressedLinear(784, 128, zero_fraction=0.75)
        self.fc2 = CompressedLinear(128, 64, zero_fraction=0.75)
        self.fc3 = CompressedLinear(64, 10, zero_fraction=0.75)

    def forward(self, x):
        x = x.view(-1, 784)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.fc2(x)
        x = F.relu(x)
        x = self.fc3(x)
        return x
```
Dieses Netzwerk hat rund 100k Parameter, von denen 75k Null sein werden.

Aber der Leistungsabfall war zu hoch. Ich konnte meinen MNIST-Loss nur auf 0,55 bringen, während ein Netzwerk ohne Kompression, aber mit weniger (25k) Parametern problemlos 0,15 erreichte.

Es war also ein interessanter Ansatz, aber nicht erfolgreich.
