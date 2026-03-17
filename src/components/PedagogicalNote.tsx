'use client'

import { useState } from 'react'

interface Props {
  title: string
  children: React.ReactNode
  type?: 'concept' | 'why' | 'exercise' | 'tip' | 'warning' | 'governance'
  defaultOpen?: boolean
}

const config = {
  concept: { icon: '📘', bg: 'bg-blue-950/30', border: 'border-blue-900/50', title_color: 'text-blue-300', label: 'Concepto' },
  why: { icon: '💡', bg: 'bg-amber-950/30', border: 'border-amber-900/50', title_color: 'text-amber-300', label: 'Por qué importa' },
  exercise: { icon: '✏️', bg: 'bg-purple-950/30', border: 'border-purple-900/50', title_color: 'text-purple-300', label: 'Ejercicio' },
  tip: { icon: '🎯', bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', title_color: 'text-emerald-300', label: 'Tip' },
  warning: { icon: '⚠️', bg: 'bg-red-950/30', border: 'border-red-900/50', title_color: 'text-red-300', label: 'Cuidado' },
  governance: { icon: '🏛️', bg: 'bg-cyan-950/30', border: 'border-cyan-900/50', title_color: 'text-cyan-300', label: 'Gobernanza' },
}

export default function PedagogicalNote({ title, children, type = 'concept', defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const c = config[type]

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl overflow-hidden my-4`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{c.icon}</span>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${c.title_color} opacity-70`}>{c.label}</span>
          <span className={`text-sm font-semibold ${c.title_color}`}>{title}</span>
        </div>
        <span className="text-slate-500 text-xs">{open ? '▲ Ocultar' : '▼ Mostrar'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-300 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}
