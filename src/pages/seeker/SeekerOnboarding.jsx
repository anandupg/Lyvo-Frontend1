import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Coffee, MoonStar, Users, Smile, Meh, Frown, Salad, Drumstick, Leaf, Soup, Volume2, VolumeX, DoorOpen, Shield, Wallet } from "lucide-react";

import SeekerNavbar from "../../components/seeker/SeekerNavbar";
import { Calendar } from "../../components/ui/calendar";

const RAW_BASE = import.meta.env.VITE_USER_SERVICE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_TRIM = String(RAW_BASE || '').replace(/\/$/, '');
const API_BASE = BASE_TRIM.endsWith('/api') ? BASE_TRIM : `${BASE_TRIM}/api`;
const QUESTIONS_API = `${API_BASE}/behaviour`;

const SeekerOnboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);

  const token = localStorage.getItem("authToken");
  const userRaw = localStorage.getItem("user");

  useEffect(() => {
    // If user already completed onboarding, skip this page
    try {
      const u = userRaw ? JSON.parse(userRaw) : null;
      if (u && (u.isNewUser === false || u.hasCompletedBehaviorQuestions)) {
        navigate('/seeker-dashboard', { replace: true });
        return;
      }
    } catch { }

    if (!token || !userRaw) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchQuestions = async () => {
      try {
        // Check completion from backend to avoid relying only on local flags
        try {
          const status = await axios.get(`${QUESTIONS_API}/status`, { headers: { Authorization: `Bearer ${token}` } });
          if (status?.data?.completed) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...user, isNewUser: false, hasCompletedBehaviorQuestions: true }));
            navigate('/seeker-dashboard', { replace: true });
            return;
          }
        } catch { }

        const res = await axios.get(`${QUESTIONS_API}/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuestions(res.data.questions || []);
      } catch (e) {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message || e?.message || 'Failed to load questions. Please try again.';
        setError(msg);
        if (status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [navigate, token, userRaw]);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (error) setError(null);
  };

  // Determine validity for the current step
  const currentQuestion = questions[step];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  // Valid if answer is not undefined, null, or empty string. 0 is valid (though unlikely here)
  const isStepValid = currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';

  const goNext = () => {
    if (!isStepValid) {
      setError("Please select an option to continue.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, (questions?.length || 1) - 1));
  };

  const goPrev = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!isStepValid) {
      setError("Please select an option to continue.");
      return;
    }
    try {
      setError(null);
      await axios.post(`${QUESTIONS_API}/answers`, { answers }, { headers: { Authorization: `Bearer ${token}` } });
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...user, isNewUser: false, hasCompletedBehaviorQuestions: true }));
      navigate("/seeker-dashboard", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to submit. Please try again.';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      <SeekerNavbar onMenuToggle={() => { }} />
      <div className="pt-20" />
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Tell us about you</h1>
          <p className="text-gray-600">This helps us personalize your co-living matches.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${questions.length ? ((step + 1) / questions.length) * 100 : 0}%` }}
          />
        </div>

        {/* One-question-at-a-time flow */}
        <AnimatePresence mode="wait">
          {questions[step] && (
            <motion.div
              key={questions[step].id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <label className="block text-base sm:text-lg font-semibold text-gray-900">
                  {questions[step].text} <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500 mt-1">{step + 1}/{questions.length}</span>
              </div>

              {/* Options */}
              {!questions[step].type && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {questions[step].options.map((opt) => (
                    <motion.button
                      key={opt}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleChange(questions[step].id, opt)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition shadow-sm ${answers[questions[step].id] === opt ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-gray-800 border-gray-300 hover:border-red-400'
                        }`}
                    >
                      <span className="text-lg">{getEmoji(opt)}</span>
                      <span className="truncate">{opt}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Date Input - Segmented (DD / MM / YYYY) */}
              {/* Date Input - Native */}
              {questions[step].type === 'date' && (
                <div className="mt-4">
                  <input
                    type="date"
                    value={answers[questions[step].id] || ''}
                    onChange={(e) => handleChange(questions[step].id, e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all shadow-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">Please enter your date of birth.</p>
                </div>
              )}

              {/* Helper Text */}
              {!isStepValid && (
                <p className="text-sm text-gray-400 mt-2">
                  Please select one option to continue
                </p>
              )}

              {/* Nav buttons */}
              {/* Nav buttons */}
              {(() => {
                const isValid = isStepValid;

                return (
                  <div className="pt-2 flex items-center justify-between mt-8">
                    <button onClick={goPrev} disabled={step === 0} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    {step < questions.length - 1 ? (
                      <button
                        onClick={goNext}
                        disabled={!isValid}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${isValid
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${isValid
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        Finish
                      </button>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div >
  );
};

export default SeekerOnboarding;

// Simple emoji helper for friendlier options
function getEmoji(opt) {
  const s = String(opt || '').toLowerCase();
  if (s.includes('night')) return '🌙';
  if (s.includes('early')) return '🌅';
  if (s.includes('flex')) return '🕒';
  if (s.includes('outgoing')) return '🎉';
  if (s.includes('social')) return '😊';
  if (s.includes('private')) return '🤫';
  if (s.includes('smoke') || s.includes('drink')) return '🚬';
  if (s.includes('yes')) return '✅';
  if (s.includes('no')) return '🚫';
  if (s.includes('clean')) return '🧼';
  if (s.includes('veg')) return '🥗';
  if (s.includes('non')) return '🍗';
  if (s.includes('vegan')) return '🌿';
  if (s.includes('cook')) return '🍳';
  if (s.includes('order')) return '📦';
  if (s.includes('quiet')) return '🔇';
  if (s.includes('noise')) return '🔊';
  if (s.includes('privacy')) return '🔒';
  if (s.includes('match') && s.includes('male') === false && s.includes('female') === false) return '🤝';
  // Gender specific
  if (s === 'male') return '👨';
  if (s === 'female') return '👩';

  return '✨';
}
