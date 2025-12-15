---
lang: en
tags:
	- science
	- evolution
	- simulation
	- algorithms
	- python
	- pygame
---

# [Simulating Evolution](/blog/science/simulating-evolution/)

Many people claim that evolution is impossible because nothing can arise from randomness. But is randomness the only factor in evolution? What if other forces are at play that guide the diversity and complexity of life? To explore this question, I developed an algorithm that simulates evolution and reveals some surprising results.

The code is available on [GitHub](https://github.com/risajef/pygame).

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

