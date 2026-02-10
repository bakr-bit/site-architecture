import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/api/auth/signin",
  },
});

// Only protect dashboard routes with middleware
// API routes handle their own auth via getServerSession
export const config = {
  matcher: ["/dashboard/:path*"],
};
