# Architektura UI dla Ski Surface Spec Extension

## 1. Przegląd struktury UI

Aplikacja jest zbudowana w oparciu o Astro 5 (strony `.astro`) z wyspami React 19 dla sekcji interaktywnych, Tailwind 4 oraz komponenty shadcn/ui. Wszystkie trasy są chronione globalnie przez middleware w `src/middleware/index.ts` (whitelist: `/auth/login`, `/auth/register`, `/api/health`) oraz dodatkowy klientowy guard, który przechwytuje odpowiedzi 401 i przekierowuje na `/login?redirectTo=…`. Autentykacja opiera się o Supabase (JWT Bearer) korzystające z sesji przeglądarkowej.

- **Główne strony**: `/auth/login`, `/auth/register`, `/ski-specs`, `/ski-specs/:id`, `/compare?ids=…`, `/account`.
- **Interaktywność**: formularze (RHF+Zod), tabela/siatka, sekcja notatek, modal Create/Edit, modal Import, tabela porównania.
- **Formaty i lokalizacja**: wartości numeryczne wyświetlane z jednostkami; liczby akceptują przecinek i kropkę (wewnętrzna normalizacja do kropki); daty i czasy zgodne z lokalizacją strony.
- **Dostępność (a11y)**: ARIA w formularzach (aria-invalid/aria-describedby), focus management w modalach, kontrast WCAG AA, klawiaturowa nawigacja; komponenty shadcn/ui.
- **Bezpieczeństwo**: ochrona tras, przechwytywanie 401, nieujawnianie danych przy błędach; confirm dialog dla operacji destrukcyjnych.
- **Zgodność z API**: UI wykorzystuje wyłącznie udostępnione w `swagger.yaml` endpointy, utrzymując spójność parametrów zapytań, zakresów i typów.

## 2. Lista widoków

### Widok: Landing Page (Strona Główna)

- **Ścieżka widoku**: `/` (root)
- **Dostępność**: Publiczny (bez wymaganego logowania)
- **Główny cel**: Prezentacja wartości aplikacji i konwersja odwiedzających do rejestracji.
- **Kluczowe informacje do wyświetlenia**:
  - Hero section z opisem problemu: brak publikowanych danych o powierzchni nart i wadze względnej (g/cm²).
  - Lista kluczowych korzyści aplikacji:
    - Automatyczne obliczenia powierzchni i wagi względnej na podstawie wymiarów.
    - Porównanie do 4 modeli narr jednocześnie w przejrzystej tabeli.
    - Import i eksport danych w formacie CSV dla łatwego zarządzania kolekcją.
    - Notatki do każdego modelu dla przechowywania obserwacji i wrażeń.
  - Social proof lub krótkie case study (opcjonalnie, jeśli dostępne).
- **Kluczowe komponenty widoku**:
  - **LandingPageHero**: Hero section z nagłówkiem, opisem problemu użytkownika i wyraźnym primary CTA.
  - **BenefitsList**: Sekcja prezentująca korzyści w formie kart lub listy z ikonami (responsywny grid: 1 kolumna mobile, 2-4 desktop).
  - **Primary CTA button**: Wyraźny przycisk "Zarejestruj się" / "Rozpocznij" prowadzący do `/auth/register`.
  - **Secondary CTA link**: "Masz już konto? Zaloguj się" prowadzący do `/auth/login`.
  - Prosty, przejrzysty layout skoncentrowany na jednym głównym działaniu (rejestracja).
- **UX, dostępność i bezpieczeństwo**:
  - Zalogowani użytkownicy **mogą pozostać** na landing page - nie ma automatycznego przekierowania do `/ski-specs` (użytkownik może wejść przez menu "Home").
  - Responsywny design z mobile-first approach.
  - Focus na jednym wyraźnym CTA powyżej fałdy.
  - A11y: odpowiednia struktura nagłówków (h1 dla głównego tytułu, h2 dla sekcji), alt text dla ikon/ilustracji, focus visible na wszystkich interaktywnych elementach.
  - Semantic HTML (section, article) dla lepszej nawigacji czytnikami ekranu.
- **Mapowanie US**: US-000 (Landing page dla niezalogowanych), US-001 (link do rejestracji), US-002 (link do logowania).

### Widok: Logowanie

- **Ścieżka widoku**: `/auth/login`
- **Dostępność**: Publiczny
- **Główny cel**: Uwierzytelnienie użytkownika i rozpoczęcie sesji.
- **Kluczowe informacje do wyświetlenia**: pola email/hasło, link do rejestracji, komunikaty błędów.
- **Kluczowe komponenty widoku**: Formularz logowania (React island), `Input`, `Button`, link do `/auth/register`, link do `/auth/reset-password` ("Zapomniałem hasła"), toasty.
- **UX, dostępność i bezpieczeństwo**:
  - Walidacja e‑mail/hasło po stronie klienta i mapowanie błędów auth.
  - Po sukcesie redirect do `redirectTo` lub `/ski-specs`.
  - Zalogowany użytkownik próbujący wejść na `/auth/login` jest automatycznie przekierowany do `/ski-specs`.
  - ARIA dla pól i błędów; obsługa Enter; widoczny focus.
- **Mapowanie US**: US-002 (Logowanie), US-003 (początek wylogowania po stronie konta), US-017 (błędy sieciowe).

### Widok: Rejestracja

- **Ścieżka widoku**: `/auth/register`
- **Dostępność**: Publiczny
- **Główny cel**: Założenie konta i automatyczne zalogowanie.
- **Kluczowe informacje do wyświetlenia**: pola email/hasło, polityka haseł, link do logowania.
- **Kluczowe komponenty widoku**: Formularz rejestracji (React island), `Input`, `Password` z walidacją, `Button`, toasty.
- **UX, dostępność i bezpieczeństwo**:
  - Walidacja e‑mail/hasło; jasne komunikaty błędów.
  - Po sukcesie automatyczne logowanie i redirect na `/ski-specs`.
  - Zalogowany użytkownik próbujący wejść na `/auth/register` jest automatycznie przekierowany do `/ski-specs`.
  - ARIA + focus management.
- **Mapowanie US**: US-001 (Rejestracja), US-017 (błędy sieciowe).

### Widok: Reset hasła (żądanie)

- **Ścieżka widoku**: `/auth/reset-password`
- **Dostępność**: Publiczny
- **Główny cel**: Umożliwienie użytkownikowi zażądania wysłania linku do resetowania hasła.
- **Kluczowe informacje do wyświetlenia**: pole email, komunikat o celu strony, link powrotu do logowania.
- **Kluczowe komponenty widoku**: Formularz reset hasła (React island), `Input`, `Button`, link do `/auth/login`, Alert box z komunikatem po wysłaniu.
- **UX, dostępność i bezpieczeństwo**:
  - Formularz przyjmuje tylko adres email
  - Walidacja formatu email po stronie klienta (Zod)
  - Po wysłaniu zawsze wyświetla komunikat sukcesu (security best practice): "Jeśli podany adres email jest w naszej bazie, otrzymasz link do resetowania hasła"
  - Komunikat nie ujawnia czy email istnieje w systemie
  - Wyświetlenie Alert box z instrukcją: "Sprawdź swoją skrzynkę pocztową i kliknij link w emailu"
  - Link "Powrót do logowania" → `/auth/login`
  - ARIA dla pola email i komunikatów
- **Parametry API**: Supabase Auth API (client-side)
- **Mapowanie US**: US-004 (Resetowanie hasła - etap 1), US-017 (błędy sieciowe).

### Widok: Ustawienie nowego hasła

- **Ścieżka widoku**: `/auth/update-password`
- **Dostępność**: Publiczny (dostępna przez link z emaila z tokenami)
- **Główny cel**: Umożliwienie użytkownikowi ustawienia nowego hasła po kliknięciu linku z emaila.
- **Kluczowe informacje do wyświetlenia**: pola nowego hasła i potwierdzenia, wskaźnik siły hasła, komunikaty o wymaganiach hasła.
- **Kluczowe komponenty widoku**: Formularz nowego hasła (React island), `Input` (password), `PasswordStrengthIndicator`, `Button`, toasty.
- **UX, dostępność i bezpieczeństwo**:
  - Automatyczna weryfikacja tokenów z URL (access_token, refresh_token w hash fragment) przy montowaniu komponentu
  - Jeśli token nieprawidłowy/wygasły: wyświetlenie komunikatu błędu "Link resetujący hasło wygasł lub jest nieprawidłowy" + link do `/auth/reset-password`
  - Formularz zawiera: pole nowego hasła, pole potwierdzenia hasła
  - Walidacja real-time z wymogami: min 8 znaków, wielka litera, mała litera, cyfra
  - Komponent `PasswordStrengthIndicator` wyświetla pasek postępu (0-100%) i checklist wymogów (✓/✗)
  - Walidacja zgodności hasła i potwierdzenia (Zod)
  - Aktualizacja hasła
  - Po sukcesie: przekierowanie do `/auth/login` + toast "Hasło zostało zmienione. Możesz się teraz zalogować"
  - ARIA dla pól formularza, focus management
- **Parametry URL**:
  - `access_token` (w hash fragment) - token z Supabase
  - `refresh_token` (w hash fragment) - token z Supabase
- **Parametry API**: Supabase Auth API (client-side)
- **Mapowanie US**: US-004 (Resetowanie hasła - etap 2), US-015 (walidacja), US-017 (błędy sieciowe).

### Widok: Lista specyfikacji nart

- **Ścieżka widoku**: `/ski-specs`
- **Dostępność**: Wymaga autentykacji
- **Główny cel**: Przeglądanie, filtrowanie, tworzenie/edycja/usuwanie specyfikacji oraz wybór do porównania.
- **Kluczowe informacje do wyświetlenia**: nazwa, długość, tip/waist/tail, radius, weight, surface_area, relative_weight, liczba notatek.
- **Kluczowe komponenty widoku**:
  - Header z przyciskiem CTA „Dodaj specyfikację" w prawym górnym rogu (primary button, wyróżniony wizualnie).
  - Toolbar (React island): `search` (debounce 300 ms), `sort_by`, `sort_order`, `page`, `limit` zsynchronizowane z URL; przyciski „Import", „Eksport CSV", „Porównaj".
  - Lista (kartyna gridzie) z checkboxami wyboru do porównania (max 4), akcje: szczegóły, edycja, usuń.
  - Modal Import (duży): upload CSV, podsumowanie (summary), zakładki „Zaimportowane"/„Błędy".
- **UX, dostępność i bezpieczeństwo**:
  - Empty state (US-016) z CTA „Dodaj pierwszą specyfikację".
  - Mapowanie błędów API: 400/422 → pola, 409 (konflikt nazwy) → `name`, ogólne → toast.
  - Eksport: `GET /api/ski-specs/export` z blokadą przycisku i nazwą pliku z `Content-Disposition`.
  - Import: komunikaty dla 413/415 i błędów CSV; po zamknięciu modala odświeżenie listy.
  - A11y: rola i etykiety dla toolbaru; dostęp klawiaturą do checkboxów i akcji.
- **Parametry API i URL**:
  - `GET /api/ski-specs?page&limit&sort_by&sort_order&search` (domyślnie `created_at desc`).
  - Wybór do porównania trzymany wyłącznie w URL `/compare?ids=…`.
- **Mapowanie US**: US-005 (dodawanie - przycisk CTA otwiera modal), US-006/007/008, US-013/014, US-015/016/017.

### Widok: Dodawanie nowej specyfikacji

- **Ścieżka widoku**: `/ski-specs/new` (odzwierciedlone w URL bez przeładowania strony)
- **Dostępność**: Wymaga autentykacji
- **Główny cel**: Umożliwienie użytkownikowi dodania nowej specyfikacji narty z pełnym zestawem parametrów technicznych i opcjonalnym opisem.
- **Kluczowe informacje do wprowadzenia**:
  - Nazwa (wymagane, unikalna dla użytkownika, max 255 znaków)
  - Opis (opcjonalne, wielowierszowe, max 2000 znaków)
  - Długość [cm] (wymagane, wartość całkowita, 100-250)
  - Szerokość tip [mm] (wymagane, wartość całkowita, 50-250, tip ≥ waist)
  - Szerokość waist [mm] (wymagane, wartość całkowita, 50-250, waist ≤ tip i tail)
  - Szerokość tail [mm] (wymagane, wartość całkowita, 50-250, tail ≥ waist)
  - Promień [m] (wymagane, wartość całkowita, 1-30)
  - Waga [g] (wymagane, wartość całkowita, 500-3000)
- **Kluczowe komponenty widoku**:
  - Dialog/Modal (shadcn/ui Dialog component) wyzwalany przyciskiem CTA z widoku listy.
  - Formularz (React island) z React Hook Form + Zod walidacją po stronie klienta.
  - Pola numeryczne typu integer z wyświetlanymi jednostkami (cm, mm, m, g).
  - Pole opisu (textarea) z licznikiem pozostałych znaków (2000 - current length).
  - Przyciski akcji: „Zapisz" (primary), „Anuluj" (secondary).
  - Toast notifications dla sukcesu i błędów.
  - Po zapisie: automatyczne obliczenie surface_area i relative_weight przez API.
- **UX, dostępność i bezpieczeństwo**:
  - Otwarcie modala: kliknięcie przycisku CTA w prawym górnym rogu listy → URL zmienia się na `/ski-specs/new` → modal otwiera się bez przeładowania strony (React state + history.pushState).
  - Zamknięcie modala: „Anuluj", ESC, kliknięcie poza modalem → jeśli są niezapisane zmiany: confirm dialog „Czy na pewno chcesz odrzucić zmiany?" → URL wraca do `/ski-specs`.
  - Walidacja real-time dla wszystkich pól (RHF + Zod):
    - Sprawdzenie relacji tip ≥ waist ≤ tail.
    - Sprawdzenie zakresów min/max dla wszystkich wartości numerycznych.
    - Sprawdzenie maksymalnej długości opisu (2000 znaków).
  - Mapowanie błędów API:
    - 400/422 (validation errors) → wyświetlenie błędów przy odpowiednich polach formularza (aria-invalid, aria-describedby).
    - 409 (conflict - nazwa już istnieje) → błąd przy polu `name`.
    - Ogólne błędy (500, network errors) → toast z możliwością ponowienia.
  - Po sukcesie (201):
    - Toast z komunikatem „Specyfikacja została dodana".
    - Zamknięcie modala.
    - Odświeżenie listy specyfikacji (refetch lub dodanie nowego elementu do cache).
    - URL wraca do `/ski-specs`.
  - A11y:
    - Focus trap w modalу (focus pozostaje w dialogu po otwarciu).
    - Focus management: po otwarciu focus na pierwszym polu formularza; po zamknięciu focus wraca na przycisk CTA.
    - ARIA: `role="dialog"`, `aria-labelledby` (tytuł modala), `aria-describedby` (opis formularza).
    - ARIA dla pól: `aria-invalid`, `aria-describedby` dla komunikatów błędów, `aria-required` dla wymaganych pól.
    - Klawiaturowa nawigacja: TAB, SHIFT+TAB, ESC (zamknięcie), ENTER (submit).
    - Widoczny focus indicator dla wszystkich interaktywnych elementów.
- **Mapowanie US**: US-005 (Dodawanie nowej specyfikacji), US-015 (walidacja), US-017 (błędy sieciowe).

### Widok: Edycja specyfikacji

- **Ścieżka widoku**: `/ski-specs/:id/edit` (odzwierciedlone w URL bez przeładowania strony)
- **Dostępność**: Wymaga autentykacji
- **Główny cel**: Umożliwienie użytkownikowi edycji istniejącej specyfikacji narty.
- **Kluczowe informacje do wyświetlenia**: Wszystkie pola specyfikacji wypełnione aktualnymi danymi.
- **Kluczowe komponenty widoku**:
  - Dialog/Modal (shadcn/ui Dialog component) - ten sam komponent co w widoku dodawania, ale w trybie edycji.
  - Formularz (React island) z React Hook Form + Zod walidacją, wypełniony danymi do edycji.
  - Wszystkie te same komponenty i walidacje co w widoku dodawania.
- **UX, dostępność i bezpieczeństwo**:
  - Otwarcie modala: kliknięcie „Edytuj" z listy lub ze szczegółów → URL zmienia się na `/ski-specs/:id/edit` → modal otwiera się z danymi specyfikacji.
  - Walidacja i mapowanie błędów: identyczne jak w widoku dodawania.
  - Po sukcesie (200):
    - Toast z komunikatem „Specyfikacja została zaktualizowana".
    - Zamknięcie modala.
    - Odświeżenie danych (lista lub widok szczegółów).
    - URL wraca do poprzedniego widoku (`/ski-specs` lub `/ski-specs/:id`).
  - A11y: identyczne wymagania jak w widoku dodawania.
- **Parametry API**:
  - `PUT /api/ski-specs/:id` z body typu `UpdateSkiSpecCommand` (identyczny z `CreateSkiSpecCommand`).
  - Response 200: `SkiSpecDTO` z przeliczonymi wartościami.
- **Parametry URL**:
  - `/ski-specs/:id/edit` (client-side routing).
- **Mapowanie US**: US-006 (Edycja specyfikacji), US-015 (walidacja), US-017 (błędy sieciowe).

### Widok: Szczegóły specyfikacji

- **Ścieżka widoku**: `/ski-specs/:id`
- **Dostępność**: Wymaga autentykacji
- **Główny cel**: Prezentacja pełnych danych specyfikacji oraz powiązanych notatek z możliwością ich CRUD.
- **Kluczowe informacje do wyświetlenia**: wszystkie parametry specyfikacji, opis (sekcja), liczba notatek, lista notatek.
- **Kluczowe komponenty widoku**:
  - Sekcja parametrów z jednostkami i wyróżnieniem `surface_area` i `relative_weight`.
  - Opis: wyświetlany jako osobna sekcja; edycja poprzez modal Edit specyfikacji.
  - Notatki (React island): lista (sort: najnowsze na górze), paginacja `limit=50` z „Pokaż więcej” (page++), formularz Dodaj/Edytuj, akcja Usuń z potwierdzeniem.
  - Licznik notatek aktualizowany po mutacjach (odświeżenie od strony 1 po dodaniu/edycji/usunięciu).
- **UX, dostępność i bezpieczeństwo**:
  - Błędy walidacji notatek (1–2000 znaków) mapowane do pól; toasty.
  - 404 dla brakującego `id`/specyfikacji z powrotem do listy.
  - A11y: role listy, opisy przycisków, focus po dodaniu/edycji.
- **Parametry API**:
  - `GET /api/ski-specs/{id}`; `GET /api/ski-specs/{specId}/notes?page&limit`.
  - `POST/PUT/DELETE /api/ski-specs/{specId}/notes` i `/notes/{noteId}`.
- **Mapowanie US**: US-018/019/020/021/022, US-015/017.

### Widok: Porównanie

- **Ścieżka widoku**: `/compare?ids=uuid,uuid,…` (2–4 elementy)
- **Dostępność**: Wymaga autentykacji
- **Główny cel**: Porównanie 2–4 modeli w spójnej tabeli z wyróżnieniem kluczowych metryk i możliwością wyboru kolumny bazowej.
- **Kluczowe informacje do wyświetlenia**: pełny zestaw parametrów dla kolumn (modele) i metryki różnic (procentowe i bezwzględne) względem aktywnej kolumny.
- **Kluczowe komponenty widoku**:
  - Tabela porównania (React island) z możliwością sortowania per wiersz; wybór aktywnej kolumny.
  - Wyróżnienia dla `surface_area` i `relative_weight`.
- **UX, dostępność i bezpieczeństwo**:
  - Walidacja liczby `ids` (2–4). Przy nieprawidłowych parametrach komunikat i link powrotu do listy.
  - A11y: nagłówki kolumn jako `th`, sticky header na desktopie, opisy sortowania.
- **Parametry API**: `GET /api/ski-specs/compare?ids=…`.
- **Mapowanie US**: US-010/011/012.

### Widoki systemowe i stany globalne

- **Not Found (404)**:
  - **Dostępność**: Publiczny (taka sama treść dla wszystkich użytkowników)
  - Jasny komunikat i przycisk powrotu do `/ski-specs`.
- **Unauthorized (401)**:
  - **Dostępność**: Obsługa globalna
  - Przechwytywane globalnie → redirect do `/login?redirectTo=…`.
- **Global Error**:
  - **Dostępność**: Obsługa globalna
  - Fallback na poziomie layoutu z możliwością ponowienia lub powrotu.

## 3. Mapa podróży użytkownika

0. **Pierwsze wejście na stronę (landing page)**

- Niezalogowany użytkownik wchodzi na `/` (landing page) → przegląda opis problemu i korzyści aplikacji.
- Użytkownik klika "Zarejestruj się" → redirect do `/auth/register`.
- LUB użytkownik klika "Zaloguj się" (link na landing page lub przycisk w menu) → redirect do `/auth/login`.
- Zalogowany użytkownik może wejść na `/` przez menu "Home" i pozostać na landing page (bez automatycznego przekierowania do `/ski-specs`).

1. **Wejście i autoryzacja**

- Użytkownik wchodzi na trasę chronioną → middleware przekierowuje na `/login?redirectTo=…`.
- Rejestracja na `/auth/register` → po sukcesie automatyczne logowanie → redirect do `/ski-specs`.
- Logowanie na `/auth/login` → po sukcesie redirect do `redirectTo` lub `/ski-specs`.
- Zalogowany użytkownik próbujący wejść na `/auth/login` lub `/auth/register` → automatyczny redirect do `/ski-specs`.

2. **Dodanie nowej specyfikacji**

- `/ski-specs` → kliknięcie przycisku CTA „Dodaj specyfikację" (prawy górny róg).
- URL zmienia się na `/ski-specs/new` bez przeładowania strony.
- Otwiera się Dialog/Modal z formularzem dodawania specyfikacji.
- Użytkownik wypełnia wszystkie wymagane pola numeryczne typu integer (nazwa, długość, tip, waist, tail, promień, waga) i opcjonalnie opis.
- Pole opisu z licznikiem pozostałych znaków.
- Walidacja real-time: relacja tip ≥ waist ≤ tail, zakresy min/max, max długość opisu.
- Kliknięcie „Zapisz" → POST `/api/ski-specs` → 201 → toast sukcesu „Specyfikacja została dodana".
- Zamknięcie modala → URL wraca do `/ski-specs` → odświeżenie listy (nowa specyfikacja widoczna).
- Alternatywnie: „Anuluj"/ESC/kliknięcie poza modalem → confirm dialog jeśli są niezapisane zmiany → zamknięcie → URL wraca do `/ski-specs`.

3. **Edycja i usuwanie specyfikacji**

- Z listy lub ze szczegółów → kliknięcie „Edytuj".
- URL zmienia się na `/ski-specs/:id/edit` bez przeładowania strony.
- Otwiera się Dialog/Modal z formularzem edycji, wypełnionym aktualnymi danymi specyfikacji.
- Użytkownik edytuje pola (wszystkie te same walidacje co przy dodawaniu).
- Kliknięcie „Zapisz" → PUT `/api/ski-specs/{id}` → 200 → toast sukcesu „Specyfikacja została zaktualizowana".
- Zamknięcie modala → URL wraca do poprzedniego widoku (`/ski-specs` lub `/ski-specs/:id`) → odświeżenie danych.
- Alternatywnie: „Anuluj"/ESC → confirm dialog jeśli są niezapisane zmiany → zamknięcie.
- **Usuwanie**: „Usuń" → confirm dialog → DELETE `/api/ski-specs/{id}` → 204 → toast → powrót/odświeżenie listy.

4. **Przegląd szczegółów i notatek**

- `/ski-specs/:id` → przegląd parametrów i opisu.
- Notatki: `GET /notes` (page=1, limit=50) → „Pokaż więcej” zwiększa `page++`.
- „Dodaj notatkę” → POST `/notes` → toast → odświeżenie listy od strony 1 i licznika.
- Edycja/Usuwanie notatek → PUT/DELETE `/notes/{noteId}` → odświeżenie.

5. **Porównanie modeli**

- Na liście zaznaczenie 2–4 modeli (checkbox) → „Porównaj” przenosi do `/compare?ids=…`.
- Tabela: wybór kolumny bazowej → wyróżnione różnice (procentowe i bezwzględne); sortowanie per wiersz.

6. **Import/eksport danych**

- Import: z menu lub toolbaru listy → modal → upload CSV → POST `/import` → summary (zakładki „Zaimportowane"/„Błędy") → zamknięcie → odświeżenie listy.
- Eksport: kliknięcie „Eksport CSV" → GET `/export` → pobranie pliku (nazwa z `Content-Disposition`), przycisk zablokowany w trakcie.

7. **Resetowanie hasła**

- Użytkownik na stronie `/auth/login` klika link "Zapomniałem hasła"
- Przekierowanie do `/auth/reset-password`
- Wprowadzenie emaila w formularz → kliknięcie "Wyślij link resetujący"
- Wywołanie logiki resetu hasła
- Wyświetlenie komunikatu: "Jeśli podany adres email jest w naszej bazie, otrzymasz link do resetowania hasła" (zawsze, niezależnie czy email istnieje)
- Wyświetlenie Alert box z instrukcją: "Sprawdź swoją skrzynkę pocztową i kliknij link w emailu"
- Użytkownik otrzymuje email z linkiem zawierającym tokeny (access_token, refresh_token w hash fragment)
- Kliknięcie linku → przekierowanie do `/auth/update-password` z tokenami w URL
- Automatyczna weryfikacja tokenu przy załadowaniu strony
- Jeśli token prawidłowy: wyświetlenie formularza nowego hasła
- Jeśli token nieprawidłowy/wygasły: komunikat błędu + link do `/auth/reset-password`
- Wprowadzenie nowego hasła i potwierdzenia → walidacja real-time (siła hasła, zgodność)
- Kliknięcie "Ustaw nowe hasło" → wywołanie aktualizacji hasła w systemie
- Po sukcesie: przekierowanie do `/auth/login` + toast "Hasło zostało zmienione. Możesz się teraz zalogować"

8. **Obsługa błędów i stany brzegowe**

- 400/422: mapowanie do pól formularza; 409 przy `name`; 401 → redirect do `/auth/login`.
- Sieciowe błędy → toasty i opcja ponowienia; dane formularza zachowane.
- Pusta lista → komunikat i CTA.

## 4. Układ i struktura nawigacji

- **Layout główny (Astro)**: nagłówek z logo i nawigacją, obszar treści, globalne toasty, modale montowane portalowo.

### Nawigacja górna - dynamiczna w zależności od stanu autentykacji

#### Wspólne elementy (zawsze widoczne)

- **Logo/Brand** (lewa strona) → zawsze link do `/` (landing page) dla wszystkich użytkowników (zalogowanych i niezalogowanych).

#### Stan: Użytkownik niezalogowany

- **Menu główne** (lewa strona):
  - `Home` → `/` (landing page)
- **CTA** (prawa strona):
  - Przycisk primary "Log in" → `/auth/login`
  - Przycisk secondary "Register" → `/auth/register`

#### Stan: Użytkownik zalogowany

- **Menu główne** (środek/lewa strona):
  - `Home` → `/` (landing page)
  - `Ski Specs` → `/ski-specs`
- **User menu** (prawa strona):
  - Avatar uzytkownika + email (button z dropdown)
  - Dropdown zawiera:
    - "Wyloguj" → akcja wylogowania + redirect na `/` (landing page)

### Zachowanie nawigacji przy zmianie stanu autentykacji

- Po zalogowaniu: automatyczna zmiana menu (dodanie Ski Specs, Account, zamiana CTA "Zaloguj się" na user menu) + redirect do `/ski-specs`.
- Po wylogowaniu: automatyczna zmiana menu (usunięcie Ski Specs, Account, zamiana user menu na CTA "Zaloguj się") + redirect na `/` (landing page).
- Zalogowany użytkownik może wejść na `/` (Home w menu) i **pozostać** na landing page - nie ma automatycznego przekierowania do `/ski-specs`.
- Próba wejścia na chronione trasy przez niezalogowanego → redirect do `/login?redirectTo=...`.
- Próba wejścia na `/auth/login` lub `/auth/register` przez zalogowanego → redirect do `/ski-specs`.

## 5. Kluczowe komponenty

- **NavigationBar/Header** (React):
  - Dynamiczna zawartość w zależności od stanu autentykacji (odczyt z Supabase Auth context).
  - Logo zawsze prowadzi do `/` (landing page) dla wszystkich użytkowników.
  - Menu adaptacyjne:
    - Niezalogowany: `Home`
    - Zalogowany: `Home`, `Ski Specs`
  - Prawa strona:
    - Niezalogowany: przycisk "Log in" → `/auth/login`, przycisk "Register" → `/auth/register`
    - Zalogowany: User dropdown (avatar + email) z opcja "Logout"
  - Sticky header
  - Aktywny link wyróżniony wizualnie (`aria-current="page"`).

- **UserDropdownMenu** (React):
  - Dropdown pod avatarem użytkownika (komponent z shadcn/ui).
  - Opcja "Wyloguj" → wywołanie akcji wylogowania + redirect do `/`.
- **ProtectedRoute/ClientGuard**: przechwytuje 401 i przekierowuje z `redirectTo`.
- **SkiSpecToolbar**: kontrolki `search/sort_by/sort_order/limit` zsynchronizowane z URL; debounce 300 ms dla `search`.
- **SkiSpecPagination**: kontrolka do paginacji zsynchronizowana z URL;
- **SkiSpecGrid**: responsywny grid cart z checkboxami do porównania, akcjami elementów i prezentacją jednostek.
- **SkiSpecFormDialog** (React):
  - Dialog/Modal (shadcn/ui Dialog component) dla dodawania i edycji specyfikacji.
  - Sterowany URL-em: `/ski-specs/new` (tryb create) lub `/ski-specs/:id/edit` (tryb edit).
  - Client-side routing bez przeładowania strony (React state + history.pushState).
  - Formularz z React Hook Form + Zod walidacją.
  - Komponenty formularza:
    - `Input` dla nazwy (text).
    - `Textarea` dla opisu z licznikiem znaków.
    - `NumberInput` dla pól numerycznych typu integer (length, tip, waist, tail, radius, weight) z wyświetlanymi jednostkami.
  - Walidacje RHF+Zod: relacja tip ≥ waist ≤ tail, zakresy min/max, max długość opisu.
  - Mapowanie błędów API: 400/422 → pola, 409 (konflikt nazwy) → pole `name`, ogólne → toast.
  - Confirm dialog przy zamknięciu z niezapisanymi zmianami.
  - Focus trap i focus management (powrót na CTA button po zamknięciu).
  - ARIA: `role="dialog"`, `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required`.
- **ImportModal**: upload CSV (multipart), podsumowanie (summary)
- **ExportButton**: obsługa `GET /export`, blokada w trakcie pobierania, odczyt nazwy z `Content-Disposition`.
- **CompareTable**: 2–4 kolumny, wybór kolumny bazowej, sortowanie per wiersz, wyróżnienie `surface_area` i `relative_weight`
- **NotesList**: paginacja `limit=50`, „Pokaż więcej", formularze dodawania/edycji, confirm delete, aktualizacja licznika po mutacjach.
- **NumberInput**: pola dla wartości całkowitych (integer) zgodnie z API; wyświetlanie jednostek (cm, mm, m, g); walidacje zakresów zgodnych z API.
- **DateTimeLocalized**: wyświetlanie dat/czasów w locale strony.
- **Toast/Alert/ConfirmDialog**: komunikaty sukcesu/błędu, potwierdzenia czynności destrukcyjnych.
- **ErrorBoundary**: fallback UI dla błędów nieprzechwyconych lokalnie.
- **ResetPasswordForm** (React):
  - Formularz żądania resetu hasła na `/auth/reset-password`
  - Pole email z walidacją (RHF+Zod)
  - Przycisk "Wyślij link resetujący"
  - Link "Powrót do logowania" → `/auth/login`
  - Wywołanie `supabase.auth.resetPasswordForEmail()` z redirectTo
  - Wyświetlanie Alert box z komunikatem sukcesu (zawsze, security best practice)
  - Obsługa błędów sieciowych i rate limiting (toast)
  - A11y: aria-invalid, aria-describedby dla pola email
- **UpdatePasswordForm** (React):
  - Formularz ustawienia nowego hasła na `/auth/update-password`
  - Automatyczna weryfikacja tokenu z URL (hash fragment) przy montowaniu
  - Pola: nowe hasło, potwierdzenie hasła (type="password")
  - Integracja z `PasswordStrengthIndicator` (wyświetlanie na żywo)
  - Walidacja RHF+Zod: min 8 znaków, wielka/mała litera, cyfra, zgodność pól
  - Wywołanie `supabase.auth.updateUser({ password })`
  - Obsługa wygasłego/nieprawidłowego tokenu: komunikat + link do `/auth/reset-password`
  - Po sukcesie: redirect `/auth/login` + toast
  - A11y: focus management, aria-invalid, aria-describedby
- **PasswordStrengthIndicator** (React):
  - Komponent pomocniczy do wizualizacji siły hasła w czasie rzeczywistym
  - Używany w `RegisterForm` i `UpdatePasswordForm`
  - Props: `password: string`
  - Wyświetlanie: pasek postępu (0-100%) z kolorami (czerwony/pomarańczowy/żółty/zielony)
  - Checklist wymogów z ikonami ✓/✗:
    - Minimum 8 znaków
    - Wielka litera
    - Mała litera
    - Cyfra
  - Algorytm: każdy spełniony wymóg +25% siły
  - A11y: role="progressbar", aria-valuenow, aria-label

## 6. Wymagania bezpieczeństwa i walidacji

- **Chronienie tras**: Middleware sprawdza sesję użytkownika przed dostępem do chronionych zasobów:
  - **Trasy publiczne**: `/` (landing page), `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/update-password`, `/404`
  - **Trasy chronione**: `/ski-specs`, `/ski-specs/*`, `/compare`, `/api/ski-specs/*`
  - Próba dostępu do chronionej trasy bez sesji → redirect `/auth/login?redirectTo=<ścieżka>`
  - Próba dostępu do `/auth/login` lub `/auth/register` z aktywną sesją → redirect `/ski-specs`
  - **Zalogowany użytkownik może wejść na landing page `/` bez przekierowania** - użytkownik pozostaje na stronie głównej
- **Walidacja danych**: wszystkie formularze wykorzystują React Hook Form + Zod dla walidacji po stronie klienta; błędy z API (400/422) mapowane do odpowiednich pól.
- **CSRF protection**: Supabase zarządza tokenami sesji; wszystkie zapytania modyfikujące używają JWT Bearer token.
- **Potwierdzenia destrukcyjnych operacji**: usuwanie specyfikacji lub notatek wymaga confirm dialog.
- **Nieujawnianie informacji**: błędy API nie ujawniają szczegółów implementacji; generyczne komunikaty dla użytkownika.

—

Zgodność z PRD i API:

- CRUD specyfikacji i notatek, porównanie (2–4), import/eksport CSV, walidacje i obsługa błędów odwzorowane w UI.
- Parametry zapytań i ścieżki zgodne z `swagger.yaml`; wyniki obliczeń (`surface_area`, `relative_weight`) dostarczane przez API i wyróżniane w UI.
- Wybór do porównania przechowywany tylko w URL (`ids`), zgodnie z decyzjami architektonicznymi sesji planowania.
