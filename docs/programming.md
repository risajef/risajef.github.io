# Experience

## Machine Learning Engineer
**[Brütsch Technology](https://brel.ch)**
Beringen, Switzerland
Okt 2025 – present
*Deep learning, Computer Vision*

> I just started. Therefore I cannot say much about the projects yet.

## PhD Student  
**[Constructor Institute of Technology (Academia)](https://se.constructor.ch/)**  
Schaffhausen, Switzerland  
Dec 2023 – Sep 2025
*Formal Verification, Eiffel, Automated Proofs (Isabelle HOL), LLMs, AI*

- **Mathematical Proof Engine:** Developing an engine for validating mathematical proofs in an object-oriented programming language. Developed a first proof of concept for a simple proof.
- **Formalization of Programming:** Creating a formalization of programming, including many definitions and theorems, all separately verified in Isabelle HOL. ([Link](https://arxiv.org/abs/2502.17149v1))
- **AI for Formal Verification:** Planning, executing, and analyzing a study on the effectiveness of LLMs in fixing bugs. ([Link](https://arxiv.org/abs/2507.15822))
- **Proof of Concepts:** Developed *CodeForge*, a tool for compiling, executing, and verifying programs online without the need for local installation. Also developed *AI-Proof*, a tool using LLMs, Sledgehammer, and Isabelle HOL to automatically generate proofs. ([Link](https://github.com/reto-weber/CodeForge))
- **Teaching Assistant:** Assisted in the courses *Advances in Software Engineering* and *Software Construction, Architecture and Engineering*. Responsibilities included teaching exercise sessions, writing and grading exams, and mentoring students.

---

## Data Scientist  
**[ti&m (Banking, Government, FinTech)](https://www.ti8m.com)**  
Zürich, Switzerland  
Aug 2020 – Nov 2023  
*Machine Learning, Python, JavaScript, Docker, Data Science, AI, Computer Vision, Blockchain, Recommender Systems*

- **eID:** Evaluated multiple SSI technologies for the Swiss electronic ID. Deployed them on a public cloud with blockchain technology. Constructed a frontend, backend, and mobile app. ([Link](https://eid.admin.ch))
- **Fit&Proper:** Extended an existing solution for automatically checking the background of people for the financial market supervisor using NLP and machine learning. ([Link](https://www.ti8m.com/de/success-stories/digital-banking-and-finance/fma))
- **Sustainability Assessment:** Developed an MVP to help a team of sustainability experts find answers to their questions in their data, especially PDFs. The tool streamlines the process of extracting and analyzing information from large document collections.  ([Link](https://www.ti8m.com/en/success-stories/life-science-and-industry/sp-global))
- **Construction Standard Management:** Planned, developed, and deployed a solution for managing the most used construction standards in Switzerland (eBKP/NPK). This system improved efficiency and accessibility for industry professionals. ([Link](https://www.ti8m.com/en/success-stories/life-science-and-industry/crb))
- **Proof of Concepts:** Built prototypes for a travel recommender system, as well as identity card and passport detection and parsing tools, showcasing the application of AI in diverse domains.

---

## Software Engineer (Machine Learning, Computer Vision)  
**[Kitris GmbH (Sports)](https://www.kitris-sports.com/)**  
Zürich, Switzerland  
Jan 2020 – Jul 2020  
*Python, Docker, R&D, Computer Vision, Visual Computing*

- **Video Tracking:** Implemented a proof of concept for a video tracking system to analyze player movements and actions in sports videos. Utilized computer vision techniques to extract relevant features and provide actionable insights for coaches and analysts.

---

## Junior Security Researcher & Software Engineer  
**[Exeon Analytics (Cybersecurity)](https://exeon.com/)**  
Zürich, Switzerland  
Apr 2018 – Jun 2019  
*Python, Docker, Scala, React*

- **Exeon Trace:** Improved the main product by implementing a new feature for tracking and visualizing network traffic, enhancing the platform's security monitoring capabilities.
- **Tridyo:** Created an MVP for a new product analyzing the future viability of companies using sentiment analysis and fit and proper techniques. This project combined data science and software engineering to deliver actionable business intelligence.

---

# Projects
## Hoare-Logic proof verifier
[**GitHub**](https://github.com/risajef/hoare-logic), [**Web Demo**](https://retoweber.info/research/hoare-logic/)
This is a web technology based hoare logic verifier. The user can create programs and their proofs using drag and drop. The proofs of the hoare logic have to be explicit to the end. The logical and arithmetical proof obligations are fed to the SMT solver [Z3](https://github.com/Z3Prover/z3). The tool is fully frontend based. No server is needed. That is why the application also works on this static website.

## CodeForge
[**CodeForge on GitHub**](https://github.com/reto-weber/CodeForge)  
CodeForge is a platform designed to compile, run, and verify code across multiple programming languages. Using Docker containers to ensure that code execution is both secure. The platform is useful for educational environments, coding demos. Its containerized architecture allows for easy integration of new languages and verification tools. It was completely vibe coded. It is sometimes online at [eiffel.org](https://autoproof.eiffel.org/).

## PDF Scan
[**PDF Scan Automation on GitHub**](https://github.com/risajef/pdf_scan_automation)  
PDF Scan is a project that streamlines the organization of physical mail and documents. It processes batches of scanned documents, automatically detecting where to split them into individual files, straightening pages, and performing OCR to extract text. This tool reduces manual effort in digitizing and archiving paperwork. It is especially helpful for personal and small office use. It was partially vibe coded.

## Autoproof Docker
[**Autoproof Docker on GitHub**](https://github.com/reto-weber/autoproof_docker)  
This project provides a [Docker image](https://hub.docker.com/repository/docker/risajef/autoproof/general) for running [AutoProof](https://se.constructor.ch/reif-site/), a static verifier for Eiffel programs. By containerizing AutoProof, the setup process becomes straightforward and platform-independent. Users can quickly verify Eiffel programs without worrying about complex dependencies. The Docker image is ideal for researchers and educators working with formal verification.

## Evolution Showcase
[**Evolution Showcase on GitHub**](https://github.com/risajef/pygame)  
Evolution Showcase is a small Python game that visually demonstrates the principles of evolution and natural selection. In the game, agents exhibit random behaviors, but over time, those best suited to the environment are selected, resulting in non-random strategies. The project serves as an educational tool for illustrating evolutionary algorithms and emergent behavior.

## OpenSCAD Phone Stand
[**OpenSCAD Phone Stand on GitHub**](https://github.com/risajef/openscad_files)  
This project features a customizable 3D model of a phone stand, created using [OpenSCAD](https://openscad.org/). The design is fully parameterized, allowing users to adjust dimensions to fit any mobile phone model. It is ideal for 3D printing enthusiasts.

## This website
[**This website on GitHub**](https://github.com/risajef/risajef.github.io)
This website was done using [mkdocs](https://www.mkdocs.org/) with a custom template and styling. It is automatically deployed to [retoweber.info](https://retoweber.info).