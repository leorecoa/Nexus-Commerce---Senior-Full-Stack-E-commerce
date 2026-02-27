import { Navbar } from './Navbar'
import { ThemeRuntime } from '@/features/theme-engine/ThemeRuntime'
import { ScrollProgressIndicator } from '@/components/immersive/ScrollProgressIndicator'
import { Toaster } from '@/components/cinematic/Toaster'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="cinematic-shell min-h-screen">
      <ThemeRuntime />
      <ScrollProgressIndicator />
      <Toaster />
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
