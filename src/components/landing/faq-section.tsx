'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, T } from '@/lib/i18n/context'
import { ChevronDown, HelpCircle, CircleDot } from 'lucide-react'

function NeonAccordionItem({ question, answer, index, isOpen, onToggle }: {
  question: string
  answer: string
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden transition-all duration-500 ${
        isOpen
          ? 'glass-strong border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
          : 'glass-neon border border-border/20 hover:border-emerald-500/15'
      }`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      {/* Top glow line when open */}
      {isOpen && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          layoutId="faq-glow"
          transition={{ duration: 0.3 }}
        />
      )}

      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left group"
      >
        {/* Question number */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary text-muted-foreground'
        }`}>
          {isOpen ? (
            <CircleDot className="h-4 w-4" />
          ) : (
            <span className="text-xs font-bold font-mono">0{index + 1}</span>
          )}
        </div>

        {/* Question text */}
        <span className={`flex-1 font-semibold transition-colors duration-300 ${
          isOpen ? 'text-emerald-400' : 'text-foreground group-hover:text-foreground/90'
        }`}>
          {question}
        </span>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={`flex-shrink-0 transition-colors duration-300 ${
            isOpen ? 'text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-5 pl-18">
              <div className="ml-12 text-muted-foreground leading-relaxed text-sm border-l-2 border-emerald-500/20 pl-4">
                {answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQSection() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
    { q: t('landing.faq.q5'), a: t('landing.faq.a5') },
    { q: t('landing.faq.q6'), a: t('landing.faq.a6') },
    { q: t('landing.faq.q7'), a: t('landing.faq.a7') },
  ]

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="max-w-3xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <T k="landing.faq.title" />
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.faq.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <NeonAccordionItem
              key={index}
              question={faq.q}
              answer={faq.a}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
