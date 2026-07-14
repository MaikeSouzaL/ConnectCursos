-- btree_gist fora do public (advisor 0014, extension_in_public).
--
-- A 0018 instalou a extensão sem dizer onde, e ela caiu no public — que é o
-- schema exposto pela API. Extensão ali dentro é superfície à toa e atrapalha o
-- search_path. O lugar da casa é `extensions`, onde o Supabase põe as demais.
--
-- Conferido no dev antes: o EXCLUDE da 0018 usa as classes de operador desta
-- extensão e continua recusando sobreposição depois da mudança — o índice
-- guarda a opclass por OID, e o OID não muda de lugar junto com o schema.
alter extension btree_gist set schema extensions;
