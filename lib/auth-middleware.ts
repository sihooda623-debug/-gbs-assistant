import { NextRequest, NextResponse } from "next/server";

export function verifyAdminToken(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!authHeader || !serviceKey) return false;

  const token = authHeader.replace("Bearer ", "");
  return token === serviceKey;
}

export function requireAdmin(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    if (!verifyAdminToken(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return handler(req);
  };
}
