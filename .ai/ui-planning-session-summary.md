<conversation_summary>
<decisions>

1. Zabezpieczenie tras globalnie w `src/middleware/index.ts` (dopuszczone: `/login`, `/register`, `/api/health`) + klientowy guard; przechwytywanie 401 i przekierowanie na `/login` z `redirectTo`.
2. Trasy jako strony `.astro` (`/login`, `/register`, `/ski-specs`, `/ski-specs/:id`, `/compare`, `/account`); interaktywność jako wyspy React (grid/formularze/tabela porównania/notatki, import/export).
3. Wybór modeli do porównania nie jest utrwalany w stanie; tylko w URL (query param `ids`). Widok porownania jest osobna strona z wlasnym urlem
4. Toolbar gridu specyfilacji nart: `search` (debounce 300 ms), `sort_by`, `sort_order`, `page/limit`; synchronizacja z URL i przekazywanie do `GET /api/ski-specs`; domyślnie `created_at desc`.
5. Jeden modal dla Create (POST `/api/ski-specs`) i Edit (PUT `/api/ski-specs/{id}`) sterowany URL-em (`?modal=create|edit&id=`); potwierdzenie porzucenia zmian; po sukcesie toast, zamknięcie i odświeżenie listy/rekordu.
6. Mapowanie błędów 400/422 z `ApiErrorResponse.details[{field,message}]` do `setError` (React Hook Form); konflikt 409 jako błąd globalny przy polu `name`; błędy ogólne w toastach.
7. Notatki: `limit=50`, „Pokaż więcej” przez `page++` (GET `/api/ski-specs/{specId}/notes`); po dodaniu/edycji/usunięciu odświeżenie od strony 1 i aktualizacja licznika notatek.
8. Import: duży modal z uploadem (CSV, `multipart/form-data`); po POST `/api/ski-specs/import` podsumowanie (metryki ile sie udalo ile nie) + zakładki „Zaimportowane” i „Błędy” (stronicowane);po zamknięciu odświeżenie listy.
   8a. Opcja importu jest dostepna w glownym menu
9. Eksport: przycisk „Eksport CSV” w toolbarze listy; `GET /api/ski-specs/export`, pobranie `blob` z nazwą z `Content-Disposition`; blokada przycisku w trakcie.
10. Konto: sekcja z e‑mailem, „Zmień hasło” (Supabase reset link), „Wyloguj”; bez edycji profilu; pokazać datę ostatniego logowania (jeśli dostępna); toasty po akcjach.
11. Strefa czasowa i lokalizacja dla dat - presentowac zgodnie z localami strony
    </decisions>
    <matched_recommendations>
12. Ochrona tras: middleware + klientowy guard i globalny handler 401 → zaakceptowane (Decyzja 1).
13. Architektura stron: `.astro` + wyspy React dla interaktywnych sekcji → zaakceptowane (Decyzja 2).
14. Porównanie: stan wyboru tylko w URL (`/compare?ids=…`) → zaakceptowane (Decyzja 3).
15. Lista specyfikacji: toolbar zsynchronizowany z URL (search/sort/paginacja) → zaakceptowane (Decyzja 4).
16. Edycja i tworzenie: jeden modal sterowany URL-em + confirm „unsaved changes” → zaakceptowane (Decyzja 5).
17. Walidacja i błędy: mapper 400/422/409 do pól i toastów → zaakceptowane (Decyzja 6).
18. Notatki: paginacja 50 + „Pokaż więcej” i odświeżanie po mutacjach → zaakceptowane (Decyzja 7).
19. Import: podsumowanie z metrykami, zakładki wyników (Decyzja 8).
20. Eksport: pobranie `blob` z nazwą z nagłówka i blokadą UI → zaakceptowane (Decyzja 9).
21. Dostępność i responsywność (mobile‑first, ARIA, WCAG AA, shadcn/ui + Tailwind 4) → rekomendacja pozostaje aktualna; wymaga potwierdzenia w MVP.
    </matched_recommendations>
    <ui_architecture_planning_summary>

- Główne wymagania UI:
  - Nawigacja po trasach za logowaniem: `/ski-specs` (lista), `/ski-specs/:id` (szczegóły+notatki), `/compare`, `/account`; uwierzytelnianie Supabase (email/hasło).
  - Operacje CRUD specyfikacji i notatek, porównanie 2–4 modeli, import/eksport CSV, obsługa walidacji API.
- Kluczowe widoki i przepływy:
  - Lista specyfikacji: grid/karty z kluczowymi parametrami i akcjami; toolbar (search/sort/paginacja) zsynchronizowany z URL; wybór do porównania (limit 4) i link do `/compare?ids=…`; export/import do/z csv.
  - Szczegóły specyfikacji: wszystkie parametry + opis; sekcja notatek (paginate 50, „Pokaż więcej”); akcje: dodaj/edytuj/usuń notatkę; licznik notatek.
  - Modal Create/Edit: formularz RHF+Zod; sterowanie URL-em; potwierdzenie porzucenia zmian; po sukcesie toast i odświeżenie listy/szczegółu.
  - Porównanie: tabela, sortowanie klientowe per parametr, możliwość wyboru kolumny bazowej; wyróżnienie `surface_area` i `relative_weight`.
  - Import: upload CSV → podsumowanie (total/success/failed/skipped) + zakładki „Zaimportowane”/„Błędy”; realizowane jako duzy modal na lisie specyfikacji; odśwież listę po zamknięciu.
  - Eksport: przycisk w toolbarze → pobranie CSV; obsługa `Content-Disposition`.
  - Konto: e‑mail, reset hasła (Supabase link), wylogowanie; toasty.
- Integracja z API i zarządzanie stanem:
  - Wywołania zgodnie ze `swagger.yaml`: `GET/POST/PUT/DELETE /api/ski-specs`, `GET /api/ski-specs/compare`, `GET /export`, `POST /import`, `GET/POST/PUT/DELETE /api/ski-specs/{specId}/notes`.
  - Zarządzanie stanem: czysty React dla logiki UI; formularze RHF+Zod; brak cache/buforowania na MVP; po mutacjach wywoływać odświeżenie widoków.
  - Mapowanie błędów: `ApiErrorResponse.details` → błędy pól; 409 (konflikt nazwy) → komunikat przy `name`; błędy ogólne → toast.
- Responsywność, dostępność i bezpieczeństwo:
  - Mobile‑first; na małych ekranach prezentacja list/tabel jako karty; sticky nagłówki kolumn na desktopie.
  - A11y: etykiety i opisy błędów (ARIA), focus management w modalach, kontrast WCAG AA; komponenty shadcn/ui + Tailwind 4.
  - Bezpieczeństwo: middleware chroniący trasy (poza `/login`, `/register`, `/api/health`), klientowy guard; przechwytywanie 401 → `/login?redirectTo=…`; odświeżanie sesji Supabase.
- Formatowanie danych:
  - Jednostki wyświetlane przy polach; akceptacja przecinka i kropki, wewnętrzna normalizacja do kropki.
  - Prezentacja `relative_weight` z 2 miejscami po przecinku; `radius` jako liczba (2 miejsca po przecinku)(jednostka sa metry) przekazywana do API jako integer, metry konwertowane na milimetry.
    </ui_architecture_planning_summary>
    </conversation_summary>
