import { MuaLogo } from "@/components/mua-logo"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MuaLogo className="h-8 w-auto text-white" />
          <span className="text-xl font-medium">MUA</span>
        </div>
        <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white hover:text-black">
          Get Started
        </Button>
      </div>
    </header>
  )
}
