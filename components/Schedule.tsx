
import React, { useState } from 'react';
import { MOCK_CALENDAR_EVENTS, MOCK_TASKS } from '../constants';
import { Clock, MapPin, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, ExternalLink, Sparkles } from 'lucide-react';

const Schedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Hours for the agenda
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  const getEventAtHour = (hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return MOCK_CALENDAR_EVENTS.find(e => e.start.startsWith(timeStr.split(':')[0]));
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Schedule</h1>
          <p className="text-slate-500 text-sm">Reviewing agenda for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-4 font-bold text-sm">Today</div>
          <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agenda</h3>
            <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              Google Calendar Connected
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-0 relative">
            {hours.map((hour) => {
              const event = getEventAtHour(hour);
              return (
                <div key={hour} className="group relative min-h-[80px] border-l border-slate-100 pl-8">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                  <span className="absolute left-[-4rem] top-0 text-[10px] font-bold text-slate-400 w-12 text-right">
                    {hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`}
                  </span>
                  
                  {event && (
                    <div className={`p-4 rounded-2xl mb-4 border transition-all hover:scale-[1.01] hover:shadow-lg ${
                      event.type === 'meeting' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{event.title}</h4>
                          <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.start} - {event.end}</span>
                            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
                          </div>
                        </div>
                        <button className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400 hover:text-indigo-600 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {event.participants && (
                        <div className="flex -space-x-2 mt-4">
                          {event.participants.map((p, i) => (
                            <img key={i} src={`https://picsum.photos/seed/${p}/40/40`} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" alt={p} title={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <Sparkles className="w-6 h-6 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Sync Your Schedule</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">Connect your personal Google Calendar to merge logistical deadlines with your daily routine.</p>
              <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Connect Calendar
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Tasks</h3>
            <div className="space-y-4">
              {MOCK_TASKS.slice(0, 3).map(task => (
                <div key={task.id} className="group cursor-pointer">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Due {task.dueDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-bold text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all">
              View All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
