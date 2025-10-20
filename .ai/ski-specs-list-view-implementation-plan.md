# Plan implementacji widoku Lista specyfikacji nart

## 1. Przegląd

Widok służy do przeglądania, filtrowania i zarządzania zapisanymi specyfikacjami nart użytkownika oraz wyboru modeli do porównania. Zawiera toolbar z wyszukiwaniem, sortowaniem i paginacją zsynchronizowaną z URL, listę/tabelę specyfikacji z kluczowymi parametrami i akcjami (szczegóły, edycja, usuń, porównaj), a także obsługuje akcje importu/eksportu oraz modale Create/Edit i Import. Widok jest zgodny z PRD, US-008 i `swagger.yaml`.

## 2. Routing widoku

- Ścieżka: `/ski-specs`
- Na tym etapie autentykacja jest pomijana, bedzie dodana pozniej
- Zależne ścieżki: `/ski-specs/:id` (szczegóły), `/compare?ids=…` (porównanie).

## 3. Struktura komponentów

- `src/pages/ski-specs.astro` (strona):
  - React island: `SkiSpecsList` (kontener widoku)
    - `SkiSpecsToolbar`
    - `SkiSpecsGrid` (zawiera `SkiSpecsEmptyState` oraz `SkiSpecsPagination`)
    - `CreateEditSkiSpecModal` (URL: `?modal=create|edit&id=`)
    - `ImportSkiSpecsModal`
    - `ConfirmDeleteDialog`
    - `Toaster` (obsługa powiadomień)

## 4. Szczegóły komponentów

### SkiSpecsList (React)

- Opis: Kontener koordynujący stan zapytań (page/limit/sort/search), pobieranie danych, zaznaczenia do porównania oraz sterowanie modalami poprzez URL.
- Główne elementy: wrapper, provider toasts, toolbar, tabela, modale.
- Obsługiwane interakcje: zmiana filtrów i sortowania (aktualizacja URL), paginacja, zaznaczanie do porównania, akcje CRUD (otwieranie modalów), import/eksport, odświeżenie listy.
- Walidacja: ograniczenia zapytań (page≥1, limit 1..100, sort_by enum, sort_order enum). Przy błędach 400 reset do wartości domyślnych + toast.
- Typy: `ListSkiSpecsQuery`, `SkiSpecListResponse`, `SkiSpecDTO`, `PaginationMeta` oraz ViewModel-e (sekcja 5).
- Propsy: `{ initialQueryFromUrl: ListSkiSpecsQuery }` (opcjonalnie), w praktyce stan synchronizowany z `window.location`.

### SkiSpecsToolbar

- Opis: Pasek narzędzi z wyszukiwaniem (debounce 300 ms), sortowaniem (`sort_by`, `sort_order`), paginacją (`limit`) i przyciskami: „Dodaj”, „Import”, „Eksport CSV”, „Porównaj (2–4)”.
- Główne elementy: `Input` (search), `Select` (sort_by, limit), `Toggle`/`Button` (sort_order), `Button` (Add, Import, Export, Compare).
- Interakcje: onChange search (debounce), wybór sortowania i limitu (natychmiast aktualizuje URL i przeładowuje listę), eksport (pobranie pliku i blokada przycisku), porównaj (nawigacja do `/compare?ids=`), dodaj/import (otwarcie modalów), edycja (również przez URL poza toolbar).
- Walidacja: ograniczenie sort_by do wartości z API; limit do 1..100; zablokowanie „Porównaj” gdy liczba zaznaczonych <2 lub >4.
- Typy: `ToolbarViewModel`, `SelectionState`, `ListSkiSpecsQuery`.
- Propsy: `{ query, onQueryChange, selection, onOpenCreate, onOpenImport, onExport, onCompare }`.

### SkiSpecsGrid

- Opis: Lista responsywna w formie kart na gridzie. Wyświetla: `name`, `length (cm)`, `tip/waist/tail (mm)`, `radius (m)`, `weight (g)`, `surface_area (cm²)`, `relative_weight (g/cm²)`, `notes_count` oraz akcje (szczegóły, edycja, usuń) i checkbox wyboru do porównania.
- Główne elementy: `Table`, `TableRow`, `Checkbox`, przyciski akcji (shadcn/ui `Button`, `DropdownMenu`), link do szczegółów (klik na nazwę lub „Szczegóły”).
- Interakcje: zaznaczanie (maks. 4, nadmiar blokowany), klik na nazwę/„Szczegóły” -> `/ski-specs/:id`, „Edytuj” -> modal edit przez URL, „Usuń” -> confirm dialog -> DELETE.
- Walidacja: wymuszanie limitu wyboru do porównania (checkbox disabled >4), poprawne formatowanie jednostek i liczb.
- Typy: `SkiSpecListItemVM[]`.
- Propsy: `{ items, selection, onSelectionChange, onEdit, onDelete, onDetails }`.

### SkiSpecsPagination

- Opis: Nawigacja po stronach, zsynchronizowana z URL.
- Główne elementy: `Pagination` (prev/next, numery stron), informacja o wynikach.
- Interakcje: zmiana strony aktualizuje URL (`page`) i ładuje dane.
- Walidacja: page≥1 i ≤`total_pages`.
- Typy: `PaginationMeta`.
- Propsy: `{ pagination, onPageChange }`.

### SkiSpecsEmptyState

- Opis: Stan pustej listy z CTA „Dodaj pierwszą specyfikację”.
- Główne elementy: ikonografia, tekst, `Button` „Dodaj pierwszą specyfikację”.
- Interakcje: klik -> otwarcie modala Create.
- Walidacja: brak.
- Typy: brak dedykowanych.
- Propsy: `{ onCreate }`.

## 5. Typy

- Z API (istniejące):
  - `ListSkiSpecsQuery`, `SkiSpecListResponse`, `SkiSpecDTO`, `SkiSpecComparisonDTO`, `PaginationMeta`, `ApiErrorResponse`, `CreateSkiSpecCommand`, `UpdateSkiSpecCommand`, `ImportResponse` (+ składowe), `HealthCheckResponse`.
- Nowe ViewModel-e (frontend):
  - `SkiSpecListItemVM` – uproszczony model do renderowania w tabeli, z wartościami sformatowanymi do UI:
    ```ts
    type SkiSpecListItemVM = {
      id: string;
      name: string;
      description: string | null;
      lengthCm: string; // np. "181 cm"
      widthsMm: string; // np. "142 / 107 / 123 mm"
      radiusM: string; // np. "18 m"
      weightG: string; // np. "1580 g"
      surfaceAreaCm2: string; // np. "2340,50 cm²" (lokalizacja)
      relativeWeight: string; // np. "0,675 g/cm²"
      notesCount: number;
      raw: SkiSpecDTO; // oryginalny rekord (do akcji)
    };
    ```
  - `ToolbarViewModel` – stan toolbaru synchronizowany z URL:
    ```ts
    type ToolbarViewModel = {
      search?: string;
      sort_by: "name" | "length" | "surface_area" | "relative_weight" | "created_at";
      sort_order: "asc" | "desc";
      limit: number; // 1..100
    };
    ```
  - `SelectionState` – zaznaczenia do porównania (maks. 4):
    ```ts
    type SelectionState = {
      selectedIds: string[]; // długość 0..4
    };
    ```

## 6. Zarządzanie stanem

- Źródło prawdy dla listy: query params w URL (`page`, `limit`, `sort_by`, `sort_order`, `search`).
- Stan lokalny (React state): selekcja do porównania, flagi ładowania (eksport/import), otwarcie modalów (też lustrzane w URL), dirty state formularza w modalach.
- Custom hooki:
  - `useUrlQueryState<T>()`: synchronizacja stanu z `URLSearchParams` (push/replaceState) + walidacja wejścia wg `ListSkiSpecsQuerySchema`.
  - `useDebouncedValue<T>(value, 300)` dla search.
  - `useSkiSpecsList(query)`: pobranie danych z `GET /api/ski-specs` + anulowanie żądań przy zmianie query, obsługa 401.
  - `useSelection(max = 4)`: dodawanie/usuwanie ID, blokada >4.
  - `useDownload(url, options)`: pobieranie pliku (obsługa `Content-Disposition` -> nazwa pliku, blokada przycisku, revoke URL po zakończeniu).

## 7. Integracja API

- Lista: `GET /api/ski-specs?page&limit&sort_by&sort_order&search`
  - Request: `ListSkiSpecsQuery`
  - Response: `SkiSpecListResponse`
  - Błędy: 400 (złe query) -> przywracamy domyślne + toast; 401 -> redirect guard; 500 -> stan błędu.

## 8. Interakcje użytkownika

- Zmiana wyszukiwania: debounce 300 ms -> aktualizacja `search` w URL -> refetch.
- Zmiana sortowania/limitu: natychmiastowa aktualizacja URL -> refetch; reset `page` do 1.
- Paginacja: klik strony -> `page` w URL -> refetch.
- Zaznaczanie do porównania: maks. 4; UI blokuje nadmiar; licznik w toolbarze; „Porównaj” -> `/compare?ids=<lista>`.
- Klik w nazwę/specyfikację: nawigacja do `/ski-specs/:id`.
- Edycja: otwarcie modala `?modal=edit&id=<uuid>`.
- Usunięcie: confirm -> `DELETE` -> odświeżenie listy + toast.
- Import: wybór pliku -> `POST` -> pokazanie summary -> zamknięcie -> odświeżenie listy.
- Eksport: `GET` -> pobranie pliku; przycisk z blokadą na czas pobierania.

## 9. Warunki i walidacja

- Query params: enforce (UI): `page>=1`, `limit in [1..100]`, `sort_by in {name,length,surface_area,relative_weight,created_at}`, `sort_order in {asc,desc}`.
- Selekcja do porównania: 2–4 ID przy aktywacji przycisku; checkbox disabled jeśli już 4 wybrane.
- Prezentacja jednostek: zawsze z jednostką; liczby ułamkowe (powierzchnia, waga względna) formatowane wg lokalizacji (akceptujemy przecinek/kropkę na wejściach formularzy; lista tylko wyświetla).
- Modale formularzy (poza zakresem US-008, ale w widoku obecne): walidacje zgodne z Zod i PRD (tip/waist/tail, zakresy min/max, opis ≤2000 znaków, radius 1..30 itd.).

## 10. Obsługa błędów

- 400 (lista): nieprawidłowe query -> reset do domyślnych, toast „Nieprawidłowe parametry – przywrócono domyślne”.
- 401: przechwytywane globalnie -> redirect do `/login` z `redirectTo`.
- 404 (DELETE/PUT/GET/:id): toast z informacją i odświeżenie listy.
- 409 (POST/PUT): prezentacja błędu przy polu `name` w modalu.
- 413/415 (import): komunikaty w modalu + możliwość ponowienia.
- 5xx: stan błędu listy (komunikat + przycisk „Spróbuj ponownie”), brak wycieku szczegółów.

## 11. Kroki implementacji

1. Routing i strona
   - Utwórz `src/pages/ski-specs.astro` z layoutem i wyspą `SkiSpecsList`.
   - Zadbaj o brak SSR danych listy (klientowe pobieranie po URL params), lub (opcjonalnie) SSR initial props z `Astro.url.searchParams`.
2. Struktura komponentów i katalog
   - `src/components/ski-specs/`:
     - `SkiSpecsList.tsx`, `SkiSpecsToolbar.tsx`, `SkiSpecsGrid.tsx`, `SkiSpecsPagination.tsx`, `SkiSpecsEmptyState.tsx`, `CreateEditSkiSpecModal.tsx`, `ImportSkiSpecsModal.tsx`, `ConfirmDeleteDialog.tsx`.
3. Hooki i narzędzia
   - `src/lib/hooks/`:
     - `useUrlQueryState.ts`, `useDebouncedValue.ts`, `useSkiSpecsList.ts`, `useSelection.ts`, `useDownload.ts`.
   - `src/lib/format.ts`: formatery jednostek/liczb (cm, mm, m, g, cm², g/cm², liczby z lokalizacją).
4. Toolbar
   - Implementuj kontrolki i synchronizację z URL (push/replaceState). Debounce search, reset page=1 przy zmianach.
5. Tabela i selekcja
   - Renderuj wiersze z checkboxami; egzekwuj limit 4; klik w nazwę -> `/ski-specs/:id`.
6. Paginacja
   - Implementuj `SkiSpecsPagination` zgodnie z `PaginationMeta`.
7. Pobieranie i stany
   - `useSkiSpecsList(query)` z anulowaniem żądań, stanami loading/empty/error, retry.
8. Akcje eksport/import
   - `useDownload` dla eksportu; modal importu z podsumowaniem i odświeżeniem listy po zamknięciu.
9. Modale Create/Edit i Delete
   - Sterowanie przez URL; formularz RHF+Zod; mapowanie błędów 400/422/409; confirm delete i odświeżenie listy.
10. A11y i UX

- Role ARIA dla toolbaru, focus trap w modalach, nawigacja klawiaturą, kontrast; toasty dla akcji.

11. Testy ręczne i weryfikacja AC (US-008)

- Sprawdź: kompletność pól, jednostki przy wartościach, liczbę notatek, akcje oraz nawigację do szczegółów.
