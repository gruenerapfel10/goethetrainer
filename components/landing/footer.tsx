import { MuaLogo } from "@/components/mua-logo"
import { Instagram, Twitter, Linkedin, Facebook, Youtube, ChevronDown, Globe } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Logo and Social Icons */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-8">
              <MuaLogo className="h-8 w-auto text-black" />
              <span className="text-xl font-bold text-black">MUA</span>
            </div>
            <div className="flex gap-4">
              <Instagram className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
              <Twitter className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
              <Linkedin className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
              <Facebook className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
              <Youtube className="w-5 h-5 text-gray-600 hover:text-black cursor-pointer" />
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-black mb-4">Company</h3>
            <div className="space-y-3">
              <a href="#" className="block text-gray-600 hover:text-black text-sm">About us</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Careers</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Security</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Status</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Terms & privacy</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Your privacy rights</a>
            </div>
          </div>

          {/* Download Links */}
          <div>
            <h3 className="font-semibold text-black mb-4">Download</h3>
            <div className="space-y-3">
              <a href="#" className="block text-gray-600 hover:text-black text-sm">iOS & Android</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Mac & Windows</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Calendar</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Web Clipper</a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-black mb-4">Resources</h3>
            <div className="space-y-3">
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Help center</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Pricing</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Blog</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Community</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Integrations</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Templates</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Affiliates</a>
            </div>
          </div>

          {/* MUA for */}
          <div>
            <h3 className="font-semibold text-black mb-4">MUA for</h3>
            <div className="space-y-3">
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Enterprise</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Small business</a>
              <a href="#" className="block text-gray-600 hover:text-black text-sm">Personal</a>
            </div>
            <div className="mt-8">
              <a href="#" className="text-black font-medium text-sm flex items-center gap-1 hover:underline">
                Explore more →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-12 mt-12 border-t border-gray-200 gap-4">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-600 hover:text-black">
              <Globe className="w-4 h-4" />
              <span className="text-sm">English (US)</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="text-gray-600 hover:text-black text-sm">
              Cookie settings
            </button>
          </div>
          <div className="text-sm text-gray-600">
            © 2025 MUA Labs, Inc.
          </div>
        </div>
      </div>
    </footer>
  )
}
