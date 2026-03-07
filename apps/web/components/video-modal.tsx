'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface VideoModalProps {
  triggerLabel: string
  triggerClassName?: string
}

export function VideoModal({ triggerLabel, triggerClassName }: VideoModalProps) {
  const [open, setOpen] = useState(false)
  // TODO: replace with real demo video URL
  const videoUrl = ''

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              aria-label="Close video"
            >
              <X size={18} />
            </button>
            {videoUrl ? (
              <iframe
                src={videoUrl}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-white text-center text-lg">Demo video coming soon</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
