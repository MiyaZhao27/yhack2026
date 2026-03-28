# LiveWell

### Run With Atlas
```bash
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URI` in `.env` to your Atlas connection string.

The app now uses the live Atlas data directly. You do not need to reseed for normal usage.

Optional demo-only seed:
```bash
npm run seed:demo
```
