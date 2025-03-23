// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 環境変数からユーザー名/パスを取得（なければデフォルト）
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "myuser";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || "mypassword";

export const config = {
  matcher: ["/((?!_next).*)"],
  // これで _next 以下を除く全ルートを保護
};

export function middleware(req: NextRequest) {
  // ===============================
  // 1) ローカル開発環境なら認証をスキップ
  // ===============================
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // ===============================
  // 2) Basic 認証ロジック
  // ===============================
  const authHeader = req.headers.get("authorization");

  // 正しく "Basic <base64(user:pass)>" が来ていれば判定
  if (authHeader) {
    const [authType, authValue] = authHeader.split(" ");
    if (authType === "Basic" && authValue) {
      const [user, pass] = Buffer.from(authValue, "base64")
        .toString()
        .split(":");
      if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS) {
        // 認証成功
        return NextResponse.next();
      }
    }
  }

  // 認証失敗 → 401 を返す + WWW-Authenticate ヘッダで Basic 認証要求
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}
