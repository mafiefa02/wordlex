import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@wordlex/ui/components/accordion";

/* `as const` so the first question is a known element rather than a possibly
   missing one — it is what the accordion opens with. */
const QUESTIONS = [
  {
    q: "Which languages can I play?",
    a: "English, Bahasa Indonesia, Basa Sunda and Basa Jawa, each at five, six and seven letters. That is twelve Tracks.",
  },
  {
    q: "Will there be more languages?",
    a: "Yes. Four is where this started, not where it stops. A language needs a Dictionary and an Answer Pool built before it can have a Track, and that is the slow part.",
  },
  {
    q: "Why not just five letters?",
    a: "Because five is an English habit, not a rule. Six and seven letters play differently, and in some languages that is where the good words are.",
  },
  {
    q: "Do I need an Account?",
    a: "No. Every Track is playable without one. An Account is what makes your history last beyond the day.",
  },
  {
    q: "How many words do I get a day?",
    a: "Twelve at most, one per Track. Each Track issues one word per WordleX Day and you get one Game against it.",
  },
  {
    q: "Can I keep playing once I have finished those?",
    a: "Not until the next WordleX Day. There is no endless practice, which is deliberate: every Game you play is one that counts.",
  },
  {
    q: "When does the day change?",
    a: "At 00:00 WIB, UTC+7, the same instant for everyone. In London that is five in the afternoon.",
  },
  {
    q: "I typed a real word and it was not accepted.",
    a: "That is an Unknown Word, not a wrong Guess. Our Dictionary is most likely missing it. Nothing is scored, you keep your row, and the word is written down so a speaker can review it and add it.",
  },
  {
    q: "What do you do with my data?",
    a: "Very little. No analytics, no advertising, no third party trackers, nothing sold or shared. The privacy policy has the detail.",
  },
] as const;

export function Faq() {
  return (
    <Accordion className="mt-8" defaultValue={[QUESTIONS[0].q]}>
      {QUESTIONS.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
          <AccordionContent className="max-w-[680px] text-muted-foreground">
            <p>{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
