export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth pages have their own full-screen centered design
  // No header/footer needed
  return <>{children}</>;
}
