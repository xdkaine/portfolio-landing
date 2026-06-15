import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function TestZoomPage() {
  return (
    <div className="min-h-screen bg-black text-white p-24 flex flex-col items-center justify-center gap-12">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Zoomable Image Test</h1>
        <p className="text-gray-400">
          This page tests the React Portal fix. Previously, the image would be trapped
          inside the parent container because of the CSS `transform` and `clip-path`
          properties applied by the ScrollReveal animation wrapper.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
        {/* With ScrollReveal (previously broken) */}
        <ScrollReveal className="border border-white/20 p-4 rounded-xl bg-white/5">
          <h2 className="text-sm tracking-widest text-gray-500 mb-4">WITH SCROLL REVEAL (PORTAL FIX)</h2>
          <div className="aspect-video relative bg-black rounded-lg overflow-hidden border border-white/10">
            <ZoomableImage
              src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80"
              alt="Test Image 1"
            />
          </div>
        </ScrollReveal>

        {/* Without ScrollReveal */}
        <div className="border border-white/20 p-4 rounded-xl bg-white/5">
          <h2 className="text-sm tracking-widest text-gray-500 mb-4">WITHOUT SCROLL REVEAL</h2>
          <div className="aspect-video relative bg-black rounded-lg overflow-hidden border border-white/10">
            <ZoomableImage
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80"
              alt="Test Image 2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
