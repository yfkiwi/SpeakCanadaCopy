import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { awardQuizPoints } from '../../../utils/pointSystem';

export default function ScenarioQuizPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Completion state
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchScenarioAndQuestions = async () => {
      try {
        // Fetch scenario details
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', id)
          .single();

        if (scenarioError) throw scenarioError;
        setScenario(scenarioData);

        // Generate quiz questions
        await generateQuizQuestions(scenarioData.title);

        // Check if user has already completed quiz
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: progress, error: progressError } = await supabase
              .from('user_scenarios_progress')
              .select('completed_activities')
              .eq('user_id', session.user.id)
              .eq('scenario_id', scenarioData.id)
              .single();

            if (!progressError && progress) {
              const completedActivities = progress.completed_activities || {};
              if (completedActivities['quiz_scenario_quiz']) {
                setQuizCompleted(true);
              }
            }
          }
        } catch (error) {
          console.error('Error checking quiz completion status:', error);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setCheckingCompletion(false);
      }
    };

    fetchScenarioAndQuestions();
  }, [id]);

  const generateQuizQuestions = async (scenarioTitle) => {
    try {
      // Fetch vocabulary for this scenario
      const { data: vocabularyData, error: vocabError } = await supabase
        .from('vocabulary_combined')
        .select('term, definition')
        .eq('scenario', scenarioTitle);

      if (vocabError) throw vocabError;

      // Fetch expressions for this scenario
      const { data: expressionsData, error: exprError } = await supabase
        .from('common_expressions')
        .select('expression, common_responses')
        .eq('scenario', scenarioTitle);

      if (exprError) throw exprError;

      // Check if we have enough data
      if (!vocabularyData || vocabularyData.length < 12) {
        throw new Error(`Not enough vocabulary items for ${scenarioTitle}. Found: ${vocabularyData?.length || 0}, need: 12`);
      }
      if (!expressionsData || expressionsData.length < 3) {
        throw new Error(`Not enough expressions for ${scenarioTitle}. Found: ${expressionsData?.length || 0}, need: 3`);
      }

      // Randomly select questions
      const selectedVocab = vocabularyData.sort(() => 0.5 - Math.random()).slice(0, 12);
      const selectedExpressions = expressionsData.sort(() => 0.5 - Math.random()).slice(0, 3);

      const questions = [];

      // Generate vocabulary questions (12)
      selectedVocab.forEach((vocab, index) => {
        // Get 3 wrong answers from other vocabulary
        const wrongAnswers = vocabularyData
          .filter(v => v.term !== vocab.term)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(v => v.definition);

        // Create options array and shuffle
        const options = [vocab.definition, ...wrongAnswers].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(vocab.definition);

        questions.push({
          id: `vocab_${index}`,
          type: 'vocabulary',
          question: `What does "${vocab.term}" mean?`,
          options: options,
          correctAnswer: correctIndex,
          explanation: {
            term: vocab.term,
            correct: vocab.definition
          }
        });
      });

      // Generate expression questions (3)
      selectedExpressions.forEach((expr, index) => {
        // Parse the common_responses to get individual responses
        const parseResponses = (responseStr) => {
          if (!responseStr) return [];
          try {
            return typeof responseStr === 'string' ? JSON.parse(responseStr) : responseStr;
          } catch {
            return responseStr.split(',').map(s => s.trim()).filter(Boolean);
          }
        };

        const correctResponses = parseResponses(expr.common_responses);
        const correctAnswer = correctResponses[0] || "Sure!"; // Use first response as correct answer

        // Get 3 wrong answers from other expressions (also use first response from each)
        const wrongAnswers = expressionsData
          .filter(e => e.expression !== expr.expression)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(e => {
            const responses = parseResponses(e.common_responses);
            return responses[0] || "Okay!";
          });

        // Create options array and shuffle
        const options = [correctAnswer, ...wrongAnswers].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(correctAnswer);

        questions.push({
          id: `expr_${index}`,
          type: 'expression',
          question: `What is a common response to "${expr.expression}"?`,
          options: options,
          correctAnswer: correctIndex,
          explanation: {
            expression: expr.expression,
            correct: correctAnswer
          }
        });
      });

      // Shuffle all questions
      const shuffledQuestions = questions.sort(() => 0.5 - Math.random());
      setQuizQuestions(shuffledQuestions);

    } catch (err) {
      console.error('Error generating quiz questions:', err);
      setError(err.message);
    }
  };

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
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && scenario) {
          // Award points for completing the scenario quiz
          const result = await awardQuizPoints(session.user.id, scenario.id, supabase);
          if (result.success) {
            console.log('📝 Quiz completed! Points:', result.points);
            setQuizCompleted(true);
          } else if (result.isAlreadyCompleted) {
            // Activity already completed
            setQuizCompleted(true);
            alert('You have already completed this quiz!');
          } else {
            // Show error message
            alert(`Error: ${result.error}`);
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
    router.push(`/scenario/${id}`);
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quizQuestions[index]?.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  if (loading || checkingCompletion) return <p>Loading quiz questions...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!scenario || quizQuestions.length === 0) return <p>Unable to load quiz questions.</p>;

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
                onClick={() => router.push(`/scenario/${id}`)}
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
              onClick={() => router.push(`/scenario/${id}`)}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Back to Scenario
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
                        Your answer: {userAnswer !== undefined ? question.options[userAnswer] : 'No answer'}
                      </p>
                      {!isCorrect && (
                        <p className="text-gray-600 ml-6">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                      {question.type === 'vocabulary' && (
                        <p className="text-blue-600 ml-6 text-xs">
                          💡 "{question.explanation.term}" - {question.explanation.correct}
                        </p>
                      )}
                      {question.type === 'expression' && (
                        <p className="text-purple-600 ml-6 text-xs">
                          💬 "{question.explanation.expression}" → {question.explanation.correct}
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
              onClick={() => router.push(`/scenario/${id}`)}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Scenario Quiz</h1>
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
            {quizQuestions[currentQuestion]?.question}
          </h2>
          <div className="text-center mt-4">
            <span className={`text-sm px-3 py-1 rounded-full ${
              quizQuestions[currentQuestion]?.type === 'vocabulary' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {quizQuestions[currentQuestion]?.type === 'vocabulary' ? 'Vocabulary' : 'Expression'}
            </span>
          </div>
        </div>

        {/* Answer Options */}
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 mb-6">
          <div className="space-y-3">
            {quizQuestions[currentQuestion]?.options.map((option, index) => (
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
            {currentQuestion > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 bg-green-500 text-white py-3 px-6 rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                Back
              </button>
            )}
            
            <button
              onClick={handleNext}
              disabled={selectedAnswers[currentQuestion] === undefined || selectedAnswers[currentQuestion] === null}
              style={{
                backgroundColor: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? '#9333ea' : '#d1d5db',
                color: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? 'white' : '#6b7280',
                cursor: (selectedAnswers[currentQuestion] !== undefined && selectedAnswers[currentQuestion] !== null) ? 'pointer' : 'not-allowed'
              }}
              className={`py-3 px-6 rounded-xl font-medium transition-colors ${
                currentQuestion > 0 ? 'flex-1' : 'w-full'
              }`}
            >
              {currentQuestion === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next'}
            </button>
          </div>
          
          <button
            onClick={handleExit}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Exit</span>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`
              }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-500">
            Question {currentQuestion + 1} of {quizQuestions.length}
          </p>
        </div>
      </div>
    </div>
  );
}