-- ============================================================================
-- ToteArt - Esquema de base de datos para Supabase
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================================

-- 1. PRODUCTOS -----------------------------------------------------------------
create table if not exists productos (
  id_producto  text primary key,
  nombre       text not null,
  categoria    text not null,
  precio       numeric(10,2) not null,
  stock        integer not null default 0 check (stock >= 0),
  imagen       text
);

-- 2. PEDIDOS -------------------------------------------------------------------
create table if not exists pedidos (
  codigo_orden       text primary key,
  id_cliente         text not null,
  fecha_pedido       timestamptz not null default now(),
  estado             text not null default 'PAGADO'
                     check (estado in ('PAGADO','BORDADO_TALLER','EN_TRANSITO','ENTREGADO')),
  guia_servientrega  text,
  metodo_entrega     text,
  direccion_entrega  text,
  subtotal           numeric(10,2),
  costo_envio        numeric(10,2),
  total              numeric(10,2)
);
create index if not exists idx_pedidos_cliente on pedidos (id_cliente, fecha_pedido desc);

-- 3. DETALLE DE PEDIDOS --------------------------------------------------------
create table if not exists detalle_pedidos (
  id_detalle       bigint generated always as identity primary key,
  codigo_orden     text not null references pedidos(codigo_orden) on delete cascade,
  id_producto      text not null references productos(id_producto),
  nombre_producto  text,
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null,
  subtotal         numeric(10,2) not null
);

-- 3b. RESEÑAS DE PRODUCTOS -----------------------------------------------------
create table if not exists resenas (
  id_resena       bigint generated always as identity primary key,
  id_producto     text not null references productos(id_producto) on delete cascade,
  id_cliente      text not null,
  nombre_cliente  text,
  calificacion    integer not null check (calificacion between 1 and 5),
  comentario      text not null,
  fecha_resena    timestamptz not null default now()
);
create index if not exists idx_resenas_producto on resenas (id_producto, fecha_resena desc);

-- 4. DESCUENTO ATÓMICO DE STOCK ------------------------------------------------
-- UPDATE productos SET stock = stock - cantidad WHERE id_producto = id;
create or replace function descontar_stock(p_id_producto text, p_cantidad integer)
returns integer
language plpgsql
security definer
as $$
declare
  nuevo_stock integer;
begin
  update productos
     set stock = stock - p_cantidad
   where id_producto = p_id_producto
     and stock >= p_cantidad
  returning stock into nuevo_stock;

  if nuevo_stock is null then
    raise exception 'Stock insuficiente para %', p_id_producto;
  end if;
  return nuevo_stock;
end;
$$;

-- 5. POLÍTICAS (RLS) -----------------------------------------------------------
-- Ajusta según tu modelo de autenticación. Estas políticas permiten operar con la anon key.
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table detalle_pedidos enable row level security;
alter table resenas enable row level security;

create policy "productos_lectura" on productos for select using (true);
create policy "pedidos_lectura" on pedidos for select using (true);
create policy "pedidos_insercion" on pedidos for insert with check (true);
create policy "pedidos_actualizacion" on pedidos for update using (true);
create policy "detalle_lectura" on detalle_pedidos for select using (true);
create policy "detalle_insercion" on detalle_pedidos for insert with check (true);
create policy "resenas_lectura" on resenas for select using (true);
create policy "resenas_insercion" on resenas for insert with check (true);

-- 6. DATOS INICIALES (36 productos) --------------------------------------------
insert into productos (id_producto, nombre, categoria, precio, stock, imagen) values
  ('girasol', 'Tote de girasol', 'flores', 22.00, 14, 'Tote de girasol.jpg'),
  ('arreglo-floral', 'Tote con arreglo floral', 'flores', 23.50, 18, 'Tote con arreglo floral.jpeg'),
  ('cerezo', 'Tote de flores de cerezo', 'flores', 25.00, 10, 'Tote de flores de cerezo.jpeg'),
  ('lavandas', 'Tote con lavandas', 'flores', 22.00, 20, 'Tote con lavandas.jpeg'),
  ('margaritas', 'Tote de margaritas silvestres', 'flores', 21.50, 16, 'tote margaritas.jpeg'),
  ('rosa-roja', 'Tote de rosa roja clásica', 'flores', 24.00, 12, 'tote rosa roja.jpeg'),
  ('tulipanes-rosados', 'Tote ramo de tulipanes rosados', 'flores', 23.00, 15, 'tote ramo de tulipanes rosados.jpeg'),
  ('flor-de-loto', 'Tote flor de loto en acuarela', 'flores', 25.50, 8, 'tote flor de loto en tonos acuarela.jpeg'),
  ('diente-de-leon', 'Tote diente de león al viento', 'flores', 22.50, 19, 'tote diente de león con semillas esparciéndose al viento.jpeg'),
  ('orquidea-morada', 'Tote de orquídea morada', 'flores', 26.00, 11, 'tote orquídea morada.jpeg'),
  ('peonias', 'Tote de peonías abiertas', 'flores', 24.50, 13, 'tote peonías abiertas.jpeg'),
  ('hortensias', 'Tote racimo de hortensias', 'flores', 25.00, 9, 'tote racimo de hortensias azules y lilas.jpeg'),
  ('snoopy', 'Tote de perrito al estilo Snoopy', 'animales', 26.00, 22, 'Tote de perrito al estilo Snoopy.jpeg'),
  ('colibri', 'Tote de colibrí', 'animales', 23.00, 17, 'Tote de colibrí.jpeg'),
  ('zorro', 'Tote de zorro otoñal', 'animales', 25.00, 14, 'Tote de zorro otoñal.jpeg'),
  ('gato', 'Tote de gato naranja', 'animales', 24.50, 16, 'Tote de gato naranja.jpg'),
  ('gato-negro', 'Tote de gato negro', 'animales', 24.00, 15, 'Tote gato negro.png'),
  ('abeja', 'Tote abeja polinizando flores', 'animales', 23.50, 20, 'tote abeja robusta polinizando pequeñas flores.png'),
  ('buho', 'Tote búho en rama de pino', 'animales', 25.50, 11, 'tote búho posado en una rama de pino.jpeg'),
  ('ciervo', 'Tote ciervo entre hojas otoñales', 'animales', 26.50, 10, 'tote ciervo rodeado de hojas otoñales.jpeg'),
  ('lobo', 'Tote lobo aullando a la luna', 'animales', 25.00, 12, 'tote lobo aullando a la luna.jpeg'),
  ('mariposa-monarca', 'Tote mariposa monarca', 'animales', 24.00, 18, 'tote mariposa monarca.jpeg'),
  ('panda', 'Tote oso panda comiendo bambú', 'animales', 24.50, 14, 'tote oso panda comiendo hojas de bambú.jpeg'),
  ('rana', 'Tote ranita verde sobre hongo', 'animales', 23.50, 21, 'tote pequeña rana verde sobre un hongo silvestre.jpeg'),
  ('totoro', 'Tote de Mi vecino Totoro', 'personajes', 24.00, 25, 'Tote de Mi vecino Totoro.jpeg'),
  ('chihiro', 'Tote de Carboncillos de Chihiro', 'personajes', 24.00, 19, 'Tote de Carboncillos del viaje de chihiro.jpeg'),
  ('bmo', 'Tote de BMO Hora de Aventura', 'personajes', 25.00, 15, 'Tote de BMO.jpeg'),
  ('calcifer', 'Tote de Calcifer el demonio del fuego', 'personajes', 25.50, 17, 'Tote de Calcifer.jpeg'),
  ('kirby', 'Tote de Kirby esponjoso', 'personajes', 23.50, 22, 'Tote de Kirby.jpeg'),
  ('sincara', 'Tote de Sin Cara con flores', 'personajes', 24.50, 16, 'Tote de Sin Cara.jpeg'),
  ('appa', 'Tote de Appa volador', 'personajes', 26.00, 13, 'Tote Appa de Avatar.jpeg'),
  ('cinnamoroll', 'Tote de Cinnamoroll', 'personajes', 24.00, 18, 'Tote Cinnamoroll.jpeg'),
  ('jiji', 'Tote Jiji de Kiki entregas', 'personajes', 24.50, 16, 'Tote Jiji de kiki entregas a domicilio.jpeg'),
  ('luna', 'Tote Luna guardiana de Sailor Moon', 'personajes', 25.00, 14, 'Tote Luna.jpeg'),
  ('pikachu', 'Tote de Pikachu electrizante', 'personajes', 24.50, 20, 'Tote Pikachu.jpeg'),
  ('pochita', 'Tote de Pochita demonio motosierra', 'personajes', 25.00, 16, 'Tote Pochita.jpeg')
on conflict (id_producto) do nothing;
