import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardQuizPoints } from '../../../../utils/pointSystem';

export default function LanguageToolkitQuizPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Sample quiz data - you can fetch this from your database
  const [quizQuestions] = useState([
    {
      id: 1,
      question: "What is a 'Double-Double'?",
      options: [
        "Tim Hortons' strong black tea",
        "doughnut holes (bite-sized)",
        "coffee with 2 creams and 2 sugars",
        "coffee with 1 cream and 1 sugar"
      ],
      correctAnswer: 2
    },
    {
      id: 2,
      question: "What does 'Timbits' refer to?",
      options: [
        "Large coffee cups",
        "Small doughnut holes",
        "Breakfast sandwiches", 
        "Hot chocolate"
      ],
      correctAnswer: 1
    },
    {
      id: 3,
      question: "What is a 'Large Regular'?",
      options: [
        "Large coffee with 1 cream and 1 sugar",
        "Large coffee with 2 creams and 2 sugars",
        "Large coffee, black",
        "Large hot chocolate"
      ],
      correctAnswer: 0
    }
  ]);

  useEffect(() => {
    if (!id) return;
    
    const fetchScenario = async () => {
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('*')
        .eq('numeric_id', id)
        .single();
      setScenario(scenarioData);
    };

    fetchScenario();
  }, [id]);

  const handleAnswerSelect = (optionIndex) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score and award points
      const score = calculateScore();
      const isPerfectScore = score === quizQuestions.length;
      
              try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && scenario) {
            // Award points for completing the scenario quiz
            const result = await awardQuizPoints(session.user.id, scenario.id, supabase);
            if (result.success && result.isCompleted) {
              console.log('🎉 Scenario completed via quiz! Points:', result.points);
            }
          }
        } catch (error) {
          console.error('Failed to update scenario progress:', error);
        }
      setShowResults(true);
    }
  };  

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleExit = () => {
    router.push(`/scenario/${id}/language-toolkit`);
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quizQuestions[index].correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  if (!scenario) return <p>Loading...</p>;

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / quizQuestions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push(`/scenario/${id}/language-toolkit`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Quiz Results</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg mb-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
            <p className="text-lg text-gray-600 mb-6">
              You scored {score} out of {quizQuestions.length} ({percentage}%)
            </p>
            <button
              onClick={() => router.push(`/scenario/${id}/language-toolkit`)}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Back to Language Toolkit
            </button>
          </div>

          {/* Quiz Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quiz Summary</h3>
            <div className="space-y-4">
              {quizQuestions.map((question, index) => {
                const userAnswer = selectedAnswers[index];
                const isCorrect = userAnswer === question.correctAnswer;
                return (
                  <div key={question.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <p className="font-medium text-gray-900 mb-2">
                      Q{index + 1}: {question.question}
                    </p>
                    <div className="space-y-2 text-sm">
                      <p className={`flex items-center ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="w-4 h-4 mr-2">
                          {isCorrect ? (
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        Your answer: {question.options[userAnswer]}
                      </p>
                      {!isCorrect && (
                        <p className="text-gray-600 ml-6">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push(`/scenario/${id}/language-toolkit`)}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Language Toolkit Quiz</h1>
              <p className="text-sm text-gray-500">{scenario.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Question Card */}
        <div className="bg-teal-200 rounded-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-black text-center">
            {quizQuestions[currentQuestion].question}
          </h2>
        </div>

        {/* Answer Options */}
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 mb-6">
          <div className="space-y-3">
            {quizQuestions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl border-2 transition-all ${
                  selectedAnswers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedAnswers[currentQuestion] === index && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-800 text-left flex-1">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={handleExit}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Exit</span>
            </button>
            
            {currentQuestion > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 bg-green-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          
          <button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] === undefined || selectedAnswers[currentQuestion] === null}
            style={{
              backgroundColor: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? '#14b8a6' : '#d1d5db',
              color: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? 'white' : '#6b7280',
              cursor: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? 'pointer' : 'not-allowed'
            }}
            className="w-full py-3 px-6 rounded-xl font-medium transition-colors"
          >
            {currentQuestion === quizQuestions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="flex justify-center space-x-2">
            {quizQuestions.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentQuestion
                    ? 'bg-blue-500'
                    : index < currentQuestion
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Question {currentQuestion + 1} of {quizQuestions.length}
          </p>
        </div>
      </div>
    </div>
  );
}