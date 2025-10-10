<conversation_summary>

<decisions>
1. W schemacie wszystkich tabel wystarczą kolumny `created_at` i `updated_at`; nie przechowujemy historii zmian.
2. Aplikacja nie będzie rejestrowała zdarzeń ani statystyk aktywności użytkowników.
3. Nazwa specyfikacji musi być unikalna w obrębie pojedynczego `user_id`; wymuszamy unikalny indeks `(user_id, name)`.
4. W MVP specyfikacje są całkowicie prywatne – brak współdzielenia między użytkownikami.
5. Import CSV tworzy duplikaty; gdy nazwa już istnieje, aplikacja dodaje sufiks `_1`, `_2`, … aby spełnić unikalność.
6. Dodajemy kolumnę `algorithm_version` (wersja semantyczna jako tekst) do tabeli ze specyfikacjami.
7. Sesje Supabase wygasają po 30 minutach nieaktywności.
8. Usuwanie specyfikacji to hard-delete; brak soft-delete.
9. Walidacja relacji tip ≥ waist ≤ tail i zakresów odbywa się wyłącznie w logice aplikacji; brak `CHECK` w bazie.
10. Jedyną rolą w systemie jest zwykły użytkownik; brak roli admin.
11. Wszystkie wartości przechowujemy w jednostkach bazowych: długości i szerokości w mm, wagę w g.
12. Pola wymagające ułamków (promień, powierzchnia, waga względna) mają typ `NUMERIC(10,2)`.
13. Polityki RLS: użytkownik widzi oraz modyfikuje tylko wiersze z `user_id = auth.uid()`.
14. Brak dodatkowych indeksów oraz wyszukiwania pełnotekstowego w MVP.
15. Import dużych plików CSV nie musi być transakcyjny „wszystko-albo-nic”.
16. Nie przewiduje się mechanizmu archiwizacji/usuwania kont użytkowników w MVP.
</decisions>

<matched_recommendations>
1. Dodawanie numerowanego sufiksu (`_1`, `_2`, …) przy importowanych duplikatach nazw.
2. Unikalny indeks złożony `(user_id, name)` dla tabeli specyfikacji.
3. Użycie jednostek bazowych (mm / g) i konwersji wyłącznie w warstwie prezentacji.
4. Typ `NUMERIC(10,2)` dla wartości z miejscami po przecinku.
5. Polityka RLS ograniczająca dostęp do własnych rekordów (`user_id = auth.uid()`).
6. Hard-delete zamiast soft-delete.
</matched_recommendations>

<database_planning_summary>
Główne wymagania:
• Tabela `ski_specs` musi przechowywać: `id (PK)`, `user_id (FK)`, `name`, `length`, `tip`, `waist`, `tail`, `radius NUMERIC(10,2)`, `weight`, `surface_area NUMERIC(10,2)`, `relative_weight NUMERIC(10,2)`, `algorithm_version`, `created_at`, `updated_at`.  
• Unikalny indeks `(user_id, name)` zabezpiecza nazwy w obrębie konta.  
• Jednostki bazowe: długości/szerokości w mm, waga w g; powierzchnia i waga względna liczone w aplikacji, zapisywane w bazie.  
• Relacja `user_id` → tabela Supabase `auth.users` (1:N). Innych encji ani relacji (historia, algorytmy, logi) nie tworzymy w MVP.

Bezpieczeństwo:
• Polityki RLS na `ski_specs`: `SELECT`, `INSERT`, `UPDATE`, `DELETE` dozwolone wyłącznie gdy `user_id = auth.uid()`.  
• Brak roli admin w MVP.

Skalowalność i wydajność:
• Brak dodatkowych indeksów – przy małej liczbie rekordów domyślne indeksy wystarczą.  
• Import CSV przebiega partiami; aplikacja zajmuje się walidacją i dodawaniem sufiksów.

Nierozwiązane kwestie krytyczne nie występują; schemat jest wystarczający do implementacji MVP.
</database_planning_summary>

<unresolved_issues>
Brak – wszystkie kwestie projektowe zostały rozstrzygnięte na etapie tej rozmowy.
</unresolved_issues>

</conversation_summary>