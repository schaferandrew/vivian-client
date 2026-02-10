# Vivian Client

A Next.js web application for the Vivian Household Agent system. This is a PWA-enabled client that connects to the Vivian backend API for HSA expense tracking and management.

## Features

- **Chat Interface**: Real-time WebSocket chat with Vivian agent
- **Receipt Upload**: Upload and process medical receipts with OCR
- **HSA Dashboard**: View unreimbursed balances and expense summaries
- **Email/Password Login**: Session-based auth with access-token refresh
- **PWA Support**: Installable on iOS and Android devices
- **Responsive Design**: Mobile-first, works on all screen sizes

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- WebSocket API
- PWA (next-pwa)

## Prerequisites

- Node.js 20+
- Vivian backend running (see vivian-backend repo)

## Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd vivian-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your backend URLs:
   ```env
   NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_AGENT_WS_URL=ws://localhost:8000/api/v1/chat/ws
   AGENT_API_URL=http://localhost:8000/api/v1
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Docker Setup

### Option 1: Local Development with Backend in Docker

If your backend is running in Docker:

```bash
# Terminal 1: Start backend
cd ../vivian-backend
docker-compose up

# Terminal 2: Start client locally
cd ../vivian-client
npm run dev
```

### Option 2: Run Client in Docker

```bash
docker-compose up -d
```

The client will be available at http://localhost:3000

Note: When running in Docker, the client uses `host.docker.internal` to connect to the backend on your host machine.

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home screen"
4. Tap "Add"

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_AGENT_API_URL` | REST API base URL | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_AGENT_WS_URL` | WebSocket URL | `ws://localhost:8000/api/v1/chat/ws` |
| `AGENT_API_URL` | Server-side API URL for auth/integration proxy routes | `http://localhost:8000/api/v1` |

## Auth Flow

- App routes are protected by `middleware.ts` and redirect unauthenticated users to `/login`.
- Login POSTs to `/api/auth/login`, which stores:
  - access token cookie (`vivian_access_token`)
  - refresh token cookie (`vivian_refresh_token`)
- API calls use bearer auth and retry once after `/api/auth/refresh` when access tokens expire.
- Logout uses `/api/auth/logout` to revoke refresh session and clear cookies.

## Project Structure

```
vivian-client/
├── app/                    # Next.js app router pages
│   ├── chat/              # Chat interface page
│   ├── receipts/          # Receipt upload wizard
│   ├── hsa/               # HSA dashboard
│   └── settings/          # Settings page
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── chat/             # Chat-specific components
├── lib/                  # Utilities and hooks
│   ├── api/              # API clients
│   └── stores/           # Zustand stores
├── types/                # TypeScript types
└── public/               # Static assets
```

## Building for Production

```bash
npm run build
```

The built application will be in the `.next` directory.

## Deployment

### Static Export

For simple static hosting:

```bash
npm run build
```

### Docker Production Build

```bash
docker-compose -f docker-compose.yml up --build
```

## Development Notes

- The app uses Next.js App Router with Server Components where possible
- Client-side state is managed with Zustand
- WebSocket connections are handled via a custom hook
- File uploads use the native Fetch API with FormData
- The UI is built with Tailwind CSS and custom components

## Troubleshooting

### WebSocket Connection Issues
- Ensure the backend is running
- Check that the WebSocket URL is correct in your environment
- Check browser console for connection errors

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## License

Private - For personal use only
