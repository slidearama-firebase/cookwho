
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return new NextResponse('Stripe Checkout is not enabled.', { status: 501 });
}
