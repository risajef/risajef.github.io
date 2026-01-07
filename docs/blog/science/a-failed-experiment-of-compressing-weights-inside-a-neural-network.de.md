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

# [Ein gescheiterter Versuch, Gewichte innerhalb eines neuronalen Netzes zu komprimieren](/blog/science/a-failed-experiment-of-compressing-weights-inside-a-neural-network/)

In neuronalen Netzen scheinen viele Gewichte zu geben, um auszudrücken, was wir wollen. Also dachte ich an die Implementierung der grundlegendsten Funktion, nämlich Matrix Multiplikation, in einer komprimierten Version. Statt nur zwei Matrixn zu multiplizieren, komprimieren wir die Gewichtsmatrix und multiplizieren das. Ich benutzte Wavelet Zersetzung mit einer Schwelle. Mein Ansatz war erfolgreich bei der Herstellung der Gewichtsmatrix 75% Nullen während des Trainings.

Ich habe so etwas benutzt:```python
coeffs = ptwt.wavedec(w_flat, "haar", mode="zero")
coeffs_thresh = tuple(
                torch.where(torch.abs(c) < threshold, torch.zeros_like(c), c)
                for c in coeffs
            )
w_compressed = ptwt.waverec(coeffs_thresh, "haar")
```
Während das Netzwerk das folgende war:```python
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
Dieses Netzwerk hat rund 100k Parameter, aus denen 75k Null sein wird.

Aber der Leistungsabfall war zu hoch. Ich konnte nur meinen MNIST-Verlust auf 0,55 bekommen, während ein Netzwerk ohne Kompression, aber nur weniger (25k) Parameter leicht 0,15 erreicht.

Es war also ein interessanter Ansatz, aber nicht erfolgreich.

