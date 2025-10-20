# Aplikacja - {Ski Surface Spec Extension} (MVP)

## Główny problem oraz cel aplikacji

Dla narciarzy skiturowych i freeride’owych kluczowe parametry nart to długość, szerokość przodu, środka i tyłu, promień skrętu oraz waga. Dane te są standardowo podawane przez producentów w specyfikacjach.

Brakuje jednak dwóch istotnych parametrów:

- **powierzchni narty**,
- **wagi względnej narty** (waga przypadająca na cm² powierzchni).

**Powierzchnia narty** jest szczególnie ważna dla freeriderów jeżdżących w nieprzygotowanym terenie, gdzie rodzaj śniegu bywa nieprzewidywalny: od mokrego i ciężkiego, przez wiosenny, aż po lekki puch. To właśnie powierzchnia decyduje o wyporności i wpływa na to, jak narta „niesie” narciarza. Umożliwia porównywanie różnych modeli pod kątem wyporności, niezależnie od ich długości czy szerokości. Może też pomóc w doborze odpowiedniej długości narty do stylu jazdy i poziomu umiejętności — kompensując krótszą długość większą szerokością.

**Waga względna narty** pozwala porównywać konstrukcje o różnych rozmiarach. Jest wskaźnikiem jakości budowy i ma przełożenie na właściwości jezdne. Ułatwia wybór narty w sytuacji, gdy trzeba znaleźć balans między komfortem zjazdu a wagą podczas podejść na fokach. Waga staje się szczególnie krytyczna na długich dystansach.

**Celem aplikacji** jest stworzenie narzędzia, które uzupełni dane producentów o te dwa brakujące parametry: powierzchnię i wagę względną narty. Dzięki temu zaawansowani narciarze skiturowi i freeride’owi będą mogli nie tylko **dokładnie wyliczać wartości tych parametrów**, ale też **porównywać modele różnych producentów na jednolitych zasadach**. To pozwala na bardziej świadomy wybór sprzętu, dopasowany do stylu jazdy, warunków śniegowych i indywidualnych preferencji.

## Najmniejszy zestaw funkcjonalności

- Dodawanie / usowanie / edytowanie / odczytywanie danych (specyfikacji) narty - nazwa, długość [cm], szerokosc tip/waist/tail [mm], promień [m], waga jednej narty [g].
- Obliczanie powierzchni narty (algorytm estymujacy powierzchnie na bazie krzywej)
- Obliczanie wagi wzglednej narty (waga przypadająca na cm² powierzchni)
- Prezentacja zapisanych nart: specyfikacja wprowadzona recznie (producenta) oraz wyliczone dodatkowe parametry - nazwa, długość [cm], szerokosc tip/waist/tail [mm], promień [m], waga jednej narty [g], powierzchnia [cm2], waga wzgledna [g/cm2], wizualizacja narty (opcjonalnie)
- Mozliwość porownania ze sobą do 4 rozszerzonych specyfikacji nart
- Prosty system kont użytkowników do powiązania uzytkownika z jego specyfikacjami nart
- Import / export specyfikacji nart z / do pliku CSV

## Co NIE wchodzi w zakres MVP

- Wyszukiwanie specyfikacji nart na bazie opisu producent / seria / model (LLM)
- Rekomendacja konkretnych modeli nart dostępnych na rynku spelnijących wprowadzoną specyfikację narty (LLM)
- Porównywanie miedzy sobą wiecej niz dwuch specyfikacji nart
- Wspołdzielenie / udostępnianie / publiczne linkowanie specyfikacji nart wprowadzonych przez uzytkownika

## Kryteria sukcesu

- ≥70% użytkowników kończy dodanie min. 2 modeli i wchodzi w ekran porównania.
- Średnio ≥3 porównane modele na sesję.
- ≥20% sesji kończy się eksportem
