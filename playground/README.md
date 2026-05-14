# Playground

Интерактивные примеры всех вариантов `Dropzone` и `UploadDropzone`. Сборка ходит в опубликованный npm-пакет `react-easy-dropzone`, и эта же страница деплоится на GitHub Pages.

## Локально

```bash
cd playground
yarn install
yarn start           # http://localhost:1234
```

## Сборка для GitHub Pages

```bash
yarn build           # → playground/dist/
```

GitHub Actions автоматически собирает и публикует страницу на каждый push в `master` (см. `.github/workflows/deploy-playground.yml`).

## Auto-upload demo (ImgBB)

Секции «Auto-upload» используют [ImgBB](https://api.imgbb.com/) (бесплатный ключ, поддерживает CORS и `expiration`). Без ключа компонент рендерится корректно, но загрузка завершится понятной ошибкой с кнопкой retry.

Для локальной разработки положи `.env` в **корень репо** (не в `playground/` — Parcel ищет его в project root):

```
IMGBB_KEY=ваш_ключ_здесь
```

После изменения `.env` перезапусти `yarn start` — Parcel читает переменные один раз при старте.

В CI ключ можно прокинуть через GitHub Secrets, но для публичного demo это необязательно — пользователи видят форму без работающего реального аплоада.
