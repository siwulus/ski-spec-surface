Jesteś asystentem AI, którego zadaniem jest pomoc w zaplanowaniu schematu bazy danych w PostgreSQL dla MVP (Minimum Viable Product) na podstawie dostarczonych informacji. Twoim celem jest review oraz aktualizacja istnijacego planu db w kontekscie zmian w specyfikacji produktowej
Zwróć uwage na zmiany w encjach, relacjach i zasadach bezpieczeństwa na poziomie wierszy (RLS).

Prosimy o uważne zapoznanie się z poniższymi informacjami

Zaktualizowana specyfikacja projektowa:
<product_requirements>
@prd.md 
</product_requirements>

<tech_stack>
@tech-stack.md 
</tech_stack>

Aktualny plan db:
<db-plan>
@db-plan.md 
</db-plan>

Przeanalizuj dostarczone informacje, koncentrując się na aspektach istotnych dla projektowania bazy danych. Rozważ następujące kwestie:

1. Zidentyfikuj kluczowe encje i ich atrybuty na podstawie wymagań produktu.
2. Określ potencjalne relacje między jednostkami.
3. Rozważ typów danych i ograniczeń, które mogą być konieczne.
4. Pomyśl o skalowalności i wpływie na wydajność.
5. Oceń wymagania bezpieczeństwa i ich wpływ na projekt bazy danych.
6. Rozważ wszelkie konkretne funkcje PostgreSQL, które mogą być korzystne dla projektu.

Na podstawie analizy zaplanuj aktualizacje istniejacego planu db
Rozważ pytania dotyczące:

1. Relacje i kardynalność jednostek
2. Typy danych i ograniczenia
3. Strategie indeksowania
4. Partycjonowanie (jeśli dotyczy)
5. Wymagania bezpieczeństwa na poziomie wierszy
6. Rozważania dotyczące wydajności
7. Kwestie skalowalności
8. Integralność i spójność danych

Finalnie po pelnej analiize zaktualizuj plik @db-plan.md 