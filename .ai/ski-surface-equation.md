# Ski Surface Area Calculation

## Ilustration

![Ski Surface Algorithm Illustration](ski-surface-equation.png)


## Main Equation

The total surface area \(S\) is calculated as:

$$
S = 2 \left( \int_0^{l_{\text{back}}} f_{\text{back}}(x) \, dx + \int_0^{l_{\text{front}}} f_{\text{front}}(x) \, dx + \int_0^{l_{\text{tip}}} f_{\text{tip}}(x) \, dx \right)
$$

## Width Functions

The width functions for each section are:

$$
f_{\text{back}}(x) = \frac{w_{\text{tail}} - w_{\text{mid}}}{2 l_{\text{back}}^2} x^2 + \frac{w_{\text{mid}}}{2}
$$

$$
f_{\text{front}}(x) = \frac{w_{\text{tip}} - w_{\text{mid}}}{2 l_{\text{front}}^2} x^2 + \frac{w_{\text{mid}}}{2}
$$

$$
f_{\text{tip}}(x) = \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} \ln(x + 1)
$$

## Integrals

The integrals of the width functions are:

$$
\int f_{\text{back}}(x) \, dx = \frac{w_{\text{tail}} - w_{\text{mid}}}{6 l_{\text{back}}^2} x^3 + \frac{w_{\text{mid}}}{2} x
$$

$$
\int f_{\text{front}}(x) \, dx = \frac{w_{\text{tip}} - w_{\text{mid}}}{6 l_{\text{front}}^2} x^3 + \frac{w_{\text{mid}}}{2} x
$$

$$
\int f_{\text{tip}}(x) \, dx = \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} \left[ (x + 1) \ln(x + 1) - x \right]
$$

## Final Formula

Evaluating the integrals at their upper bounds, the surface area becomes:

$$
\begin{split}
S = 2 \Bigg\{ & \frac{w_{\text{tail}} - w_{\text{mid}}}{6 l_{\text{back}}^2} l_{\text{back}}^3 + \frac{w_{\text{mid}}}{2} l_{\text{back}} \\
& + \frac{w_{\text{tip}} - w_{\text{mid}}}{6 l_{\text{front}}^2} l_{\text{front}}^3 + \frac{w_{\text{mid}}}{2} l_{\text{front}} \\
& + \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} (l_{\text{tip}} + 1) \ln(l_{\text{tip}} + 1) - \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} l_{\text{tip}} \Bigg\}
\end{split}
$$

---

**Variable definitions:**

- $S$ = total surface area
- $w_{\text{tail}}$ = width at tail
- $w_{\text{mid}}$ = width at midpoint (waist)
- $w_{\text{tip}}$ = width at tip
- $l_{\text{back}}$ = length of back section
- $l_{\text{front}}$ = length of front section
- $l_{\text{tip}}$ = length of tip section

