import Link from "next/link"
import { GoetheLogo } from "@/components/goethe-logo"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <GoetheLogo className="h-8 w-auto text-white" />
            <span className="text-xl font-medium text-white">Goethe</span>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/auth" className="text-sm font-medium text-zinc-300 hover:text-white">
              Login
            </Link>
            <Link href="/offer" className="text-sm text-zinc-300 hover:text-white">
              Pricing
            </Link>
          </nav>
          <Button asChild className="bg-blue-600 text-white hover:bg-blue-500">
            <Link href="/offer">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}