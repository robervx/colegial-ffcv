App Next.js del proyecto — ver [README.md de la raíz](../README.md) para contexto de producto, workflow SDD y cómo arrancar en local.

```bash
npm install
cp .env.example .env.local   # rellenar con credenciales reales de Supabase
npm run dev
npm test                     # Vitest — lógica de lib/
npm run lint
```

Ver [AGENTS.md](./AGENTS.md) antes de tocar código de Next.js: esta versión (16) tiene cambios que rompen respecto al conocimiento por defecto de los modelos.
