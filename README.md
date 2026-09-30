# TIDELINE

**Океан возможностей. Один точный ход.**

Полноценная браузерная морская стратегия для Narxoz Incubator 2026: классический матч, короткий Blitz, честный AI, серверный multiplayer и анализ решений.

## Overview

TIDELINE — название линии прилива: оно связывает море и сетку координат, коротко выглядит в логотипе и подходит самостоятельному digital-продукту. Основная визуальная тема Ocean сочетает глубокий navy и спокойный мятный акцент. Tactical и Arctic реально меняют оформление.

## Problem

Знакомая игра часто заканчивается на неудобной расстановке или случайных кликах. TIDELINE сокращает путь до партии, сохраняет прогресс и объясняет решения после матча.

## Target Audience

Студенты, друзья на разных устройствах и любители коротких стратегических игр. Интерфейс на русском, координаты и названия игровых режимов — привычные международные.

## Product Idea

Петля возвращения: матч → результат → персональный разбор → replay → ещё один матч. История, достижения, Elo и турниры дают долгосрочные цели. Нет искусственно наполненного рейтинга.

## Key Features

- Classic 10×10; ручная расстановка с перемещением/удалением/вращением и случайный флот.
- Easy / Normal / Hard / Expert AI без доступа к скрытым кораблям.
- Гостевая игра с localStorage и восстановлением, серверные AI-партии для аккаунтов.
- Регистрация, вход, выход, профиль; email-восстановление при подключённом email-провайдере.
- Комнаты с приглашением, readiness, серверными ходами, SSE и reconnect.
- Quick Match с реальными ожидающими игроками.
- История, точность, серии, достижения, Elo, рейтинг из PostgreSQL.
- Анализ реальных ходов и replay с таймлайном.
- Друзья, запросы, присутствие, публичные профили, недавние соперники.
- Турниры на 4 участников с настоящими полуфиналами и финалом.
- Demo PRO, Expert AI, расширенная статистика и replay, без реальных платежей.
- Три темы, клавиатурный доступ, reduced motion, опциональный тихий звук.

## Unique Feature

**Blitz Battle**: 7×7 и 5 кораблей (9 палуб). Быстрый формат для перерыва между занятиями. «~5 минут» — ориентир продолжительности, а не принудительный таймер.

## Game Rules

Classic: один четырёхпалубный, два трёхпалубных, три двухпалубных и четыре однопалубных корабля. Корабли прямые, не пересекаются и не касаются даже диагонально. После попадания ход сохраняется, после промаха переходит. Повторный выстрел запрещён. Победа — уничтожение всего флота. Окружение потопленного корабля помечается как известная вода.

## Tech Stack

Next.js App Router, React, strict TypeScript, custom CSS, Lucide, Prisma/PostgreSQL, Zod, bcryptjs, jose, SSE, Vitest и Playwright. Node ≥22.12. Минимум зависимостей: Tailwind/shadcn/Zustand не нужны для этих компонентов и состояния. Client/CLI Prisma закреплены на одной версии 6.12; версия выбрана после проверки npm audit.

## Architecture

Чистый движок в `lib/game`, серверные транзакции в `server`, API в `app/api`, UI в `components`. Приватный MatchState никогда не сериализуется целиком в серверные клиентские ответы. План: [docs/architecture.md](docs/architecture.md).

## Database

Миграции автоматически создают User, Game, GamePlayer, GameEvent, Friendship, UserAchievement, Tournament, TournamentParticipant и PasswordReset. Профиль/рейтинг/тариф — поля User; корабли/выстрелы — атомарный JSON агрегат Game. Причины и связи: [docs/database.md](docs/database.md).

## AI

Easy — случайные выстрелы; Normal — добивание соседей; Hard — шахматный поиск и направленное добивание; Expert — перечисление допустимых положений оставшихся кораблей. Это вероятностная эвристика, а не чтение флота. Trainer оценивает доступную информацию до каждого хода. [Описание AI](docs/ai.md).

## Multiplayer

HTTP-команды + SSE персональных снимков из PostgreSQL. Транзакционная блокировка предотвращает двойной ход и двойной пересчёт результата. Комната восстанавливается с той же учётной записью на другом устройстве. [Протокол и ограничения](docs/multiplayer.md).

## Security

Bcrypt, HttpOnly/SameSite/Secure session, серверные проверки участника/хода/расстановки/победы/PRO, Zod, параметризованные запросы, same-origin защита, ограничение частоты. Reset-токены одноразовые, хешированы, действуют час и отзывают предыдущие сессии. Elo и достижения считаются в транзакции. `.env` исключён из Git. Гостевой AI локальный и нерейтинговый; для защищённой игры используйте аккаунт и серверный режим.

## Local Development

```bash
npm install
cp .env.example .env
# Set PostgreSQL DATABASE_URL and random SESSION_SECRET in .env.
npm run db:migrate
npm run dev
```

Откройте **http://localhost:3000**. Гостевой AI работает без PostgreSQL. Авторизация, multiplayer и сообщество требуют базы. После `npm run build` команда `npm start` запускает подготовленный standalone-сервер; другой порт: `npm start -- --port 3002`.

Для Windows без установленной PostgreSQL: при отсутствии `.env` выполните `npm run db:local` в отдельном терминале — helper создаст локальную `.env` со случайным SESSION_SECRET и запустит БД на 54329. Затем `npm run db:migrate` и `npm run dev`. Если уже скопировали `.env.example`, сначала настройте URL на локальный helper вручную или используйте собственный PostgreSQL; helper не перезаписывает настроенный внешний URL.

Seed необязателен: задайте DEMO_EMAIL и DEMO_PASSWORD (12+ символов), затем `npm run db:seed`. Он создаёт только unplayed development account. Общих публичных credentials нет.

## Environment Variables

| Variable                   | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| DATABASE_URL               | PostgreSQL connection string, production TLS recommended     |
| SESSION_SECRET             | Random signing secret, minimum 32 characters                 |
| APP_URL                    | Public origin for recovery links                             |
| RESEND_API_KEY             | Optional provider key for password recovery                  |
| EMAIL_FROM                 | Verified sender for recovery email                           |
| DEMO_EMAIL / DEMO_PASSWORD | Optional explicit development seed credentials               |
| PLAYWRIGHT_CHANNEL         | Optional installed browser, e.g. chrome                      |
| TEST_DATABASE              | Set 1 to run real database E2E against a disposable database |

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Для полного серверного E2E нужна мигрированная тестовая PostgreSQL и запущенное приложение с её DATABASE_URL. PowerShell: `$env:TEST_DATABASE='1'; $env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e`. Эти тесты создают тестовых пользователей/матчи: используйте отдельную development БД. Без TEST_DATABASE серверные тесты явно пропускаются; это не считается проверенным multiplayer. [QA report](docs/qa.md).

## Deployment

Standalone Docker Node service + managed PostgreSQL — основной вариант для долгих SSE-соединений. Есть Dockerfile/Compose, переменные и миграции. Vercel требует учёта ограничений времени stream-функций. [Подробный deployment guide](docs/deployment.md). Публичная публикация ещё не выполнена: credentials хостинга, GitHub repo и домен не предоставлены.

## AI Tools

Codex использован для проектирования, реализации, тестирования и документации. Runtime AI opponent и trainer — собственные детерминированные алгоритмы с случайным tie-break; внешние AI API не используются.

## Libraries

Next.js/React — routing/rendering; Prisma — PostgreSQL client/migrations; Zod — validation; bcryptjs/jose — auth; Lucide — ISC icons; Vitest/Playwright — tests; Prettier/ESLint — code quality. Embedded PostgreSQL + pg используются только для Windows development helper. Manrope/Space Grotesk — Google Fonts, SIL Open Font License; интерфейс имеет системные fallback-шрифты.

## Borrowed Components

UI написан самостоятельно, готовые шаблоны и copyrighted illustrations не использованы. Tactical preview и SVG mark — собственные. Иконки: Lucide (ISC). Инструкции API сверялись с [Next.js documentation](https://nextjs.org/docs/app/api-reference/functions/cookies), [Prisma documentation](https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference), local Next.js docs. Windows helper использует бинарники [embedded-postgres](https://github.com/leinelissen/embedded-postgres).

## Known Limitations

- Исходный файл задания Narxoz не приложен; соответствие проверено по тексту пользователя.
- Нет опубликованного production URL и GitHub remote. Локальная проверка не заменяет smoke-test после реального деплоя.
- Password recovery требует настроенного Resend и verified sender; без них отображается явная ошибка. Email verification пока нет.
- SSE polling увеличивает число запросов: для масштаба нужны pub/sub, connection pooling и distributed rate limiter. Текущий лимитер действует в одном Node-процессе.
- Presence приблизительный; нет автофорфейта после disconnect, модерации, чата и автоматического планировщика турниров.
- Турниры фиксированы на 4 участников; раунды запускает организатор. Это рабочая базовая сетка.
- История загружает последние 100 матчей, рейтинг — до 50 игроков; пагинация — следующий этап.
- Гостевой localStorage доступен владельцу браузера; такие партии не участвуют в рейтинге и не мигрируются автоматически в аккаунт.
- PRO — демонстрация, не платёжный сервис. Темы доступны всем; Expert и расширенная статистика/replay служат реальными unlock-функциями.

## Product Roadmap

Pub/sub realtime, shared rate limiting, verified emails, automatic tournament scheduling, pagination, matchmaking by Elo, moderation, calibrated probability heatmap, profile cosmetics and payment sandbox after product validation.
