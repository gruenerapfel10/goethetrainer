import { MuaLogo } from "@/components/mua-logo"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Header() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-full px-8 py-3 shadow-xl">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <MuaLogo className="h-6 w-auto text-white" />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Features
            </a>
            <a href="#universities" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Universities
            </a>
            <a href="#pricing" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button 
                variant="ghost" 
                className="text-white/80 hover:text-white text-sm font-medium bg-transparent hover:bg-white/10 px-4 py-2 rounded-full transition-all duration-200"
              >
                Log in
              </Button>
            </Link>
            <Link href="/login">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                <Button 
                  variant="ghost" 
                  className="relative bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  Get Started
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
