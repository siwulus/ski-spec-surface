# Dokument wymagań produktu (PRD) - Ski Surface Spec Extension

## 1. Przegląd produktu

Ski Surface Spec Extension to aplikacja webowa stworzona dla zaawansowanych narciarzy skiturowych i freeride'owych, która uzupełnia standardowe specyfikacje nart o dwa kluczowe parametry: powierzchnię narty oraz wagę względną. Aplikacja umożliwia użytkownikom wprowadzanie danych technicznych nart, automatyczne wyliczanie brakujących parametrów oraz porównywanie różnych modeli nart na jednolitych zasadach.

Aplikacja jest skierowana do doświadczonych narciarzy, którzy potrzebują precyzyjnych danych do świadomego wyboru sprzętu dopasowanego do warunków terenowych, stylu jazdy i indywidualnych preferencji. System wymaga rejestracji i logowania, co zapewnia każdemu użytkownikowi prywatną przestrzeń do zarządzania własnymi specyfikacjami nart. Każda specyfikacja może zawierać opcjonalny opis, umożliwiający użytkownikom dodanie dodatkowych informacji o modelu, takich jak producent, seria, przeznaczenie czy krótkie notatki.

Kluczowe założenia:

- Aplikacja webowa dostępna przez przeglądarkę
- Landing page dostępny publicznie bez logowania, opisuje cel i funkcjonalność aplikacji
- Dostęp do funkcjonalności aplikacji tylko dla zalogowanych użytkowników
- Po zalogowaniu użytkownik przekierowany do listy specyfikacji
- Każdy rozmiar narty traktowany jako oddzielny model
- Wszystkie pola specyfikacji technicznych (wymiary, waga) są obowiązkowe, opis specyfikacji jest opcjonalny
- Algorytm obliczania powierzchni realizuje zdefiniowany interfejs i może być podmieniany od najprostszego wymaganego w PoC po bardziej zaawansowany oparty na krzywych w wersji MVP
- Algorytm liczenia powierzchni "by design" zakłada estymację przybliżonej powierzchni. Porównywanie wyników dla różnych specyfikacji nart wykonane tym samym algorytmem jest wystarczające do realizacji przyjętych celów aplikacji
- Szczegółowa specyfikacja algorytmu zostanie zdefiniowana w osobnym dokumencie technicznym

## 2. Problem użytkownika

Narciarze skiturowi i freeride'owi napotykają na istotny problem przy wyborze odpowiedniego sprzętu. Producenci nart podają standardowe parametry takie jak długość, szerokość (tip/waist/tail), promień skrętu i wagę, jednak brakuje dwóch krytycznych informacji:

1. Powierzchnia narty - parametr decydujący o wyporności narty w różnych warunkach śniegowych. Jest to szczególnie istotne w nieprzygotowanym terenie, gdzie rodzaj śniegu jest nieprzewidywalny (od mokrego i ciężkiego po lekki puch). Powierzchnia umożliwia obiektywne porównanie wyporności różnych modeli niezależnie od ich wymiarów.

2. Waga względna (g/cm²) - wskaźnik pozwalający porównać konstrukcje nart o różnych rozmiarach. Jest to kluczowy parametr przy szukaniu balansu między komfortem zjazdu a wagą podczas podejść, szczególnie na długich trasach skiturowych.

Brak tych danych utrudnia:

- Obiektywne porównanie modeli różnych producentów
- Dobór odpowiedniej długości narty kompensowanej jej szerokością
- Ocenę rzeczywistej wyporności narty w głębokim śniegu
- Znalezienie optymalnego kompromisu między właściwościami jezdnymi a wagą

Obecnie narciarze muszą samodzielnie szacować te parametry lub polegać na subiektywnych opiniach, co prowadzi do nietrafionych wyborów sprzętu i frustracji na stoku.

## 3. Wymagania funkcjonalne

### 3.1 Zarządzanie specyfikacjami nart

- Dodawanie nowych specyfikacji nart z pełnym zestawem danych
- Edycja istniejących specyfikacji
- Usuwanie specyfikacji
- Przeglądanie listy zapisanych specyfikacji
- Wyświetlanie widoku szczegółów specyfikacji z pełnymi parametrami i powiązanymi notatkami
- Nawigacja z listy specyfikacji do widoku szczegółów wybranej specyfikacji
- Każda specyfikacja zawiera: nazwę, opis (opcjonalny), długość [cm], szerokość tip/waist/tail [mm], promień [m], wagę jednej narty [g]

### 3.2 Obliczenia parametrów

- Automatyczne obliczanie powierzchni narty [cm²] na podstawie wymiarów
- Automatyczne obliczanie wagi względnej [g/cm²] jako iloraz wagi i powierzchni
- Obliczenia realizowane przez wymienny moduł algorytmiczny
- Szczegółowa specyfikacja algorytmu obliczania powierzchni zostanie zdefiniowana w osobnym dokumencie technicznym

### 3.3 Walidacja danych

- Sprawdzanie poprawności relacji: tip ≥ waist ≤ tail
- Walidacja szerokości [mm]: 50 <= tip, waist, tail <= 250
- Walidacja promienia [m]: 1 <= wartość <= 30
- Walidacja wagi [g]: 500 <= wartość <= 3000
- Walidacja długości [cm]: 100 <= wartość <= 250
- Walidacja opisu: maksymalnie 2000 znaków (pole opcjonalne)
- Blokada zapisu przy niepoprawnych danych
- Wyświetlanie komunikatów o błędach
- Walidacja notatki: maksymalnie 2000 znaków (pole opcjonalne)

### 3.4 Porównywanie specyfikacji

- Wybór do 4 modeli nart do porównania
- Wyświetlanie porównania w formie tabeli
- Wyróżnienie powierzchni i wagi względnej w tabeli
- Sortowanie wyników porównania
- Czytelne etykiety z jednostkami
- Prezentowanie roznic w wartosciach parametrów specyfikacji, procentowe i bezwzgledne pomiedzy wybranym modelem a pozostałymi wybranymi do porównania

### 3.5 Import/eksport danych

- Import specyfikacji z pliku CSV
- Eksport zapisanych specyfikacji do pliku CSV
- Import/eksport uwzględnia opis specyfikacji o ile jest ona obecna
- Walidacja importowanych danych
- Poprawne escapowanie opisów w formacie CSV (obsługa znaków specjalnych, nowych linii)
- Obsługa błędów podczas importu

### 3.6 System uwierzytelniania

- Landing page z opisem aplikacji dostępny publicznie bez uwierzytelniania
- Rejestracja nowych użytkowników
- Logowanie i wylogowanie
- Zarządzanie kontem użytkownika
- Integracja z zewnętrznym dostawcą uwierzytelniania

### 3.7 Formatowanie i jednostki

- Długość: cm, tylko wartosci całkowite
- Szerokości (tip/waist/tail): mm, tylko wartosci całkowite
- Promień: m, liczba ułamkowa z dwoma miejscami po przecinku
- Waga: g, tylko wartosci całkowite
- Powierzchnia: cm², liczba ułamkowa z dwoma miejscami po przecinku
- Waga względna: g/cm², liczba ułamkowa z dwoma miejscami po przecinku
- Opis: tekst wielowierszowy, opcjonalny, maksimum 2000 znaków
- Parser akceptujący zarówno kropkę jak i przecinek jako separator dziesiętny
- Wewnętrzna standaryzacja na kropce
- Wyświetlanie jednostek w interfejsie

### 3.8 Zarządzanie notatkami

- Dodawanie nowych notatek do specyfikacji narty
- Edycja istniejących notatek
- Usuwanie notatek
- Przeglądanie listy notatek w widoku szczegółów specyfikacji
- Jedna specyfikacja może mieć zero lub wiele notatek
- Każda notatka zawiera: treść (tekst wielowierszowy), datę utworzenia, datę ostatniej edycji
- Notatki są sortowane chronologicznie (najnowsze na górze)
- System automatycznie zapisuje datę utworzenia przy dodawaniu notatki
- System automatycznie aktualizuje datę ostatniej edycji przy zapisywaniu zmian
- Notatki są usuwane automatycznie przy usunięciu specyfikacji
- Wyświetlanie licznika notatek przy każdej specyfikacji na liście
- Walidacja długości treści notatki (minimum 1 znak, maksimum 2000 znaków)

### 3.9 Landing Page

- Strona główna aplikacji (root `/`) dostępna publicznie bez logowania
- Prezentacja problemu użytkownika: brak danych o powierzchni narty i wadze względnej w specyfikacjach producentów
- Lista kluczowych korzyści aplikacji:
  - Automatyczne obliczanie powierzchni narty na podstawie wymiarów
  - Kalkulacja wagi względnej (g/cm²) dla obiektywnego porównania modeli
  - Porównywanie do 4 modeli nart jednocześnie
  - Prywatna przestrzeń do zarządzania własnymi specyfikacjami
  - Import/eksport danych w formacie CSV
  - System notatek do dokumentowania testów i obserwacji
- Wyraźny przycisk Call-to-Action (CTA) do rejestracji/logowania
- Responsywny design dostosowany do urządzeń mobilnych i desktopowych
- Prosty, czytelny layout skupiony na przekazaniu wartości aplikacji
- Brak demonstracji interaktywnej ani trybu demo (opcja poza zakresem MVP)

## 4. Granice produktu

### 4.1 Funkcjonalności wchodzące w zakres MVP

- Landing page z opisem aplikacji i funkcjonalności (dostępny publicznie)
- Pełny CRUD specyfikacji nart
- Widok szczegółów specyfikacji
- Pełny CRUD notatek powiązanych ze specyfikacjami
- Obliczenia powierzchni i wagi względnej
- Porównywanie do 4 modeli jednocześnie
- Import/eksport CSV
- System uwierzytelniania użytkowników
- Walidacja wprowadzanych danych

### 4.2 Funkcjonalności poza zakresem MVP

- Wyszukiwanie specyfikacji nart na podstawie opisu (producent/seria/model) z użyciem LLM
- Wyszukiwanie pełnotekstowe w notatkach
- Tagowanie notatek
- Załączniki do notatek (zdjęcia, filmy)
- Formatowanie tekstu w notatkach (markdown, rich text)
- Kategorie notatek (test, obserwacja, serwis, itp.)
- Eksport notatek do PDF
- Rekomendacje modeli nart dostępnych na rynku
- Porównywanie więcej niż 4 specyfikacji jednocześnie
- Współdzielenie i publiczne udostępnianie specyfikacji wraz z notatkami
- Wizualizacja konturu narty
- Interaktywny tryb demo na landing page (prezentacja funkcjonalności bez rejestracji)
- Tryb gościa z ograniczonymi funkcjonalnościami (bez logowania)
- Integracja z zewnętrznymi bazami danych producentów
- Aplikacja mobilna

### 4.3 Ograniczenia techniczne

- Aplikacja dostępna tylko przez przeglądarkę internetową
- Wymaga stałego połączenia z internetem
- Algorytm obliczania powierzchni jako zewnętrzny moduł
- Brak offline mode

### 4.4 Do doprecyzowania

- Konkretne wartości min/max dla walidacji specyfikacji i notatek
- Wybór dostawcy uwierzytelniania
- Schemat pliku CSV (czy uwzględniać notatki w eksporcie)
- Polityka prywatności i RODO
- Dokładne wartości KPI
- Format daty w notatkach (lokalizacja)

## 5. Historyjki użytkowników

### 5.1 Uwierzytelnianie i zarządzanie kontem

#### US-000: Wyświetlanie landing page dla niezalogowanych użytkowników

- ID: US-000
- Tytuł: Przeglądanie landing page bez logowania
- Opis: Jako potencjalny użytkownik chcę zobaczyć informacje o aplikacji przed rejestracją, aby zrozumieć jej wartość i funkcjonalność
- Kryteria akceptacji:
  - Landing page jest stroną główną aplikacji (root `/`)
  - Strona jest dostępna bez logowania
  - Wyświetlana jest sekcja opisująca problem użytkownika: brak danych o powierzchni i wadze względnej w specyfikacjach producentów
  - Prezentowana jest lista kluczowych korzyści aplikacji w czytelnej formie (punkty lub ikony z opisami)
  - Wyraźny przycisk Call-to-Action (CTA) "Zarejestruj się" lub "Rozpocznij" jest widoczny w górnej części strony
  - Dodatkowy link do logowania dla istniejących użytkowników jest dostępny
  - Strona jest responsywna i poprawnie wyświetla się na urządzeniach mobilnych i desktopowych
  - Layout jest prosty i skupiony na przekazaniu wartości aplikacji
  - Po kliknięciu przycisku CTA użytkownik jest przekierowany do formularza rejestracji
  - Po kliknięciu linku logowania użytkownik jest przekierowany do formularza logowania

#### US-001: Rejestracja nowego użytkownika

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik chcę się zarejestrować w aplikacji, aby móc korzystać z jej funkcjonalności
- Kryteria akceptacji:
  - Formularz rejestracji dostępny z landing page (przycisk CTA) oraz bezpośrednio pod adresem `/signup` lub `/register`
  - Formularz rejestracji zawiera wymagane pola (email, hasło)
  - System waliduje poprawność adresu email
  - System wymusza minimalne wymagania bezpieczeństwa hasła
  - Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany
  - Po zalogowaniu użytkownik jest przekierowany do listy specyfikacji (która początkowo jest pusta)
  - System wyświetla komunikat potwierdzający rejestrację

#### US-002: Logowanie użytkownika

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik chcę się zalogować do aplikacji, aby uzyskać dostęp do moich danych
- Kryteria akceptacji:
  - Formularz logowania dostępny z landing page (link "Zaloguj się") oraz bezpośrednio pod adresem `/login`
  - Formularz logowania zawiera pola email i hasło
  - System weryfikuje poprawność danych logowania
  - Po pomyślnym logowaniu użytkownik jest przekierowany do listy specyfikacji
  - Przy błędnych danych wyświetlany jest komunikat o błędzie
  - System blokuje możliwość logowania po przekroczeniu limitu nieudanych prób
  - Zalogowany użytkownik próbujący wejść na landing page (root `/`) jest automatycznie przekierowywany do listy specyfikacji

#### US-003: Wylogowanie użytkownika

- ID: US-003
- Tytuł: Wylogowanie z aplikacji
- Opis: Jako zalogowany użytkownik chcę się wylogować z aplikacji, aby zabezpieczyć moje dane
- Kryteria akceptacji:
  - Przycisk wylogowania jest widoczny w interfejsie
  - Po wylogowaniu użytkownik jest przekierowany do strony logowania
  - Sesja użytkownika jest prawidłowo zakończona
  - Próba dostępu do chronionych zasobów przekierowuje do logowania

#### US-004: Resetowanie hasła

- ID: US-004
- Tytuł: Resetowanie zapomnianego hasła
- Opis: Jako użytkownik chcę zresetować zapomniane hasło, aby odzyskać dostęp do konta
- Kryteria akceptacji:
  - Link "Zapomniałem hasła" jest dostępny na stronie logowania
  - System wysyła email z linkiem do resetowania hasła
  - Link resetowania hasła wygasa po określonym czasie
  - Nowe hasło musi spełniać wymagania bezpieczeństwa
  - Po zmianie hasła użytkownik może się zalogować nowym hasłem

### 5.2 Zarządzanie specyfikacjami nart

#### US-005: Dodawanie nowej specyfikacji

- ID: US-005
- Tytuł: Dodawanie nowej specyfikacji narty
- Opis: Jako użytkownik chcę dodać nową specyfikację narty, aby móc ją analizować i porównywać
- Kryteria akceptacji:
  - Formularz zawiera wszystkie wymagane pola: nazwa, długość, tip/waist/tail, promień, waga
  - Formularz zawiera opcjonalne pole tekstowe wielowierszowe na opis specyfikacji
  - Pole opisu umożliwia wprowadzenie maksymalnie 2000 znaków
  - Wyświetlany jest licznik pozostałych znaków dla pola opisu
  - System wyświetla jednostki przy każdym polu numerycznym
  - System akceptuje zarówno kropkę jak i przecinek jako separator dziesiętny
  - Walidacja sprawdza relację tip ≥ waist ≤ tail
  - Walidacja sprawdza czy promień > 0
  - Walidacja sprawdza zakresy min/max dla wszystkich pól
  - Walidacja sprawdza maksymalną długość opisu (2000 znaków)
  - Po zapisie system automatycznie oblicza powierzchnię i wagę względną
  - Użytkownik otrzymuje potwierdzenie zapisania specyfikacji

#### US-006: Edycja istniejącej specyfikacji

- ID: US-006
- Tytuł: Edycja zapisanej specyfikacji
- Opis: Jako użytkownik chcę edytować zapisaną specyfikację, aby poprawić błędne dane lub zaktualizować opis
- Kryteria akceptacji:
  - Przycisk edycji jest dostępny przy każdej specyfikacji na liście oraz w widoku szczegółów
  - Formularz edycji wypełniony jest aktualnymi danymi, włącznie z istniejącym opisem
  - Użytkownik może edytować wszystkie pola, w tym opcjonalny opis
  - Wyświetlany jest licznik pozostałych znaków dla pola opisu
  - Obowiązują te same reguły walidacji co przy dodawaniu
  - Po zapisie system przelicza powierzchnię i wagę względną
  - Użytkownik może anulować edycję bez zapisywania zmian

#### US-007: Usuwanie specyfikacji

- ID: US-007
- Tytuł: Usuwanie specyfikacji narty
- Opis: Jako użytkownik chcę usunąć niepotrzebną specyfikację, aby utrzymać porządek w danych
- Kryteria akceptacji:
  - Przycisk usuwania jest dostępny przy każdej specyfikacji
  - System wyświetla potwierdzenie przed usunięciem
  - Po potwierdzeniu specyfikacja jest trwale usunięta wraz ze wszystkimi powiązanymi notatkami
  - Użytkownik otrzymuje komunikat o pomyślnym usunięciu
  - Nie można cofnąć operacji usunięcia

#### US-008: Przeglądanie listy specyfikacji

- ID: US-008
- Tytuł: Przeglądanie zapisanych specyfikacji
- Opis: Jako użytkownik chcę przeglądać listę moich specyfikacji, aby zarządzać danymi
- Kryteria akceptacji:
  - Lista wyświetla wszystkie zapisane specyfikacje użytkownika
  - Dla każdej specyfikacji widoczne są: nazwa, długość, szerokości, powierzchnia, waga względna
  - Przy każdej specyfikacji wyświetlany jest licznik powiązanych notatek (np. "3 notatki")
  - Jednostki są wyświetlane przy wartościach
  - Lista jest czytelna i przejrzysta
  - Dostępne są przyciski akcji: szczegóły, edycja, usuń, porównaj
  - Kliknięcie w nazwę specyfikacji lub przycisk "szczegóły" prowadzi do widoku szczegółów

### 5.3 Obliczenia parametrów

#### US-009: Obliczanie powierzchni narty

- ID: US-009
- Tytuł: Automatyczne obliczanie powierzchni narty
- Opis: Jako użytkownik chcę, aby system automatycznie obliczał powierzchnię narty na podstawie wprowadzonych wymiarów, wykorzystując dedykowany algorytm estymacji
- Kryteria akceptacji:
  - System automatycznie oblicza powierzchnię po wprowadzeniu wszystkich wymaganych wymiarów (długość, tip/waist/tail)
  - Algorytm uwzględnia krzywą narty bazując na podanych wymiarach
  - Wynik jest prezentowany w cm² z dokładnością do 1 cm²
  - Obliczenia są wykonywane przez wymienny moduł algorytmiczny
  - System obsługuje różne implementacje algorytmu (od prostej w PoC do zaawansowanej w MVP)
  - Szczegółowa specyfikacja algorytmu zostanie zdefiniowana w osobnym dokumencie technicznym

### 5.4 Porównywanie specyfikacji

#### US-010: Wybór nart do porównania

- ID: US-010
- Tytuł: Wybór modeli do porównania
- Opis: Jako użytkownik chcę wybrać do 4 modeli nart do porównania, aby podjąć decyzję zakupową
- Kryteria akceptacji:
  - Przy każdej specyfikacji dostępny jest checkbox do zaznaczenia
  - System pozwala zaznaczyć maksymalnie 4 specyfikacje
  - Po zaznaczeniu 4 specyfikacji kolejne są nieaktywne
  - Przycisk "Porównaj" aktywny gdy zaznaczone są minimum 2 specyfikacje
  - Licznik pokazuje ile specyfikacji jest zaznaczonych

#### US-011: Wyświetlanie tabeli porównawczej

- ID: US-011
- Tytuł: Przeglądanie porównania specyfikacji
- Opis: Jako użytkownik chcę zobaczyć tabelę porównawczą wybranych modeli, aby ocenić różnice
- Kryteria akceptacji:
  - Tabela wyświetla wszystkie parametry dla wybranych modeli
  - Powierzchnia i waga względna są wizualnie wyróżnione
  - Jednostki są wyświetlane przy wartościach
  - Kolumny reprezentują modele, wiersze parametry
  - Tabela jest czytelna i responsywna
  - Wybranie aktywnej kolumny powoduje pokazanie róznic procentowych i bezwzglednych poszczegolnych paramentow dla pozostałych specyfikacji w porównaniu do wybranego modelu (wybrana kolumna)

#### US-012: Sortowanie w tabeli porównawczej

- ID: US-012
- Tytuł: Sortowanie wyników porównania
- Opis: Jako użytkownik chcę sortować wyniki w tabeli, aby łatwiej analizować różnice
- Kryteria akceptacji:
  - Każdy parametr w tabeli można sortować rosnąco/malejąco
  - Ikona przy nazwie parametru wskazuje możliwość sortowania
  - Aktualne sortowanie jest wizualnie oznaczone
  - Sortowanie zachowuje integralność danych modeli

### 5.5 Import i eksport danych

#### US-013: Import specyfikacji z CSV

- ID: US-013
- Tytuł: Import danych z pliku CSV
- Opis: Jako użytkownik chcę zaimportować specyfikacje z pliku CSV, aby szybko wprowadzić wiele danych
- Kryteria akceptacji:
  - Przycisk importu jest dostępny w interfejsie
  - System akceptuje pliki w formacie CSV
  - Plik CSV może zawierać kolumnę z opisem specyfikacji (opcjonalnie)
  - System waliduje strukturę i dane w pliku, włącznie z długością opisu (max 2000 znaków)
  - Błędne rekordy są raportowane z numerem linii i opisem błędu
  - Poprawne rekordy są dodane do bazy użytkownika wraz z opisami
  - System wyświetla podsumowanie importu (ile rekordów dodano, ile odrzucono)

#### US-014: Eksport specyfikacji do CSV

- ID: US-014
- Tytuł: Eksport danych do pliku CSV
- Opis: Jako użytkownik chcę wyeksportować moje specyfikacje do CSV, aby archiwizować dane
- Kryteria akceptacji:
  - Przycisk eksportu jest dostępny w interfejsie
  - System generuje plik CSV ze wszystkimi specyfikacjami użytkownika
  - Plik zawiera nagłówki kolumn z jednostkami
  - Plik zawiera kolumnę z opisem specyfikacji (jeśli został wprowadzony)
  - Opisy w CSV są poprawnie escapowane (cudzysłowy, przecinki, nowe linie)
  - Dane są poprawnie sformatowane zgodnie ze standardem CSV
  - Plik jest automatycznie pobierany z odpowiednią nazwą (np. ski-specs-YYYY-MM-DD.csv)

### 5.6 Obsługa błędów i przypadki brzegowe

#### US-015: Obsługa błędów walidacji

- ID: US-015
- Tytuł: Wyświetlanie błędów walidacji
- Opis: Jako użytkownik chcę otrzymywać jasne komunikaty o błędach, aby móc je poprawić
- Kryteria akceptacji:
  - Błędy walidacji są wyświetlane przy odpowiednich polach
  - Komunikaty błędów są zrozumiałe i pomocne
  - Pola z błędami są wizualnie wyróżnione
  - Po poprawieniu błędu komunikat znika
  - Formularz nie może być zapisany dopóki są błędy

#### US-016: Obsługa pustej listy specyfikacji

- ID: US-016
- Tytuł: Komunikat o braku danych
- Opis: Jako nowy użytkownik chcę zobaczyć pomocny komunikat gdy nie mam żadnych specyfikacji
- Kryteria akceptacji:
  - Gdy lista jest pusta wyświetlany jest komunikat informacyjny
  - Komunikat zawiera sugestię dodania pierwszej specyfikacji
  - Dostępny jest wyraźny przycisk "Dodaj pierwszą specyfikację"
  - Komunikat znika po dodaniu pierwszej specyfikacji

#### US-017: Obsługa błędów sieciowych

- ID: US-017
- Tytuł: Komunikaty o problemach z połączeniem
- Opis: Jako użytkownik chcę być informowany o problemach z połączeniem, aby wiedzieć dlaczego operacja się nie udała
- Kryteria akceptacji:
  - Błędy sieciowe są przechwytywane i obsługiwane
  - Wyświetlany jest zrozumiały komunikat o problemie
  - Użytkownik ma możliwość ponowienia operacji
  - Dane w formularzach nie są tracone przy błędzie

### 5.7 Zarządzanie notatkami i widok szczegółów

#### US-018: Wyświetlanie widoku szczegółów specyfikacji

- ID: US-018
- Tytuł: Przeglądanie szczegółów specyfikacji narty
- Opis: Jako użytkownik chcę zobaczyć szczegółowy widok wybranej specyfikacji wraz z opisem i wszystkimi powiązanymi notatkami, aby mieć pełny obraz danego modelu nart
- Kryteria akceptacji:
  - Widok szczegółów wyświetla wszystkie parametry specyfikacji: nazwę, opis, długość, szerokości, promień, wagę, powierzchnię, wagę względną
  - Opis specyfikacji wyświetlany jest jako osobna sekcja, bezpośrednio pod nazwą lub głównymi parametrami
  - Jeśli opis nie został wprowadzony, wyświetlany jest komunikat "Brak opisu" lub pole pozostaje puste
  - Opis może być edytowany bezpośrednio w widoku szczegółów (edycja inline)
  - Jednostki są wyświetlane przy wartościach numerycznych
  - Poniżej parametrów wyświetlana jest sekcja z listą notatek
  - Jeśli brak notatek, wyświetlany jest komunikat zachęcający do dodania pierwszej notatki
  - Dostępny jest przycisk "Dodaj notatkę"
  - Dostępny jest przycisk powrotu do listy specyfikacji
  - Dostępne są przyciski edycji i usunięcia specyfikacji

#### US-019: Dodawanie notatki do specyfikacji

- ID: US-019
- Tytuł: Dodawanie nowej notatki
- Opis: Jako użytkownik chcę dodać notatkę do specyfikacji narty, aby zapisać swoje obserwacje i wrażenia z testów
- Kryteria akceptacji:
  - Przycisk "Dodaj notatkę" jest widoczny w widoku szczegółów specyfikacji
  - Formularz zawiera pole tekstowe wielowierszowe na treść notatki
  - Formularz waliduje minimalną długość (1 znak) i maksymalną długość (2000 znaków)
  - Wyświetlany jest licznik pozostałych znaków
  - System automatycznie zapisuje datę utworzenia notatki
  - Po zapisaniu notatka pojawia się na liście notatek
  - Użytkownik otrzymuje potwierdzenie dodania notatki
  - Użytkownik może anulować dodawanie bez zapisywania

#### US-020: Przeglądanie listy notatek

- ID: US-020
- Tytuł: Wyświetlanie notatek powiązanych ze specyfikacją
- Opis: Jako użytkownik chcę przeglądać listę notatek dla danej specyfikacji, aby przypomnieć sobie wcześniejsze obserwacje
- Kryteria akceptacji:
  - Notatki wyświetlane są w widoku szczegółów specyfikacji
  - Notatki są sortowane chronologicznie (najnowsze na górze)
  - Każda notatka wyświetla: treść, datę utworzenia, datę ostatniej edycji (jeśli była edytowana)
  - Format daty: DD.MM.YYYY HH:MM
  - Jeśli notatka była edytowana, wyświetlana jest informacja "Edytowano: [data]"
  - Przy każdej notatce dostępne są przyciski: edycja, usuń
  - Lista notatek jest czytelna i przejrzysta

#### US-021: Edycja notatki

- ID: US-021
- Tytuł: Edycja istniejącej notatki
- Opis: Jako użytkownik chcę edytować zapisaną notatkę, aby zaktualizować lub poprawić jej treść
- Kryteria akceptacji:
  - Przycisk edycji jest dostępny przy każdej notatce
  - Formularz edycji wypełniony jest aktualną treścią notatki
  - Obowiązują te same reguły walidacji co przy dodawaniu
  - Wyświetlany jest licznik pozostałych znaków
  - System automatycznie aktualizuje datę ostatniej edycji
  - Po zapisie notatka wyświetla zaktualizowaną treść i datę edycji
  - Użytkownik może anulować edycję bez zapisywania zmian
  - Użytkownik otrzymuje potwierdzenie zapisania zmian

#### US-022: Usuwanie notatki

- ID: US-022
- Tytuł: Usuwanie notatki
- Opis: Jako użytkownik chcę usunąć niepotrzebną notatkę, aby utrzymać porządek w dokumentacji
- Kryteria akceptacji:
  - Przycisk usuwania jest dostępny przy każdej notatce
  - System wyświetla potwierdzenie przed usunięciem z fragmentem treści notatki
  - Po potwierdzeniu notatka jest trwale usunięta
  - Użytkownik otrzymuje komunikat o pomyślnym usunięciu
  - Nie można cofnąć operacji usunięcia
  - Licznik notatek przy specyfikacji jest automatycznie aktualizowany

## 6. Metryki sukcesu

### 6.1 Kluczowe wskaźniki wydajności (KPI)

#### Konwersja z landing page

- Cel: ≥15% odwiedzających landing page dokonuje rejestracji
- Pomiar: liczba rejestracji / liczba unikalnych odwiedzin landing page
- Okres pomiaru: miesięczny
- Uwaga: Wyłączając użytkowników którzy weszli bezpośrednio na strony rejestracji lub logowania

#### Zaangażowanie użytkowników

- Cel: ≥70% użytkowników dodaje minimum 2 specyfikacje i wchodzi w ekran porównania
- Pomiar: liczba użytkowników z ≥2 specyfikacjami którzy użyli porównania / liczba wszystkich aktywnych użytkowników
- Okres pomiaru: pierwsze 30 dni od rejestracji

#### Intensywność użycia funkcji porównania

- Cel: średnio ≥3 porównane modele na sesję użytkownika
- Pomiar: suma wszystkich porównań / liczba sesji z użyciem porównania
- Okres pomiaru: miesięczny
