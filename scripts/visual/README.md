# Визуальные проверки (v0.51)

Скрипты для Playwright + Chromium (программный WebGL). Не входят в сборку игры.

```
npm run build && npx vite preview --port 4174 &
npm i -D playwright      # один раз, в отдельной папке или глобально
node scripts/visual/districts.mjs out/ http://localhost:4174/            # 3 кадра каждого района (FORCE=id,id… — выбрать районы)
node scripts/visual/profile.mjs http://localhost:4174/ medium            # время кадра и отрисовки по районам
node scripts/visual/audit.mjs http://localhost:4174/                     # предметы в воздухе/в объектах, спавны в стенах
node scripts/visual/effects.mjs out/ http://localhost:4174/              # кадры взрыва и фейерверка
```

Время кадра здесь — программный рендер, не реальная видеокарта; сравнивать только «до/после».
`audit.mjs` даёт ложные срабатывания для предметов внутри шкафов/урн и на полках — смотреть кадры.
