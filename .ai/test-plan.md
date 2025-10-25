# Plan Testów dla Projektu "Ski Surface Spec"

## 1. Wprowadzenie i Cele Testowania

### 1.1 Wprowadzenie
Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji "Ski Surface Spec". Aplikacja ta jest narzędziem przeznaczonym dla zaawansowanych narciarzy, umożliwiającym zarządzanie, analizę i porównywanie specyfikacji technicznych nart. Kluczową funkcjonalnością jest obliczanie zaawansowanych metryk, takich jak powierzchnia ślizgu i waga względna, które nie są standardowo dostarczane przez producentów. Projekt oparty jest na nowoczesnym stosie technologicznym, w tym Astro, React, TypeScript oraz Supabase jako Backend-as-a-Service.

### 1.2 Cele Testowania
Głównym celem procesu testowania jest zapewnienie najwyższej jakości, niezawodności, bezpieczeństwa i użyteczności aplikacji "Ski Surface Spec". Cele szczegółowe obejmują:
*   **Weryfikację funkcjonalną:** Potwierdzenie, że wszystkie funkcjonalności aplikacji, w tym CRUD na specyfikacjach i notatkach, działają zgodnie z założeniami.
*   **Zapewnienie poprawności danych:** Sprawdzenie, czy algorytmy obliczeniowe (powierzchnia, waga względna) działają poprawnie i dostarczają precyzyjnych wyników.
*   **Weryfikację bezpieczeństwa:** Upewnienie się, że mechanizmy uwierzytelniania i autoryzacji skutecznie chronią dane użytkowników.
*   **Ocenę wydajności:** Identyfikacja i eliminacja potencjalnych wąskich gardeł w komunikacji z backendem i renderowaniu komponentów.
*   **Zapewnienie użyteczności (UX/UI):** Sprawdzenie, czy interfejs jest intuicyjny, responsywny i dostępny dla użytkowników.
*   **Wykrywanie i raportowanie błędów:** Systematyczne identyfikowanie i dokumentowanie defektów w celu ich sprawnej naprawy.

## 2. Zakres Testów

### 2.1 Funkcjonalności objęte testami (In-Scope)
*   **Moduł Uwierzytelniania:** Rejestracja, logowanie, wylogowywanie, resetowanie hasła, aktualizacja hasła.
*   **Ochrona Ścieżek (Routing):** Ochrona stron i komponentów po stronie serwera (middleware) i klienta (`AuthGuard`).
*   **Zarządzanie Specyfikacjami Nart (CRUD):** Tworzenie, odczyt, aktualizacja i usuwanie specyfikacji nart.
*   **Logika Biznesowa:** Poprawność działania algorytmów obliczających powierzchnię i wagę względną w `SkiSpecService`.
*   **Zarządzanie Notatkami (CRUD):** Tworzenie, odczyt, aktualizacja i usuwanie notatek przypisanych do specyfikacji.
*   **Interfejs Użytkownika:** Poprawność działania, responsywność i walidacja formularzy, sortowanie, paginacja, wyszukiwanie.
*   **API Endpoints:** Weryfikacja kontraktów, obsługi błędów i zabezpieczeń dla wszystkich punktów końcowych w `/pages/api`.
*   **Obsługa Błędów:** Spójne i czytelne dla użytkownika komunikaty o błędach (walidacyjne, sieciowe, serwerowe).
*   **Dokumentacja API:** Poprawne renderowanie i działanie strony z dokumentacją API.

### 2.2 Funkcjonalności wyłączone z testów (Out-of-Scope)
*   Testowanie wewnętrznej infrastruktury Supabase (np. wydajność bazy danych PostgreSQL, działanie usług Supabase Auth). Testy skupią się na integracji aplikacji z SDK Supabase.
*   Testowanie wydajności i niezawodności zewnętrznych bibliotek (np. React, Astro, Shadcn/ui), chyba że ich implementacja w projekcie powoduje problemy.
*   Testy penetracyjne wykraczające poza standardowe weryfikacje bezpieczeństwa (np. ataki DDoS).

## 3. Typy Testów do Przeprowadzenia

W projekcie zostanie zastosowana strategia piramidy testów, aby zapewnić zrównoważone pokrycie na różnych poziomach.

*   **Testy Jednostkowe (Unit Tests):**
    *   **Cel:** Weryfikacja małych, izolowanych fragmentów kodu.
    *   **Zakres:**
        *   Funkcje pomocnicze (`/lib/utils`).
        *   Schematy walidacji Zod (walidacja regoł biznesowych) (`/types/*.types.ts`).
        *   Czyste funkcje i logika biznesowa w `SkiSpecService.ts` (np. `calculateSurfaceArea`).
        *   Pojedyncze komponenty React (`/components/ski-specs`) i hooki (`/components/hooks`) w izolacji, z mockowaniem zależności.

*   **Testy Integracyjne (Integration Tests):**
    *   **Cel:** Weryfikacja współpracy między modułami.
    *   **Zakres:**
        *   Pełne metody `SkiSpecService.ts` z zamockowanym klientem Supabase, w celu testowania logiki interakcji z bazą danych.
        *   Interakcja komponentów React z hookami (`useAuth`, `useSkiSpecMutation`).
        *   Testowanie API endpoints (`/pages/api`) z zamockowaną warstwą serwisową (`SkiSpecService`), aby zweryfikować logikę kontrolerów (walidacja, autoryzacja, przekazywanie danych).
        *   Poprawność działania middleware (`/middleware/index.ts`) w zakresie autoryzacji i wstrzykiwania zależności.

*   **Testy End-to-End (E2E Tests):**
    *   **Cel:** Symulacja kompletnych scenariuszy użytkownika w przeglądarce, weryfikująca przepływ danych przez całą aplikację.
    *   **Zakres:**
        *   Pełny cykl życia użytkownika: rejestracja, logowanie, wylogowanie.
        *   Kompletny scenariusz zarządzania specyfikacją nart: utworzenie, edycja, wyszukanie i usunięcie specyfikacji.
        *   Interakcja z elementami interfejsu: paginacja, sortowanie, filtrowanie i weryfikacja aktualizacji stanu URL.
        *   Obsługa błędów walidacyjnych w formularzach z perspektywy użytkownika.

*   **Testy Bezpieczeństwa:**
    *   **Cel:** Weryfikacja mechanizmów autentykacji i autoryzacji.
    *   **Zakres:**
        *   Testowanie ochrony ścieżek (próba dostępu do chronionych stron bez logowania).
        *   Testowanie izolacji danych użytkowników (próba odczytu/modyfikacji danych innego użytkownika przez API – testy IDOR).
        *   Sprawdzenie, czy ciasteczka sesji są poprawnie zarządzane (np. usuwane po wylogowaniu).

*   **Testy Dostępności (Accessibility Tests):**
    *   **Cel:** Zapewnienie zgodności aplikacji ze standardami WCAG.
    *   **Zakres:**
        *   Automatyczne audyty z wykorzystaniem narzędzi (np. Axe) w ramach testów E2E.
        *   Testowanie nawigacji za pomocą klawiatury.
        *   Sprawdzenie poprawności atrybutów ARIA i kontrastu kolorów.

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

Poniżej przedstawiono przykładowe, wysokopoziomowe scenariusze testowe. Szczegółowe przypadki testowe zostaną opracowane w osobnym dokumencie.

### 4.1 Moduł Uwierzytelniania i Autoryzacji
*   **TC1: Pomyślna rejestracja użytkownika:** Użytkownik podaje poprawne i unikalne dane, tworzy konto i zostaje automatycznie zalogowany oraz przekierowany na stronę ze specyfikacjami.
*   **TC2: Pomyślne logowanie i wylogowanie:** Użytkownik loguje się przy użyciu poprawnych danych, a po wylogowaniu jego sesja jest kończona i zostaje przekierowany na stronę główną.
*   **TC3: Ochrona dostępu:** Niezalogowany użytkownik, próbując wejść na `/ski-specs`, jest przekierowywany na stronę logowania. Zalogowany użytkownik, próbując wejść na `/auth/login`, jest przekierowywany na `/ski-specs`.
*   **TC4: Resetowanie hasła:** Użytkownik poprawnie przechodzi przez proces resetowania hasła, otrzymuje link, ustawia nowe hasło i może się na nie zalogować.
*   **TC5: Walidacja formularzy uwierzytelniania:** Formularze rejestracji i logowania poprawnie wyświetlają błędy walidacji (np. niepoprawny email, za słabe hasło, niezgodne hasła).

### 4.2 Zarządzanie Specyfikacjami Nart (CRUD)
*   **TC6: Pomyślne utworzenie nowej specyfikacji:** Zalogowany użytkownik wypełnia formularz poprawnymi danymi, zapisuje go, a nowa specyfikacja pojawia się na liście.
*   **TC7: Pomyślna edycja istniejącej specyfikacji:** Użytkownik edytuje dane istniejącej specyfikacji, zapisuje zmiany, a zaktualizowane dane są widoczne na karcie produktu.
*   **TC8: Pomyślne usunięcie specyfikacji:** Użytkownik usuwa specyfikację, potwierdza operację w oknie dialogowym, a specyfikacja znika z listy.
*   **TC9: Walidacja formularza specyfikacji:** Formularz poprawnie waliduje dane wejściowe (np. wartości poza zakresem, talia szersza niż dziób) i wyświetla komunikaty o błędach.
*   **TC10: Izolacja danych (test bezpieczeństwa):** Użytkownik A nie może wyświetlić, edytować ani usunąć specyfikacji należącej do użytkownika B, nawet znając jej ID. Próba takiej operacji przez API powinna zwrócić błąd 404 Not Found.

### 4.3 Interakcja z Interfejsem Użytkownika
*   **TC11: Wyszukiwanie specyfikacji:** Wpisanie frazy w polu wyszukiwania poprawnie filtruje listę specyfikacji, a parametr `search` jest dodawany do URL.
*   **TC12: Sortowanie specyfikacji:** Zmiana kryterium sortowania i kierunku poprawnie układa listę specyfikacji, a parametry `sort_by` i `sort_order` są aktualizowane w URL.
*   **TC13: Paginacja:** Przechodzenie między stronami wyników za pomocą kontrolek paginacji działa poprawnie, a parametr `page` jest aktualizowany w URL.

## 5. Środowisko Testowe
*   **Środowisko deweloperskie (lokalne):** Testy jednostkowe i integracyjne będą uruchamiane lokalnie przez deweloperów podczas pracy nad kodem. Wykorzystany zostanie dedykowany, lokalny projekt Supabase lub zamockowane SDK.
*   **Środowisko CI (Continuous Integration):** Wszystkie typy testów automatycznych będą uruchamiane w ramach pipeline'u GitHub Actions po każdym pushu do gałęzi `main` oraz przy tworzeniu Pull Requestów.
*   **Baza danych:** Do testów E2E i integracyjnych zostanie wykorzystany oddzielny projekt Supabase, aby izolować dane testowe od deweloperskich i produkcyjnych. Baza danych będzie czyszczona przed każdym cyklem testowym.
*   **Przeglądarki:** Testy E2E będą uruchamiane na najnowszych wersjach przeglądarek: Chrome, Firefox i WebKit (Safari).

## 6. Narzędzia do Testowania
*   **Framework do testów jednostkowych i integracyjnych:** **Vitest** – ze względu na natywną integrację z Vite, którego używa Astro, co zapewnia szybkość i prostotę konfiguracji.
*   **Biblioteka do testowania komponentów React:** **React Testing Library** – do testowania komponentów w sposób, w jaki używają ich użytkownicy.
*   **Framework do testów E2E:** **Playwright** – ze względu na jego niezawodność, szybkość, obsługę wielu przeglądarek i zaawansowane funkcje, takie jak auto-waits i testowanie API.
*   **Mockowanie i Asercje:** Wbudowane funkcje **Vitest** (`vi.mock`) oraz biblioteka asercji `expect`.
*   **Testy dostępności:** **axe-core** zintegrowane z testami Playwright.
*   **Zarządzanie zadaniami i błędami:** **GitHub Issues**.

## 7. Harmonogram Testów
Proces testowania będzie prowadzony w sposób ciągły, zintegrowany z cyklem rozwoju oprogramowania.
*   **Testy jednostkowe i integracyjne:** Pisane i uruchamiane przez deweloperów na bieżąco z implementacją nowych funkcji.
*   **Testy E2E:** Rozwijane równolegle z kluczowymi funkcjonalnościami. Pełny zestaw testów będzie uruchamiany automatycznie w środowisku CI.
*   **Testy regresji:** Automatyczne uruchamianie pełnego pakietu testów (jednostkowych, integracyjnych, E2E) przed każdym wdrożeniem na produkcję.
*   **Testy manualne (eksploracyjne):** Przeprowadzane przed wydaniem większych funkcjonalności w celu znalezienia błędów, które mogły zostać pominięte przez automaty.

## 8. Kryteria Akceptacji Testów
### 8.1 Kryteria Wejścia (Rozpoczęcia Testów)
*   Kod źródłowy został pomyślnie zbudowany i wdrożony na środowisku testowym.
*   Wszystkie testy jednostkowe napisane przez deweloperów przechodzą pomyślnie.
*   Dostępna jest dokumentacja dla testowanych funkcjonalności.

### 8.2 Kryteria Wyjścia (Zakończenia Testów)
*   **100%** krytycznych scenariuszy testowych E2E zakończyło się powodzeniem.
*   Pokrycie kodu testami jednostkowymi i integracyjnymi dla kluczowych modułów (np. `SkiSpecService`, logika autoryzacji) wynosi co najmniej **90%**.
*   Wszystkie zidentyfikowane błędy o priorytecie krytycznym i wysokim zostały naprawione i zweryfikowane.
*   Brak znanych regresji w stosunku do poprzedniej wersji.
*   Produkt został zaakceptowany przez Product Ownera.

## 9. Role i Odpowiedzialności w Procesie Testowania
*   **Inżynierowie Oprogramowania (Deweloperzy):**
    *   Odpowiedzialni za pisanie i utrzymanie testów jednostkowych i integracyjnych dla swojego kodu.
    *   Naprawianie błędów zgłoszonych przez zespół QA.
    *   Zapewnienie, że kod przechodzi wszystkie testy w CI przed scaleniem zmian.
*   **Inżynier QA:**
    *   Autor niniejszego planu testów.
    *   Odpowiedzialny za tworzenie, utrzymanie i uruchamianie automatycznych testów E2E i testów bezpieczeństwa.
    *   Przeprowadzanie testów manualnych (eksploracyjnych).
    *   Zarządzanie procesem zgłaszania i weryfikacji błędów.
    *   Raportowanie o stanie jakości oprogramowania.
*   **Product Owner / Project Manager:**
    *   Definiowanie priorytetów dla testowanych funkcjonalności.
    *   Podejmowanie decyzji o akceptacji lub odroczeniu naprawy błędów o niskim priorytecie.
    *   Ostateczna akceptacja produktu przed wdrożeniem.

## 10. Procedury Raportowania Błędów
Wszystkie zidentyfikowane defekty będą raportowane jako "Issues" w repozytorium projektu na GitHub.

### 10.1 Szablon Zgłoszenia Błędu
Każde zgłoszenie powinno zawierać:
*   **Tytuł:** Zwięzły i jednoznaczny opis problemu.
*   **Środowisko:** Wersja aplikacji, przeglądarka, system operacyjny.
*   **Kroki do odtworzenia:** Szczegółowa, ponumerowana lista kroków prowadzących do wystąpienia błędu.
*   **Obserwowany rezultat:** Co się stało po wykonaniu kroków.
*   **Oczekiwany rezultat:** Co powinno się stać.
*   **Priorytet:** (Krytyczny, Wysoki, Średni, Niski)
*   **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.

### 10.2 Cykl Życia Błędu
1.  **Nowy (New):** Błąd został zgłoszony i oczekuje na analizę.
2.  **Otwarty (Open):** Błąd został potwierdzony i przypisany do dewelopera.
3.  **W trakcie (In Progress):** Deweloper pracuje nad naprawą.
4.  **Do weryfikacji (Ready for QA):** Błąd został naprawiony i jest gotowy do sprawdzenia.
5.  **Zamknięty (Closed):** Błąd został zweryfikowany przez QA i potwierdzono jego naprawę.
6.  **Odrzucony (Rejected):** Zgłoszenie nie jest błędem lub nie będzie naprawiane.
7.  **Ponownie otwarty (Reopened):** Weryfikacja nie powiodła się, błąd nadal występuje.