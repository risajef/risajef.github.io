---
lang: en
extra_css:
- assets/hoare/style.css
extra_javascript:
- assets/hoare/script.js
tags:
- hoare
- logic
- verifier
- axiomatic
- semantics
- SMT
- Z3
github: https://github.com/risajef/hoare-logic
---
# Hoare logic proof verifier

> This was vibe coded and uses React.

1. Create a program using drag and drop with the given elements.
2. Click `Create Root`
3. Add the appropriate rules until it says `Valid Proof: Yes`

## Hoare inference rules

$$\frac{}{\{p[e/x]\} \; x := e \; \{p\}}\text{[ass]}$$

$$\frac{}{\{p\} \; \text{skip} \; \{p\}}\text{[skip]}$$

$$\frac{ \{p\} \; P \; \{r\} \; \; \;  \{r\} \; Q \; \{q\}}{ \{p\} \; P; Q \; \{q\}}\text{[comp]}$$

$$\frac{\{p \land b\} \; P \; \{p\}}{\{p\} \; \text{while } b \; \text{ do } P \; \{\neg b \land p\}}\text{[while]}$$

$$\frac{\{p \land b\} \; P \; \{q\} \; \; \; \{p \land \lnot b\} \; Q \; \{q\}}{\{p\} \; \text{if } b \; \text{ then } P \; \text{else } Q \text { end }\{q\}}\text{[if]}$$

$$\frac{p' \implies p \; \; \; \{p\} \; P \; \{q\} \; \; \; q \implies q'}{\{p'\} \; P \; \{q'\}}\text{[cons]}$$

This tool is not sophisticated but only doing string replacement and string comparison.

## Hoare logic prover

<div id="root"></div>