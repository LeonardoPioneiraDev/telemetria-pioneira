// apps/frontend/src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'telemetria-frontend',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    },
    { status: 200 }
  );
}
