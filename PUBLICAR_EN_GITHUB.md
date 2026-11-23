# Cómo publicar este proyecto en GitHub

Este proyecto está bajo la licencia pública **MIT** (ver [LICENSE](LICENSE)). Cualquiera puede usarlo, copiarlo y modificarlo, siempre que conserve el aviso de copyright.

## 0. Antes de subir (importante)

- El archivo `.env` **no debe subirse**. Ya está listado en `.gitignore`. Verifícalo con `git status` después de `git add .`: no debe aparecer `.env`.
- Si algún día un secreto (token, contraseña) llegó a subirse, cámbialo: borrarlo del repo no lo elimina del historial.
- Se incluye `.env.example` como plantilla; copia a `.env` y rellena los valores.
- Opcional: elimina archivos de respaldo como `*.tsx.new` y `GameDetailView_fixed.tsx` si no los necesitas.
- Si cambias el titular del copyright, edita la línea `Copyright (c) 2026 ...` de `LICENSE`.

## 1. Requisitos

1. Una cuenta en <https://github.com>.
2. Git instalado: <https://git-scm.com/downloads>. Comprueba con `git --version`.
3. Configura tu identidad (una sola vez):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

## 2. Crear el repositorio en GitHub

1. Entra a <https://github.com/new>.
2. Escribe el nombre (por ejemplo `ScoreFrontend`) y elige **Public**.
3. **No** marques "Add a README", ".gitignore" ni "license" (ya los tienes aquí; evita conflictos).
4. Pulsa **Create repository** y copia la URL, por ejemplo `https://github.com/TU_USUARIO/ScoreFrontend.git`.

## 3. Subir el código

Desde la carpeta del proyecto (la que contiene `package.json` y `LICENSE`):

```bash
git init
git add .
git status            # revisa que NO aparezca .env ni node_modules
git commit -m "Primer commit: proyecto con licencia MIT"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ScoreFrontend.git
git push -u origin main
```

## 4. Autenticación

GitHub ya no acepta contraseña normal al hacer push por HTTPS. Opciones:

- **GitHub CLI (más fácil):** instala <https://cli.github.com>, ejecuta `gh auth login` y sigue los pasos.
- **Token personal:** GitHub → Settings → Developer settings → Personal access tokens → genera uno con permiso `repo` y úsalo como contraseña cuando Git la pida.
- **Git Credential Manager** (viene con Git para Windows) abrirá el navegador para iniciar sesión.

## 5. Verificar

- En la página del repo debe verse `LICENSE` y, en la barra lateral, **MIT License**.
- Confirma que `.env` no está en la lista de archivos.

## 6. Subir cambios posteriores

```bash
git add .
git commit -m "Describe el cambio"
git push
```

## Problemas comunes

| Problema | Solución |
| --- | --- |
| `remote origin already exists` | `git remote set-url origin <URL>` |
| `rejected ... fetch first` (el repo remoto tenía archivos) | `git pull origin main --allow-unrelated-histories`, resuelve conflictos y `git push` |
| Se subió `.env` por error | Rota/cambia los valores y quítalo: `git rm --cached .env`, commit y push |
