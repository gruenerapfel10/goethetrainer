'use client';

export default function TrackInformation() {
  const tracks = [
    {
      label: 'Language Mastery',
      title: 'German is a challenging language',
      description:
        'German grammar, complex sentence structures, and nuanced vocabulary require consistent practice and deep understanding. Traditional learning methods often fail to address the core challenges that learners face in real-world conversations and exams.',
      imagePosition: 'right',
    },
    {
      label: 'Our Approach',
      title: 'Gamified learning works',
      description:
        'By turning language learning into engaging games and challenges, Faust makes mastery feel like play. Interactive quizzes, real-time feedback, and adaptive difficulty keep you motivated and accelerate your progress toward exam readiness.',
      imagePosition: 'left',
    },
    {
      label: 'Smart Learning',
      title: 'Personalized to your level',
      description:
        'Whether you\'re starting from A1 or preparing for C2, Faust adapts to your current level and learning pace. AI-powered insights identify your weak areas and create a personalized study plan that targets exactly what you need to improve.',
      imagePosition: 'right',
    },
    {
      label: 'Exam Ready',
      title: 'Master the Goethe exam',
      description:
        'Faust provides comprehensive exam preparation with real past exam questions, authentic listening materials, and expert tips. Practice all four skills—listening, reading, writing, and speaking—and gain the confidence you need to pass.',
      imagePosition: 'left',
    },
  ];

  return (
    <section className="w-full bg-white py-20 md:py-32">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-20 md:space-y-32">
          {/* Track Cards */}
          {tracks.map((track, index) => (
            <div key={index} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Image - left position */}
              {track.imagePosition === 'left' && (
                <div className="h-80 md:h-96 bg-black/10 rounded-lg flex items-center justify-center order-2 lg:order-1">
                  <p className="text-black/50">Illustration</p>
                </div>
              )}

              {/* Content */}
              <div className={track.imagePosition === 'left' ? 'order-1 lg:order-2' : ''}>
                <p className="text-xs uppercase tracking-widest text-black/60 mb-4">
                  {track.label}
                </p>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black">
                  {track.title}
                </h2>
                <p className="text-lg text-black/70 leading-relaxed">
                  {track.description}
                </p>
              </div>

              {/* Image - right position */}
              {track.imagePosition === 'right' && (
                <div className="h-80 md:h-96 bg-black/10 rounded-lg flex items-center justify-center">
                  <p className="text-black/50">Illustration</p>
                </div>
              )}
            </div>
          ))}

          {/* Final statement */}
          <div className="text-center py-12">
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-black max-w-3xl mx-auto">
              Faust is transforming how people master the German language.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
