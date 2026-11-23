# Static listing images (Vercel CDN)

Synced from `backend/airbnb/uploads/{product,@avatar}`.

Served as same-origin `/uploads/...` so the app does not depend on Supabase
Storage egress. Re-sync after adding product photos locally:

```bash
rsync -a --delete \
  ../backend/airbnb/uploads/product \
  ../backend/airbnb/uploads/@avatar \
  ./uploads/
```

Do not put `kyc/` here.
