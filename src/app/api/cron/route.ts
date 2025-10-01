import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    if (
        req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
}
