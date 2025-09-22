---
extra_css:
- assets/hoare/style.css
extra_javascript:
- assets/hoare/script.js
---
# Hoar logic proof verifier

> This was vibe coded and uses React.

1. Create a program using drag and drop with the given elements.
2. Click `Create Root`
3. Add the appropriate rules until it says `Valid Proof: Yes`

## Hoar inference rules

$$\frac{}{\{p[e/x]\} \; x := e \; \{p\}}\text{[ass]}$$

$$\frac{}{\{p\} \; \text{skip} \; \{p\}}\text{[skip]}$$

$$\frac{ \{p\} \; P \; \{r\} \;  \{r\} \; Q \; \{q\}}{ \{p\} \; P; Q \; \{q\}}\text{[comp]}$$

$$\frac{\{p \land b\} \; P \; \{p\}}{\{p\} \; \text{while } b \; \text{ do } P \; \{\neg b \land p\}}\text{[while]}$$

$$\frac{\{p \land b\} \; P \; \{q\} \; \{q \land b\} \; \text{if } b \; \text{ then } P \; \{q\}}{\{p\} \; \text{if } b \; \text{ then } P \; \{q\}}\text{[if]}$$

$$\frac{\{p\} \; P \; \{q\} \; p' \implies p \; q \implies q'}{\{p'\} \; P \; \{q'\}}\text{[cons]}$$

This tool is not suffisticated but only doing string replacement and string comparison.

## Hoare logic prover

<div id="root"></div>