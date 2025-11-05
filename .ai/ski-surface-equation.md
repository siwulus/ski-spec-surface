# Obliczanie Powierzchni Nart

## Ilustracja

![Ilustracja Algorytmu Powierzchni Nart](ski-surface-equation.png)


## Równanie Główne

Całkowita powierzchnia \(S\) jest obliczana jako:

$$
S = 2 \left( \int_0^{l_{\text{back}}} f_{\text{back}}(x) \, dx + \int_0^{l_{\text{front}}} f_{\text{front}}(x) \, dx + \int_0^{l_{\text{tip}}} f_{\text{tip}}(x) \, dx \right)
$$

## Funkcje Szerokości

Funkcje szerokości dla każdej sekcji:

$$
f_{\text{back}}(x) = \frac{w_{\text{tail}} - w_{\text{mid}}}{2 l_{\text{back}}^2} x^2 + \frac{w_{\text{mid}}}{2}
$$

$$
f_{\text{front}}(x) = \frac{w_{\text{tip}} - w_{\text{mid}}}{2 l_{\text{front}}^2} x^2 + \frac{w_{\text{mid}}}{2}
$$

$$
f_{\text{tip}}(x) = \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} \ln(x + 1)
$$

## Całki

Całki funkcji szerokości:

$$
\int f_{\text{back}}(x) \, dx = \frac{w_{\text{tail}} - w_{\text{mid}}}{6 l_{\text{back}}^2} x^3 + \frac{w_{\text{mid}}}{2} x
$$

$$
\int f_{\text{front}}(x) \, dx = \frac{w_{\text{tip}} - w_{\text{mid}}}{6 l_{\text{front}}^2} x^3 + \frac{w_{\text{mid}}}{2} x
$$

$$
\int f_{\text{tip}}(x) \, dx = \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} \left[ (x + 1) \ln(x + 1) - x \right]
$$

## Wzór Końcowy

Po obliczeniu całek w ich górnych granicach, powierzchnia wynosi:

$$
\begin{split}
S = 2 \Bigg\{ & \frac{w_{\text{tail}} - w_{\text{mid}}}{6 l_{\text{back}}^2} l_{\text{back}}^3 + \frac{w_{\text{mid}}}{2} l_{\text{back}} \\
& + \frac{w_{\text{tip}} - w_{\text{mid}}}{6 l_{\text{front}}^2} l_{\text{front}}^3 + \frac{w_{\text{mid}}}{2} l_{\text{front}} \\
& + \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} (l_{\text{tip}} + 1) \ln(l_{\text{tip}} + 1) - \frac{w_{\text{tip}}}{2 \ln(l_{\text{tip}} + 1)} l_{\text{tip}} \Bigg\}
\end{split}
$$

---

**Definicje zmiennych:**

- $S$ = całkowita powierzchnia
- $w_{\text{tail}}$ = szerokość przy ogonie
- $w_{\text{mid}}$ = szerokość w środku (talia)
- $w_{\text{tip}}$ = szerokość przy czubku
- $l_{\text{back}}$ = długość sekcji tylnej
- $l_{\text{front}}$ = długość sekcji przedniej
- $l_{\text{tip}}$ = długość sekcji czubka

---

## Wyjaśnienie Podejścia

### Podział Narty na Sekcje

Narta została podzielona na trzy charakterystyczne sekcje ze względu na różny charakter zmian jej geometrii:

1. **Sekcja tylna** (od ogona do talii) - obszar, w którym szerokość stopniowo zmienia się od szerokiego ogona do wąskiej talii
2. **Sekcja przednia** (od talii do początku czubka) - obszar, w którym szerokość zwiększa się od wąskiej talii w kierunku szerokiego czubka
3. **Sekcja czubka** - końcowy fragment narty charakteryzujący się wyraźnym zaokrągleniem i zagięciem do góry

### Modelowanie Kształtu

Każda sekcja narty wymaga innego matematycznego modelowania ze względu na odmienną geometrię:

**Funkcje kwadratowe** ($f_{\text{back}}$ i $f_{\text{front}}$) zostały wybrane dla sekcji tylnej i przedniej, ponieważ:

- Zapewniają płynną, stopniową zmianę szerokości
- Dobrze aproksymują typowy łukowaty profil narty w tych obszarach
- Są symetryczne względem talii, co odzwierciedla rzeczywisty kształt

**Funkcja logarytmiczna** ($f_{\text{tip}}$) została zastosowana dla sekcji czubka, ponieważ:

- Modeluje charakterystyczne zaokrąglenie końcówki narty
- Zapewnia płynne przejście do zera na samym końcu
- Odzwierciedla bardziej dynamiczną zmianę krzywizny w tym obszarze

### Metoda Całkowania

Powierzchnia narty jest obliczana poprzez **całkowanie funkcji szerokości** wzdłuż długości każdej sekcji. To podejście:

- Uwzględnia ciągłą zmianę szerokości wzdłuż narty (nie jest to proste przybliżenie prostokątami)
- Daje dokładny wynik matematyczny dla zamodelowanego kształtu
- Jest analogiczne do obliczania pola pod krzywą w analizie matematycznej

### Współczynnik 2

Końcowy wynik jest mnożony przez 2, ponieważ:

- Powierzchnia obejmuje **obie strony narty** (górną i dolną)
- Jest to istotne dla obliczenia rzeczywistej powierzchni nośnej
- Uwzględnia pełną powierzchnię kontaktu ze śniegiem (dolna strona)

### Zastosowanie

Obliczona powierzchnia jest kluczowym parametrem dla:

- Określenia **względnej wagi narty** (masa/powierzchnia w g/cm²)
- Oceny charakterystyki pływania w głębokim śniegu
- Porównania różnych modeli nart pod kątem efektywności konstrukcji
- Analizy rozkładu nacisku narciarza na podłoże
