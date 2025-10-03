import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.ACCESS_SECRET;

export function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("Access_Token")?.value;

  // Protect dashboard route
  if (url.pathname.startsWith("/dashboard")) {
    if (!token) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    try {
      const user = jwt.verify(token, ACCESS_SECRET);

      if (user.role !== "admin") {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    } catch (err) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Tell Next.js which paths should trigger this middleware
export const config = {
  matcher: ["/dashboard"], // applies to /dashboard and subroutes
};
