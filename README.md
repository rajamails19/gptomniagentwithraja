# GPT Omni Agents

AI Agent Studio is a TanStack Start and Vite app for demonstrating multi-agent AI workflow planning, execution, debugging, monitoring, memory, cost analytics, and final output review.

## Local Development

```sh
npm install
npm run dev
```

The current local dev server is running at:

```text
http://localhost:8087
```

## Validation

```sh
npm run lint
npm run build
```

`npm run build` uses Nitro's Vercel preset and emits Vercel Build Output API files under `.vercel/output`.

## Vercel Deployment

This repo includes `vercel.json` with:

- Build command: `npm run build`
- Output directory: `.vercel/output`

In Vercel, import the GitHub repository and keep the default install command unless you intentionally switch package managers. No required environment variables are currently defined.

## GitHub First Commit

```sh
git add .
git commit -m "Initial AI Agent Studio app"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
