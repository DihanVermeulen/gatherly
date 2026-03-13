# @repo/ui-web

Shared React UI components for web apps, styled with Tailwind CSS v4.

## Setup

### 1. Add the dependency

In your app's `package.json`:

```json
{
  "dependencies": {
    "@repo/ui-web": "workspace:*"
  }
}
```

### 2. Import the styles

In your app's global CSS file (e.g. `globals.css` or `app.css`):

```css
@import "@repo/ui-web/styles";
```

> If your app already has `@import "tailwindcss"`, you can instead tell Tailwind to
> scan this package's source directly:
>
> ```css
> @source "../../packages/ui-web/src";
> ```

### 3. Use components

```tsx
import { Button } from "@repo/ui-web/button";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui-web/card";
import { Badge } from "@repo/ui-web/badge";

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="primary">Save</Button>
        <Button variant="outline">Cancel</Button>
        <Badge variant="success">Active</Badge>
      </CardContent>
    </Card>
  );
}
```

## Components

| Component | Variants |
|-----------|----------|
| `Button` | `primary`, `secondary`, `outline`, `ghost`, `destructive` · sizes: `sm`, `md`, `lg` |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` | — |
| `Badge` | `default`, `secondary`, `success`, `warning`, `destructive`, `outline` |

## Development

```bash
# Build once
pnpm build

# Watch mode (CSS + JS)
pnpm dev
```

## Adding a new component

1. Create `src/<name>/index.tsx`
2. Add the export entry to `package.json` under `"exports"`
3. Run `pnpm build`
