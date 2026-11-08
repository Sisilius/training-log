# Training Log

Мобильный дневник тренировок: GitHub Pages + Supabase (Postgres, Auth, RLS).

## Что уже есть

- Вход по email (magic link).
- Данные хранятся в Supabase, доступны с телефона и компьютера.
- Каждый пользователь видит только свои записи (Row Level Security).
- Экспорт текущего дня в CSV.
- Бесплатный тариф Supabase: 500 МБ базы, 50 000 MAU, 5 ГБ egress.

## Шаг 1. Supabase

1. Зарегистрируйся на https://supabase.com и создай новый проект.
2. Выбери регион поближе (например, Frankfurt).
3. Дождись, пока проект поднимется.
4. Открой **SQL Editor**, вставь содержимое `supabase/schema.sql` и нажми **Run**.
5. Открой **Authentication → URL Configuration**:
   - **Site URL**: `https://<username>.github.io/training-log/`
   - **Redirect URLs**: добавь
     - `https://<username>.github.io/training-log/`
     - `http://localhost:8000/` (для локальной проверки)
6. Открой **Project Settings → API** и скопируй:
   - **Project URL**
   - **anon public** key

## Шаг 2. config.js

Открой `config.js` и вставь свои значения:

```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

`anon` key публичный, его можно держать в репозитории. **service_role key не вставляй никогда.**

## Шаг 3. GitHub Pages

1. Создай **публичный** репозиторий, например `training-log`.
2. Залей туда файлы из этой папки:
   ```bash
   git init
   git add .
   git commit -m "feat: training log with supabase"
   git branch -M main
   git remote add origin https://github.com/<username>/training-log.git
   git push -u origin main
   ```
3. В репозитории: **Settings → Pages → Build and deployment**.
4. Source: **Deploy from a branch**, Branch: **main**, folder: **/ (root)**.
5. Через минуту сайт будет доступен по адресу `https://<username>.github.io/training-log/`.

Если репозиторий приватный, GitHub Pages на бесплатном аккаунте не включится — нужен Pro или публичный репозиторий.

## Шаг 4. Проверка

1. Открой сайт.
2. Введи email и нажми «Отправить ссылку».
3. Перейди по ссылке из письма.
4. Введи подходы, например `40×12`, и обнови страницу — данные должны остаться.
5. Нажми «Экспорт CSV» — скачается файл за выбранную дату.

## Локальная проверка

В папке проекта:

```bash
python -m http.server 8000
```

Открой `http://localhost:8000/`. Не открывай через `file://` — Supabase Auth и редиректы могут не работать.

## Важные ограничения

- Free-проект Supabase **пауза после 1 недели неактивности**. Данные сохраняются, проект можно разбудить в дашборде.
- Автоматических бэкапов на Free нет. Раз в месяц делай экспорт CSV или `pg_dump`.
- Встроенная отправка писем у Supabase имеет лимиты. Если письмо не приходит — проверь спам и повтори позже. Для стабильности можно подключить свой SMTP.
- Если сайт станет публичным и популярным, смотри Pro-план ($25/мес): без пауз, ежедневные бэкапы, больше лимитов.

## Если «Ошибка сохранения: TypeError: Failed to fetch»

Это сетевой сбой, а не ошибка SQL. Проверь по порядку:

1. Открыт ли сайт по адресу `https://sisilius.github.io/training-log/`, а не локальный файл `file:///...`. С `file://` Supabase-запросы блокируются CORS.
2. Открой в том же браузере `https://qgndwqxesecfzcoiocus.supabase.co/auth/v1/health` — должен вернуться JSON с `GoTrue`. Если не открывается — домен блокирует сеть/VPN/AdBlock/Private DNS.
3. Выключи VPN, AdBlock, Private Relay и попробуй мобильный интернет вместо Wi-Fi.
4. Нажми в приложении «Проверить связь» — оно покажет, доходит ли до Supabase.
5. На ПК: F12 → Network, повтори сохранение и посмотри красный запрос (статус, CORS, DNS).

Данные при сбое сохраняются локально в браузере. После восстановления связи нажми «Проверить связь» — приложение попробует отправить их снова.

## Структура

```
index.html        — интерфейс
styles.css        — стили
app.js            — логика, Supabase client, сохранение
config.js         — Project URL + anon key
supabase/schema.sql — таблица, RLS, триггер
```
