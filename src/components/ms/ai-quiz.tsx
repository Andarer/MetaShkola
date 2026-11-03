import { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Award, BookOpen } from "lucide-react";
import { Btn, Card, controlClass, Field } from "@/components/ms/ui";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const QUIZ_BANK: Record<string, QuizQuestion[]> = {
  math: [
    {
      id: "m1",
      question: "Решите квадратное уравнение: x² - 5x + 6 = 0. Найдите его корни.",
      options: ["x = 2 и x = 3", "x = -2 и x = -3", "x = 1 и x = 6", "x = -1 и x = 5"],
      correctIndex: 0,
      explanation: "По теореме Виета: x₁ + x₂ = 5, x₁ · x₂ = 6. Корни равны 2 и 3 (так как (x - 2)(x - 3) = 0).",
    },
    {
      id: "m2",
      question: "Чему равна гипотенуза прямоугольного треугольника с катетами 6 см и 8 см?",
      options: ["9 см", "10 см", "12 см", "14 см"],
      correctIndex: 1,
      explanation: "По теореме Пифагора: c² = a² + b² = 6² + 8² = 36 + 64 = 100. Значит c = √100 = 10 см.",
    },
    {
      id: "m3",
      question: "Найдите значение выражения: 2³ + 3² · 2.",
      options: ["22", "26", "34", "18"],
      correctIndex: 1,
      explanation: "Сначала возведение в степень и умножение: 2³ = 8, 3² = 9, 9 · 2 = 18. Затем сложение: 8 + 18 = 26.",
    },
    {
      id: "m4",
      question: "Какова вероятность выпадения четного числа при броске правильной игральной кости (6 граней)?",
      options: ["1/3", "1/2", "2/3", "1/6"],
      correctIndex: 1,
      explanation: "Четные числа на кости: 2, 4, 6 (всего 3 благоприятных исхода из 6 возможных). 3/6 = 1/2 (50%).",
    },
  ],
  physics: [
    {
      id: "p1",
      question: "С каким ускорением движется тело массой 5 кг под действием силы 20 Н?",
      options: ["2 м/с²", "4 м/с²", "10 м/с²", "100 м/с²"],
      correctIndex: 1,
      explanation: "По второму закону Ньютона: F = ma, следовательно a = F / m = 20 Н / 5 кг = 4 м/с².",
    },
    {
      id: "p2",
      question: "В каких единицах в системе СИ измеряется электрическое сопротивление?",
      options: ["Ампер", "Вольт", "Ом", "Ватт"],
      correctIndex: 2,
      explanation: "Единицей электрического сопротивления в СИ является Ом (в честь Георга Ома). R = U / I.",
    },
    {
      id: "p3",
      question: "Какова скорость света в вакууме (приблизительно)?",
      options: ["300 000 км/с", "150 000 км/с", "30 000 км/с", "300 000 м/с"],
      correctIndex: 0,
      explanation: "Фундаментальная физическая константа скорости света в вакууме составляет c ≈ 300 000 км/с (3·10⁸ м/с).",
    },
  ],
  history: [
    {
      id: "h1",
      question: "В каком году произошла битва на Калке?",
      options: ["1223 г.", "1240 г.", "1380 г.", "1147 г."],
      correctIndex: 0,
      explanation: "Битва на реке Калке между объединенным русско-половецким войском и монгольским корпусом произошла 31 мая 1223 года.",
    },
    {
      id: "h2",
      question: "Кто был автором первого свода законов Древней Руси «Русская Правда»?",
      options: ["Владимир Мономах", "Ярослав Мудрый", "Святослав Игоревич", "Владимир Великий"],
      correctIndex: 1,
      explanation: "Первый письменный свод законов «Русская Правда» был составлен при киевском князе Ярославе Мудром в начале XI века.",
    },
  ],
  english: [
    {
      id: "e1",
      question: "Choose the correct sentence in Present Perfect:",
      options: [
        "She has already finished her homework.",
        "She finished already her homework.",
        "She have already finished her homework.",
        "She has finish already her homework.",
      ],
      correctIndex: 0,
      explanation: "For 3rd person singular (She/He/It) in Present Perfect we use 'has + V3 (Past Participle)'. Finished is regular V3.",
    },
    {
      id: "e2",
      question: "Which word is a synonym for 'essential'?",
      options: ["Trivial", "Crucial", "Optional", "Temporary"],
      correctIndex: 1,
      explanation: "'Essential' means absolutely necessary or extremely important, which is identical in meaning to 'Crucial'.",
    },
  ],
};

export function AiQuizGenerator() {
  const [subjectKey, setSubjectKey] = useState<string>("math");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = QUIZ_BANK[subjectKey] || QUIZ_BANK.math;
  const currentQ = questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
    }
  };

  const handleReset = (newSubject?: string) => {
    if (newSubject) setSubjectKey(newSubject);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setFinished(false);
  };

  return (
    <Card className="border-copper/30">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-copper" />
            <span>AI-Тренажёр и тесты знаний</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Интерактивная проверка понимания материала с пошаговыми подсказками и объяснением ошибок.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["math", "Алгебра и геометрия"],
          ["physics", "Физика"],
          ["history", "История"],
          ["english", "Английский язык"],
        ].map(([key, label]) => (
          <Btn
            key={key}
            variant={subjectKey === key ? "primary" : "ghost"}
            className="text-xs py-1.5 h-8"
            onClick={() => handleReset(key)}
          >
            {label}
          </Btn>
        ))}
      </div>

      {!finished && currentQ ? (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Вопрос {currentIndex + 1} из {questions.length}</span>
            <span className="font-semibold text-copper">Баллы: {score}</span>
          </div>

          <div className="rounded-2xl border border-line bg-surface-2/40 p-4">
            <p className="text-base font-semibold text-fg leading-relaxed">{currentQ.question}</p>
          </div>

          <div className="flex flex-col gap-2">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQ.correctIndex;
              let style = "border-line bg-surface hover:bg-surface-2";

              if (selectedAnswer !== null) {
                if (isCorrect) {
                  style = "border-sage bg-sage/10 text-sage font-semibold";
                } else if (isSelected) {
                  style = "border-clay bg-clay/10 text-clay font-semibold";
                } else {
                  style = "border-line/40 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={selectedAnswer !== null}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all ${style}`}
                >
                  <span>{option}</span>
                  {selectedAnswer !== null ? (
                    isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
                    ) : isSelected ? (
                      <XCircle className="h-4 w-4 text-clay shrink-0" />
                    ) : null
                  ) : null}
                </button>
              );
            })}
          </div>

          {showExplanation ? (
            <div className="rounded-xl border border-copper/30 bg-copper/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-copper flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Разбор от AI-Репетитора:</span>
              </p>
              <p className="text-muted leading-relaxed">{currentQ.explanation}</p>
            </div>
          ) : null}

          {selectedAnswer !== null ? (
            <Btn onClick={handleNext} className="mt-2 flex items-center justify-center gap-2">
              <span>{currentIndex + 1 < questions.length ? "Следующий вопрос" : "Посмотреть итог теста"}</span>
            </Btn>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center text-center p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-copper/10 text-copper">
            <Award className="h-8 w-8" />
          </div>
          <h3 className="mt-3 text-2xl font-semibold">Тест завершен!</h3>
          <p className="mt-1 text-sm text-muted">
            Вы ответили правильно на <strong className="text-fg">{score}</strong> из {questions.length} вопросов ({Math.round((score / questions.length) * 100)}%).
          </p>
          <div className="mt-4 flex gap-2">
            <Btn onClick={() => handleReset()} className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" />
              <span>Пройти еще раз</span>
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
