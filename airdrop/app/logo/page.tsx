import { LogoGenerator } from "@/components/logo-generator"
import { MuaLogo } from "@/components/mua-logo"
import { MuaLogoVertical } from "@/components/mua-logo-vertical"

export default function LogoPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 sm:p-8">
      <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-3xl font-bold">Logo Generator</h1>
        <p className="mb-8 text-center text-gray-600">
          Download different versions of the MUA logo in PNG or SVG format.
        </p>
        <div className="space-y-12">
          <div>
            <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Horizontal</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <LogoGenerator
                title="White on Blue"
                logoComponent={<MuaLogo className="h-16 w-auto text-white" />}
                previewBgColor="#2c55ff"
                exportBgColor="#2c55ff"
                fileNamePrefix="mua-logo-horizontal-blue-bg"
              />
              <LogoGenerator
                title="Blue on Transparent"
                logoComponent={<MuaLogo className="h-16 w-auto text-blue-600" />}
                previewBgColor="#ffffff"
                fileNamePrefix="mua-logo-horizontal-transparent-bg"
              />
            </div>
          </div>
          <div>
            <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">Vertical</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <LogoGenerator
                title="White on Blue"
                logoComponent={<MuaLogoVertical className="h-24 w-auto text-white" />}
                previewBgColor="#2c55ff"
                exportBgColor="#2c55ff"
                fileNamePrefix="mua-logo-vertical-blue-bg"
              />
              <LogoGenerator
                title="Blue on Transparent"
                logoComponent={<MuaLogoVertical className="h-24 w-auto text-blue-600" />}
                previewBgColor="#ffffff"
                fileNamePrefix="mua-logo-vertical-transparent-bg"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
