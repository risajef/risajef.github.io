---
lang: en
tags:
    - science
    - machine-learning
    - neural-networks
    - compression
    - wavelets
    - pytorch
---

# [A failed experiment of compressing weights inside a neural network](/blog/science/a-failed-experiment-of-compressing-weights-inside-a-neural-network/)

In neural networks there seem to be a lot of weights to express what we want. So I thought of implementing the most basic feature, namely matrix multiplication, in a compressed version. So instead of just multiply two matrixes we compress the weight matrix and multiply this. I used wavelet decomposition with a threshold. My approach was successful in making the weight matrix 75% zeros during training.

I used something like:
```python
coeffs = ptwt.wavedec(w_flat, "haar", mode="zero")
coeffs_thresh = tuple(
                torch.where(torch.abs(c) < threshold, torch.zeros_like(c), c)
                for c in coeffs
            )
w_compressed = ptwt.waverec(coeffs_thresh, "haar")
```

While the network was the following:
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
This network has around 100k parameters from which 75k will be zero.

But the performance drop was too high. I could only get my MNIST loss to 0.55 whilst a network using no compression but just less (25k) parameters easily reached 0.15.

So it was an interesting approach, but not successful.

