# CNC Geometry FULL

Офлайн PWA-калькулятор для CNC/фрезерных и координатных расчётов. Проект подготовлен для публикации на GitHub Pages без сборщика, Node.js и сервера.

## Что работает

- Шар → 4 грани: профиль X/Z для отрезного резца, шейка, припуск, 4 позиции C и расчёт остаточных сферических дуг
- Деление окружности / индексация оси C
- Болтовая окружность PCD → X/Y/C
- Лепестки / фигурная окружность: центры дуг, шаг C, компенсационный радиус
- Лыски
- Многоугольник (N граней)
- Пазы по окружности
- Радиальные отверстия
- Метрическая резьба: сверло под резьбу + ориентир S/F
- Дуга по двум точкам и R → центр, I/J, G2/G3
- Линейный массив X/Y
- Режимы фрезерования Vc/S/fz/F/ap
- SVG-схемы результатов
- Таблицы координат
- Копируемые данные для стойки
- Сохранение проектов в localStorage
- Локальный список инструмента
- Профиль станка/стойки
- Тёмная / светлая тема
- PNG-карточка результата
- PDF через системную печать браузера
- PWA/offline service worker

## GitHub Pages

1. Создать новый репозиторий.
2. Загрузить **содержимое этой папки в корень репозитория**.
3. GitHub → Settings → Pages.
4. Source: `Deploy from a branch`.
5. Branch: `main`, folder: `/ (root)`.
6. Сохранить и открыть выданный адрес Pages.
7. На iPhone: Safari → Поделиться → «На экран Домой».

Все пути относительные, поэтому проект работает и в репозитории вида `username.github.io/repository-name/`.

## Проверка

```bash
node tests.mjs
```

Ожидаемый результат: `OK: 15/15 calculator regression checks`.

## Важное по технологическим режимам

Расчёт S/F в приложении предназначен как стартовый ориентир. Для реальной обработки финальные режимы нужно сверять с конкретным инструментом, материалом, вылетом, жёсткостью установки, охлаждением и рекомендациями производителя инструмента.


## v1.0.4 Dock Diagnostics
Profile now includes live Dock diagnostics with controls for bottom offset, width, thickness, radius and border. Settings can be saved to localStorage.


## v1.0.6 device profile
For standalone mode on a 393×852 CSS-pixel screen at DPR 3, the app applies the calibrated iPhone 14 Pro-class UI profile: topbar 0/75/13/0/34/1 and Dock 2px/87%/68px/1px. Other devices retain generic defaults. Top diagnostics remain available in Profile.


## v1.1.0 — fixed iPhone 14 Pro production profile
The calibrated 393×852 @3x standalone profile is now locked as a device rule. Top diagnostics were removed from the production UI, prior localStorage topbar overrides are ignored on this profile, and the validated mobile result layout and iOS caret behavior are retained.


## v1.2.0 — Sphere → Cube
- Новый двухэтапный модуль: кругляк → шар отрезным резцом → 4 одинаковые грани фрезой.
- Теоретический X/Z профиль шара и безопасный черновой X с учётом ширины резца и припуска.
- Опциональная шейка для удержания детали.
- Индексация C через 90°, расчёт съёма, положения центра фрезы, длины плоской площадки и остаточной сферической дуги.
- Две отдельные таблицы результата и комбинированная схема вида X/Z + торец.
