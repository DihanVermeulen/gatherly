# .well-known verification files

These files support iOS Universal Links (AASA) and Android App Links (assetlinks.json).

## IMPORTANT: Content-Type header required

The apple-app-site-association file MUST be served with:
  Content-Type: application/json

CRA (react-scripts) cannot set custom headers. Configure at your hosting platform:

Netlify (_headers file in public/):
  /.well-known/apple-app-site-association
    Content-Type: application/json

Vercel (vercel.json):
  { "headers": [{ "source": "/.well-known/apple-app-site-association", "headers": [{ "key": "Content-Type", "value": "application/json" }] }] }

nginx:
  location = /.well-known/apple-app-site-association {
    default_type application/json;
  }

## Placeholders to replace before production

- apple-app-site-association: Replace TEAMID with your 10-char Apple Developer Team ID
- apple-app-site-association: Confirm bundle identifier matches app.json ios.bundleIdentifier
- assetlinks.json: Replace PLACEHOLDER:SHA256:... with fingerprint from EAS Build credentials
