'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, BookMarked } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Flashcard } from './Flashcard';
import type { DeckCategory, CardTemplate } from '@/lib/flashcards/types';
import { FlashcardDeckType } from '@/lib/flashcards/types';
import { BookOpen } from 'lucide-react';

type BuilderCard = {
  front: string;
  back: string;
  hint: string;
  tagsInput: string;
};

const STEPS = [
  { title: 'Create a Flashcard Deck', description: 'Add deck info, categories, and cards.' },
] as const;

const createEmptyCard = (): BuilderCard => ({
  front: '',
  back: '',
  hint: '',
  tagsInput: '',
});

type FlashcardBuilderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => Promise<void> | void;
};

export function FlashcardBuilderModal({ open, onOpenChange, onRefresh }: FlashcardBuilderModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<BuilderCard[]>([createEmptyCard()]);
  const [categories, setCategories] = useState<DeckCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const normalizedSelectedCategories = useMemo(() => new Set(selectedCategories), [selectedCategories]);

  const resetState = useCallback(() => {
    setStepIndex(0);
    setTitle('');
    setDescription('');
    setCards([createEmptyCard()]);
    setSelectedCategories([]);
    setCategoryInput('');
    setErrorMessage(null);
    setSubmitting(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch('/api/flashcards/categories');
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload.categories)) {
          setCategories(payload.categories);
        }
      }
    } catch (error) {
      console.error('Failed to load categories', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchCategories();
    } else {
      resetState();
    }
  }, [open, fetchCategories, resetState]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) {
      return;
    }
    if (document.activeElement === el) {
      return;
    }
    const nextValue = description ?? '';
    if (el.textContent !== nextValue) {
      el.textContent = nextValue;
    }
  }, [description]);

  const preparedCards = useMemo(
    () =>
      cards
        .map(card => ({
          front: card.front.trim(),
          back: card.back.trim(),
          hint: card.hint.trim() || undefined,
          tags: card.tagsInput
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean),
        }))
        .filter(card => card.front && card.back),
    [cards]
  );

  const handleCreateCategory = useCallback(async () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    setCreatingCategory(true);
    try {
      const response = await fetch('/api/flashcards/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to create category');
        return;
      }
      if (payload.category) {
        setCategories(prev => (prev.find(item => item.id === payload.category.id) ? prev : [payload.category, ...prev]));
        setSelectedCategories(prev =>
          prev.includes(payload.category.name) ? prev : [...prev, payload.category.name]
        );
      }
      setCategoryInput('');
    } catch (error) {
      setErrorMessage('Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  }, [categoryInput]);

  const handleCardChange = (index: number, field: keyof BuilderCard, value: string) => {
    setCards(prev => prev.map((card, idx) => (idx === index ? { ...card, [field]: value } : card)));
  };

  const appendCard = () => setCards(prev => [...prev, createEmptyCard()]);
  const removeCard = (index: number) => {
    if (cards.length === 1) return;
    setCards(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setErrorMessage('Deck title is required');
      return;
    }
    if (!preparedCards.length) {
      setErrorMessage('Add at least one card');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const createResponse = await fetch('/api/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          categories: Array.from(new Set(selectedCategories.map(name => name.trim()))),
          cards: preparedCards,
        }),
      });
      const createPayload = await createResponse.json();
      if (!createResponse.ok) {
        setErrorMessage(createPayload.error ?? 'Failed to create deck');
        return;
      }

      // Publish the deck
      const deckId = createPayload.deck.id;
      const publishResponse = await fetch(`/api/flashcards/decks/${deckId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const publishPayload = await publishResponse.json();
      if (!publishResponse.ok) {
        setErrorMessage(publishPayload.error ?? 'Failed to publish deck');
        return;
      }

      onOpenChange(false);
      void onRefresh?.();
    } catch (error) {
      setErrorMessage('Failed to create deck');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, selectedCategories, preparedCards, onOpenChange, onRefresh]);


  const renderStepContent = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name">Deck name</Label>
            <Input id="deck-name" value={title} onChange={event => setTitle(event.target.value)} placeholder="Goethe Politik Deck" autoFocus className="h-12 rounded-2xl border-none bg-muted text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <div
              ref={descriptionRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setDescription(e.currentTarget.textContent || '')}
              className="min-h-[48px] rounded-2xl border-none bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              role="textbox"
              aria-label="Description"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="category-input">Categories</Label>
            <div className="flex gap-2">
              <Input
                id="category-input"
                className="max-w-[220px] h-10 rounded-2xl border-none bg-muted text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                value={categoryInput}
                onChange={event => setCategoryInput(event.target.value)}
                placeholder="Add category"
              />
              <Button size="sm" variant="outline" disabled={!categoryInput.trim() || creatingCategory} onClick={handleCreateCategory} className="rounded-2xl">
                {creatingCategory ? 'Saving…' : 'Add'}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {loadingCategories ? (
              <span className="text-xs text-muted-foreground">Loading categories…</span>
            ) : categories.length ? (
              categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    normalizedSelectedCategories.has(category.name)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(category.name) ? prev.filter(item => item !== category.name) : [...prev, category.name]
                  )}
                >
                  {category.name}
                </button>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No categories yet.</span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Cards</p>
            <Button variant="outline" size="sm" onClick={appendCard} className="rounded-2xl">
              <BookMarked className="mr-2 h-4 w-4" />
              Add card
            </Button>
          </div>

          {/* Card carousel indicators */}
          {cards.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {cards.map((_, index) => {
                const isActive = carouselIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => setCarouselIndex(index)}
                    className={cn(
                      'h-6 rounded-full transition-all',
                      isActive ? 'w-10 bg-primary' : 'w-6 bg-muted hover:opacity-80',
                    )}
                    title={`Card ${index + 1}`}
                  />
                );
              })}
            </div>
          )}

          {/* Card carousel content */}
          {cards.length > 0 ? (
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.2 }}
                >
                  {editingCardIndex === carouselIndex ? (
                    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/80 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Card {carouselIndex + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeCard(carouselIndex)}
                          disabled={cards.length === 1}
                          className="text-xs uppercase tracking-[0.3em] text-muted-foreground transition hover:text-destructive disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`hint-${carouselIndex}`} className="text-xs">Hint</Label>
                            <Input id={`hint-${carouselIndex}`} value={cards[carouselIndex].hint} onChange={event => handleCardChange(carouselIndex, 'hint', event.target.value)} className="rounded-2xl border-none bg-muted text-sm focus-visible:ring-2 focus-visible:ring-primary/40" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tags-${carouselIndex}`} className="text-xs">Tags</Label>
                            <Input id={`tags-${carouselIndex}`} placeholder="comma separated" value={cards[carouselIndex].tagsInput} onChange={event => handleCardChange(carouselIndex, 'tagsInput', event.target.value)} className="rounded-2xl border-none bg-muted text-sm focus-visible:ring-2 focus-visible:ring-primary/40" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Flashcard
                      card={{
                        id: String(carouselIndex),
                        type: FlashcardDeckType.BASIC,
                        front: cards[carouselIndex].front,
                        back: cards[carouselIndex].back,
                        hint: cards[carouselIndex].hint || undefined,
                        tags: cards[carouselIndex].tagsInput.split(',').map(t => t.trim()).filter(Boolean),
                      }}
                      building={true}
                      onFrontChange={(value) => handleCardChange(carouselIndex, 'front', value)}
                      onBackChange={(value) => handleCardChange(carouselIndex, 'back', value)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              No cards yet. Click "Add card" to get started.
            </div>
          )}

          {/* Navigation buttons */}
          {cards.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCarouselIndex((prev) => Math.max(0, prev - 1))}
                disabled={carouselIndex === 0}
                className="rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Card {carouselIndex + 1} of {cards.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCarouselIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                disabled={carouselIndex === cards.length - 1}
                className="rounded-full"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-none bg-background p-0 text-foreground shadow-2xl sm:rounded-[40px]">
        <div className="flex flex-col gap-2 p-6 sm:p-8">
          <header className="flex flex-col gap-0">
            <div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
                <h2 className="text-3xl font-semibold text-foreground">{STEPS[0].title}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground ml-11">{STEPS[0].description}</p>
            </div>
          </header>

          <div className="relative w-full overflow-visible rounded-none border-none bg-transparent p-0" style={{ minHeight: 420 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              className="rounded-full px-6"
              onClick={handleSubmit}
              disabled={!title.trim() || !preparedCards.length || submitting}
            >
              {submitting ? 'Publishing…' : 'Publish deck'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
