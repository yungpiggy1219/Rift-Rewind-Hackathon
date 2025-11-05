import { NextRequest, NextResponse } from "next/server";
import { riotAPI } from "@/lib/riot-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get("gameName") || "Faker";
    const tagLine = searchParams.get("tagLine") || "T1";

    console.log(`🧪 Testing PUUID retrieval for ${gameName}#${tagLine}...`);

    // Test account lookup
    const account = await riotAPI.getAccountByRiotId(gameName, tagLine);

    console.log(`✅ Account found:`, account);

    return NextResponse.json({
      success: true,
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      region: account.regionDisplay,
      message: `PUUID retrieved successfully!`,
    });
  } catch (error: any) {
    console.error("❌ PUUID test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
