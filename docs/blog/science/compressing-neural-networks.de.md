---
lang: de
tags:
- science
- machine-learning
- neural-networks
- compression
- pytorch
- mnist
auto_translated: true
source_lang: en
---

# [Neue Netzwerke komprimieren](/blog/science/compressing-neural-networks/)

Als ich mich um eine PhD-Position beworben habe, wollte ich dem Professor einen Grund geben, mich anzuheuern, also habe ich eine meiner Ideen umgesetzt. Ich vermute, dass die Gewichte neuronaler Netze zu dicht sind. Es gibt viel Redundanz. Das herkömmliche Verfahren zur Reduzierung der Komplexität ist die Einführung eines Engpasses in die Architektur des neuronalen Netzes. Dies ist jedoch ein ressourcenintensiver Weg, um das Problem zu lösen. Anstatt die Anzahl der Gewichte zu reduzieren, erhöhen wir sie. Eine weitere Möglichkeit, die Komplexität eines Modells zu reduzieren, besteht darin, die Genauigkeit der Gewichte, z.B. von 32-Bit auf 8-Bit, zu senken. Dies ist ein legitimer Ansatz, aber nicht inspiriert. Und es ist schwer zu glauben, dass dies der einzige und richtige Weg für alle Situationen ist.

Meine Hypothese war, die Gewichtsmatrix mit einem gemeinsamen Algorithmus wie JPEG zu komprimieren. Ich nahm MNIST und trainierte ein kleines CNN:

```python
hidden_layer_size = 512
linear1 = torch.nn.Linear(784, hidden_layer_size, bias=True)
linear2 = torch.nn.Linear(hidden_layer_size, 10, bias=True)
relu = torch.nn.ReLU()

model = torch.nn.Sequential(linear1, relu, linear2)
```

Die Grösse von 512 für die versteckten Schichten war die erste Leistung von zwei, die gute Ergebnisse lieferte.

Die 784 stammt aus der Eingangsgrösse, die 28 × 28 beträgt.

Die versteckte Schicht ist somit eine Liste von 512 verschiedenen 28 × 28 Matrizen.

Ich nahm jede Matrix und komprimierte sie mit JPEG auf eine Qualität von nur 20%, verlieren eine Menge Informationen, wie hier gesehen:

![Unkomprimiert](/assets/images/weight_uncompressed.png)
*Random unkomprimierte Gewichtsschicht*

![JPEG komprimiert 20% Qualität](/assets/images/weight_compressed.png)
*Same-Gewichtsschicht aber mit jpeg komprimiert*

Die Prüfgenauigkeit sank nur von 97 % auf 96 %, was angesichts der geringeren Auflösung im latenten Raum bemerkenswert ist.

Die Gewichte in einem CNN sind sehr redundant. Mit einem naiven Algorithmus wie JPEG können wir die Dimensionalität deutlich reduzieren. Für die Weiterverbreitung im Netzwerk brauche ich jedoch die Matrixversion von JPEG, die keinen Speicher speichert. Die komprimierten Gewichte könnten verwendet werden, um sie über ein Low-Bandbreite-Netzwerk wie das Internet zu übertragen. Wir können jedoch einige fundierte Annahmen machen:

- Die Wahl einer anderen Grundlage für die Gewichte, wie die Fourier-Basis, anstatt ein unabhängiges Gewicht an jeder Position, könnte die Schaffung von grossen Netzwerken mit einer begrenzten Anzahl von Gewichten ermöglichen.
- Diese Methode könnte auch in tiefen neuronalen Netzwerken arbeiten.
- Die Entwicklung einer differenzierbaren Methode, die mit wenigen Parametern eine erhebliche Komplexität erzeugt, könnte die Rechenfähigkeit bestehender Hardware verbessern.
