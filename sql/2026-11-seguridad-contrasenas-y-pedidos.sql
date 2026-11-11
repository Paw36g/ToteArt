-- =============================================================================
-- ToteArt · Seguridad de contraseñas + guardado de detalle de pedidos y pagos
-- -----------------------------------------------------------------------------
-- DÓNDE: Supabase > tu proyecto ToteArt > SQL Editor > New query > pegar todo > Run
-- CUÁNDO: DESPUÉS de que la versión nueva de la web esté publicada en Vercel
--         (el login nuevo usa fn_login_seguro y sabe usar la función vieja
--         mientras esta no exista; al revés NO funciona).
-- Es seguro ejecutarlo más de una vez. Todo va en una transacción: si algo
-- falla, no se cambia nada.
--
-- Qué hace:
--   1. Cifra con bcrypt las contraseñas guardadas hoy en texto plano.
--   2. Cifra automáticamente toda contraseña nueva o cambiada (trigger).
--   3. Crea fn_login_seguro(p_email, p_password) para validar el login.
--   4. Oculta la columna password_hash a los visitantes (clave pública).
--   5. Permite insertar en detalle_pedidos y pagos (hoy RLS lo bloquea,
--      por eso esas tablas están vacías).
-- =============================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_tabla      text;     -- nombre real de la tabla de usuarios
  v_tipo_id    text;     -- tipo de dato de id_usuario
  v_tiene_act  boolean;  -- ¿existe la columna activo?
  v_columnas   text;     -- columnas visibles (todas menos password_hash)
  v_rel        record;
  v_n          int;
begin
  -- ---------------------------------------------------------------------------
  -- 0. Localizar la tabla de usuarios (usuarios o "USUARIOS")
  -- ---------------------------------------------------------------------------
  select count(*) into v_n
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and lower(c.relname) = 'usuarios' and c.relkind in ('r', 'p');

  if v_n = 0 then
    raise exception 'ToteArt: no se encontró la tabla de usuarios. No se cambió nada.';
  elsif v_n > 1 then
    raise exception 'ToteArt: existen dos tablas distintas (usuarios y "USUARIOS"). No se cambió nada; comparte este mensaje para ajustar el script.';
  end if;

  select c.relname into v_tabla
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and lower(c.relname) = 'usuarios' and c.relkind in ('r', 'p');

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = v_tabla and column_name = 'password_hash') then
    raise exception 'ToteArt: la tabla % no tiene la columna password_hash. No se cambió nada.', v_tabla;
  end if;

  select format_type(a.atttypid, a.atttypmod) into v_tipo_id
  from pg_attribute a
  where a.attrelid = format('public.%I', v_tabla)::regclass and a.attname = 'id_usuario' and not a.attisdropped;

  if v_tipo_id is null then
    raise exception 'ToteArt: la tabla % no tiene la columna id_usuario. No se cambió nada.', v_tabla;
  end if;

  v_tiene_act := exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = v_tabla and column_name = 'activo');

  raise notice 'ToteArt: tabla de usuarios = %, id_usuario = %', v_tabla, v_tipo_id;

  -- ---------------------------------------------------------------------------
  -- 1. Cifrar las contraseñas existentes (las que aún no son bcrypt)
  -- ---------------------------------------------------------------------------
  execute format(
    'update public.%I set password_hash = extensions.crypt(password_hash, extensions.gen_salt(''bf'', 10))
       where password_hash is not null and password_hash !~ ''^\$2[abxy]\$''', v_tabla);
  get diagnostics v_n = row_count;
  raise notice 'ToteArt: % contraseña(s) cifradas con bcrypt', v_n;

  -- ---------------------------------------------------------------------------
  -- 2. Trigger: toda contraseña que llegue en texto plano se cifra al guardarse
  -- ---------------------------------------------------------------------------
  execute $f$
    create or replace function public.tg_toteart_hash_password()
    returns trigger
    language plpgsql
    security definer
    set search_path = public, extensions
    as $body$
    begin
      if new.password_hash is not null and new.password_hash !~ '^\$2[abxy]\$' then
        new.password_hash := extensions.crypt(new.password_hash, extensions.gen_salt('bf', 10));
      end if;
      return new;
    end
    $body$;
  $f$;

  execute format('drop trigger if exists trg_toteart_hash_password on public.%I', v_tabla);
  execute format(
    'create trigger trg_toteart_hash_password before insert or update of password_hash on public.%I
       for each row execute function public.tg_toteart_hash_password()', v_tabla);

  -- ---------------------------------------------------------------------------
  -- 3. Función de login segura. Devuelve: valido, id_usuario, email
  --    Acepta contraseñas guardadas antes en texto plano o como SHA-256
  --    (ambas quedan ya cifradas con bcrypt por el paso 1).
  -- ---------------------------------------------------------------------------
  execute 'drop function if exists public.fn_login_seguro(text, text)';
  execute format($f$
    create function public.fn_login_seguro(p_email text, p_password text)
    returns table (valido boolean, id_usuario %1$s, email text)
    language plpgsql
    security definer
    set search_path = public, extensions
    as $body$
    declare
      r record;
    begin
      select u.id_usuario as uid, u.email::text as mail, u.password_hash::text as pw %2$s
        into r
        from public.%3$I u
       where lower(u.email) = lower(trim(p_email))
       limit 1;

      if not found then
        return query select false, null::%1$s, null::text;
        return;
      end if;

      if r.pw is null or r.pw !~ '^\$2[abxy]\$' or coalesce(p_password, '') = '' %4$s then
        return query select false, null::%1$s, null::text;
        return;
      end if;

      if r.pw = extensions.crypt(p_password, r.pw)
         or r.pw = extensions.crypt(encode(extensions.digest(p_password, 'sha256'), 'hex'), r.pw) then
        return query select true, r.uid, r.mail;
      else
        return query select false, null::%1$s, null::text;
      end if;
    end
    $body$;
  $f$,
    v_tipo_id,
    case when v_tiene_act then ', u.activo as act' else '' end,
    v_tabla,
    case when v_tiene_act then 'or r.act is false' else '' end
  );

  execute 'revoke all on function public.fn_login_seguro(text, text) from public';
  execute 'grant execute on function public.fn_login_seguro(text, text) to anon, authenticated';

  -- ---------------------------------------------------------------------------
  -- 4. Ocultar password_hash a los visitantes: pueden leer el resto de
  --    columnas (el registro necesita id_usuario y email), pero no la contraseña.
  --    Se aplica a la tabla y a una posible vista con el otro nombre.
  -- ---------------------------------------------------------------------------
  for v_rel in
    select c.relname, c.oid
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and lower(c.relname) = 'usuarios' and c.relkind in ('r', 'p', 'v')
  loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_columnas
    from pg_attribute a
    where a.attrelid = v_rel.oid and a.attnum > 0 and not a.attisdropped and a.attname <> 'password_hash';

    execute format('revoke select on public.%I from anon, authenticated', v_rel.relname);
    execute format('grant select (%s) on public.%I to anon, authenticated', v_columnas, v_rel.relname);
    raise notice 'ToteArt: password_hash oculto en %', v_rel.relname;
  end loop;

  -- ---------------------------------------------------------------------------
  -- 5. detalle_pedidos y pagos: permitir guardar al finalizar la compra
  -- ---------------------------------------------------------------------------
  for v_rel in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and lower(c.relname) in ('detalle_pedidos', 'pagos') and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', v_rel.relname);
    execute format('grant insert on public.%I to anon, authenticated', v_rel.relname);
    execute format('drop policy if exists toteart_insercion on public.%I', v_rel.relname);
    execute format('create policy toteart_insercion on public.%I for insert to anon, authenticated with check (true)', v_rel.relname);

    -- Mis Pedidos y la verificación de reseñas leen el detalle (los pagos no se leen)
    if lower(v_rel.relname) = 'detalle_pedidos' then
      execute format('grant select on public.%I to anon, authenticated', v_rel.relname);
      execute format('drop policy if exists toteart_lectura on public.%I', v_rel.relname);
      execute format('create policy toteart_lectura on public.%I for select to anon, authenticated using (true)', v_rel.relname);
    end if;
    raise notice 'ToteArt: inserción habilitada en %', v_rel.relname;
  end loop;
end $$;

commit;

-- -----------------------------------------------------------------------------
-- Comprobación (opcional, no muestra contraseñas): cuántas quedaron cifradas
-- select count(*) filter (where password_hash ~ '^\$2[abxy]\$') as cifradas,
--        count(*) as total
--   from public.usuarios;
-- -----------------------------------------------------------------------------
