-- Uma sala, um locatário por horário.
--
-- Até aqui createBooking só fazia INSERT: o sistema aceitava alugar a mesma
-- sala para dois clientes no mesmo dia e hora. Como alugar sala é o negócio da
-- escola, isso põe duas pessoas pagantes na mesma porta.
--
-- A trava é no banco, não na tela: validar em JavaScript antes do insert não
-- resolve dois cliques simultâneos — os dois leem "livre" e os dois gravam.
-- Só uma constraint decide no momento da escrita.

create extension if not exists btree_gist;  -- permite uuid (=) junto de range (&&) no mesmo índice

-- Os horários são text ('19:00'). O cast text::time NÃO é immutable (o parser
-- aceita fuso, ex.: '19:00 EST'), e coluna gerada exige immutable — por isso o
-- horário é montado por aritmética, que é immutable de verdade. Marcar uma
-- função como immutable "na fé" resolveria o erro e envenenaria o índice.
--
-- '[)' = fim aberto: 19:00–22:00 e 22:00–23:00 são reservas coladas, não
-- conflito. Só sobrepõe de verdade quem invade o intervalo.
alter table public.room_bookings
  add column periodo tsrange generated always as (
    tsrange(
      date + make_interval(hours => split_part(start_time, ':', 1)::int,
                           mins  => split_part(start_time, ':', 2)::int),
      date + make_interval(hours => split_part(end_time, ':', 1)::int,
                           mins  => split_part(end_time, ':', 2)::int),
      '[)'
    )
  ) stored;

-- Cancelada não ocupa a sala: o horário volta a ser vendável.
alter table public.room_bookings
  add constraint room_bookings_sem_sobreposicao
  exclude using gist (room_id with =, periodo with &&)
  where (status <> 'cancelado');
