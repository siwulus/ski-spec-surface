<conversation_summary> 
<decisions>

1. Algorytm obliczeń (profil/funkcje/całkowanie) będzie osobnym podprojektem z ustalonym interfejsem – poza zakresem PRD.
2. Dane specyfikacji są per rozmiar; każdy rozmiar traktowany jako oddzielny model; wszystkie pola są wymagane.
3. Aplikacja jest webowa; brak onboardingu i trybu demo w MVP.
4. Walidacja danych: tip ≥ waist ≤ tail; promień > 0; zakresy min/max (konkretne wartości doprecyzować).
5. Porównanie w tabeli do 4 modeli; wyróżniamy powierzchnię i wagę względną.
6. Brak wizualizacji konturu narty w MVP.
7. Jednostki: długość [cm], tip/waist/tail [mm], waga [g], powierzchnia [cm²], waga względna [g/cm²].
8. Format liczb: standaryzacja wewnętrzna na kropce; parser akceptuje kropkę i przecinek; UI pokazuje jednostki.
9. Dostęp tylko dla zalogowanych użytkowników; provider zewnętrzny (np. Supabase Auth) zostanie wskazany później.
10. KPI: usuwamy „eksport CSV” z kryteriów sukcesu; pozostałe KPI zostaną doprecyzowane później.
11. Import/eksport CSV wchodzi w zakres MVP; specyfikacja schematu CSV zostanie zdefiniowana później.

</decisions>

<matched_recommendations>

1. Walidacja twarda przy wprowadzaniu danych (blokada zapisu + komunikaty) – przyjęte.
2. Tabela porównawcza z wyróżnieniem powierzchni i g/cm² – przyjęte.
3. Standaryzacja liczb i jednostek (kropka/ przecinek, jednostki w UI) – przyjęte.
4. Brak demo/onboardingu w MVP, jedynie podstawowe podpowiedzi inline (opcjonalnie) – częściowo przyjęte (onboarding odrzucony).
5. Logowanie wymagane od startu (bez trybu gościa) – przyjęte.
6. Brak wizualizacji SVG konturu – odrzucone (poza MVP).
7. KPI: zachować wskaźniki zaangażowania, usunąć eksport CSV – częściowo przyjęte (doprecyzowanie później).
8. Model danych „model-rozmiar” bez imputacji braków – przyjęte.
   </matched_recommendations>

<prd_planning_summary>
a. Główne wymagania funkcjonalne:

* CRUD specyfikacji nart per rozmiar (nazwa, długość [cm], tip/waist/tail [mm], promień [m], waga jednej narty [g]).
* Obliczenia: powierzchnia [cm²] i waga względna [g/cm²] dostarczane przez zewnętrzny moduł algorytmiczny.
* Porównanie do 4 modeli w tabeli z wyróżnieniem powierzchni i wagi względnej; sortowanie i czytelne etykiety jednostek.
* Import/eksport CSV (schemat do ustalenia).
* Uwierzytelnianie wymagane (provider zewnętrzny, do wyboru później).
* Walidacja: tip ≥ waist ≤ tail; promień > 0; zakresy min/max (konkretne wartości do ustalenia); wszystkie pola obowiązkowe.

b. Kluczowe historie użytkownika i ścieżki:

* Jako zalogowany użytkownik dodaję specyfikację narty (pełen zestaw pól) i zapisuję ją po przejściu walidacji.
* Jako użytkownik wybieram do 4 zapisanych modeli i porównuję je w tabeli, skupiając się na powierzchni i g/cm².
* Jako użytkownik importuję listę modeli z pliku CSV (po walidacji) i/lub eksportuję moje modele do CSV.
* Jako użytkownik chcę widzieć jednoznaczne jednostki i móc wprowadzać wartości z kropką lub przecinkiem.

c. Kryteria sukcesu i pomiar:

* Podstawowe: odsetek użytkowników, którzy zapiszą ≥2 modele i wejdą w ekran porównania; średnia liczba porównań na sesję.
* Usunięto: KPI związany z eksportem CSV.
* Metryki i zdarzenia analityczne zostaną doprecyzowane później (np. completion rate CRUD, start/completion porównania).

d. Nierozwiązane kwestie/obszary do doprecyzowania:

* Konkrety zakresów min/max dla walidacji pól.
* Wybór i konfiguracja dostawcy uwierzytelniania.
* Dokładne KPI (wartości progowe i definicje zdarzeń).
* Specyfikacja formatu CSV (nagłówki, walidacja, wersjonowanie).
* Polityka prywatności/RODO oraz retention danych użytkownika.
  </prd_planning_summary>

<unresolved_issues>

1. Wartości graniczne dla walidacji (min/max dla długości, szerokości, wagi, promienia).
2. Wybór i szczegóły integracji dostawcy auth (np. Supabase Auth) oraz polityka haseł/SSO.
3. Finalne KPI (progi, definicje zdarzeń, okresy pomiaru).
4. Schemat CSV (kolumny obowiązkowe/opcjonalne, kolejność, wersja, komunikaty błędów).
5. Wymogi prawne: polityka prywatności, RODO, retencja i eksport/usuwanie danych.
6. Zakres i layout ekranu porównania (np. kolejność kolumn, mechanizmy sortowania/filtrów).
   </unresolved_issues>
   </conversation_summary>
