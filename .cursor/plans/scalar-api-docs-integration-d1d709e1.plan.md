<!-- d1d709e1-6cf7-44d2-b41d-24cee3182569 8fe67edb-aad3-4a4d-a60f-4c3cba65596b -->
# Integrate Scalar API Documentation Viewer

## Implementation Steps

### 1. Install Scalar Astro Integration

Install the official Astro-specific Scalar package:

```bash
pnpm add @scalar/astro-api-reference
```

### 2. Move OpenAPI Spec to Public Directory

Move `swagger.yaml` from project root to `public/` directory so it's accessible at `/swagger.yaml`:

- Source: `swagger.yaml`
- Destination: `public/swagger.yaml`

This makes the spec file publicly accessible for the Scalar component to load.

### 3. Create API Documentation Page

Create `src/pages/api-docs.astro` with the Scalar API reference component:

```astro
---
import ApiReference from '@scalar/astro-api-reference';
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ski Surface Spec API Documentation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <ApiReference 
    configuration={{
      spec: {
        url: '/swagger.yaml',
      },
      theme: 'purple',
      layout: 'modern',
      darkMode: true,
      showSidebar: true,
    }}
  />
</body>
</html>
```

## Key Configuration Options

The Scalar component supports these configuration options:

- `spec.url`: Points to the public OpenAPI spec file
- `theme`: Visual theme (purple, default, etc.)
- `layout`: UI layout style (modern, classic)
- `darkMode`: Enable/disable dark mode
- `showSidebar`: Show/hide navigation sidebar

## Result

After implementation:

- API documentation will be accessible at `http://localhost:4321/api-docs`
- Raw OpenAPI spec will be available at `http://localhost:4321/swagger.yaml`
- No external CDN dependencies - everything bundled with the application
- Works offline and in air-gapped environments

### To-dos

- [ ] Install @scalar/astro-api-reference package using pnpm
- [ ] Move swagger.yaml from root to public/ directory
- [ ] Create src/pages/api-docs.astro with Scalar ApiReference component