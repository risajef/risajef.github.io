# Compressing Neural Networks

When I applied for a PhD position, I wanted to give the professor a reason to hire me, so I implemented one of my ideas. I suspected that the weights of neural networks are too dense. There is a lot of redundancy. The conventional method to reduce complexity is to introduce a bottleneck in the architecture of the neural network. However, this is a resource-intensive way to solve the problem. Instead of reducing the number of weights, we increase them. Another way to reduce the complexity of a model is to lower the precision of the weights, e.g., from 32-bit to 8-bit. This is a legitimate approach but uninspired. And it's hard to believe that this is the only and correct way for all situations.

My hypothesis was to compress the weight matrix using a common algorithm like JPEG. I took MNIST and trained a small CNN:

```python
hidden_layer_size = 512
linear1 = torch.nn.Linear(784, hidden_layer_size, bias=True)
linear2 = torch.nn.Linear(hidden_layer_size, 10, bias=True)
relu = torch.nn.ReLU()

model = torch.nn.Sequential(linear1, relu, linear2)
```

The size of 512 for the hidden layers was the first power of two that yielded good results.

The 784 comes from the input size, which is 28 × 28.

The hidden layer is thus a list of 512 different 28 × 28 matrices.

I took each matrix and compressed it with JPEG to a quality of only 20%, losing a lot of information, as seen here:

Uncompressed

JPEG compressed 20% quality
# Practical Lessons from Mathematical Insights

## Gödel's Incompleteness Theorem

Gödel is one of the great mathematicians of the last century. Among other things, he worked on the foundations of mathematics. He was interested in the question of whether mathematics is complete. To understand this statement, I must briefly explain the concept of an axiom.

An axiom is an assumption in a mathematical system that is not proved. Mathematics cannot exist without these assumptions. One possible axiom that is popularly known is 1 + 1 = 2. It seems impossible to prove that. However, you may be tempted to claim, “That doesn't require proof,” and when they say that, they have understood the idea behind axioms. As an axiom, you always want to choose a statement that everyone can agree with. That is so obvious that it can hardly be disputed. But in the science of mathematics, you are very aware of what assumptions you are making. You don't just say, “Anything that's obvious, we'll assume to be true.” Because what is considered obvious to you may not be to someone else. That's why mathematicians write down their axioms and say, “I do mathematics under the following assumptions.” Then a colleague can go and check if his work is correct under the assumptions.

An example of such assumptions:

- A: 0 is a number
- B: 1 is a number
- C: If x is a number, then: x + 0 = x
- D: If x is a number, then x + 1 is also a number
- E: x + 1 > x

Mathematicians would say this is not formally correct, but for my purposes, it is sufficient. Here you can see how banal such statements are. With these statements, we can already prove the statement, “There is no greatest number.” A proof, which is a mind-blowing realization for children. And we should not simply downplay this fascination.

We prove it here with a proof of contradiction:

Suppose there is a largest number. Let us call it y. If it is a number, it follows from 'D' that y + 1 is also a number. Let's call it z. And from 'E' it follows that z is greater than y. Which refutes our assumption that y is the largest number. It follows that there is no largest number.
# Simulating Evolution

Many people claim that evolution is impossible because nothing can arise from randomness. But is randomness the only factor in evolution? What if other forces are at play that guide the diversity and complexity of life? To explore this question, I developed an algorithm that simulates evolution and reveals some surprising results.

The code is available on GitHub.

Imagine an empty world. Void of meaning and possibilities. In this world, a robot pops into existence. It cannot see anything. Its visual input is as empty as the universe in which it was created. The robot has no will. It simply does something random. What it doesn't know is that there are 50 other robots created at the same time. They all behave differently. Some wander around, some stand still, and some spin in circles. Then suddenly, a change occurs in one robot. Its input changes. It sees something red. The others in the same location see it too. They behave randomly. Some move toward it, some don't. What is this red thing? The closer a robot gets, the clearer it sees it until it can touch it. From nothing you came, and to nothing you shall return. The robot disappears. Every robot that touches the red thing disappears. It dies. Over time, only the robots that either don't move or avoid touching the red thing remain. This happens automatically, simply by the laws of this universe. As robots disappear, new ones are randomly created and thrown into the world to keep the population from dying out. And there was evening and morning. The first day.

On the second day, they faced a new problem. There were rumors about a green thing. Most robots behaved the same toward the green things since evolution favored cautious individuals. But some robots simply disappeared without touching the red ones. Their lifespan expired, and they hadn't figured out the secret to survival. Well, most hadn't. Some had the random behavior of approaching the green things. And when they touched them, something magical happened. First, they unknowingly extended their lifespan, and second, they reproduced. They created a copy of themselves, very similar but slightly different, with a random variation in behavior. This changes everything. Instead of not dying, reproduction became the new goal of the game. Soon, all robots avoided the red stuff and sought the green stuff.

Now comes the next stage. Before, caution was key. Move slowly to reduce the risk of accidentally touching the red mines. But after some time, some robots randomly became faster, and they were always the first to the green magic fruit. The cautious robots starved because the faster ones got there first. Speed is now the key. But they must now take more risks. Many robots now die because of the mines, but as long as they reproduce faster, they dominate this world.

The final stage. Now, without human intervention, the robots have developed useful behavior simply because they were exposed to this very specific environment. Now, only one last optimization remains. They must slowly but surely avoid the mines and maximize their base speed. After this development, a balance is reached, and from pure randomness without programming, intelligent behavior regarding this environment has emerged.
  
---

<iframe width="560" height="315" src="https://www.youtube.com/embed/ietVz2V5iDI?si=oZbGKo8A3-BdxUVX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>  
Non-optimized robots


<iframe width="560" height="315" src="https://www.youtube.com/embed/w4fR5Zr0aZo?si=oZbGKo8A3-BdxUVX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>  
Optimized robots

<iframe width="560" height="315" src="https://www.youtube.com/embed/D7IjajvfVnw?si=oZbGKo8A3-BdxUVX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>  
Robot's field of view visualized
