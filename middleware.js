import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/(.*)',
  '/health',
  '/webhook-info',
  '/auto-setup-webhook',
  '/success',
  '/cancel',
  '/processing',
  '/call-me',
  '/deadlines',
  '/habits',
  '/long-term',
  '/onboarding',
  '/pro',
  '/progress',
  '/task',
  '/ai',
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};