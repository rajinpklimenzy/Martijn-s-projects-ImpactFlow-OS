import React, { useState, useEffect } from 'react';
import { Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiGetSurvey, apiSubmitSurveyResponse } from '../utils/api';

interface SurveyResponsePageProps {
  surveyId: string;
}

const SurveyResponsePage: React.FC<SurveyResponsePageProps> = ({ surveyId }) => {
  const [survey, setSurvey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      setIsLoading(true);
      const response = await apiGetSurvey(surveyId);
      if (response.success && response.data) {
        setSurvey(response.data);
        // Initialize answers object
        const initialAnswers: Record<string, any> = {};
        response.data.templateSnapshot.forEach((q: any) => {
          if (q.type === 'nps') {
            initialAnswers[q.id] = null;
          } else if (q.type === 'multiple_choice') {
            initialAnswers[q.id] = '';
          } else {
            initialAnswers[q.id] = '';
          }
        });
        setAnswers(initialAnswers);
        
        // Get contact ID from URL params or use first recipient
        const urlParams = new URLSearchParams(window.location.search);
        const contactParam = urlParams.get('contact');
        if (contactParam) {
          setContactId(contactParam);
        } else if (response.data.recipients && response.data.recipients.length > 0) {
          setContactId(response.data.recipients[0].contactId);
        }
      } else {
        setError('Survey not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load survey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!contactId) {
      setError('Contact information is missing');
      return;
    }

    // Validate NPS question is answered
    const npsQuestion = survey.templateSnapshot.find((q: any) => q.type === 'nps');
    if (npsQuestion && (answers[npsQuestion.id] === null || answers[npsQuestion.id] === undefined)) {
      setError('Please answer the NPS question (required)');
      return;
    }

    // Validate required questions
    for (const question of survey.templateSnapshot) {
      if (question.required && (!answers[question.id] || answers[question.id] === '')) {
        setError(`Please answer: ${question.text}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const answerArray = Object.entries(answers)
        .filter(([_, value]) => value !== null && value !== '')
        .map(([questionId, answer]) => ({
          questionId,
          answer
        }));

      await apiSubmitSurveyResponse(surveyId, {
        contactId,
        answers: answerArray
      });

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Survey Not Found</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
          <p className="text-slate-600">Your feedback has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  const npsQuestion = survey.templateSnapshot.find((q: any) => q.type === 'nps');

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Satisfaction Survey</h1>
            <p className="text-slate-600">We value your feedback. Please take a few moments to share your experience.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            {survey.templateSnapshot.map((question: any, index: number) => (
              <div key={question.id} className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {question.type === 'nps' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => handleAnswerChange(question.id, score)}
                          className={`flex-1 py-3 px-2 rounded-lg border-2 font-semibold transition-all ${
                            answers[question.id] === score
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>Not at all likely</span>
                      <span>Extremely likely</span>
                    </div>
                  </div>
                )}

                {question.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {question.options?.map((option: string) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-slate-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'free_text' && (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Your answer..."
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Survey'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyResponsePage;
