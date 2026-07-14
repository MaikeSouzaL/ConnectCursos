-- Saldo inicial em caixa da instituição: sem ele, o "Saldo em caixa" do fluxo
-- partiria sempre de zero e não refletiria o dinheiro que a escola já tem.
alter table public.institution
  add column opening_balance numeric(12,2) not null default 0;
