import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is the Navigator plan a recurring subscription?",
    answer:
      "Yes, the Navigator plan is an annual subscription that renews automatically. You can manage or cancel your subscription at any time from your account dashboard. We will notify you before your subscription renews.",
  },
  {
    question: "What kind of support do I get with the Navigator plan?",
    answer:
      "Navigator members receive priority email support. Our dedicated support team aims to respond to all Navigator inquiries within 24 business hours. You'll get help with platform issues, billing questions, and general guidance.",
  },
  {
    question: "Can I upgrade from Explorer to Navigator later?",
    answer:
      "You can upgrade from the free Explorer plan to the Navigator plan at any time. Simply go to the billing section in your account settings and choose to upgrade. Your existing data and applications will be seamlessly carried over.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards, including Visa, Mastercard, and American Express. All payments are processed securely through our payment partner, Stripe.",
  },
]

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-12 text-center text-4xl font-bold">Clearing the Static</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border-b border-white/10">
            <AccordionTrigger className="py-6 text-left text-lg hover:no-underline">{faq.question}</AccordionTrigger>
            <AccordionContent className="pb-6 text-base text-zinc-400">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}