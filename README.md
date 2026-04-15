# PlainFinancials Etsy Calculator

The Etsy profit calculator for non-US sellers. Lives under `plainfinancials.com/etsy/`.

## Architecture

- Standalone Netlify site: `plainfinancials-etsy.netlify.app`
- Proxied via `plainfinancials.com/etsy/*` using Netlify rewrite on the parent site
- Pure static: HTML + CSS + vanilla JS. No build step.

## Local preview

Open `index.html` directly in a browser, or run:

```
npx serve .
```

## Deploy

Pushes to `main` auto-deploy on Netlify.

## Pricing

- Free: Standard tab (calculator + totals)
- Pro ($2.99/mo or $24/yr): Advisor tab (verdict, target prices, monthly goal, offsite ads risk)

Test the Pro view locally with `?pro=1` in the URL.
