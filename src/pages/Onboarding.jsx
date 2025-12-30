import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, ArrowLeft, Settings, Home, User, DollarSign, Briefcase } from "lucide-react";
import apiClient from "../utils/apiClient";

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({ budget: 8000 });
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const token = localStorage.getItem("authToken");
  const userRaw = localStorage.getItem("user");

  useEffect(() => {
    if (!token || !userRaw) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchQuestions = async () => {
      try {
        const res = await apiClient.get(`/behaviour/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuestions(res.data.questions || []);
      } catch (e) {
        // Handle error gracefully
        console.error("Error fetching questions:", e);
        // Fallback questions if API fails (good for resiliency)
        if (questions.length === 0) {
          setQuestions([
            { id: 'budget', text: 'Monthly Budget', type: 'range', min: 5000, max: 50000 },
            { id: 'occupation', text: 'Occupation', options: ['Student', 'Professional', 'Other'] }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [navigate, token, userRaw]);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await apiClient.post(`/behaviour/answers`, { answers }, { headers: { Authorization: `Bearer ${token}` } });
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...user, isNewUser: false, hasCompletedBehaviorQuestions: true }));

      setShowCelebration(true);

      setTimeout(() => {
        if (user.role === 1) {
          navigate("/seeker-profile", { replace: true });
        } else {
          navigate(user.role === 3 ? "/owner-dashboard" : "/admin-dashboard", { replace: true });
        }
      }, 1500);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to submit.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const getQuestionIcon = (questionText) => {
    const text = questionText.toLowerCase();
    if (text.includes('budget') || text.includes('price')) return <DollarSign className="w-6 h-6 text-gray-700" />;
    if (text.includes('occupation') || text.includes('work')) return <Briefcase className="w-6 h-6 text-gray-700" />;
    return <Settings className="w-6 h-6 text-gray-700" />;
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading preferences...</p>
        </div>
      </div>
    );
  }

  if (showCelebration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preferences Saved</h1>
          <p className="text-gray-600">Setting up your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswer = answers[currentQuestion?.id] !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Your Preferences</h1>
          <p className="text-gray-600">Help us customize your living experience.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
            <span>Step {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 bg-red-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Card */}
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[400px] flex flex-col"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gray-100 rounded-lg">
              {getQuestionIcon(currentQuestion?.text || '')}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{currentQuestion?.text}</h2>
          </div>

          <div className="flex-grow">
            {!currentQuestion?.type && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion?.options?.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleChange(currentQuestion.id, opt)}
                    className={`w-full text-left px-5 py-4 rounded-lg border transition-all ${answers[currentQuestion.id] === opt
                        ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                  >
                    <span className="font-medium">{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion?.type === 'range' && (
              <div className="px-4 py-8">
                <input
                  type="range"
                  min={currentQuestion.min}
                  max={currentQuestion.max}
                  step={currentQuestion.step || 100}
                  value={answers[currentQuestion.id] ?? currentQuestion.min}
                  onChange={(e) => handleChange(currentQuestion.id, Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="mt-6 flex justify-between items-center text-gray-900">
                  <span className="text-3xl font-bold">₹{answers[currentQuestion.id] ?? currentQuestion.min}</span>
                  <span className="text-gray-500 font-medium badge px-3 py-1 bg-gray-100 rounded-md">Monthly Budget</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentQuestionIndex === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              Back
            </button>

            <div className="flex gap-3">
              {!isLastQuestion && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={isLastQuestion ? handleSubmit : handleNext}
                disabled={!hasAnswer && isLastQuestion}
                className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLastQuestion ? (isSubmitting ? "Saving..." : "Finish") : "Continue"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;



