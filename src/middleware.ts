import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Only protect dashboard routes with middleware
// API routes handle their own auth via getServerSession
export const config = {
  matcher: ["/dashboard/:path*"],
};
