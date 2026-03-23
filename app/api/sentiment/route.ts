import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text } = await req.json();

  let sentiment = "neutral";

  if (text.toLowerCase().includes("good")) {
    sentiment = "positive";
  } else if (text.toLowerCase().includes("bad")) {
    sentiment = "negative";
  }

  return NextResponse.json({ sentiment });
}